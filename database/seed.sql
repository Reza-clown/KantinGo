-- KantinGO seed data (MySQL)
-- Catatan:
-- - Tax tidak dibuat sesuai instruksi.
-- - Untuk users, password_hash HARUS sesuai cara hashing backend kamu.
--   Karena backend belum ada auth di repo ini, pakai placeholder string.

USE kantingo_db;

-- 1) SETTINGS default (kalau belum ada)
INSERT INTO settings (id, stock_threshold, is_stock_notification_enabled)
SELECT 1, 5, 1
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE id = 1);

-- 2) CATEGORIES
INSERT INTO categories (name, slug, is_active) VALUES
  ('Makanan Berat', 'makanan-berat', 1),
  ('Minuman Dingin', 'minuman-dingin', 1),
  ('Camilan / Snack', 'camilan-snack', 1)
ON DUPLICATE KEY UPDATE
  is_active = VALUES(is_active);

-- 3) USERS (password_hash placeholder)
INSERT INTO users (username, full_name, password_hash, role, is_active)
VALUES
  ('admin', 'Admin KantinGO', 'CHANGE_ME_PASSWORD_HASH', 'admin', 1),
  ('kasir', 'Kasir KantinGO', 'CHANGE_ME_PASSWORD_HASH', 'kasir', 1)
ON DUPLICATE KEY UPDATE
  full_name = VALUES(full_name),
  role = VALUES(role),
  is_active = VALUES(is_active);

-- 4) PRODUCTS
-- price disimpan sebagai BIGINT: misal Rp 15000 -> 15000
-- stock adalah stok utama

INSERT INTO products (category_id, name, price, image_url, stock, status, is_active)
SELECT
  (SELECT id FROM categories WHERE slug='makanan-berat' LIMIT 1),
  'Nasi Goreng Spesial',
  15000,
  'https://images.unsplash.com/photo-1512058560566-4334670a1c10?w=400',
  42,
  'tersedia',
  1
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name='Nasi Goreng Spesial');

INSERT INTO products (category_id, name, price, image_url, stock, status, is_active)
SELECT
  (SELECT id FROM categories WHERE slug='makanan-berat' LIMIT 1),
  'Ayam Geprek Bento',
  23000,
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
  5,
  'tersedia',
  1
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name='Ayam Geprek Bento');

INSERT INTO products (category_id, name, price, image_url, stock, status, is_active)
SELECT
  (SELECT id FROM categories WHERE slug='minuman-dingin' LIMIT 1),
  'Es Kopi Gula Aren',
  12000,
  'https://images.unsplash.com/photo-1544145945-f904253d0c71?w=400',
  0,
  'habis',
  1
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name='Es Kopi Gula Aren');

INSERT INTO products (category_id, name, price, image_url, stock, status, is_active)
SELECT
  (SELECT id FROM categories WHERE slug='makanan-berat' LIMIT 1),
  'Mie Ayam Spesial',
  17000,
  'https://images.unsplash.com/photo-1521305916504-4a1121188589?w=400',
  18,
  'tersedia',
  1
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name='Mie Ayam Spesial');

-- 5) INITIAL STOCK MOVEMENTS (audit log awal)
INSERT INTO inventory_movements (
  product_id, movement_type, qty, source, source_ref, note, created_by_user_id,
  created_at, stock_before, stock_after
)
SELECT
  p.id,
  'in',
  p.stock,
  'manual',
  'seed',
  'Seed stok awal',
  (SELECT id FROM users WHERE username='admin' LIMIT 1),
  CURRENT_TIMESTAMP,
  0,
  p.stock
FROM products p
WHERE p.stock >= 0
  AND NOT EXISTS (
    SELECT 1 FROM inventory_movements im
    WHERE im.product_id = p.id AND im.source_ref='seed'
  );

