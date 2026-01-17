import fs from 'fs';
import path from 'path';

const SEQUENCE_FILE = path.join(process.cwd(), 'data', 'sequence.json');

interface SequenceData {
  sequenceNumber: number;
  lastUpdated: string;
}

// Ensure data directory exists
const dataDir = path.dirname(SEQUENCE_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize sequence file if it doesn't exist
if (!fs.existsSync(SEQUENCE_FILE)) {
  const initialData: SequenceData = {
    sequenceNumber: 0,
    lastUpdated: new Date().toISOString()
  };
  fs.writeFileSync(SEQUENCE_FILE, JSON.stringify(initialData, null, 2));
}

export class SequenceManager {
  private static readSequence(): SequenceData {
    try {
      const data = fs.readFileSync(SEQUENCE_FILE, 'utf8');
      const parsed = JSON.parse(data);
      
      // Handle migration from old format
      if (parsed.invoiceNumber !== undefined) {
        return {
          sequenceNumber: Math.max(parsed.invoiceNumber || 0, parsed.referenceNumber || 0),
          lastUpdated: parsed.lastUpdated || new Date().toISOString()
        };
      }
      
      return parsed;
    } catch (error) {
      console.error('Error reading sequence file:', error);
      return {
        sequenceNumber: 0,
        lastUpdated: new Date().toISOString()
      };
    }
  }

  private static writeSequence(data: SequenceData): void {
    try {
      data.lastUpdated = new Date().toISOString();
      fs.writeFileSync(SEQUENCE_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error writing sequence file:', error);
    }
  }

  static getNextSequenceNumber(): string {
    const data = this.readSequence();
    data.sequenceNumber += 1;
    this.writeSequence(data);
    return data.sequenceNumber.toString().padStart(3, '0');
  }

  static getNextSequenceNumbers(count: number): string[] {
    const data = this.readSequence();
    const sequenceNumbers: string[] = [];

    for (let i = 0; i < count; i++) {
      data.sequenceNumber += 1;
      sequenceNumbers.push(data.sequenceNumber.toString().padStart(3, '0'));
    }

    this.writeSequence(data);
    return sequenceNumbers;
  }

  static getCurrentSequence(): SequenceData {
    return this.readSequence();
  }

  static resetSequence(): void {
    const data: SequenceData = {
      sequenceNumber: 0,
      lastUpdated: new Date().toISOString()
    };
    this.writeSequence(data);
  }
}