const express = require('express');
const fs = require('fs');
const crypto = require('crypto');
const cors = require('cors');

const app = express();

// =============================================
// 🚀 BASIC SECURITY CONFIGURATION
// =============================================

// 🔐 SECRET KEY UNTUK ENCRYPTION (SAMA DENGAN DI CLIENT)
const VALIDATION_SECRET = process.env.VALIDATION_SECRET || 'zalyst-secure-validation-2024-secret-key-advanced-protection-system';

// 🛡️ Basic Security Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// =============================================
// 📁 FILE MANAGEMENT SYSTEM
// =============================================

// 🔐 FILE UNTUK MENYIMPAN TOKEN (gunakan path Railway)
const TOKENS_FILE = process.env.TOKENS_FILE || '/tmp/api-tokens.json';

// 🔑 LOAD TOKENS DARI FILE
function loadTokens() {
  try {
    if (!fs.existsSync(TOKENS_FILE)) {
      const defaultTokens = { tokens: [], createdAt: new Date().toISOString() };
      fs.writeFileSync(TOKENS_FILE, JSON.stringify(defaultTokens, null, 2));
      return [];
    }
    const data = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));
    return data.tokens || [];
  } catch (error) {
    console.error('❌ Error loading tokens:', error);
    return [];
  }
}

// 💾 SIMPAN TOKENS KE FILE
function saveTokens(tokens) {
  try {
    const data = { 
      tokens, 
      updatedAt: new Date().toISOString(),
      totalTokens: tokens.length
    };
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Error saving tokens:', error);
    return false;
  }
}

// =============================================
// 🔐 ENCRYPTED RESPONSE SYSTEM
// =============================================

class EncryptedResponseSystem {
  constructor(secretKey) {
    this.secretKey = crypto.createHash('sha512').update(secretKey).digest();
  }

  // 🔒 GENERATE ENCRYPTED RESPONSE
  generateEncryptedResponse(data) {
    try {
      const timestamp = Date.now();
      const payload = {
        data: data,
        timestamp: timestamp,
        version: '2.0.2'
      };

      // Generate signature
      const signature = crypto
        .createHmac('sha512', this.secretKey)
        .update(timestamp + JSON.stringify(data))
        .digest('hex');

      return {
        signature: signature,
        timestamp: timestamp,
        data: payload,
        encrypted: true
      };

    } catch (error) {
      console.error('❌ Encryption error:', error);
      return this.generateErrorResponse('ENCRYPTION_FAILED');
    }
  }

  // 🔓 VALIDATE ENCRYPTED REQUEST
  validateEncryptedRequest(request) {
    try {
      if (!request || typeof request !== 'object') {
        return { valid: false, error: 'INVALID_REQUEST_FORMAT' };
      }

      // Check required fields
      if (!request.signature || !request.timestamp || !request.data) {
        return { valid: false, error: 'MISSING_REQUIRED_FIELDS' };
      }

      // Validate timestamp (max 30 seconds difference)
      const now = Date.now();
      if (Math.abs(now - request.timestamp) > 30000) {
        return { valid: false, error: 'TIMESTAMP_EXPIRED' };
      }

      // Validate signature
      const expectedSignature = crypto
        .createHmac('sha512', this.secretKey)
        .update(request.timestamp + JSON.stringify(request.data))
        .digest('hex');

      // Use timingSafeEqual to prevent timing attacks
      const requestSigBuffer = Buffer.from(request.signature, 'hex');
      const expectedSigBuffer = Buffer.from(expectedSignature, 'hex');
      
      if (requestSigBuffer.length !== expectedSigBuffer.length) {
        return { valid: false, error: 'SIGNATURE_LENGTH_MISMATCH' };
      }

      if (!crypto.timingSafeEqual(requestSigBuffer, expectedSigBuffer)) {
        return { valid: false, error: 'INVALID_SIGNATURE' };
      }

      return { valid: true, data: request.data };

    } catch (error) {
      console.error('❌ Validation error:', error);
      return { valid: false, error: 'VALIDATION_FAILED' };
    }
  }

  // 🚨 GENERATE ERROR RESPONSE
  generateErrorResponse(errorCode) {
    return this.generateEncryptedResponse({
      valid: false,
      error: errorCode,
      message: this.getErrorMessage(errorCode)
    });
  }

