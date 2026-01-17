import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import multer from 'multer';
import * as XLSX from 'xlsx';
import * as ExcelJS from 'exceljs';
import fs from 'fs';
import archiver from 'archiver';
import moment from 'moment';
import winston from 'winston';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

// Load environment variables from root directory
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Company Steering Standard: Environment Validation Schema
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.string().transform(Number).default('3006'),
  DATABASE_URL: z.string().optional(),
  SESSION_SECRET: z.string().min(32, 'Session secret must be at least 32 characters'),
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  FRONTEND_URL: z.string().url().default('http://localhost:3001'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

// Mandatory Practice: Validate environment variables at startup
let env: z.infer<typeof EnvSchema>;
try {
  env = EnvSchema.parse(process.env);
  console.log('✅ Environment validation passed');
} catch (error) {
  console.error('❌ Environment validation failed:', error);
  console.error('🔧 Please check your .env file against .env.example');
  process.exit(1);
}

// Company Steering Standard: Structured Logging with Winston
const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: path.resolve(__dirname, '../../../logs/error.log'), 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: path.resolve(__dirname, '../../../logs/combined.log') 
    }),
  ],
});

// Add console transport for development
if (env.NODE_ENV === 'development') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Mandatory Practice: Standardized API Response Types
interface ApiSuccess<T = any> {
  success: true;
  data: T;
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId?: string;
  };
}

// Utility function for standardized responses
const createSuccessResponse = <T>(data: T, requestId?: string): ApiSuccess<T> => ({
  success: true,
  data,
  meta: {
    timestamp: new Date().toISOString(),
    requestId,
  },
});

const createErrorResponse = (code: string, message: string, details?: any, requestId?: string): ApiError => ({
  success: false,
  error: {
    code,
    message,
    details: env.NODE_ENV === 'development' ? details : undefined,
    timestamp: new Date().toISOString(),
    requestId,
  },
});

const app = express();
const PORT = env.PORT;

// Configure multer for file uploads
const upload = multer({ 
  dest: path.resolve(__dirname, '../../../uploads/'),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Ensure directories exist
const uploadsDir = path.resolve(__dirname, '../../../uploads/');
const outputDir = path.resolve(__dirname, '../../../output/');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

// Middleware
app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3002'],
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Basic API status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    message: 'Logogear Internal Portal API is running',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

// File upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    res.json({
      success: true,
      message: 'File uploaded successfully',
      fileId: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, error: 'Upload failed' });
  }
});

// BlueDart processing function - Based on exact sample file format
function processBlueDartData(data: any[]): any[] {
  console.log('Processing BlueDart data with', data.length, 'rows');
  
  return data.map((row, index) => {
    const sequenceNumber = String(index + 1).padStart(3, '0');
    const invoiceRef = `LGS-INV-${sequenceNumber}`;
    
    // Extract and process data according to sample BlueDart format
    const processed = {
      'Reference No': invoiceRef,
      'Billing Area': 'BLR',
      'Billing Customer Code': '204455',
      'Pickup Date': moment().format('DD/MM/YYYY'),
      'Pickup Time': '1800',
      'Shipper Name': 'Logogear Solution LLP',
      'Pickup address': 'Mico Layout Begur road',
      'Pickup pincode': '560068',
      'Company Name': (row['Full Name'] || row['Customer Name'] || row['Name'] || '').toString().trim(),
      'Delivery address': formatDeliveryAddress(row),
      'Delivery Pincode': (row['Postal Code'] || row['Pincode'] || row['PIN'] || row['Zip'] || '').toString().trim(),
      'Product Code': '',
      'Product Type': '',
      'Pack Type': 'X',
      'Piece Count': parseInt(row['Quantity'] || row['Qty'] || '1') || 1,
      'Actual Weight': '',
      'Declared Value': '',
      'Register Pickup': 'TRUE',
      'Length': '',
      'Breadth': '',
      'Height': '',
      'To Pay Customer': '',
      'Sender': 'Logogear',
      'Sender mobile': '9035636626',
      'Receiver Telephone': cleanMobileNumber(row['Mobile Number'] || row['Phone'] || row['Mobile'] || ''),
      'Receiver mobile': cleanMobileNumber(row['Mobile Number'] || row['Phone'] || row['Mobile'] || ''),
      'Receiver Name': (row['Full Name'] || row['Customer Name'] || row['Name'] || '').toString().trim(),
      'Invoice No': invoiceRef,
      'Special Instruction': (row['Special Instructions'] || row['Instructions'] || '').toString().trim(),
      'Commodity Detail 1': '',
      'Commodity Detail 2': '',
      'Commodity Detail 3': ''
    };
    
    return processed;
  }).filter(row => row['Company Name'] && row['Delivery Pincode'] && row['Receiver mobile']); // Filter out invalid rows
}

