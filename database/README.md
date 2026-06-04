# KantinGO Database (MySQL)

## Folder
- `schema.sql` berisi DDL seluruh tabel.
- `seed.sql` berisi data awal (categories, products, settings, users dummy, stock log seed).

## Cara pakai (Laravel/Node/Backend apa pun)
1. Import schema:
   - Atau di MySQL Workbench/PhpMyAdmin: **Import** file `database/schema.sql` ke database `kantingo_db`.
2. Import seed data:
   - Import file `database/seed.sql` ke database `kantingo_db`.

## Catatan Tax
- Sesuai kebutuhan pengembangan ke depan, kolom/tabel pajak (tax/PPN) **belum dibuat**.

## Tabel utama
- `users` : akun admin/kasir
- `categories` : kategori menu
- `products` : produk/menu + stok utama (`stock`)
- `inventory_movements` : histori perubahan stok (audit)
- `orders` : transaksi POS
- `order_items` : item per transaksi (snapshot nama produk)
- `settings` : setting aplikasi (stock threshold)

## Catatan `seed.sql` untuk password
- `seed.sql` mengisi `password_hash` dengan placeholder: `CHANGE_ME_PASSWORD_HASH`.
- Setelah backend auth selesai, ganti `password_hash` sesuai algoritma (bcrypt/argon2) yang dipakai.