  // 📝 ERROR MESSAGES
  getErrorMessage(errorCode) {
    const messages = {
      'ENCRYPTION_FAILED': 'Failed to encrypt response',
      'INVALID_REQUEST_FORMAT': 'Invalid request format',
      'MISSING_REQUIRED_FIELDS': 'Missing required fields in request',
      'TIMESTAMP_EXPIRED': 'Request timestamp expired',
      'SIGNATURE_LENGTH_MISMATCH': 'Signature length mismatch',
      'INVALID_SIGNATURE': 'Invalid signature',
      'VALIDATION_FAILED': 'Request validation failed',
      'TOKEN_NOT_FOUND': 'Token not found in database',
      'SERVER_ERROR': 'Internal server error'
    };
    return messages[errorCode] || 'Unknown error';
  }
}

// Initialize encrypted response system
const encryptionSystem = new EncryptedResponseSystem(VALIDATION_SECRET);

// =============================================
// 🌐 ENHANCED API ENDPOINTS
// =============================================

// 🏠 HOME PAGE - Enhanced with security info
app.get('/', (req, res) => {
  const tokens = loadTokens();
  res.json({ 
    status: 'Active',
    message: '🚀 Zalyst Enhanced Token Validator Server',
    version: '2.0.2',
    security: 'Encrypted Response System Active',
    total_tokens: tokens.length,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    endpoints: {
      validate: 'POST /validate-token (Encrypted)',
      add_token: 'POST /add-token',
      delete_token: 'DELETE /delete-token',
      list_tokens: 'GET /list-tokens',
      health: 'GET /health'
    }
  });
});

// ❤️ HEALTH CHECK ENDPOINT
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ✅ ENHANCED VALIDATION ENDPOINT - SUPPORT BOTH FORMATS
app.post('/validate-token', (req, res) => {
  try {
    console.log('📥 Received validation request');
    
    // Check if request is encrypted
    if (req.body.signature && req.body.timestamp && req.body.data) {
      console.log('🔐 Processing encrypted validation request');
      return handleEncryptedValidation(req, res);
    } else {
      console.log('📨 Processing plain validation request');
      return handlePlainValidation(req, res);
    }
    
  } catch (error) {
    console.error('❌ Server error:', error);
    const errorResponse = encryptionSystem.generateErrorResponse('SERVER_ERROR');
    res.status(500).json(errorResponse);
  }
});

// 🔐 HANDLE ENCRYPTED VALIDATION REQUEST
function handleEncryptedValidation(req, res) {
  const validationResult = encryptionSystem.validateEncryptedRequest(req.body);
  
  if (!validationResult.valid) {
    console.log(`❌ Encrypted validation failed: ${validationResult.error}`);
    const errorResponse = encryptionSystem.generateErrorResponse(validationResult.error);
    return res.status(400).json(errorResponse);
  }

  const { token } = validationResult.data;
  
  if (!token) {
    console.log('❌ No token provided in encrypted request');
    const errorResponse = encryptionSystem.generateErrorResponse('MISSING_REQUIRED_FIELDS');
    return res.status(400).json(errorResponse);
  }

  // Validate token from database
  const tokens = loadTokens();
  const isValid = tokens.includes(token);
  
  console.log(`🔐 Encrypted token validation: ${isValid ? 'VALID' : 'INVALID'}`);
  
  // Send encrypted response
  const responseData = {
    valid: isValid,
    checkedAt: new Date().toISOString(),
    tokenPreview: `${token.substring(0, 10)}...${token.substring(token.length - 5)}`
  };
  
  const encryptedResponse = encryptionSystem.generateEncryptedResponse(responseData);
  res.json(encryptedResponse);
}

// 📨 HANDLE PLAIN VALIDATION REQUEST (Backward Compatibility)
function handlePlainValidation(req, res) {
  const { token } = req.body;
  
  if (!token) {
    console.log('❌ No token provided in plain request');
    return res.json(false);
  }
  
  // Validate token from database
  const tokens = loadTokens();
  const isValid = tokens.includes(token);
  
  console.log(`📨 Plain token validation: ${isValid ? 'VALID' : 'INVALID'}`);
  res.json(isValid);
}