function formatDeliveryAddress(row: any): string {
  const streetAddress = (row['Street Address'] || row['Address Line 1'] || row['Address'] || '').toString().trim();
  const landmark = (row['Landmark'] || row['Address Line 2'] || '').toString().trim();
  const city = (row['City'] || '').toString().trim();
  
  let address = streetAddress;
  if (landmark) {
    address += `\n${landmark}`;
  }
  if (city) {
    address += `\n${city}`;
  }
  
  return address;
}

function cleanMobileNumber(mobile: any): string {
  if (!mobile) return '';
  
  // Remove all non-numeric characters except +
  let cleaned = mobile.toString().replace(/[^0-9+]/g, '');
  
  // Handle Indian mobile numbers
  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.substring(2);
  }
  
  // Ensure 10-digit mobile number
  if (cleaned.length === 10 && cleaned.match(/^[6-9]/)) {
    return cleaned;
  }
  
  return mobile.toString().trim(); // Return original if can't clean properly
}

function processAddressData(data: any) {
  let streetAddress = (data['Street Address'] || data['Address Line 1'] || '').toString().trim();
  const fullName = (data['Full Name'] || data['Customer Name'] || '').toString().trim();
  const landmark = (data['Landmark'] || data['Address Line 2'] || '').toString().trim();
  const city = (data['City'] || '').toString().trim();
  const state = (data['State/Province'] || data['State'] || '').toString().trim();
  const postalCode = (data['Postal Code'] || data['Pincode'] || '').toString().trim();
  const country = (data['Country'] || 'India').toString().trim();
  
  // Remove name from street address if it starts with the name (as per VBA logic)
  if (streetAddress.toLowerCase().startsWith(fullName.toLowerCase())) {
    streetAddress = streetAddress.substring(fullName.length).trim();
    if (streetAddress.startsWith(',')) {
      streetAddress = streetAddress.substring(1).trim();
    }
  }
  
  // Build address lines as per DC template requirements
  const line1 = streetAddress;
  const line2 = landmark ? `${landmark}` : '';
  const line3 = city;
  const line4 = state && postalCode ? `${state} - ${postalCode}` : `${state} ${postalCode}`.trim();
  const line5 = country;
  
  return { line1, line2, line3, line4, line5 };
}

