const bcrypt = require('bcryptjs');
const User = require('../models/User');

const SAFE_ATTRS = ['id', 'username', 'full_name', 'role', 'is_active', 'created_at', 'updated_at'];

/** GET /api/users */
const getAll = async (req, res, next) => {
  try {
    const users = await User.findAll({ attributes: SAFE_ATTRS, order: [['created_at', 'DESC']] });
    return res.json({ status: 200, data: users });
  } catch (err) {
    next(err);
  }
};

/** GET /api/users/:id */
const getById = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, { attributes: SAFE_ATTRS });
    if (!user) return res.status(404).json({ status: 404, message: 'Karyawan tidak ditemukan' });
    return res.json({ status: 200, data: user });
  } catch (err) {
    next(err);
  }
};

/** POST /api/users */
const create = async (req, res, next) => {
  try {
    const { username, full_name, password, role } = req.body;

    const exists = await User.findOne({ where: { username } });
    if (exists) {
      return res.status(400).json({ status: 400, message: 'Username sudah digunakan' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, full_name, password_hash, role: role || 'kasir' });

    return res.status(201).json({
      status: 201,
      message: 'Karyawan berhasil ditambahkan',
      data: { id: user.id, username: user.username, full_name: user.full_name, role: user.role },
    });
  } catch (err) {
    next(err);
  }
};

/** PUT /api/users/:id */
const update = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ status: 404, message: 'Karyawan tidak ditemukan' });

    const { full_name, role, is_active, password } = req.body;

    if (full_name !== undefined) user.full_name = full_name;
    if (role !== undefined) user.role = role;
    if (is_active !== undefined) user.is_active = is_active;
    if (password) user.password_hash = await bcrypt.hash(password, 10);

    await user.save();

    return res.json({ status: 200, message: 'Karyawan berhasil diupdate' });
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/users/:id */
const remove = async (req, res, next) => {
  try {
    // Hindari hapus diri sendiri
    if (Number(req.params.id) === req.user.id) {
      return res.status(400).json({ status: 400, message: 'Tidak bisa menghapus akun sendiri' });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ status: 404, message: 'Karyawan tidak ditemukan' });

    await user.destroy();
    return res.json({ status: 200, message: 'Karyawan berhasil dihapus' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getById, create, update, remove };
