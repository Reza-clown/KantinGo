const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const User = require('./User');

const Order = sequelize.define(
  'Order',
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    order_code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
    created_by_user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    order_status: {
      type: DataTypes.ENUM('paid', 'unpaid', 'cancelled'),
      allowNull: false,
      defaultValue: 'unpaid',
    },
    payment_method: {
      type: DataTypes.ENUM('tunai', 'qris', 'transfer', 'lainnya'),
      allowNull: false,
      defaultValue: 'tunai',
    },
    subtotal: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
    discount_amount: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
    total: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: 'orders',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

Order.belongsTo(User, { foreignKey: 'created_by_user_id', as: 'kasir' });
User.hasMany(Order, { foreignKey: 'created_by_user_id', as: 'orders' });

module.exports = Order;