async function createEnhancedDCFile(customerData: any, serialNo: number): Promise<Buffer> {
  try {
    console.log(`Creating DC file for: ${customerData['Full Name'] || customerData['Customer Name']}`);

    // Create new workbook with proper Logo Gear DC format
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Delivery Challan');
    
    // Process address data
    const addressData = processAddressData(customerData);
    const today = moment().format('DD/MM/YYYY');
    const customerName = customerData['Full Name'] || customerData['Customer Name'] || '';
    const mobileNumber = cleanMobileNumber(customerData['Mobile Number'] || customerData['Phone'] || '');

    // Set column widths
    worksheet.columns = [
      { width: 15 }, // A
      { width: 25 }, // B  
      { width: 15 }, // C
      { width: 25 }, // D
      { width: 25 }, // E
      { width: 15 }, // F
      { width: 15 }, // G
      { width: 15 }  // H
    ];

    // Header - DELIVERY CHALLAN
    worksheet.mergeCells('A1:H1');
    const headerCell = worksheet.getCell('A1');
    headerCell.value = 'DELIVERY CHALLAN';
    headerCell.font = { size: 16, bold: true };
    headerCell.alignment = { horizontal: 'center', vertical: 'middle' };
    headerCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    // From/To headers
    worksheet.getCell('A3').value = 'From';
    worksheet.getCell('A3').font = { bold: true };
    worksheet.getCell('E3').value = 'To';
    worksheet.getCell('E3').font = { bold: true };

    // Company details (From section)
    worksheet.getCell('A4').value = 'LOGO GEAR SOLUTION LLP';
    worksheet.getCell('A4').font = { bold: true, size: 12 };
    
    worksheet.getCell('A5').value = 'Address:';
    worksheet.getCell('A5').font = { bold: true };
    worksheet.getCell('B5').value = '#1149, 20th Cross Mico Layout';
    
    worksheet.getCell('B6').value = 'Near Begur Main Road';
    worksheet.getCell('B7').value = 'Bengaluru 560068';
    worksheet.getCell('B8').value = 'Karnataka - India';

    worksheet.getCell('A9').value = 'Contact:';
    worksheet.getCell('A9').font = { bold: true };
    worksheet.getCell('B9').value = '9035636626';

    worksheet.getCell('A10').value = 'GSTIN:';
    worksheet.getCell('A10').font = { bold: true };
    worksheet.getCell('B10').value = '29AALFL0083H1Z5';

    // Customer details (To section)
    worksheet.getCell('E4').value = customerName;
    worksheet.getCell('E4').font = { bold: true };

    if (addressData.line1) {
      worksheet.getCell('E5').value = addressData.line1;
    }
    if (addressData.line2) {
      worksheet.getCell('E6').value = addressData.line2;
    }
    if (addressData.line3) {
      worksheet.getCell('E7').value = addressData.line3;
    }
    if (addressData.line4) {
      worksheet.getCell('E8').value = addressData.line4;
    }
    if (mobileNumber) {
      worksheet.getCell('E9').value = mobileNumber;
    }

    // Invoice and Date section
    worksheet.getCell('A12').value = 'Invoice No:';
    worksheet.getCell('A12').font = { bold: true };
    
    worksheet.getCell('A13').value = 'DC No:';
    worksheet.getCell('A13').font = { bold: true };
    
    worksheet.getCell('A14').value = 'Date:';
    worksheet.getCell('A14').font = { bold: true };
    worksheet.getCell('B14').value = today;

    // Item Details header
    worksheet.getCell('A16').value = 'Item Details:';
    worksheet.getCell('A16').font = { bold: true, size: 12 };

    // Table headers
    const headers = ['SL No', 'Description of Goods', 'HSN Code', 'Quantity', 'Unit Price (Including Tax)', 'Total'];
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(17, index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Item row
    worksheet.getCell('A18').value = 1;
    worksheet.getCell('B18').value = 'Merchandise';
    worksheet.getCell('C18').value = '';
    worksheet.getCell('D18').value = 1;
    worksheet.getCell('E18').value = '₹0.00';
    worksheet.getCell('F18').value = '₹0.00';

    // Add borders to item row
    for (let col = 1; col <= 6; col++) {
      const cell = worksheet.getCell(18, col);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }

    // Total row
    worksheet.getCell('E24').value = 'Total Amount:';
    worksheet.getCell('E24').font = { bold: true };
    worksheet.getCell('F24').value = '₹0.00';
    worksheet.getCell('F24').font = { bold: true };

    // Terms & Conditions
    worksheet.getCell('A26').value = 'Terms & Conditions:';
    worksheet.getCell('A26').font = { bold: true };
    
    worksheet.getCell('A27').value = '1. Goods once delivered will not be taken back';
    worksheet.getCell('A28').value = '2. Subject to Mumbai jurisdiction';
    worksheet.getCell('A29').value = '3. Payment terms: As per agreement';

    // Signature section
    worksheet.getCell('E31').value = 'For LOGO GEAR SOLUTION LLP';
    worksheet.getCell('E31').font = { bold: true };
    
    worksheet.getCell('E34').value = 'Authorized Signatory';
    worksheet.getCell('E34').font = { bold: true };

    console.log('DC file created successfully with proper Logo Gear format');

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);

  } catch (error) {
    console.error('Error creating DC file:', error);
    
    // Fallback: create a basic DC if main creation fails
    return createFallbackDCFile(customerData, serialNo);
  }
}

