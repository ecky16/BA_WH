const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// Token Bot diambil dari Environment Variables Vercel biar aman
const token = process.env.TELEGRAM_TOKEN; 
const bot = new TelegramBot(token);

// URL WEB APP GOOGLE APPS SCRIPT MAS
const appsScriptUrl = 'https://script.google.com/macros/s/AKfycbz0X95RzBF-NWFYWYZ-tAk5n7UsWlU4nZVAoga7wqRaR-C9Fwe85zcMoAaoC2Y0kpa8/exec'; 

module.exports = async (req, res) => {
  try {
    const { body } = req;
    
    if (body.message) {
      const msg = body.message;
      const chatId = msg.chat.id;
      const namaUser = msg.from.first_name;

      // === ANTI-SPAM ALBUM FOTO ===
      if (msg.photo && !msg.caption && msg.media_group_id) {
        return res.status(200).send('OK');
      }

      // === [UPGRADE] FITUR BANTUAN DENGAN WHITELIST ===
      // Sekarang /start tidak langsung dijawab Vercel, tapi dilempar ke GAS untuk cek akses
      if (msg.text === '/start' || msg.text === '/help' || msg.text === '/bantuan') {
        axios.post(appsScriptUrl, {
          jenis: 'bantuan',
          chatId: chatId,
          namaUser: namaUser
        }).catch(err => console.error("Error Bantuan ke GAS:", err));
        return res.status(200).send('OK');
      }

      // === PROSES TERIMA FOTO & DATA ===
      if (msg.photo && msg.caption) {
        const lines = msg.caption.split('\n');
        const infoUtama = lines[0].split('|').map(item => item.trim());

        // Validasi format baris pertama (Harus ada 3 bagian)
        if (infoUtama.length < 3) {
          await bot.sendMessage(chatId, `⚠️ Waduh Mas ${namaUser}, format baris pertamanya salah.\n\nSesuai template, gunakan pemisah ( | ) untuk:\n*Nama Project | Nomor ID | Tanggal*\n\nContoh:\nINC47176317 | Ibooster0_1773196 | 11/03/2026`, { parse_mode: "Markdown" });
          return res.status(200).send('OK');
        }

        // 1. Kasih tahu kalau proses sedang berjalan (Cek Whitelist & PDF)
        await bot.sendMessage(chatId, `⏳ Siap Mas! Data diterima. Sedang mengecek akses Whitelist & memproses PDF. Mohon tunggu sebentar...`);

        // 2. Ambil URL file foto dari Telegram
        const fileId = msg.photo[msg.photo.length - 1].file_id;
        const fileUrl = await bot.getFileLink(fileId);

        // 3. Siapkan payload dengan penanda 'proses_pdf'
        const payload = {
          jenis: 'proses_pdf',
          nama_project: infoUtama[0] || "-",
          nomor_id: infoUtama[1] || "-",
          tanggal: infoUtama[2] || "-",
          rawBarang: lines.slice(1).join('\n'),
          fileUrl: fileUrl,
          chatId: chatId,    
          namaUser: namaUser 
        };

        // 4. Lempar ke Google Apps Script
        axios.post(appsScriptUrl, payload).catch(err => console.error("Error Proses ke GAS:", err));
        
      } else if (msg.photo && !msg.caption) {
        await bot.sendMessage(chatId, `Waduh Mas ${namaUser}, fotonya kelupaan dikasih caption datanya nih.`);
      } else if (msg.text && !msg.text.startsWith('/')) {
        await bot.sendMessage(chatId, `Mas ${namaUser}, jangan lupa kirimnya harus berupa FOTO yang dikasih caption ya.`);
      }
    }
  } catch (error) {
    console.error("Error Webhook:", error);
  }
  
  res.status(200).send('OK');
};



