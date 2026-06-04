const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const User = sequelize.define(
  'User',
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    username: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    full_name: { type: DataTypes.STRING(100), allowNull: false },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    role: { type: DataTypes.ENUM('owner', 'kasir'), allowNull: false, defaultValue: 'kasir' },
    is_active: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1 },
  },
  {
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = User;
