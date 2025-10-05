// token-bot-manager.js (DEBUG VERSION)
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// Konfigurasi - GANTI DENGAN TOKEN BOT MANAGER ANDA
const BOT_TOKEN = "8104521474:AAGmKMPG0OwN5w3iKWVyNTqyNbXUbm-dI9w"; // Token bot manager Anda
const VALIDATOR_API_URL = "https://token.zeyansmp.xyz"; // Ganti dengan URL Railway Anda

console.log("🚀 Starting Token Manager Bot...");
console.log(`🔗 Validator URL: ${VALIDATOR_API_URL}`);
console.log(`🤖 Bot Token: ${BOT_TOKEN.substring(0, 10)}...`);

const bot = new TelegramBot(BOT_TOKEN, { 
  polling: {
    interval: 300,
    autoStart: true,
    params: {
      timeout: 10
    }
  }
});

// Debug events
bot.on('polling_error', (error) => {
  console.error('❌ Polling Error:', error.message);
});

bot.on('webhook_error', (error) => {
  console.error('❌ Webhook Error:', error);
});

bot.on('error', (error) => {
  console.error('❌ Bot Error:', error);
});

// Test bot connection
bot.getMe().then((me) => {
  console.log(`✅ Bot Manager Ready: @${me.username} (${me.first_name})`);
  console.log(`📱 Bot ID: ${me.id}`);
}).catch((error) => {
  console.error('❌ Bot Connection Failed:', error.message);
});

// Fungsi untuk validasi token via API
async function validateTokenViaAPI(token) {
  try {
    console.log(`🔐 Validating token: ${token.substring(0, 10)}...`);
    
    const response = await axios.post(`${VALIDATOR_API_URL}/validate-token`, { 
      token: token 
    }, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ZalystBot/1.0'
      }
    });
    
    console.log(`✅ Validation response:`, response.data);
    return response.data;
    
  } catch (error) {
    console.error('❌ Validation API Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    return false;
  }
}

// Fungsi untuk menambah token ke API
async function addTokenToAPI(token) {
  try {
    console.log(`➕ Adding token: ${token.substring(0, 10)}...`);
    
    const response = await axios.post(`${VALIDATOR_API_URL}/add-token`, { 
      token: token 
    }, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`✅ Add token response:`, response.data);
    return response.data;
    
  } catch (error) {
    console.error('❌ Add Token API Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    return { success: false, message: error.message };
  }
}

// Command handlers dengan logging
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.username || msg.from.first_name;
  
  console.log(`📥 /start from ${username} (${userId}) in chat ${chatId}`);
  
  const menuText = `
🤖 *Zalyst Token Manager Bot*

*Available Commands:*
/addtoken <token> - Tambah token baru ke API
/checktoken <token> - Cek validitas token via API
/listtokens - Lihat daftar token dari API
/deletetoken <token> - Hapus token dari API

*Validator API:* ${VALIDATOR_API_URL}

*Debug Info:*
- Chat ID: ${chatId}
- User ID: ${userId}
- Username: @${username || 'N/A'}
  `;
  
  bot.sendMessage(chatId, menuText, { parse_mode: "Markdown" })
    .then(() => console.log(`✅ Start message sent to ${username}`))
    .catch(error => console.error('❌ Failed to send start message:', error));
});

// Command untuk menambah token
bot.onText(/\/addtoken (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const token = match[1].trim();
  
  console.log(`📥 /addtoken from ${userId} with token: ${token.substring(0, 10)}...`);

  try {
    // Validasi format token Telegram
    const tokenRegex = /^\d{10}:[A-Za-z0-9_-]{35}$/;
    if (!tokenRegex.test(token)) {
      console.log('❌ Invalid token format');
      return bot.sendMessage(chatId, 
        "❌ Format token tidak valid!\n\n" +
        "Format yang benar: `1234567890:ABCdefGHIjklMNOpqrSTUvwxYZabc123456`\n" +
        "Pastikan token memiliki:\n" +
        "- 10 digit angka di awal\n" + 
        "- Tanda :\n" +
        "- 35 karakter alfanumerik",
        { parse_mode: "Markdown" }
      );
    }

    const processingMsg = await bot.sendMessage(chatId, "🔍 Memvalidasi dan menambahkan token...");
    
    // Tambah token langsung ke API
    const result = await addTokenToAPI(token);
    
    if (result.success) {
      await bot.editMessageText(
        `✅ *Token berhasil ditambahkan!*\n\n` +
        `Token: \`${token}\`\n` +
        `Total tokens: ${result.total_tokens}\n` +
        `Status: ✅ TERDAFTAR`,
        {
          chat_id: chatId,
          message_id: processingMsg.message_id,
          parse_mode: "Markdown"
        }
      );
      console.log(`✅ Token added successfully by ${userId}`);
    } else {
      await bot.editMessageText(
        `❌ *Gagal menambahkan token!*\n\n` +
        `Error: ${result.message}\n` +
        `Token: \`${token.substring(0, 10)}...\``,
        {
          chat_id: chatId,
          message_id: processingMsg.message_id,
          parse_mode: "Markdown"
        }
      );
      console.log(`❌ Failed to add token: ${result.message}`);
    }

  } catch (error) {
    console.error('❌ Add token command error:', error);
    bot.sendMessage(chatId, `❌ Error: ${error.message}`);
  }
});

