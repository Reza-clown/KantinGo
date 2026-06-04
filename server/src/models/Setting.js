const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Setting = sequelize.define(
  'Setting',
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    stock_threshold: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 5 },
    is_stock_notification_enabled: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1 },
  },
  {
    tableName: 'settings',
    timestamps: true,
    createdAt: false,
    updatedAt: 'updated_at',
  }
);

module.exports = Setting;
