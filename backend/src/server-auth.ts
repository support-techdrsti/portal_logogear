import { spawn } from 'child_process';
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

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// File cleanup configuration
const RETENTION_DAYS = 7;
const CLEANUP_INTERVAL_HOURS = 24; // Run cleanup every 24 hours

// Authorized users for SSO
const AUTHORIZED_USERS = [
  'junaid@logogear.co.in',
  'javed@logogear.co.in', 
  'info@logogear.co.in',
  'support@techdrsti.com',
  'dhanraj@techdrsti.com',
  'mahadesh@techdrsti.com',
  'harshithak82@gmail.com'
];

// Admin credentials
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'l0g0gear'
};

// Temporary storage for auth states, codes, and verification codes (in production, use Redis or database)
const pendingAuthStates = new Map();
const authorizationCodes = new Map();
const verificationCodes = new Map(); // Store generated verification codes

// File cleanup functions
function cleanupOldFiles() {
  const outputDir = path.resolve(__dirname, '../../output');
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
  
  console.log(`🧹 Running cleanup for files older than ${RETENTION_DAYS} days...`);
  
  try {
    if (!fs.existsSync(outputDir)) {
      return;
    }
    
    const items = fs.readdirSync(outputDir);
    let deletedCount = 0;
    
    for (const item of items) {
      const itemPath = path.join(outputDir, item);
      
      // Skip the counter file - it's permanent
      if (item === 'ref_counter.txt') {
        continue;
      }
      
      try {
        const stats = fs.statSync(itemPath);
        
        if (stats.mtime < cutoffDate) {
          if (stats.isDirectory()) {
            fs.rmSync(itemPath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(itemPath);
          }
          deletedCount++;
          console.log(`🗑️  Deleted old file/directory: ${item}`);
        }
      } catch (error) {
        console.error(`❌ Error deleting ${item}:`, (error as Error).message);
      }
    }
    
    console.log(`✅ Cleanup completed. Deleted ${deletedCount} old items.`);
  } catch (error) {
    console.error('❌ Error during cleanup:', (error as Error).message);
  }
}

function deleteFileAfterDownload(filePath: string, delay: number = 5000) {
  // Delete file after a short delay to ensure download completed
  setTimeout(() => {
    try {
      if (fs.existsSync(filePath)) {
        // If it's a directory, delete recursively
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
          fs.rmSync(filePath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(filePath);
        }
        console.log(`🗑️  Immediate cleanup: Deleted ${path.basename(filePath)}`);
      }
    } catch (error) {
      console.error(`❌ Error in immediate cleanup for ${filePath}:`, (error as Error).message);
    }
  }, delay);
}

function logFileGeneration(userId: string, fileType: string, filename: string, success: boolean, details?: any) {
  // In a real app, this would log to database
  // For now, we'll log to console and could extend to database later
  const logEntry = {
    timestamp: new Date().toISOString(),
    userId,
    fileType,
    filename,
    success,
    details: details || {}
  };
  
  console.log('📊 File Generation Log:', JSON.stringify(logEntry));
  
  // TODO: Add database logging here when database is set up
  // await db.fileLogs.create({ data: logEntry });
}

const app = express();
const PORT = process.env.PORT || 3006;

// Start periodic cleanup
setInterval(cleanupOldFiles, CLEANUP_INTERVAL_HOURS * 60 * 60 * 1000);
// Run cleanup once on startup
setTimeout(cleanupOldFiles, 5000);

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
  origin: ['http://localhost:3001', 'http://localhost:3002', 'http://127.0.0.1:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json());

// Add request logging for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

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

// Authentication endpoints
app.get('/auth/login', (req, res) => {
  // Generate a secure state parameter for CSRF protection
  const state = require('crypto').randomBytes(32).toString('hex');
  const redirectUri = encodeURIComponent(`${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/callback`);
  
  // In production, this would redirect to actual SSO provider (Google, Azure AD, etc.)
  // For development, we'll simulate a proper OAuth flow
  const authUrl = `/auth/sso-provider?` +
    `response_type=code&` +
    `client_id=logogear-portal&` +
    `redirect_uri=${redirectUri}&` +
    `scope=openid email profile&` +
    `state=${state}`;
  
  // Store state in session for validation (in production, use proper session store)
  pendingAuthStates.set(state, { timestamp: Date.now() });
  
  console.log('🔐 Redirecting to SSO provider with state:', state);
  res.redirect(authUrl);
});

// Simulated SSO Provider (in production, this would be external)
app.get('/auth/sso-provider', (req, res) => {
  const { redirect_uri, state, client_id } = req.query;
  
  // Validate client_id
  if (client_id !== 'logogear-portal') {
    return res.status(400).json({ error: 'Invalid client_id' });
  }
  
  // In production, this would show the actual SSO provider's login page
  // For development, we'll show a secure two-step login form
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Logogear SSO - Secure Login</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 450px; margin: 50px auto; padding: 20px; background: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 8px; font-weight: bold; color: #333; }
        input { width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px; box-sizing: border-box; }
        input:focus { border-color: #1B4B5A; outline: none; }
        button { width: 100%; padding: 15px; background: #1B4B5A; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: bold; }
        button:hover { background: #2E6B7A; }
        button:disabled { background: #ccc; cursor: not-allowed; }
        .error { color: #e74c3c; margin-top: 10px; padding: 10px; background: #fdf2f2; border-radius: 4px; }
        .success { color: #27ae60; margin-top: 10px; padding: 10px; background: #f2fdf2; border-radius: 4px; }
        .info { color: #666; font-size: 14px; margin-bottom: 20px; background: #f8f9fa; padding: 15px; border-radius: 8px; }
        .step { display: none; }
        .step.active { display: block; }
        .step-indicator { display: flex; justify-content: center; margin-bottom: 30px; }
        .step-dot { width: 12px; height: 12px; border-radius: 50%; background: #ddd; margin: 0 5px; }
        .step-dot.active { background: #1B4B5A; }
        .step-dot.completed { background: #27ae60; }
        .code-display { background: #e8f4f8; padding: 15px; border-radius: 8px; margin: 10px 0; text-align: center; }
        .code-display strong { font-size: 24px; color: #1B4B5A; letter-spacing: 2px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2 style="text-align: center; color: #1B4B5A; margin-bottom: 30px;">🔐 Logogear SSO Login</h2>
        
        <!-- Step Indicator -->
        <div class="step-indicator">
          <div class="step-dot active" id="step1-dot"></div>
          <div class="step-dot" id="step2-dot"></div>
        </div>
        
        <!-- Step 1: Email Entry -->
        <div class="step active" id="step1">
          <div class="info">
            <strong>Step 1:</strong> Enter your authorized email address to receive a verification code.
          </div>
          
          <form id="emailForm" onsubmit="handleEmailSubmit(event)">
            <div class="form-group">
              <label for="email">Email Address:</label>
              <input type="email" id="email" name="email" required 
                     placeholder="your.email@logogear.co.in" />
            </div>
            
            <button type="submit" id="emailBtn">Send Verification Code</button>
            <div id="emailError" class="error" style="display: none;"></div>
            <div id="emailSuccess" class="success" style="display: none;"></div>
          </form>
        </div>
        
        <!-- Step 2: Code Verification -->
        <div class="step" id="step2">
          <div class="info">
            <strong>Step 2:</strong> Enter the 6-digit verification code sent to your email.
          </div>
          
          <div id="codeDisplay" class="code-display" style="display: none;">
            <p><strong>Development Mode:</strong> Your verification code is:</p>
            <strong id="displayedCode"></strong>
            <p style="font-size: 12px; margin-top: 10px;">In production, this would be sent to your email.</p>
          </div>
          
          <form id="codeForm" onsubmit="handleCodeSubmit(event)">
            <div class="form-group">
              <label for="verification">Verification Code:</label>
              <input type="text" id="verification" name="verification" required 
                     placeholder="Enter 6-digit code" maxlength="6" />
            </div>
            
            <button type="submit" id="codeBtn">Verify & Sign In</button>
            <div id="codeError" class="error" style="display: none;"></div>
          </form>
          
          <p style="text-align: center; margin-top: 20px;">
            <a href="#" onclick="goBackToStep1()" style="color: #1B4B5A;">← Use different email</a>
          </p>
        </div>
      </div>
      
      <script>
        let currentEmail = '';
        
        async function handleEmailSubmit(event) {
          event.preventDefault();
          
          const email = document.getElementById('email').value;
          const emailBtn = document.getElementById('emailBtn');
          const emailError = document.getElementById('emailError');
          const emailSuccess = document.getElementById('emailSuccess');
          
          // Reset messages
          emailError.style.display = 'none';
          emailSuccess.style.display = 'none';
          
          // Disable button
          emailBtn.disabled = true;
          emailBtn.textContent = 'Sending...';
          
          try {
            const response = await fetch('/auth/generate-verification', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email })
            });
            
            const result = await response.json();
            
            if (result.success) {
              currentEmail = email;
              emailSuccess.textContent = result.message;
              emailSuccess.style.display = 'block';
              
              // Show development code if available
              if (result.developmentCode) {
                document.getElementById('displayedCode').textContent = result.developmentCode;
                document.getElementById('codeDisplay').style.display = 'block';
              }
              
              // Move to step 2 after 2 seconds
              setTimeout(() => {
                document.getElementById('step1').classList.remove('active');
                document.getElementById('step2').classList.add('active');
                document.getElementById('step1-dot').classList.remove('active');
                document.getElementById('step1-dot').classList.add('completed');
                document.getElementById('step2-dot').classList.add('active');
                document.getElementById('verification').focus();
              }, 2000);
              
            } else {
              emailError.textContent = result.error || 'Failed to send verification code';
              emailError.style.display = 'block';
            }
          } catch (error) {
            emailError.textContent = 'Network error. Please try again.';
            emailError.style.display = 'block';
          } finally {
            emailBtn.disabled = false;
            emailBtn.textContent = 'Send Verification Code';
          }
        }
        
        async function handleCodeSubmit(event) {
          event.preventDefault();
          
          const verification = document.getElementById('verification').value;
          const codeBtn = document.getElementById('codeBtn');
          const codeError = document.getElementById('codeError');
          
          // Reset messages
          codeError.style.display = 'none';
          
          // Disable button
          codeBtn.disabled = true;
          codeBtn.textContent = 'Verifying...';
          
          try {
            const response = await fetch('/auth/sso-authenticate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: currentEmail,
                verification,
                state: '${state}',
                redirect_uri: '${redirect_uri}'
              })
            });
            
            const result = await response.json();
            
            if (result.success) {
              // Redirect back to application with authorization code
              window.location.href = result.redirect_url;
            } else {
              codeError.textContent = result.error || 'Authentication failed';
              codeError.style.display = 'block';
            }
          } catch (error) {
            codeError.textContent = 'Network error. Please try again.';
            codeError.style.display = 'block';
          } finally {
            codeBtn.disabled = false;
            codeBtn.textContent = 'Verify & Sign In';
          }
        }
        
        function goBackToStep1() {
          document.getElementById('step2').classList.remove('active');
          document.getElementById('step1').classList.add('active');
          document.getElementById('step2-dot').classList.remove('active');
          document.getElementById('step1-dot').classList.remove('completed');
          document.getElementById('step1-dot').classList.add('active');
          document.getElementById('email').focus();
        }
      </script>
    </body>
    </html>
  `);
});

// Generate verification code endpoint
app.post('/auth/generate-verification', (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ 
      success: false, 
      error: 'Email address is required' 
    });
  }
  
  // Validate email is in authorized list
  if (!AUTHORIZED_USERS.includes(email)) {
    return res.status(401).json({ 
      success: false, 
      error: 'Email address not authorized. Please contact administrator.' 
    });
  }
  
  // Generate 6-digit verification code
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Store verification code (expires in 5 minutes)
  verificationCodes.set(email, {
    code: verificationCode,
    timestamp: Date.now(),
    attempts: 0
  });
  
  // In production, send email here
  // await sendVerificationEmail(email, verificationCode);
  
  console.log(`📧 Generated verification code for ${email}: ${verificationCode}`);
  console.log(`🔔 In production, this would be sent via email/SMS`);
  
  // For development, we'll return the code in the response
  // In production, remove this and only send via email
  res.json({
    success: true,
    message: 'Verification code generated and sent to your email',
    // Remove this in production:
    developmentCode: verificationCode,
    expiresIn: '5 minutes'
  });
});

// SSO Authentication endpoint
app.post('/auth/sso-authenticate', (req, res) => {
  const { email, verification, state, redirect_uri } = req.body;
  
  console.log('🔍 SSO Authentication attempt:', { email, verification, state: state?.substring(0, 8) + '...', redirect_uri });
  
  // Validate state parameter (CSRF protection)
  if (!state || !pendingAuthStates.has(state)) {
    console.log('❌ Invalid or expired state:', state);
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid or expired authentication request' 
    });
  }
  
  // Check if state is not too old (5 minutes max)
  const stateData = pendingAuthStates.get(state);
  if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
    console.log('❌ State expired');
    pendingAuthStates.delete(state);
    return res.status(400).json({ 
      success: false, 
      error: 'Authentication request expired' 
    });
  }
  
  // Validate email is in authorized list
  if (!AUTHORIZED_USERS.includes(email)) {
    console.log('❌ Email not authorized:', email);
    return res.status(401).json({ 
      success: false, 
      error: 'Email address not authorized. Please contact administrator.' 
    });
  }
  
  // Validate verification code
  if (!verificationCodes.has(email)) {
    console.log('❌ No verification code found for:', email);
    console.log('📋 Available codes:', Array.from(verificationCodes.keys()));
    return res.status(401).json({ 
      success: false, 
      error: 'No verification code found. Please request a new code.' 
    });
  }
  
  const codeData = verificationCodes.get(email);
  console.log('🔍 Code data:', { code: codeData.code, attempts: codeData.attempts, age: Date.now() - codeData.timestamp });
  
  // Check if code is expired (5 minutes)
  if (Date.now() - codeData.timestamp > 5 * 60 * 1000) {
    console.log('❌ Verification code expired');
    verificationCodes.delete(email);
    return res.status(401).json({ 
      success: false, 
      error: 'Verification code expired. Please request a new code.' 
    });
  }
  
  // Check attempt limit (max 3 attempts)
  if (codeData.attempts >= 3) {
    console.log('❌ Too many attempts');
    verificationCodes.delete(email);
    return res.status(401).json({ 
      success: false, 
      error: 'Too many failed attempts. Please request a new code.' 
    });
  }
  
  // Validate the verification code
  if (verification !== codeData.code) {
    codeData.attempts++;
    verificationCodes.set(email, codeData);
    
    return res.status(401).json({ 
      success: false, 
      error: `Invalid verification code. ${3 - codeData.attempts} attempts remaining.` 
    });
  }
  
  // Code is valid - clean up
  verificationCodes.delete(email);
  
  // Generate authorization code
  const authCode = require('crypto').randomBytes(32).toString('hex');
  
  // Store authorization code with user info (expires in 10 minutes)
  authorizationCodes.set(authCode, {
    email,
    timestamp: Date.now(),
    state,
    used: false
  });
  
  // Clean up state
  pendingAuthStates.delete(state);
  
  // Redirect back to application with authorization code
  const redirectUrl = `${redirect_uri}?code=${authCode}&state=${state}`;
  
  console.log('✅ SSO authentication successful for:', email);
  console.log('🔑 Generated authorization code:', authCode.substring(0, 8) + '...');
  
  res.json({
    success: true,
    redirect_url: redirectUrl
  });
});

// OAuth callback endpoint - exchange code for token
app.post('/auth/callback', (req, res) => {
  const { code, state } = req.body;
  
  if (!code) {
    return res.status(400).json({ 
      success: false, 
      error: 'Authorization code required' 
    });
  }
  
  // Validate authorization code
  if (!authorizationCodes.has(code)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid authorization code' 
    });
  }
  
  const codeData = authorizationCodes.get(code);
  
  // Check if code is expired (10 minutes)
  if (Date.now() - codeData.timestamp > 10 * 60 * 1000) {
    authorizationCodes.delete(code);
    return res.status(400).json({ 
      success: false, 
      error: 'Authorization code expired' 
    });
  }
  
  // Check if code was already used
  if (codeData.used) {
    authorizationCodes.delete(code);
    return res.status(400).json({ 
      success: false, 
      error: 'Authorization code already used' 
    });
  }
  
  // Mark code as used
  codeData.used = true;
  
  // Create user session
  const user = {
    id: `user-${codeData.email.split('@')[0]}`,
    email: codeData.email,
    name: codeData.email.split('@')[0].charAt(0).toUpperCase() + codeData.email.split('@')[0].slice(1),
    department: codeData.email.includes('logogear.co.in') ? 'Logogear' : 'TechDrsti',
    roles: ['user'],
    authenticatedAt: new Date().toISOString(),
    authMethod: 'sso'
  };
  
  // Store user session
  currentSession = user;
  
  // Generate JWT token (in production, use proper JWT library)
  const token = require('crypto').randomBytes(32).toString('hex');
  
  // Clean up authorization code
  setTimeout(() => authorizationCodes.delete(code), 1000);
  
  console.log('🎉 OAuth flow completed successfully for:', user.email);
  
  res.json({
    success: true,
    user: user,
    token: token
  });
});

// OAuth callback endpoint - handle GET requests from redirect
app.get('/auth/callback', (req, res) => {
  const { code, state } = req.query;
  
  console.log('🔄 OAuth GET callback received:', { code: code?.toString().substring(0, 8) + '...', state: state?.toString().substring(0, 8) + '...' });
  
  if (!code) {
    return res.status(400).json({ 
      success: false, 
      error: 'Authorization code required' 
    });
  }
  
  // Validate authorization code
  if (!authorizationCodes.has(code as string)) {
    console.log('❌ Invalid authorization code');
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid authorization code' 
    });
  }
  
  const codeData = authorizationCodes.get(code as string);
  
  // Check if code is expired (10 minutes)
  if (Date.now() - codeData.timestamp > 10 * 60 * 1000) {
    console.log('❌ Authorization code expired');
    authorizationCodes.delete(code as string);
    return res.status(400).json({ 
      success: false, 
      error: 'Authorization code expired' 
    });
  }
  
  // Check if code was already used
  if (codeData.used) {
    console.log('❌ Authorization code already used');
    authorizationCodes.delete(code as string);
    return res.status(400).json({ 
      success: false, 
      error: 'Authorization code already used' 
    });
  }
  
  // Mark code as used
  codeData.used = true;
  
  // Create user session
  const user = {
    id: `user-${codeData.email.split('@')[0]}`,
    email: codeData.email,
    name: codeData.email.split('@')[0].charAt(0).toUpperCase() + codeData.email.split('@')[0].slice(1),
    department: codeData.email.includes('logogear.co.in') ? 'Logogear' : 'TechDrsti',
    roles: ['user'],
    authenticatedAt: new Date().toISOString(),
    authMethod: 'sso'
  };
  
  // Store user session
  currentSession = user;
  
  // Generate JWT token (in production, use proper JWT library)
  const token = require('crypto').randomBytes(32).toString('hex');
  
  // Clean up authorization code
  setTimeout(() => authorizationCodes.delete(code as string), 1000);
  
  console.log('🎉 OAuth GET callback completed successfully for:', user.email);
  
  // For GET requests, we need to redirect back to the frontend with the user data
  // In a real OAuth flow, this would be handled differently, but for our setup:
  const userData = encodeURIComponent(JSON.stringify({ success: true, user, token }));
  res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3001'}?auth_result=${userData}`);
});

app.post('/auth/mock-login', (req, res) => {
  // Mock login for development - check if user is authorized
  const { email, username, password } = req.body;
  
  let user = null;
  
  // Check admin credentials
  if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
    user = {
      id: 'admin-user',
      email: 'admin@logogear.co.in',
      name: 'Administrator',
      department: 'Admin',
      roles: ['admin', 'user']
    };
  }
  // Check authorized email addresses
  else if (email && AUTHORIZED_USERS.includes(email)) {
    user = {
      id: `user-${email.split('@')[0]}`,
      email: email,
      name: email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1),
      department: email.includes('logogear.co.in') ? 'Logogear' : 'TechDrsti',
      roles: ['user']
    };
  }
  
  if (user) {
    // Store user session
    currentSession = user;
    // In a real app, you'd set session/JWT here
    res.json({
      success: true,
      user: user,
      token: 'mock-jwt-token'
    });
  } else {
    res.status(401).json({
      success: false,
      error: 'Unauthorized. Please contact administrator for access.'
    });
  }
});

// Simple session storage (in production, use proper session management)
let currentSession: any = null;

app.get('/auth/me', (req, res) => {
  // Return current session user or null
  if (currentSession) {
    res.json(currentSession);
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

app.post('/auth/logout', (req, res) => {
  // Clear current session
  currentSession = null;
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Cleanup status endpoint
app.get('/api/cleanup/status', (req, res) => {
  const outputDir = path.resolve(__dirname, '../../output');
  
  try {
    if (!fs.existsSync(outputDir)) {
      return res.json({
        success: true,
        status: 'Output directory does not exist',
        totalFiles: 0,
        totalSize: 0,
        retentionDays: RETENTION_DAYS,
        cleanupInterval: `${CLEANUP_INTERVAL_HOURS} hours`
      });
    }
    
    const items = fs.readdirSync(outputDir);
    let totalFiles = 0;
    let totalSize = 0;
    let oldFiles = 0;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
    
    for (const item of items) {
      const itemPath = path.join(outputDir, item);
      
      try {
        const stats = fs.statSync(itemPath);
        totalFiles++;
        totalSize += stats.size;
        
        if (stats.mtime < cutoffDate && item !== 'ref_counter.txt') {
          oldFiles++;
        }
      } catch (error) {
        // Skip files that can't be accessed
      }
    }
    
    res.json({
      success: true,
      totalFiles,
      totalSize,
      oldFiles,
      retentionDays: RETENTION_DAYS,
      cleanupInterval: `${CLEANUP_INTERVAL_HOURS} hours`,
      nextCleanup: 'Every 24 hours',
      permanentFiles: ['ref_counter.txt']
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error checking cleanup status',
      message: (error as Error).message
    });
  }
});

// Manual cleanup trigger endpoint (for admin use)
app.post('/api/cleanup/run', (req, res) => {
  try {
    cleanupOldFiles();
    res.json({
      success: true,
      message: 'Manual cleanup triggered successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error running manual cleanup',
      message: (error as Error).message
    });
  }
});

// Test endpoint to verify API connection
app.get('/api/test', (req, res) => {
  console.log('Test endpoint called');
  res.json({ success: true, message: 'API connection working' });
});

// Basic applications endpoint
app.get('/api/applications', (req, res) => {
  console.log('Applications endpoint called');
  const applications = [
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
  ];
  
  console.log('Returning applications:', applications.length);
  res.json(applications);
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

    // Path to the DC template file
    const templatePath = path.resolve(__dirname, '../../../templates/DC-FORMAT.xlsx');
    
    if (!fs.existsSync(templatePath)) {
      console.log('DC template not found at:', templatePath);
      return createFallbackDCFile(customerData, serialNo);
    }

    // Read the template file - PRESERVE EVERYTHING, only fill customer data
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);
    
    console.log('Loaded DC template - preserving ALL formatting, logos, and structure');
    
    // Get the first worksheet
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      console.log('Could not access worksheet');
      return createFallbackDCFile(customerData, serialNo);
    }

    // Helper function to find first non-merged cell (like Python's first_free_cell)
    const firstFreeCell = (rowIdx: number, startColIdx: number) => {
      let colIdx = startColIdx;
      while (true) {
        const cell = worksheet.getCell(rowIdx, colIdx);
        // Check if cell is merged by looking at master cell
        if (!cell.isMerged || cell.master === cell) {
          return cell;
        }
        colIdx++;
      }
    };

    // Extract customer data exactly like Python code
    const fullName = customerData['Full Name'] || customerData['Customer Name'] || '';
    const street = customerData['Street Address'] || customerData['Address Line 1'] || '';
    const landmark = customerData['Landmark'] || customerData['Address Line 2'] || '';
    const city = customerData['City'] || '';
    const state = customerData['State/Province'] || customerData['State'] || '';
    const pincode = customerData['Postal Code'] || customerData['Pincode'] || '';
    const country = customerData['Country'] || 'India';
    const mobile = customerData['Mobile Number'] || customerData['Phone'] || '';
    const email = customerData['Email'] || '';

    // Get current date
    const today = moment().format('DD/MM/YYYY');

    // ===== 1) TO SECTION IN COLUMN C ===== (Exactly like Python code)
    // Start from column 3 (C), skip merged cells automatically
    const nameCell = firstFreeCell(3, 3);      // row 3, col >= C
    const addr1Cell = firstFreeCell(4, 3);     // row 4, col >= C  
    const landmarkCell = firstFreeCell(5, 3);  // row 5, col >= C
    const citypinCell = firstFreeCell(6, 3);   // row 6, col >= C
    const statectyCell = firstFreeCell(7, 3);  // row 7, col >= C
    const mobileCell = firstFreeCell(8, 3);    // row 8, col >= C
    const emailCell = firstFreeCell(9, 3);     // row 9, col >= C

    // Fill the data exactly like Python
    nameCell.value = fullName;
    addr1Cell.value = street;
    landmarkCell.value = landmark || '';
    citypinCell.value = `${city} - ${pincode}`;
    statectyCell.value = `${state}, ${country}`;
    mobileCell.value = `Mob: ${mobile}`;
    emailCell.value = `Email: ${email}`;

    // ===== 2) DC NO & DATE ===== (Like Python code)
    // Fill date in B12 (cell next to "DC No" or "Date")
    worksheet.getCell('B12').value = today;

    // ===== 3) ITEM TABLE ===== 
    // Add merchandise item in the first available row
    let itemRowFound = false;
    for (let row = 15; row <= 25; row++) {
      const slNoCell = worksheet.getCell(`A${row}`);
      const descCell = worksheet.getCell(`B${row}`);
      
      // If we find an empty SL No cell, this is where we add the item
      if ((!slNoCell.value || slNoCell.value.toString().trim() === '') && 
          (!descCell.value || descCell.value.toString().trim() === '')) {
        
        worksheet.getCell(`A${row}`).value = 1; // SL No
        worksheet.getCell(`B${row}`).value = 'Merchandise'; // Description
        worksheet.getCell(`D${row}`).value = 1; // Quantity
        worksheet.getCell(`E${row}`).value = '₹0.00'; // Unit Price
        worksheet.getCell(`F${row}`).value = '₹0.00'; // Total
        
        itemRowFound = true;
        break;
      }
    }

    if (!itemRowFound) {
      console.log('Could not find item table, using fallback row 16');
      worksheet.getCell('A16').value = 1;
      worksheet.getCell('B16').value = 'Merchandise';
      worksheet.getCell('D16').value = 1;
      worksheet.getCell('E16').value = '₹0.00';
      worksheet.getCell('F16').value = '₹0.00';
    }

    console.log('DC file created using EXACT Python logic with template preservation');

    // Generate buffer - this preserves ALL template content:
    // - Header "Delivery Challan" title
    // - Logogear logo (blue background with white text)
    // - Complete "LOGO GEAR SOLUTION LLP" company details
    // - All table formatting and borders
    // - Circular signature stamp at bottom
    // - All styling and layout
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);

  } catch (error) {
    console.error('Error creating DC file with template:', error);
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

// Shipping tools endpoints
app.post('/api/shipping-tools/bluedart', upload.single('dataFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    console.log('Generating BlueDart file using Python script from:', req.file.filename);
    
    // Convert Excel to CSV for Python script
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Create temporary CSV file
    const batchId = moment().format('YYYYMMDD_HHmmss');
    const tempCsvPath = path.join(uploadsDir, `temp_bluedart_${batchId}.csv`);
    const csvData = XLSX.utils.sheet_to_csv(worksheet);
    fs.writeFileSync(tempCsvPath, csvData);
    
    // Paths for Python script
    const pythonScript = path.resolve(__dirname, '../scripts/generate_bluedart.py');
    const outputDir = path.resolve(__dirname, '../../output');
    const batchOutputDir = path.join(outputDir, `BlueDart_${batchId}`);
    
    // Ensure output directory exists
    fs.mkdirSync(batchOutputDir, { recursive: true });
    
    // Use main output directory for counter persistence (not batch-specific)
    const counterDir = outputDir;
    
    console.log('Executing BlueDart Python script with:');
    console.log('- CSV file:', tempCsvPath);
    console.log('- Output dir:', batchOutputDir);
    console.log('- Counter dir:', counterDir);
    
    // Execute Python script with both output dir and counter dir
    const pythonProcess = spawn('python', [pythonScript, tempCsvPath, batchOutputDir, counterDir], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log('Python stdout:', data.toString());
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error('Python stderr:', data.toString());
    });
    
    pythonProcess.on('close', async (code) => {
      try {
        // Clean up temporary CSV file
        if (fs.existsSync(tempCsvPath)) {
          fs.unlinkSync(tempCsvPath);
        }
        
        // Clean up uploaded file
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        
        if (code === 0) {
          // Parse result from Python script output
          let result = { success: true, file: null, filename: null };
          const resultMatch = stdout.match(/RESULT_JSON: (.+)/);
          if (resultMatch) {
            try {
              result = JSON.parse(resultMatch[1]);
            } catch (e) {
              console.error('Error parsing Python result:', e);
            }
          }
          
          console.log('BlueDart Python script completed successfully:', result);
          
          if (result.success && result.file && fs.existsSync(result.file)) {
            // Send file using Express sendFile for proper handling
            try {
              const absolutePath = path.resolve(result.file);
              
              console.log(`Sending BlueDart file: ${absolutePath}`);
              console.log(`File exists: ${fs.existsSync(absolutePath)}`);
              
              // Set proper headers for CSV download
              res.setHeader('Content-Type', 'text/csv; charset=utf-8');
              res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
              res.setHeader('Cache-Control', 'no-cache');
              
              // Use sendFile for proper file serving
              res.sendFile(absolutePath, (err) => {
                if (err) {
                  console.error('Error sending BlueDart file:', err);
                  if (!res.headersSent) {
                    res.status(500).json({ 
                      success: false, 
                      error: 'Error sending BlueDart file' 
                    });
                  }
                  // Log failed generation
                  logFileGeneration('anonymous', 'BLUEDART', result.filename || 'unknown', false, { error: (err as Error).message });
                } else {
                  console.log(`BlueDart file sent successfully: ${result.filename}`);
                  
                  // Log successful generation
                  logFileGeneration('anonymous', 'BLUEDART', result.filename || '', true, { 
                    recordCount: (result as any).count || 0,
                    fileSize: fs.statSync(absolutePath).size 
                  });
                  
                  // Schedule immediate cleanup of the batch directory
                  const batchDir = path.dirname(absolutePath);
                  deleteFileAfterDownload(batchDir, 3000); // Delete after 3 seconds
                }
              });
              
            } catch (fileError) {
              console.error('Error preparing BlueDart file:', fileError);
              res.status(500).json({ 
                success: false, 
                error: 'Error preparing BlueDart file for download' 
              });
            }
            
          } else {
            res.status(500).json({ 
              success: false, 
              error: 'No BlueDart file was generated. Please check your data format.' 
            });
          }
          
        } else {
          console.error('BlueDart Python script failed with code:', code);
          console.error('Python stderr:', stderr);
          res.status(500).json({ 
            success: false, 
            error: `BlueDart generation failed: ${stderr || 'Python script error'}` 
          });
        }
        
      } catch (error) {
        console.error('Error in BlueDart Python script completion handler:', error);
        res.status(500).json({ success: false, error: 'BlueDart file generation failed' });
      }
    });
    
    pythonProcess.on('error', (error) => {
      console.error('Error spawning BlueDart Python process:', error);
      
      // Clean up files
      if (fs.existsSync(tempCsvPath)) {
        fs.unlinkSync(tempCsvPath);
      }
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({ 
        success: false, 
        error: 'Failed to execute Python script. Please ensure Python is installed.' 
      });
    });
    
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

    console.log('Generating DC files using Python script from:', req.file.filename);
    
    // Convert Excel to CSV for Python script
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Create temporary CSV file
    const batchId = moment().format('YYYYMMDD_HHmmss');
    const tempCsvPath = path.join(uploadsDir, `temp_data_${batchId}.csv`);
    const csvData = XLSX.utils.sheet_to_csv(worksheet);
    fs.writeFileSync(tempCsvPath, csvData);
    
    // Paths for Python script
    const pythonScript = path.resolve(__dirname, '../scripts/generate_dc.py');
    const templatePath = path.resolve(__dirname, '../../templates/DC-FORMAT.xlsx');
    const outputDir = path.resolve(__dirname, '../../output');
    const batchOutputDir = path.join(outputDir, `DC_Files_${batchId}`);
    
    // Ensure output directory exists
    fs.mkdirSync(batchOutputDir, { recursive: true });
    
    console.log('Executing Python script with:');
    console.log('- CSV file:', tempCsvPath);
    console.log('- Template:', templatePath);
    console.log('- Output dir:', batchOutputDir);
    
    // Execute Python script
    const pythonProcess = spawn('python', [pythonScript, tempCsvPath, templatePath, batchOutputDir], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log('Python stdout:', data.toString());
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error('Python stderr:', data.toString());
    });
    
    pythonProcess.on('close', async (code) => {
      try {
        // Clean up temporary CSV file
        if (fs.existsSync(tempCsvPath)) {
          fs.unlinkSync(tempCsvPath);
        }
        
        // Clean up uploaded file
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        
        if (code === 0) {
          // Parse result from Python script output
          let result = { success: true, files: [], count: 0 };
          const resultMatch = stdout.match(/RESULT_JSON: (.+)/);
          if (resultMatch) {
            try {
              result = JSON.parse(resultMatch[1]);
            } catch (e) {
              console.error('Error parsing Python result:', e);
            }
          }
          
          console.log('Python script completed successfully:', result);
          
          // Create ZIP file from generated DC files
          const zipPath = path.join(outputDir, `DC_Files_${batchId}.zip`);
          
          if (result.files && result.files.length > 0) {
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
              
              // Add all generated files to ZIP
              result.files.forEach((filePath: string) => {
                if (fs.existsSync(filePath)) {
                  archive.file(filePath, { name: path.basename(filePath) });
                }
              });
              
              archive.finalize();
            });
            
            // Clean up individual DC files
            result.files.forEach((filePath: string) => {
              if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
              }
            });
            
            // Remove batch directory
            if (fs.existsSync(batchOutputDir)) {
              fs.rmSync(batchOutputDir, { recursive: true, force: true });
            }
            
            // Send ZIP file to client
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', `attachment; filename="${path.basename(zipPath)}"`);
            
            const fileStream = fs.createReadStream(zipPath);
            fileStream.pipe(res);
            
            // Log successful generation
            logFileGeneration('anonymous', 'DC', path.basename(zipPath), true, { 
              recordCount: (result as any).count || 0,
              fileCount: (result as any).files?.length || 0,
              fileSize: fs.statSync(zipPath).size 
            });
            
            // Schedule immediate cleanup of the ZIP file
            deleteFileAfterDownload(zipPath, 3000); // Delete after 3 seconds
            
          } else {
            // Log failed generation
            logFileGeneration('anonymous', 'DC', `DC_Files_${batchId}.zip`, false, { 
              error: 'No DC files generated',
              inputFile: req.file?.originalname || 'unknown'
            });
            
            res.status(500).json({ 
              success: false, 
              error: 'No DC files were generated. Please check your data format.' 
            });
          }
          
        } else {
          console.error('Python script failed with code:', code);
          console.error('Python stderr:', stderr);
          res.status(500).json({ 
            success: false, 
            error: `DC generation failed: ${stderr || 'Python script error'}` 
          });
        }
        
      } catch (error) {
        console.error('Error in Python script completion handler:', error);
        res.status(500).json({ success: false, error: 'DC file generation failed' });
      }
    });
    
    pythonProcess.on('error', (error) => {
      console.error('Error spawning Python process:', error);
      
      // Clean up files
      if (fs.existsSync(tempCsvPath)) {
        fs.unlinkSync(tempCsvPath);
      }
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({ 
        success: false, 
        error: 'Failed to execute Python script. Please ensure Python is installed.' 
      });
    });
    
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