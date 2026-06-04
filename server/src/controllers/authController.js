const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * POST /api/auth/login
 * Body: { username, password }
 */
const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ where: { username, is_active: 1 } });
    if (!user) {
      return res.status(401).json({ status: 401, message: 'Username atau password salah' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ status: 401, message: 'Username atau password salah' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    return res.json({
      status: 200,
      message: 'Login berhasil',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          role: user.role,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/register  (hanya owner bisa membuat akun baru)
 * Body: { username, full_name, password, role }
 */
const register = async (req, res, next) => {
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
      message: 'Akun berhasil dibuat',
      data: { id: user.id, username: user.username, role: user.role },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 */
const me = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'username', 'full_name', 'role', 'is_active', 'created_at'],
    });
    if (!user) return res.status(404).json({ status: 404, message: 'User tidak ditemukan' });
    return res.json({ status: 200, data: user });
  } catch (err) {
    next(err);
  }
};

module.exports = { login, register, me };