// Fallback function to create basic DC if template is not available
async function createFallbackDCFile(customerData: any, serialNo: number): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Delivery Challan');
  
  // Basic DC structure as fallback
  worksheet.mergeCells('A1:H2');
  const headerCell = worksheet.getCell('A1');
  headerCell.value = 'DELIVERY CHALLAN';
  headerCell.font = { size: 18, bold: true };
  headerCell.alignment = { horizontal: 'center', vertical: 'middle' };
  
  // Add basic customer information
  worksheet.getCell('A4').value = 'Customer Name:';
  worksheet.getCell('B4').value = customerData['Full Name'] || customerData['Customer Name'] || '';
  
  worksheet.getCell('A5').value = 'Address:';
  const addressData = processAddressData(customerData);
  worksheet.getCell('B5').value = addressData.line1;
  
  worksheet.getCell('A6').value = 'City:';
  worksheet.getCell('B6').value = addressData.line3;
  
  worksheet.getCell('A7').value = 'Mobile:';
  worksheet.getCell('B7').value = customerData['Mobile Number'] || customerData['Phone'] || '';
  
  worksheet.getCell('A8').value = 'Date:';
  worksheet.getCell('B8').value = moment().format('DD/MM/YYYY');
  
  // Add item table
  worksheet.getCell('A10').value = 'SL No';
  worksheet.getCell('B10').value = 'Description';
  worksheet.getCell('C10').value = 'Quantity';
  worksheet.getCell('D10').value = 'Amount';
  
  worksheet.getCell('A11').value = 1;
  worksheet.getCell('B11').value = 'Merchandise';
  worksheet.getCell('C11').value = 1;
  worksheet.getCell('D11').value = '₹0.00';
  
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function createDCTemplate(data: any, serialNo: number) {
  const addressData = processAddressData(data);
  const today = moment().format('DD/MM/YYYY');
  
  // Create DC template structure matching the exact sample format
  const dcTemplate = [
    // Row 1: Header
    ['Delivery Challan '],
    
    // Row 2: From/To headers
    ['From', '', 'To '],
    
    // Row 3: Company name and customer name
    ['LOGO GEAR SOLUTION LLP', '', data['Full Name'] || data['Customer Name'] || ''],
    
    // Row 4: Company address and customer address
    ['Address      ', '#1149, 20th Cross Mico Layout', addressData.line1],
    
    // Row 5: Company address line 2 and customer city
    ['                     ', 'Near Begur Main Road ', addressData.line3],
    
    // Row 6: Company city and customer state-pincode
    ['                     ', 'Bengaluru 560068', addressData.line4],
    
    // Row 7: Company state and customer country
    ['                     ', 'Karnataka- India ', addressData.line5],
    
    // Row 8: Contact and customer mobile
    ['Contact      ', '', data['Mobile Number'] || data['Phone'] || ''],
    
    // Row 9: GSTIN
    ['GSTIN       ', '29AALFL0083H1Z5'],
    
    // Row 10: Invoice No
    ['Invoice No'],
    
    // Row 11: DC No
    ['DC No         '],
    
    // Row 12: Date
    ['Date          ', today],
    
    // Row 13: Empty
    [''],
    
    // Row 14: Item Details header
    ['Item Details : '],
    
    // Row 15: Table headers
    ['SL No', 'Description of Goods', 'HSN Code', 'Quantity', 'Unit Price (Including Tax)', 'Total '],
    
    // Row 16: Item details
    ['1', 'Merchandise', '', '1', '0', '0'],
    
    // Rows 17-22: Empty rows for additional items
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    
    // Row 23: Total row
    ['', '', '', '', 'Total Amount:', '0'],
    
    // Row 24: Empty
    ['', '', '', '', '', ''],
    
    // Row 25: Terms header
    ['Terms & Conditions:', '', '', '', '', ''],
    
    // Row 26: Term 1
    ['1. Goods once delivered will not be taken back', '', '', '', '', ''],
    
    // Row 27: Term 2
    ['2. Subject to Mumbai jurisdiction', '', '', '', '', ''],
    
    // Row 28: Term 3
    ['3. Payment terms: As per agreement', '', '', '', '', ''],
    
    // Row 29: Empty
    ['', '', '', '', '', ''],
    
    // Row 30: Signature section
    ['', '', '', 'For LOGO GEAR SOLUTION LLP', '', ''],
    
    // Row 31: Empty
    ['', '', '', '', '', ''],
    
    // Row 32: Authorized signatory
    ['', '', '', 'Authorized Signatory', '', '']
  ];
  
  return dcTemplate;
}

