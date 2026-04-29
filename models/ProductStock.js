const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ProductStock = sequelize.define('ProductStock', {
  warehouseName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['central', 'macororo']],
    },
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  quantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0 },
  },
}, {
  tableName: 'product_stock',
  timestamps: true,
});

module.exports = ProductStock;