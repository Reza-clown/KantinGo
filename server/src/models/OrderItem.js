const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const Order = require('./Order');
const Product = require('./Product');

const OrderItem = sequelize.define(
  'OrderItem',
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    order_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    product_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    product_name_snapshot: { type: DataTypes.STRING(150), allowNull: false },
    unit_price: { type: DataTypes.BIGINT, allowNull: false },
    qty: { type: DataTypes.BIGINT, allowNull: false, validate: { min: 1 } },
    line_total: { type: DataTypes.BIGINT, allowNull: false },
  },
  {
    tableName: 'order_items',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  }
);

OrderItem.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });
Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items' });

OrderItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
Product.hasMany(OrderItem, { foreignKey: 'product_id', as: 'order_items' });

module.exports = OrderItem;
