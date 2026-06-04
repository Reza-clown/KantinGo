/**
 * Seed script — jalankan sekali untuk membuat akun owner default
 * Usage: npm run seed
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const sequelize = require('./config/sequelize');

// Import semua model
require('./models/User');
require('./models/Category');
require('./models/Product');
require('./models/Order');
require('./models/OrderItem');
require('./models/InventoryMovement');
require('./models/Setting');

const User = require('./models/User');
const Category = require('./models/Category');
const Setting = require('./models/Setting');

async function seed() {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    console.log('✔ Database tersinkronisasi');

    // Buat akun owner default (jika belum ada)
    const existing = await User.findOne({ where: { username: 'owner' } });
    if (!existing) {
      const hash = await bcrypt.hash('kantingo123', 10);
      await User.create({
        username: 'owner',
        full_name: 'Owner KantinGO',
        password_hash: hash,
        role: 'owner',
        is_active: 1,
      });
      console.log('✔ Akun owner dibuat  →  username: owner | password: kantingo123');
    } else {
      console.log('ℹ Akun owner sudah ada, dilewati');
    }

    // Buat akun kasir default (jika belum ada)
    const kasir = await User.findOne({ where: { username: 'kasir1' } });
    if (!kasir) {
      const hash = await bcrypt.hash('kasir123', 10);
      await User.create({
        username: 'kasir1',
        full_name: 'Kasir Satu',
        password_hash: hash,
        role: 'kasir',
        is_active: 1,
      });
      console.log('✔ Akun kasir dibuat  →  username: kasir1 | password: kasir123');
    }

    // Buat kategori default
    const cats = ['Makanan', 'Minuman', 'Snack'];
    for (const name of cats) {
      const slug = name.toLowerCase().replace(/\s+/g, '-');
      const [, created] = await Category.findOrCreate({
        where: { slug },
        defaults: { name, slug },
      });
      if (created) console.log(`✔ Kategori "${name}" dibuat`);
    }

    // Pastikan settings row ada
    const [, created] = await Setting.findOrCreate({
      where: { id: 1 },
      defaults: { stock_threshold: 5, is_stock_notification_enabled: 1 },
    });
    if (created) console.log('✔ Settings default dibuat');

    console.log('\n✅ Seed selesai!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed gagal:', err.message);
    process.exit(1);
  }
}

seed();
