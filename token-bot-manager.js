const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');

// Konfigurasi
const BOT_TOKEN = "8104521474:AAGmKMPG0OwN5w3iKWVyNTqyNbXUbm-dI9w";
const VALIDATOR_API_URL = "http://localhost:3000"; // Base URL

// Load admin data
function loadAdmins() {
  try {
    const ADMIN_FILE = "admin.json";
    if (!fs.existsSync(ADMIN_FILE)) return { owners: [], admins: [] };
    return JSON.parse(fs.readFileSync(ADMIN_FILE));
  } catch (error) {
    return { owners: [], admins: [] };
  }
}

function isAdmin(userId) {
  const { admins, owners } = loadAdmins();
  return owners.includes(userId) || admins.includes(userId);
}

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
🤖 *API Token Manager Bot*

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
  const userId = msg.from.id;
  const token = match[1].trim();

  if (!isAdmin(userId)) {
    return bot.sendMessage(chatId, "❌ Hanya admin yang bisa menambah token!");
  }

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
  const userId = msg.from.id;

  if (!isAdmin(userId)) {
    return bot.sendMessage(chatId, "❌ Hanya admin yang bisa melihat daftar token!");
  }

  try {
    bot.sendMessage(chatId, "📋 Mengambil daftar token dari API...");
    
    const result = await getTokensFromAPI();
    
    if (result.success && result.tokens.length > 0) {
      let tokenList = "📋 *Daftar Token dari API:*\n\n";
      result.tokens.forEach((token, index) => {
        const maskedToken = `${token.substring(0, 10)}...${token.substring(token.length - 5)}`;
        tokenList += `${index + 1}. \`${maskedToken}\`\n`;
      });

      tokenList += `\n*Total:* ${result.tokens.length} token`;

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
  const userId = msg.from.id;
  const tokenToDelete = match[1].trim();

  if (!isAdmin(userId)) {
    return bot.sendMessage(chatId, "❌ Hanya admin yang bisa menghapus token!");
  }

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

// Handler untuk pesan tidak dikenal
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text.startsWith('/')) {
    bot.sendMessage(chatId, "❌ Command tidak dikenali. Ketik /start untuk melihat menu.");
  }
});

console.log("🤖 API Token Manager Bot berjalan...");
