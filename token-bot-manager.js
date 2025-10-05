// token-bot-manager.js (Railway)
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// Konfigurasi - TIDAK PERLU .env UNTUK TOKEN
const BOT_TOKEN = "8104521474:AAGmKMPG0OwN5w3iKWVyNTqyNbXUbm-dI9w"; // Token bot manager
const VALIDATOR_API_URL = process.env.RAILWAY_STATIC_URL || 'http://localhost:3000';

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Fungsi untuk validasi token via API
async function validateTokenViaAPI(token) {
  try {
    const response = await axios.post(`${VALIDATOR_API_URL}/validate-token`, { token });
    return response.data;
  } catch (error) {
    console.error('❌ Error validating token via API:', error.message);
    return false;
  }
}

// Fungsi untuk menambah token ke API
async function addTokenToAPI(token) {
  try {
    const response = await axios.post(`${VALIDATOR_API_URL}/add-token`, { token });
    return response.data;
  } catch (error) {
    console.error('❌ Error adding token:', error.message);
    return { success: false, message: error.message };
  }
}

// Fungsi untuk hapus token dari API
async function deleteTokenFromAPI(token) {
  try {
    const response = await axios.delete(`${VALIDATOR_API_URL}/delete-token`, { 
      data: { token } 
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error deleting token:', error.message);
    return { success: false, message: error.message };
  }
}

// Fungsi untuk get list tokens dari API
async function getTokensFromAPI() {
  try {
    const response = await axios.get(`${VALIDATOR_API_URL}/list-tokens`);
    return response.data;
  } catch (error) {
    console.error('❌ Error getting tokens:', error.message);
    return { success: false, tokens: [] };
  }
}

// Command handlers
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const menuText = `
🤖 *Zalyst Token Manager Bot*

*Available Commands:*
/addtoken <token> - Tambah token baru ke API
/checktoken <token> - Cek validitas token via API
/listtokens - Lihat daftar token dari API
/deletetoken <token> - Hapus token dari API

*Validator API:* ${VALIDATOR_API_URL}
  `;
  
  bot.sendMessage(chatId, menuText, { parse_mode: "Markdown" });
});

// Command untuk menambah token
bot.onText(/\/addtoken (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const token = match[1].trim();

  try {
    // Validasi format token Telegram
    const tokenRegex = /^\d{10}:[A-Za-z0-9_-]{35}$/;
    if (!tokenRegex.test(token)) {
      return bot.sendMessage(chatId, "❌ Format token tidak valid! Token harus dalam format: `1234567890:ABCdefGHIjklMNOpqrSTUvwxYZabc123456`", { parse_mode: "Markdown" });
    }

    bot.sendMessage(chatId, "🔍 Memvalidasi dan menambahkan token...");
    
    // Tambah token langsung ke API
    const result = await addTokenToAPI(token);
    
    if (result.success) {
      bot.sendMessage(chatId, `✅ Token berhasil ditambahkan ke API!\n\nToken: \`${token}\`\nTotal tokens: ${result.total_tokens}`, { 
        parse_mode: "Markdown" 
      });
    } else {
      bot.sendMessage(chatId, `❌ Gagal menambahkan token: ${result.message}`);
    }

  } catch (error) {
    bot.sendMessage(chatId, "❌ Gagal menambahkan token: " + error.message);
  }
});

// Command untuk cek token
bot.onText(/\/checktoken (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const token = match[1].trim();

  try {
    bot.sendMessage(chatId, "🔍 Memeriksa token...");
    
    const isValid = await validateTokenViaAPI(token);
    
    if (isValid) {
      bot.sendMessage(chatId, `✅ Token **VALID**\n\nToken: \`${token}\``, { 
        parse_mode: "Markdown" 
      });
    } else {
      bot.sendMessage(chatId, `❌ Token **TIDAK VALID**\n\nToken: \`${token}\``, { 
        parse_mode: "Markdown" 
      });
    }
  } catch (error) {
    bot.sendMessage(chatId, "❌ Gagal memeriksa token: " + error.message);
  }
});

// Command untuk list tokens
bot.onText(/\/listtokens/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    bot.sendMessage(chatId, "📋 Mengambil daftar token dari API...");
    
    const result = await getTokensFromAPI();
    
    if (result.success && result.tokens.length > 0) {
      let tokenList = "📋 *Daftar Token dari API:*\n\n";
      result.tokens.forEach((token, index) => {
        tokenList += `${index + 1}. \`${token}\`\n`;
      });

      tokenList += `\n*Total:* ${result.total_tokens} token`;

      bot.sendMessage(chatId, tokenList, { parse_mode: "Markdown" });
    } else {
      bot.sendMessage(chatId, "📭 Tidak ada token dalam database API.");
    }
  } catch (error) {
    bot.sendMessage(chatId, "❌ Gagal mengambil daftar token: " + error.message);
  }
});

// Command untuk delete token
bot.onText(/\/deletetoken (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const tokenToDelete = match[1].trim();

  try {
    bot.sendMessage(chatId, "🗑️ Menghapus token dari API...");
    
    const result = await deleteTokenFromAPI(tokenToDelete);
    
    if (result.success) {
      bot.sendMessage(chatId, `✅ Token berhasil dihapus dari API!\n\nToken: \`${tokenToDelete}\`\nTotal tokens: ${result.total_tokens}`, { 
        parse_mode: "Markdown" 
      });
    } else {
      bot.sendMessage(chatId, `❌ Gagal menghapus token: ${result.message}`);
    }
  } catch (error) {
    bot.sendMessage(chatId, "❌ Gagal menghapus token: " + error.message);
  }
});

console.log("🤖 Token Manager Bot berjalan di Railway...");