// ➕ ENHANCED ADD TOKEN ENDPOINT
app.post('/add-token', (req, res) => {
  try {
    console.log('📥 Received add token request');
    
    const { token } = req.body;
    
    if (!token) {
      console.log('❌ No token provided');
      return res.status(400).json({ 
        success: false, 
        message: 'Token is required' 
      });
    }
    
    // Enhanced token format validation
    const tokenRegex = /^\d{10}:[A-Za-z0-9_-]{35}$/;
    if (!tokenRegex.test(token)) {
      console.log('❌ Invalid token format');
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid token format. Expected format: 1234567890:ABCdefGHIjklMNOpqrSTUvwxYZabc123456' 
      });
    }
    
    const tokens = loadTokens();
    
    // Check if token already exists
    if (tokens.includes(token)) {
      console.log('⚠️ Token already exists');
      return res.status(400).json({ 
        success: false, 
        message: 'Token already exists in database' 
      });
    }
    
    // Add new token
    tokens.push(token);
    const saveResult = saveTokens(tokens);
    
    if (saveResult) {
      console.log(`✅ Token added successfully: ${token.substring(0, 10)}...`);
      res.json({ 
        success: true, 
        message: 'Token added successfully',
        token_preview: `${token.substring(0, 10)}...${token.substring(token.length - 5)}`,
        total_tokens: tokens.length,
        added_at: new Date().toISOString()
      });
    } else {
      throw new Error('Failed to save tokens to database');
    }
    
  } catch (error) {
    console.error('❌ Add token error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to add token: ' + error.message 
    });
  }
});

// 🗑️ ENHANCED DELETE TOKEN ENDPOINT
app.delete('/delete-token', (req, res) => {
  try {
    console.log('📥 Received delete token request');
    
    const { token } = req.body;
    
    if (!token) {
      console.log('❌ No token provided');
      return res.status(400).json({ 
        success: false, 
        message: 'Token is required' 
      });
    }
    
    const tokens = loadTokens();
    
    // Check if token exists
    if (!tokens.includes(token)) {
      console.log('❌ Token not found in database');
      return res.status(404).json({ 
        success: false, 
        message: 'Token not found in database' 
      });
    }
    
    // Delete token
    const updatedTokens = tokens.filter(t => t !== token);
    const saveResult = saveTokens(updatedTokens);
    
    if (saveResult) {
      console.log(`✅ Token deleted successfully: ${token.substring(0, 10)}...`);
      res.json({ 
        success: true, 
        message: 'Token deleted successfully',
        token_preview: `${token.substring(0, 10)}...${token.substring(token.length - 5)}`,
        total_tokens: updatedTokens.length,
        deleted_at: new Date().toISOString()
      });
    } else {
      throw new Error('Failed to update tokens database');
    }
    
  } catch (error) {
    console.error('❌ Delete token error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete token: ' + error.message 
    });
  }
});

// 📋 ENHANCED LIST TOKENS ENDPOINT
app.get('/list-tokens', (req, res) => {
  try {
    console.log('📥 Received list tokens request');
    
    const tokens = loadTokens();
    
    console.log(`📋 Returning ${tokens.length} tokens`);
    
    // Mask tokens for security
    const maskedTokens = tokens.map(token => {
      return {
        masked: `${token.substring(0, 10)}...${token.substring(token.length - 5)}`,
        length: token.length,
        added: 'N/A'
      };
    });
    
    res.json({ 
      success: true, 
      tokens: maskedTokens,
      total_tokens: tokens.length,
      server_time: new Date().toISOString(),
      security_level: 'ENCRYPTED_RESPONSE_ACTIVE'
    });
    
  } catch (error) {
    console.error('❌ List tokens error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to list tokens: ' + error.message 
    });
  }
});

// 🚨 ENHANCED 404 HANDLER
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    available_endpoints: [
      'GET /', 
      'GET /health',
      'POST /validate-token (Encrypted Support)', 
      'POST /add-token', 
      'DELETE /delete-token',
      'GET /list-tokens'
    ],
    security_notice: 'Validation endpoint now supports encrypted requests for enhanced security'
  });
});

// =============================================
// 🚀 SERVER STARTUP
// =============================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(60));
  console.log('🚀 ZALYST ENHANCED TOKEN SERVER v2.0.2');
  console.log('='.repeat(60));
  console.log(`✅ Server running on port: ${PORT}`);
  console.log(`📁 Token database: ${TOKENS_FILE}`);
  console.log(`🔐 Total tokens loaded: ${loadTokens().length}`);
  console.log(`🛡️ Security Level: ENCRYPTED RESPONSE ACTIVE`);
  console.log(`🔑 Validation Secret: ${VALIDATION_SECRET ? 'SET' : 'USING DEFAULT'}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('='.repeat(60));
  
  // Security warning for default secret
  if (!process.env.VALIDATION_SECRET) {
    console.log('⚠️  WARNING: Using default validation secret');
    console.log('⚠️  Set VALIDATION_SECRET environment variable for production');
  }
});
