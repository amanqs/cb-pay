const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const axios = require('axios');
const { User, Deposit } = require('./models');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Koneksi ke MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Endpoint untuk menerima callback dari PayDisini
app.post('/callback', async (req, res) => {
  // Ambil status dari body
  const status = req.body.status;

  // Temukan unique_code berdasarkan key yang ada di req.body
  const unique_code = Object.keys(req.body).find(key => key.startsWith('user'));

  console.log('Received callback:', req.body);
  console.log('Unique code:', unique_code); // Debug log

  try {
    // Cari deposit berdasarkan unique_code yang ditemukan
    const deposit = await Deposit.findOne({ uniqueCode: unique_code });
    if (!deposit) {
      console.error('Deposit not found for unique_code:', unique_code);
      return res.status(404).send('Deposit not found');
    }

    // Jika status adalah 'Success'
    if (status === 'Success') {
      deposit.status = 'BERHASIL ✅';
      const user = await User.findOne({ userId: deposit.userId });
      if (!user) {
        console.error('User not found for userId:', deposit.userId);
        return res.status(404).send('User not found');
      }

      user.saldo += deposit.amount;
      await user.save();

      // Kirim pesan ke bot menggunakan bot token
      const chatId = deposit.userId;
      const message = `╭──── 〔 *DEPOSIT BERHASIL* 〕
┊・ 🏷️| Jumlah Deposit: Rp ${deposit.amount}
┊・ 📦| Saldo Yang Sekarang: Rp ${user.saldo}
┊・ 🧾| Status: ${deposit.status}
┊
┊・ Pembelian barang berhasil, terima 
┊     kasih telah berbelanja. Yuk beli 
┊     akun di @IDevilsStoreBOT , Silakan Type /menu untuk membeli barang
┊
┊・ Owner : @IDevilsStoree
┊・ ©2024
╰┈┈┈┈┈┈┈┈`;


      const akses = `╭──── 〔 *DEPOSIT MASUK BOS* 〕
┊・ 🏷️| Jumlah Deposit: Rp ${deposit.amount}
┊・ 📦| Saldo Yang Sekarang: Rp ${user.saldo}
┊・ 🧾| Status: ${deposit.status}
┊ . 🦸| User:  ${chatId}
┊ 
╰┈┈┈┈┈┈┈┈`;

      const botToken = process.env.BOT_TOKEN;
      const groupId = '-1001591109995';
      await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      });
      await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: groupId,
        text: akses,
        parse_mode: 'MarkdownV2', // Gunakan 'MarkdownV2' untuk parsing yang benar
      });
      console.log(`Pembelian Otomatis via QRIS Berhasil Dek`);
      console.log(`Deposit successful message sent to ${chatId}`);
    } else {
      deposit.status = 'failed';
    }

    // Simpan status deposit
    await deposit.save();

    // Kirim respon sukses
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error processing callback:', error);
    res.status(500).send('Internal Server Error');
  }
});


// Jalankan server express
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Callback server is running on port ${PORT}`);
});
         