// Command untuk cek token
bot.onText(/\/checktoken (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const token = match[1].trim();
  
  console.log(`📥 /checktoken for: ${token.substring(0, 10)}...`);

  try {
    const processingMsg = await bot.sendMessage(chatId, "🔍 Memeriksa token...");
    
    const isValid = await validateTokenViaAPI(token);
    
    if (isValid) {
      await bot.editMessageText(
        `✅ *Token VALID*\n\n` +
        `Token: \`${token}\`\n` +
        `Status: ✅ TERDAFTAR & AKTIF`,
        {
          chat_id: chatId,
          message_id: processingMsg.message_id,
          parse_mode: "Markdown"
        }
      );
    } else {
      await bot.editMessageText(
        `❌ *Token TIDAK VALID*\n\n` +
        `Token: \`${token}\`\n` +
        `Status: ❌ TIDAK TERDAFTAR\n\n` +
        `Gunakan /addtoken untuk mendaftarkan token.`,
        {
          chat_id: chatId,
          message_id: processingMsg.message_id,
          parse_mode: "Markdown"
        }
      );
    }
  } catch (error) {
    console.error('❌ Check token error:', error);
    bot.sendMessage(chatId, `❌ Error: ${error.message}`);
  }
});

// Command untuk list tokens
bot.onText(/\/listtokens/, async (msg) => {
  const chatId = msg.chat.id;
  
  console.log(`📥 /listtokens from ${msg.from.id}`);

  try {
    const processingMsg = await bot.sendMessage(chatId, "📋 Mengambil daftar token dari API...");
    
    const response = await axios.get(`${VALIDATOR_API_URL}/list-tokens`, {
      timeout: 10000
    });
    
    const result = response.data;
    
    if (result.success && result.tokens && result.tokens.length > 0) {
      let tokenList = "📋 *Daftar Token Terdaftar:*\n\n";
      result.tokens.forEach((token, index) => {
        tokenList += `${index + 1}. \`${token}\`\n`;
      });

      tokenList += `\n*Total:* ${result.total_tokens} token`;

      await bot.editMessageText(tokenList, {
        chat_id: chatId,
        message_id: processingMsg.message_id,
        parse_mode: "Markdown"
      });
    } else {
      await bot.editMessageText(
        "📭 *Tidak ada token yang terdaftar*\n\n" +
        "Gunakan /addtoken untuk menambahkan token pertama.",
        {
          chat_id: chatId,
          message_id: processingMsg.message_id,
          parse_mode: "Markdown"
        }
      );
    }
  } catch (error) {
    console.error('❌ List tokens error:', error);
    await bot.editMessageText(
      `❌ *Gagal mengambil daftar token*\n\nError: ${error.message}`,
      {
        chat_id: chatId,
        message_id: processingMsg.message_id,
        parse_mode: "Markdown"
      }
    );
  }
});

// Command untuk test API connection
bot.onText(/\/testapi/, async (msg) => {
  const chatId = msg.chat.id;
  
  console.log(`📥 /testapi from ${msg.from.id}`);

  try {
    const testMsg = await bot.sendMessage(chatId, "🧪 Testing API connection...");
    
    const response = await axios.get(`${VALIDATOR_API_URL}/`, {
      timeout: 5000
    });
    
    await bot.editMessageText(
      `✅ *API Connection Test*\n\n` +
      `Status: ${response.data.status}\n` +
      `Message: ${response.data.message}\n` +
      `Total Tokens: ${response.data.total_tokens}\n` +
      `Environment: ${response.data.environment || 'N/A'}`,
      {
        chat_id: chatId,
        message_id: testMsg.message_id,
        parse_mode: "Markdown"
      }
    );
    
  } catch (error) {
    console.error('❌ API test error:', error);
    bot.sendMessage(chatId, 
      `❌ *API Test Failed*\n\n` +
      `Error: ${error.message}\n` +
      `URL: ${VALIDATOR_API_URL}`,
      { parse_mode: "Markdown" }
    );
  }
});

console.log("🤖 Token Manager Bot event handlers registered!");
