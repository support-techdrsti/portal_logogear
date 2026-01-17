import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';
import moment from 'moment';
import { logger } from '../config/logger';

export interface ShippingData {
  'Full Name': string;
  'Mobile Number': string;
  'Street Address': string;
  'Landmark'?: string;
  'City': string;
  'State/Province': string;
  'Postal Code': string;
  'Country': string;
  [key: string]: any;
}

export class ShippingService {
  private templatesDir = path.join(process.cwd(), 'templates');
  private uploadsDir = path.join(process.cwd(), 'uploads');
  private outputDir = path.join(process.cwd(), 'output');

  constructor() {
    // Ensure directories exist
    [this.templatesDir, this.uploadsDir, this.outputDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Process BlueDart data file - cleans and reshapes the data
   */
  async processBlueDartFile(filePath: string): Promise<string> {
    try {
      logger.info('Processing BlueDart file:', filePath);
      
      // Read the uploaded file
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const rawData = XLSX.utils.sheet_to_json(worksheet);
      
      // Process and clean the data (implement your BlueDart macro logic here)
      const processedData = this.cleanBlueDartData(rawData);
      
      // Create output file
      const outputFileName = `BlueDart_Processed_${moment().format('YYYYMMDD_HHmmss')}.xlsx`;
      const outputPath = path.join(this.outputDir, outputFileName);
      
      // Create new workbook with processed data
      const newWorkbook = XLSX.utils.book_new();
      const newWorksheet = XLSX.utils.json_to_sheet(processedData);
      XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Processed Data');
      
      // Write the file
      XLSX.writeFile(newWorkbook, outputPath);
      
      logger.info('BlueDart file processed successfully:', outputPath);
      return outputPath;
      
    } catch (error) {
      logger.error('Error processing BlueDart file:', error);
      throw new Error('Failed to process BlueDart file');
    }
  }

  /**
   * Generate Delivery Challan files for each row
   */
  async generateDCFiles(filePath: string): Promise<string> {
    try {
      logger.info('Generating DC files from:', filePath);
      
      // Read the data file
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data: ShippingData[] = XLSX.utils.sheet_to_json(worksheet);
      
      // Create output directory for this batch
      const batchId = moment().format('YYYYMMDD_HHmmss');
      const batchDir = path.join(this.outputDir, `DC_Files_${batchId}`);
      fs.mkdirSync(batchDir, { recursive: true });
      
      // Process each row
      const generatedFiles: string[] = [];
      
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const dcFilePath = await this.generateSingleDC(row, batchDir, i + 1);
        generatedFiles.push(dcFilePath);
      }
      
      // Create ZIP file containing all DC files
      const zipPath = path.join(this.outputDir, `DC_Files_${batchId}.zip`);
      await this.createZipFile(generatedFiles, zipPath);
      
      // Clean up individual files
      generatedFiles.forEach(file => {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      });
      
      // Remove batch directory
      fs.rmSync(batchDir, { recursive: true, force: true });
      
      logger.info('DC files generated successfully:', zipPath);
      return zipPath;
      
    } catch (error) {
      logger.error('Error generating DC files:', error);
      throw new Error('Failed to generate DC files');
    }
  }

  /**
   * Clean and process BlueDart data (implement your macro logic here)
   */
  private cleanBlueDartData(rawData: any[]): any[] {
    // This is where you'll implement your BlueDart macro logic
    // For now, I'll create a basic structure - you can customize this based on your actual macro
    
    return rawData.map((row, index) => {
      // Clean and transform data according to your BlueDart macro
      const cleaned = {
        'SL No': index + 1,
        'Full Name': this.cleanString(row['Full Name'] || row['Name'] || ''),
        'Mobile Number': this.cleanMobileNumber(row['Mobile Number'] || row['Phone'] || ''),
        'Street Address': this.cleanString(row['Street Address'] || row['Address'] || ''),
        'Landmark': this.cleanString(row['Landmark'] || ''),
        'City': this.cleanString(row['City'] || ''),
        'State/Province': this.cleanString(row['State/Province'] || row['State'] || ''),
        'Postal Code': this.cleanString(row['Postal Code'] || row['PIN'] || row['Pincode'] || ''),
        'Country': this.cleanString(row['Country'] || 'India'),
        // Add other fields as needed based on your macro
      };
      
      return cleaned;
    }).filter(row => row['Full Name'] && row['City']); // Filter out invalid rows
  }

  /**
   * Generate a single DC file using the template
   */
  private async generateSingleDC(data: ShippingData, outputDir: string, serialNo: number): Promise<string> {
    try {
      // Load the DC template
      const templatePath = path.join(this.templatesDir, 'DC-FORMAT.xlsx');
      
      // Create a basic template if it doesn't exist (you should replace this with your actual template)
      if (!fs.existsSync(templatePath)) {
        await this.createBasicDCTemplate(templatePath);
      }
      
      const templateWorkbook = XLSX.readFile(templatePath);
      const templateSheet = templateWorkbook.Sheets[templateWorkbook.SheetNames[0]];
      
      // Process address data
      const addressData = this.processAddressData(data);
      
      // Fill the template with data
      // Map to specific cells as per your DC template format
      templateSheet['C3'] = { t: 's', v: data['Full Name'] }; // Full Name
      templateSheet['C4'] = { t: 's', v: addressData.line2 }; // Address line 1
      templateSheet['C5'] = { t: 's', v: addressData.line3 }; // City
      templateSheet['C6'] = { t: 's', v: addressData.line4 }; // State - Postal Code
      templateSheet['C7'] = { t: 's', v: addressData.line5 }; // Country
      templateSheet['C8'] = { t: 's', v: data['Mobile Number'] }; // Mobile Number
      
      // Date
      templateSheet['B12'] = { t: 's', v: moment().format('DD/MM/YYYY') };
      
      // Item details
      templateSheet['A16'] = { t: 'n', v: 1 }; // SL No
      templateSheet['B16'] = { t: 's', v: 'Merchandise' }; // Description
      templateSheet['C16'] = { t: 's', v: '' }; // Empty
      templateSheet['D16'] = { t: 'n', v: 1 }; // Quantity
      templateSheet['E16'] = { t: 'n', v: 0 }; // Unit price
      templateSheet['F16'] = { t: 'n', v: 0 }; // Total
      templateSheet['F24'] = { t: 'n', v: 0 }; // Total at bottom
      
      // Generate filename
      const cleanName = data['Full Name'].replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `DC_${cleanName}_${moment().format('YYYYMMDD')}.xlsx`;
      const outputPath = path.join(outputDir, fileName);
      
      // Write the file
      XLSX.writeFile(templateWorkbook, outputPath);
      
      return outputPath;
      
    } catch (error) {
      logger.error('Error generating single DC file:', error);
      throw error;
    }
  }

  /**
   * Process address data according to your macro rules
   */
  private processAddressData(data: ShippingData) {
    let streetAddress = data['Street Address'] || '';
    const fullName = data['Full Name'] || '';
    const landmark = data['Landmark'] || '';
    const city = data['City'] || '';
    const state = data['State/Province'] || '';
    const postalCode = data['Postal Code'] || '';
    const country = data['Country'] || '';
    
    // Remove name from street address if it starts with the name
    if (streetAddress.toLowerCase().startsWith(fullName.toLowerCase())) {
      streetAddress = streetAddress.substring(fullName.length).trim();
      if (streetAddress.startsWith(',')) {
        streetAddress = streetAddress.substring(1).trim();
      }
    }
    
    // Build address lines
    const line2 = landmark ? `${streetAddress}, ${landmark}` : streetAddress;
    const line3 = city;
    const line4 = state && postalCode ? `${state} - ${postalCode}` : `${state} ${postalCode}`.trim();
    const line5 = country;
    
    return { line2, line3, line4, line5 };
  }

  /**
   * Create a basic DC template (replace with your actual template)
   */
  private async createBasicDCTemplate(templatePath: string) {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['DELIVERY CHALLAN'],
      [''],
      ['To:', '', 'Full Name'],
      ['', '', 'Address Line 1'],
      ['', '', 'City'],
      ['', '', 'State - Postal Code'],
      ['', '', 'Country'],
      ['', '', 'Mobile Number'],
      [''],
      [''],
      [''],
      ['Date:', 'DD/MM/YYYY'],
      [''],
      [''],
      [''],
      ['SL No', 'Description', '', 'Qty', 'Unit Price', 'Total'],
      ['1', 'Merchandise', '', '1', '0', '0'],
      [''],
      [''],
      [''],
      [''],
      [''],
      [''],
      ['', '', '', '', 'Total:', '0']
    ]);
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'DC');
    XLSX.writeFile(workbook, templatePath);
  }

  /**
   * Create ZIP file from multiple files
   */
  private async createZipFile(filePaths: string[], outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      output.on('close', () => {
        logger.info(`ZIP file created: ${outputPath} (${archive.pointer()} bytes)`);
        resolve();
      });
      
      archive.on('error', (err) => {
        logger.error('Error creating ZIP file:', err);
        reject(err);
      });
      
      archive.pipe(output);
      
      filePaths.forEach(filePath => {
        if (fs.existsSync(filePath)) {
          archive.file(filePath, { name: path.basename(filePath) });
        }
      });
      
      archive.finalize();
    });
  }

  /**
   * Utility functions
   */
  private cleanString(str: string): string {
    return (str || '').toString().trim();
  }

  private cleanMobileNumber(mobile: string): string {
    const cleaned = (mobile || '').toString().replace(/[^0-9+]/g, '');
    return cleaned;
  }

  /**
   * Clean up old files
   */
  async cleanupOldFiles(maxAgeHours: number = 24): Promise<void> {
    try {
      const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);
      
      [this.uploadsDir, this.outputDir].forEach(dir => {
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir);
          files.forEach(file => {
            const filePath = path.join(dir, file);
            const stats = fs.statSync(filePath);
            if (stats.mtime.getTime() < cutoffTime) {
              fs.unlinkSync(filePath);
              logger.info(`Cleaned up old file: ${filePath}`);
            }
          });
        }
      });
    } catch (error) {
      logger.error('Error cleaning up old files:', error);
    }
  }
}