const jwt = require('jsonwebtoken');

/**
 * Verifikasi JWT dari header Authorization: Bearer <token>
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 401, message: 'Token autentikasi diperlukan' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, username, role }
    next();
  } catch (err) {
    return res.status(401).json({ status: 401, message: 'Token tidak valid atau sudah expired' });
  }
};

/**
 * Hanya role owner yang boleh akses
 */
const ownerOnly = (req, res, next) => {
  if (req.user?.role !== 'owner') {
    return res.status(403).json({ status: 403, message: 'Akses ditolak. Hanya owner yang diizinkan.' });
  }
  next();
};

/**
 * Kasir dan owner boleh akses
 */
const kasirOrOwner = (req, res, next) => {
  if (!['owner', 'kasir'].includes(req.user?.role)) {
    return res.status(403).json({ status: 403, message: 'Akses ditolak.' });
  }
  next();
};

module.exports = { authenticate, ownerOnly, kasirOrOwner };