// Shipping tools endpoints
app.post('/api/shipping-tools/bluedart', upload.single('dataFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    console.log('Processing BlueDart file:', req.file.filename);
    
    // Read the uploaded file
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet);
    
    // Process the data according to BlueDart macro logic
    const processedData = processBlueDartData(rawData);
    
    console.log(`Processed ${processedData.length} valid records from ${rawData.length} input records`);
    
    // Create output file with proper BlueDart filename format
    const outputFileName = `BlueDart_${moment().format('DDMMYYYY')}_${moment().format('HHmmss')}.xlsx`;
    const outputPath = path.join(outputDir, outputFileName);
    
    // Create new workbook with processed data in exact BlueDart format
    const newWorkbook = XLSX.utils.book_new();
    const newWorksheet = XLSX.utils.json_to_sheet(processedData);
    
    // Set column widths for BlueDart format (matching sample file)
    newWorksheet['!cols'] = [
      { wch: 15 }, // Reference No
      { wch: 12 }, // Billing Area
      { wch: 18 }, // Billing Customer Code
      { wch: 12 }, // Pickup Date
      { wch: 12 }, // Pickup Time
      { wch: 25 }, // Shipper Name
      { wch: 30 }, // Pickup address
      { wch: 12 }, // Pickup pincode
      { wch: 25 }, // Company Name
      { wch: 50 }, // Delivery address
      { wch: 12 }, // Delivery Pincode
      { wch: 12 }, // Product Code
      { wch: 12 }, // Product Type
      { wch: 10 }, // Pack Type
      { wch: 10 }, // Piece Count
      { wch: 12 }, // Actual Weight
      { wch: 12 }, // Declared Value
      { wch: 12 }, // Register Pickup
      { wch: 8 },  // Length
      { wch: 8 },  // Breadth
      { wch: 8 },  // Height
      { wch: 15 }, // To Pay Customer
      { wch: 15 }, // Sender
      { wch: 15 }, // Sender mobile
      { wch: 15 }, // Receiver Telephone
      { wch: 15 }, // Receiver mobile
      { wch: 25 }, // Receiver Name
      { wch: 15 }, // Invoice No
      { wch: 30 }, // Special Instruction
      { wch: 20 }, // Commodity Detail 1
      { wch: 20 }, // Commodity Detail 2
      { wch: 20 }  // Commodity Detail 3
    ];
    
    XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'BlueDart Upload Data');
    XLSX.writeFile(newWorkbook, outputPath);
    
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    // Set proper headers for Excel file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${outputFileName}"`);
    
    // Stream the file directly
    const fileStream = fs.createReadStream(outputPath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('BlueDart generation error:', error);
    res.status(500).json({ success: false, error: 'BlueDart file generation failed' });
  }
});

