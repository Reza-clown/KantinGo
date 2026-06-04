const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const Category = require('./Category');

const Product = sequelize.define(
  'Product',
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    category_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    name: { type: DataTypes.STRING(150), allowNull: false },
    price: {
      type: DataTypes.BIGINT,
      allowNull: false,
      validate: { isInt: true, min: 0 },
    },
    image_url: { type: DataTypes.STRING(500), allowNull: true },
    stock: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
      validate: { isInt: true, min: 0 },
    },
    status: {
      type: DataTypes.ENUM('tersedia', 'habis'),
      allowNull: false,
      defaultValue: 'tersedia',
    },
    is_active: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1 },
  },
  {
    tableName: 'products',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

Product.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });
Category.hasMany(Product, { foreignKey: 'category_id', as: 'products' });

module.exports = Product;
