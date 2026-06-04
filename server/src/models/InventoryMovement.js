const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const Product = require('./Product');
const User = require('./User');

const InventoryMovement = sequelize.define(
  'InventoryMovement',
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    product_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    movement_type: { type: DataTypes.ENUM('in', 'out'), allowNull: false },
    qty: { type: DataTypes.BIGINT, allowNull: false },
    source: {
      type: DataTypes.ENUM('manual', 'order'),
      allowNull: false,
      defaultValue: 'manual',
    },
    source_ref: { type: DataTypes.STRING(50), allowNull: true },
    note: { type: DataTypes.STRING(255), allowNull: true },
    created_by_user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    stock_before: { type: DataTypes.BIGINT, allowNull: false },
    stock_after: { type: DataTypes.BIGINT, allowNull: false },
  },
  {
    tableName: 'inventory_movements',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  }
);

InventoryMovement.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
InventoryMovement.belongsTo(User, { foreignKey: 'created_by_user_id', as: 'created_by' });

module.exports = InventoryMovement;