app.post('/api/shipping-tools/dc', upload.single('dataFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    console.log('Generating DC files from:', req.file.filename);
    
    // Read the data file
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    // Create output directory for this batch
    const batchId = moment().format('YYYYMMDD_HHmmss');
    const batchDir = path.join(outputDir, `DC_Files_${batchId}`);
    fs.mkdirSync(batchDir, { recursive: true });
    
    // Process each row and create proper DC files
    const generatedFiles: string[] = [];
    
    for (let i = 0; i < data.length; i++) {
      const row: any = data[i];
      
      // Skip rows without essential data
      if (!row['Full Name'] && !row['Customer Name'] || !row['City']) {
        console.log(`Skipping row ${i + 1}: Missing essential data`);
        continue;
      }
      
      // Create enhanced DC file with proper formatting
      const dcBuffer = await createEnhancedDCFile(row, i + 1);
      
      // Generate filename as per VBA macro logic: DC_<FullNameWithUnderscores>_YYYYMMDD.xlsx
      const cleanName = (row['Full Name'] || row['Customer Name'] || 'Unknown')
        .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .substring(0, 50); // Limit length
      
      const fileName = `DC_${cleanName}_${moment().format('YYYYMMDD')}.xlsx`;
      const filePath = path.join(batchDir, fileName);
      
      // Write the buffer to file
      fs.writeFileSync(filePath, dcBuffer);
      generatedFiles.push(filePath);
      
      console.log(`Generated DC file ${i + 1}/${data.length}: ${fileName}`);
    }
    
    // Create ZIP file containing all DC files
    const zipPath = path.join(outputDir, `DC_Files_${batchId}.zip`);
    
    await new Promise<void>((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      output.on('close', () => {
        console.log(`ZIP file created: ${zipPath} (${archive.pointer()} bytes)`);
        resolve();
      });
      
      archive.on('error', (err: any) => {
        console.error('Error creating ZIP file:', err);
        reject(err);
      });
      
      archive.pipe(output);
      
      generatedFiles.forEach(filePath => {
        if (fs.existsSync(filePath)) {
          archive.file(filePath, { name: path.basename(filePath) });
        }
      });
      
      archive.finalize();
    });
    
    // Clean up individual files and batch directory
    generatedFiles.forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });
    fs.rmSync(batchDir, { recursive: true, force: true });
    
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);
    
    console.log('DC files generated successfully:', zipPath);

    // Set proper headers for ZIP file download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(zipPath)}"`);
    
    // Stream the ZIP file directly
    const fileStream = fs.createReadStream(zipPath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('DC generation error:', error);
    res.status(500).json({ success: false, error: 'DC file generation failed' });
  }
});

// File download endpoint
app.get('/api/download/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(outputDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    // Set proper headers for Excel file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ success: false, error: 'Download failed' });
  }
});

// Authentication endpoints
app.get('/auth/login', (req, res) => {
  // In production, this would redirect to SSO provider
  // For development, redirect to mock login success
  res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=mock-jwt-token`);
});

app.post('/auth/mock-login', (req, res) => {
  // Mock login for development
  const mockUser = {
    id: 'mock-user-1',
    email: 'developer@logogear.com',
    name: 'Development User',
    department: 'Engineering',
    roles: ['user', 'developer']
  };

  // In a real app, you'd set session/JWT here
  res.json({
    success: true,
    user: mockUser,
    token: 'mock-jwt-token'
  });
});

app.get('/auth/me', (req, res) => {
  // Mock current user endpoint
  // In production, this would validate JWT/session
  const mockUser = {
    id: 'mock-user-1',
    email: 'developer@logogear.com',
    name: 'Development User',
    department: 'Engineering',
    roles: ['user', 'developer']
  };

  res.json(mockUser);
});

app.post('/auth/logout', (req, res) => {
  // Mock logout endpoint
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Basic applications endpoint
app.get('/api/applications', (req, res) => {
  res.json([
    {
      id: '1',
      name: 'Sample Application',
      code: 'SAMPLE_APP',
      description: 'A sample application for testing',
      category: 'DEVELOPMENT',
      url: 'http://localhost:3002',
      isActive: true,
      environment: 'development'
    },
    {
      id: '2',
      name: 'Zoho CRM',
      code: 'ZOHO_CRM',
      description: 'Customer relationship management system',
      category: 'SALES',
      url: 'https://crm.zoho.com',
      isActive: true,
      environment: 'production'
    },
    {
      id: '3',
      name: 'Product Management',
      code: 'PIM',
      description: 'Product information management system',
      category: 'INVENTORY',
      url: 'https://pim.logogear.co.in',
      isActive: true,
      environment: 'production'
    }
  ]);
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API status: http://localhost:${PORT}/api/status`);
  console.log(`🎯 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export { app };