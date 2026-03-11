const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// Token Bot Telegram Mas Ecky
const token = process.env.TELEGRAM_TOKEN; 
const bot = new TelegramBot(token);

// URL WEB APP GOOGLE APPS SCRIPT MAS
const appsScriptUrl = 'https://script.google.com/macros/s/AKfycbz0X95RzBF-NWFYWYZ-tAk5n7UsWlU4nZVAoga7wqRaR-C9Fwe85zcMoAaoC2Y0kpa8/exec'; 

module.exports = async (req, res) => {
  try {
    const { body } = req;
    
    if (body.message && body.message.photo && body.message.caption) {
      const msg = body.message;
      const chatId = msg.chat.id;
      const namaUser = msg.from.first_name;

      // 1. Kasih tahu Mas Ecky kalau proses sedang berjalan
      await bot.sendMessage(chatId, `⏳ Siap Mas ${namaUser}! Data diterima, PDF sedang diproses. Mohon tunggu sebentar ya...`);

      // 2. Ambil URL file foto dari Telegram
      const fileId = msg.photo[msg.photo.length - 1].file_id;
      const fileUrl = await bot.getFileLink(fileId);

      // 3. Ekstrak teks caption
      const lines = msg.caption.split('\n');
      const infoUtama = lines[0].split('|').map(item => item.trim());
      const project = infoUtama[0] || "-";
      const tanggal = infoUtama[1] || "-";
      const nomorId = infoUtama[2] || "-";
      const rawBarang = lines.slice(1).join('\n');

      // 4. Siapkan data, TAMBAHKAN chatId agar GAS bisa membalas ke Telegram
      const payload = {
        tanggal: tanggal,
        project: project,
        nomorId: nomorId,
        rawBarang: rawBarang,
        fileUrl: fileUrl,
        chatId: chatId,    // Penting untuk kirim balik PDF
        namaUser: namaUser // Penting untuk sapaan
      };

      // 5. Lempar ke Google Apps Script secara asinkron (tidak perlu ditunggu)
      axios.post(appsScriptUrl, payload).catch(err => console.error(err));
      
    }
  } catch (error) {
    console.error("Error Webhook:", error);
  }
  
  // Wajib kembalikan status 200 agar Telegram tidak error
  res.status(200).send('OK');
};
