-- KantinGO Database Schema (MySQL)
-- Catatan: Tax development untuk ke depan -> kolom tax tidak dibuat saat ini.
-- Gunakan charset utf8mb4.

CREATE DATABASE IF NOT EXISTS kantingo_db
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE kantingo_db;

-- USERS (karyawan/admin)
CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('owner','kasir') NOT NULL DEFAULT 'kasir',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username)
) ENGINE=InnoDB;

-- CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(120) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_slug (slug),
  UNIQUE KEY uq_categories_name (name)
) ENGINE=InnoDB;

-- PRODUCTS
-- Stok disimpan di products.stock sebagai sumber utama,
-- setiap perubahan stok dicatat di inventory_movements.
CREATE TABLE IF NOT EXISTS products (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_id BIGINT UNSIGNED NULL,
  name VARCHAR(150) NOT NULL,
  price BIGINT NOT NULL,
  image_url VARCHAR(500) NULL,
  stock BIGINT NOT NULL DEFAULT 0,
  status ENUM('tersedia','habis') NOT NULL DEFAULT 'tersedia',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_products_category_id (category_id),
  CONSTRAINT fk_products_category_id
    FOREIGN KEY (category_id) REFERENCES categories(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB;

-- STOCK LOG / INVENTORY MOVEMENTS
-- type: 'in' (tambah), 'out' (kurangi)
-- source: 'manual' (admin), 'order' (transaksi pos)
CREATE TABLE IF NOT EXISTS inventory_movements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NOT NULL,
  movement_type ENUM('in','out') NOT NULL,
  qty BIGINT NOT NULL,
  source ENUM('manual','order') NOT NULL DEFAULT 'manual',
  source_ref VARCHAR(50) NULL,
  note VARCHAR(255) NULL,
  created_by_user_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- snapshot stok sebelum & sesudah agar riwayat audit
  stock_before BIGINT NOT NULL,
  stock_after BIGINT NOT NULL,

  PRIMARY KEY (id),
  KEY idx_inventory_movements_product_id (product_id),
  KEY idx_inventory_movements_created_at (created_at),
  KEY idx_inventory_movements_source (source),
  CONSTRAINT fk_inventory_movements_product_id
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_inventory_movements_created_by
    FOREIGN KEY (created_by_user_id) REFERENCES users(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB;

-- ORDERS (transaksi POS)
CREATE TABLE IF NOT EXISTS orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_code VARCHAR(30) NOT NULL,
  created_by_user_id BIGINT UNSIGNED NULL,
  order_status ENUM('paid','unpaid','cancelled') NOT NULL DEFAULT 'paid',
  payment_method ENUM('tunai','qris','transfer','lainnya') NOT NULL DEFAULT 'qris',
  subtotal BIGINT NOT NULL,
  discount_amount BIGINT NOT NULL DEFAULT 0,
  total BIGINT NOT NULL,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_orders_order_code (order_code),
  KEY idx_orders_created_at (created_at),
  CONSTRAINT fk_orders_created_by
    FOREIGN KEY (created_by_user_id) REFERENCES users(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB;

-- ORDER ITEMS
CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NULL,
  product_name_snapshot VARCHAR(150) NOT NULL,
  unit_price BIGINT NOT NULL,
  qty BIGINT NOT NULL,
  line_total BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_order_items_order_id (order_id),
  KEY idx_order_items_product_id (product_id),
  CONSTRAINT fk_order_items_order_id
    FOREIGN KEY (order_id) REFERENCES orders(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_order_items_product_id
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB;

-- APP SETTINGS (untuk sekarang fokus non-tax)
CREATE TABLE IF NOT EXISTS settings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  stock_threshold BIGINT NOT NULL DEFAULT 5,
  is_stock_notification_enabled TINYINT(1) NOT NULL DEFAULT 1,

  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

-- Insert default settings row (id=1)
INSERT INTO settings (id, stock_threshold, is_stock_notification_enabled)
SELECT 1, 5, 1
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE id = 1);

