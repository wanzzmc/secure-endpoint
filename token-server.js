// token-server.js (Railway)
const express = require('express');
const fs = require('fs');
const app = express();

// MIDDLEWARE
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔐 FILE UNTUK MENYIMPAN TOKEN (gunakan path Railway)
const TOKENS_FILE = '/tmp/api-tokens.json';

// 🔑 LOAD TOKENS DARI FILE
function loadTokens() {
  try {
    if (!fs.existsSync(TOKENS_FILE)) {
      const defaultTokens = { tokens: [] };
      fs.writeFileSync(TOKENS_FILE, JSON.stringify(defaultTokens, null, 2));
      return [];
    }
    const data = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));
    return data.tokens || [];
  } catch (error) {
    console.error('Error loading tokens:', error);
    return [];
  }
}

// 💾 SIMPAN TOKENS KE FILE
function saveTokens(tokens) {
  try {
    const data = { tokens };
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving tokens:', error);
    return false;
  }
}

// 🏠 HOME PAGE
app.get('/', (req, res) => {
  const tokens = loadTokens();
  res.json({ 
    status: 'Active',
    message: 'Zalyst Token Validator Server is Running on Railway!',
    total_tokens: tokens.length,
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      validate: 'POST /validate-token',
      add_token: 'POST /add-token',
      delete_token: 'DELETE /delete-token',
      list_tokens: 'GET /list-tokens'
    }
  });
});

// ✅ ENDPOINT VALIDASI TOKEN
app.post('/validate-token', (req, res) => {
  try {
    console.log('📥 Received validation request');
    
    const { token } = req.body;
    
    if (!token) {
      console.log('❌ No token provided');
      return res.json(false);
    }
    
    // Validasi token dari file
    const tokens = loadTokens();
    const isValid = tokens.includes(token);
    
    console.log(`🔐 Token validation result: ${isValid ? 'VALID' : 'INVALID'}`);
    
    res.json(isValid);
    
  } catch (error) {
    console.error('❌ Server error:', error);
    res.json(false);
  }
});

// ➕ ENDPOINT TAMBAH TOKEN BARU
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
    
    // Validasi format token Telegram
    const tokenRegex = /^\d{10}:[A-Za-z0-9_-]{35}$/;
    if (!tokenRegex.test(token)) {
      console.log('❌ Invalid token format');
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid token format. Token should be in format: 1234567890:ABCdefGHIjklMNOpqrSTUvwxYZabc123456' 
      });
    }
    
    const tokens = loadTokens();
    
    // Cek jika token sudah ada
    if (tokens.includes(token)) {
      console.log('⚠️ Token already exists');
      return res.status(400).json({ 
        success: false, 
        message: 'Token already exists' 
      });
    }
    
    // Tambah token baru
    tokens.push(token);
    const saveResult = saveTokens(tokens);
    
    if (saveResult) {
      console.log(`✅ Token added successfully: ${token.substring(0, 10)}...`);
      res.json({ 
        success: true, 
        message: 'Token added successfully',
        total_tokens: tokens.length
      });
    } else {
      throw new Error('Failed to save tokens');
    }
    
  } catch (error) {
    console.error('❌ Add token error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to add token: ' + error.message 
    });
  }
});

// 🗑️ ENDPOINT HAPUS TOKEN
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
    
    // Cek jika token ada
    if (!tokens.includes(token)) {
      console.log('❌ Token not found');
      return res.status(404).json({ 
        success: false, 
        message: 'Token not found' 
      });
    }
    
    // Hapus token
    const updatedTokens = tokens.filter(t => t !== token);
    const saveResult = saveTokens(updatedTokens);
    
    if (saveResult) {
      console.log(`✅ Token deleted successfully: ${token.substring(0, 10)}...`);
      res.json({ 
        success: true, 
        message: 'Token deleted successfully',
        total_tokens: updatedTokens.length
      });
    } else {
      throw new Error('Failed to save tokens');
    }
    
  } catch (error) {
    console.error('❌ Delete token error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete token: ' + error.message 
    });
  }
});

// 📋 ENDPOINT LIST TOKENS
app.get('/list-tokens', (req, res) => {
  try {
    console.log('📥 Received list tokens request');
    
    const tokens = loadTokens();
    
    console.log(`📋 Returning ${tokens.length} tokens`);
    
    // Mask tokens untuk security
    const maskedTokens = tokens.map(token => {
      return `${token.substring(0, 10)}...${token.substring(token.length - 5)}`;
    });
    
    res.json({ 
      success: true, 
      tokens: maskedTokens,
      total_tokens: tokens.length
    });
    
  } catch (error) {
    console.error('❌ List tokens error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to list tokens: ' + error.message 
    });
  }
});

// Handle 404
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    available_endpoints: [
      'GET /', 
      'POST /validate-token', 
      'POST /add-token', 
      'DELETE /delete-token',
      'GET /list-tokens'
    ]
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Zalyst Token Server running on port ${PORT}`);
  console.log(`📁 Token file: ${TOKENS_FILE}`);
  console.log(`🔐 Total tokens loaded: ${loadTokens().length}`);
});
