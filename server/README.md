# KantinGO — Backend API

Node.js + Express + MySQL (Sequelize ORM)

## Struktur Folder

```
server/src/
├── config/
│   └── sequelize.js          # Konfigurasi Sequelize
├── models/
│   ├── User.js               # Model karyawan/owner
│   ├── Category.js           # Model kategori produk
│   ├── Product.js            # Model produk
│   ├── Order.js              # Model transaksi
│   ├── OrderItem.js          # Model item transaksi
│   ├── InventoryMovement.js  # Model log pergerakan stok
│   └── Setting.js            # Model pengaturan sistem
├── controllers/
│   ├── authController.js     # Login, register, me
│   ├── userController.js     # CRUD karyawan
│   ├── productController.js  # CRUD produk + update stok
│   ├── orderController.js    # CRUD transaksi POS
│   ├── dashboardController.js# Dashboard owner & kasir
│   └── reportController.js   # Laporan bulanan + export
├── routes/
│   ├── auth.js
│   ├── users.js
│   ├── categories.js
│   ├── products.js
│   ├── orders.js
│   ├── dashboard.js
│   └── reports.js
├── middleware/
│   ├── auth.js               # JWT authenticate, ownerOnly, kasirOrOwner
│   ├── validate.js           # Handler express-validator
│   └── errorHandler.js       # Global error handler
├── seed.js                   # Seed data awal
└── index.js                  # Entry point
```

## Setup

### 1. Konfigurasi environment

```bash
cp .env.example .env
# Edit .env sesuai konfigurasi MySQL lokal
```

`.env` minimal:
```
PORT=3001
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=kantingo_db
JWT_SECRET=ganti_dengan_secret_yang_kuat
```

### 2. Buat database

```sql
CREATE DATABASE kantingo_db DEFAULT CHARACTER SET utf8mb4;
```

Atau jalankan `database/schema.sql` untuk membuat semua tabel.

### 3. Install dependencies

```bash
npm install
```

### 4. Seed data awal

```bash
npm run seed
```

Akun default yang dibuat:
| Username | Password      | Role  |
|----------|---------------|-------|
| owner    | kantingo123   | owner |
| kasir1   | kasir123      | kasir |

### 5. Jalankan server

```bash
npm run dev    # development (nodemon)
npm start      # production
```

---

## API Reference

Base URL: `http://localhost:3001/api`

Semua endpoint (kecuali `/auth/login`) membutuhkan header:
```
Authorization: Bearer <token>
```

---

### Auth

| Method | Endpoint         | Akses | Deskripsi                     |
|--------|-----------------|-------|-------------------------------|
| POST   | /auth/login     | Public | Login, mendapat JWT token    |
| POST   | /auth/register  | Owner | Buat akun karyawan baru       |
| GET    | /auth/me        | Semua | Info user yang login          |

**POST /auth/login**
```json
{ "username": "owner", "password": "kantingo123" }
```

---

### Dashboard

| Method | Endpoint          | Akses | Deskripsi                           |
|--------|------------------|-------|-------------------------------------|
| GET    | /dashboard/owner  | Owner | Omzet bulanan, produk laris/kurang  |
| GET    | /dashboard/kasir  | Kasir | Omzet harian, notif stok menipis    |

Query params: `?month=6&year=2025`

---

### Manajemen Karyawan (Owner only)

| Method | Endpoint     | Deskripsi          |
|--------|--------------|--------------------|
| GET    | /users       | Daftar karyawan    |
| GET    | /users/:id   | Detail karyawan    |
| POST   | /users       | Tambah karyawan    |
| PUT    | /users/:id   | Update karyawan    |
| DELETE | /users/:id   | Hapus karyawan     |

**POST /users body:**
```json
{
  "username": "kasir2",
  "full_name": "Kasir Dua",
  "password": "kasir123",
  "role": "kasir"
}
```

---

### Produk

| Method | Endpoint               | Akses        | Deskripsi              |
|--------|----------------------|--------------|------------------------|
| GET    | /products             | Semua        | Daftar produk          |
| GET    | /products/:id         | Semua        | Detail produk          |
| POST   | /products             | Owner        | Tambah produk baru     |
| PUT    | /products/:id         | Owner        | Update data produk     |
| PATCH  | /products/:id/stock   | Owner+Kasir  | Update stok            |
| DELETE | /products/:id         | Owner        | Soft delete produk     |

**POST /products body:**
```json
{
  "name": "Nasi Goreng",
  "price": 12000,
  "stock": 50,
  "category_id": 1,
  "image_url": "https://..."
}
```

**PATCH /products/:id/stock body:**
```json
{
  "qty": 10,
  "movement_type": "in",
  "note": "Restock mingguan"
}
```

---

### Transaksi POS (Kasir & Owner)

| Method | Endpoint               | Deskripsi                    |
|--------|----------------------|------------------------------|
| GET    | /orders               | Daftar transaksi             |
| GET    | /orders/:id           | Detail transaksi             |
| POST   | /orders               | Buat transaksi baru          |
| PATCH  | /orders/:id/status    | Update status (paid/cancel)  |
| DELETE | /orders/:id           | Hapus (hanya unpaid/cancel)  |

**POST /orders body:**
```json
{
  "payment_method": "tunai",
  "discount_amount": 0,
  "items": [
    { "product_id": 1, "qty": 2 },
    { "product_id": 3, "qty": 1 }
  ]
}
```

**PATCH /orders/:id/status body:**
```json
{ "order_status": "paid", "payment_method": "qris" }
```

---

### Laporan (Owner only)

| Method | Endpoint                     | Deskripsi               |
|--------|------------------------------|-------------------------|
| GET    | /reports/monthly             | Laporan JSON bulanan    |
| GET    | /reports/monthly/export      | Download CSV atau Excel |

Query params:
- `?month=6&year=2025`
- `?month=6&year=2025&format=csv` atau `&format=excel`

---

## Hak Akses

| Fitur                  | Owner | Kasir |
|------------------------|-------|-------|
| Dashboard Owner        | ✅    | ❌    |
| Dashboard Kasir        | ✅    | ✅    |
| CRUD Karyawan          | ✅    | ❌    |
| CRUD Produk (full)     | ✅    | ❌    |
| Baca + Update Stok     | ✅    | ✅    |
| Transaksi POS          | ✅    | ✅    |
| Laporan + Export       | ✅    | ❌    |

---

## Response Format

```json
// Success
{ "status": 200, "data": { ... } }
{ "status": 201, "message": "...", "data": { ... } }

// Error
{ "status": 400, "message": "...", "errors": [...] }
{ "status": 401, "message": "Token autentikasi diperlukan" }
{ "status": 403, "message": "Akses ditolak" }
{ "status": 404, "message": "... tidak ditemukan" }
{ "status": 500, "message": "Internal server error" }
```
