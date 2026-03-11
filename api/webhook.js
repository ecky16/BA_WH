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

      // === [UPGRADE 1] ANTI-SPAM ALBUM FOTO ===
      // Jika mengirim banyak foto sekaligus (album), abaikan pesan foto tanpa caption 
      // agar bot tidak spam membalas error berkali-kali.
      if (msg.photo && !msg.caption && msg.media_group_id) {
        return res.status(200).send('OK');
      }

      // === FITUR BANTUAN (/help atau /start) ===
      if (msg.text === '/start' || msg.text === '/help' || msg.text === '/bantuan') {
        const pesanBantuan = `Halo Mas ${namaUser}! 👋\nIni adalah Bot BA WH Otomatis.\n\n` +
          `📌 *CARA PENGGUNAAN:*\n` +
          `Kirim *FOTO EVIDENCE* dan wajib sertakan *CAPTION* dengan susunan berikut:\n\n` +
          `Nama Project | Tanggal | Nomor ID\n` +
          `Nama Barang 1, Satuan, Qty\n` +
          `Nama Barang 2, Satuan, Qty\n\n` +
          `💡 *CONTOH CAPTION (Tinggal Copas & Edit):*\n` +
          `GAMAS feeder GPON03 | 11/03/2026 | ID-0214\n` +
          `KU ADSS 48, Meter, 190\n` +
          `UC 24, Bh, 4\n\n` +
          `⚠️ *CATATAN PENTING:*\n` +
          `- Pisahkan info di baris pertama dengan garis lurus ( | )\n` +
          `- Pisahkan detail barang dengan koma ( , )\n` +
          `- Pastikan pakai enter untuk setiap barang baru.\n\n` +
          `Silakan langsung kirim fotonya Mas! 🚀`;

        await bot.sendMessage(chatId, pesanBantuan, { parse_mode: "Markdown" });
        return res.status(200).send('OK');
      }

      // === PROSES TERIMA FOTO & DATA ===
      if (msg.photo && msg.caption) {
        
        const lines = msg.caption.split('\n');
        const infoUtama = lines[0].split('|').map(item => item.trim());

        // === [UPGRADE 2] VALIDASI FORMAT BARIS PERTAMA ===
        // Mencegah PDF berantakan kalau Mas lupa ketik tanda pemisah (|)
        if (infoUtama.length < 3) {
          await bot.sendMessage(chatId, `⚠️ Waduh Mas ${namaUser}, format baris pertamanya ada yang kurang nih.\nPastikan pakai tanda pemisah ( | ) untuk: *Nama Project | Tanggal | Nomor ID*\n\nContoh: GAMAS GPON03 | 11/03/2026 | ID-0214`, { parse_mode: "Markdown" });
          return res.status(200).send('OK');
        }

        // 1. Kasih tahu kalau proses sedang berjalan
        await bot.sendMessage(chatId, `⏳ Siap Mas ${namaUser}! Data diterima, PDF sedang diproses. Mohon tunggu sebentar ya...`);

        // 2. Ambil URL file foto dari Telegram
        const fileId = msg.photo[msg.photo.length - 1].file_id;
        const fileUrl = await bot.getFileLink(fileId);

        // 3. Ekstrak data yang sudah bersih 
        // === [UPGRADE 3] PENYELARASAN VARIABEL ===
        const nama_project = infoUtama[0] || "-";
        const tanggal = infoUtama[1] || "-";
        const nomor_id = infoUtama[2] || "-";
        const rawBarang = lines.slice(1).join('\n');

        // 4. Siapkan payload ke Google Apps Script
        const payload = {
          nama_project: nama_project,
          tanggal: tanggal,
          nomor_id: nomor_id,
          rawBarang: rawBarang,
          fileUrl: fileUrl,
          chatId: chatId,    
          namaUser: namaUser 
        };

        // 5. Lempar ke Google Apps Script
        axios.post(appsScriptUrl, payload).catch(err => console.error("Error ke GAS:", err));
        
      } else if (msg.photo && !msg.caption) {
        // Kalau user kirim foto tapi lupa kasih caption
        await bot.sendMessage(chatId, `Waduh Mas ${namaUser}, fotonya kelupaan dikasih caption datanya nih. Coba kirim ulang fotonya sekalian pakai caption ya! Ketik /help untuk lihat contohnya.`);
      } else if (msg.text && msg.text !== '/start' && msg.text !== '/help') {
        // Kalau user cuma kirim teks tanpa foto
        await bot.sendMessage(chatId, `Mas ${namaUser}, jangan lupa kirimnya harus berupa FOTO yang dikasih caption ya. Ketik /help untuk lihat panduan.`);
      }
    }
  } catch (error) {
    console.error("Error Webhook:", error);
  }
  
  res.status(200).send('OK');
};
