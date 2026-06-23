const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const QuotationItem = sequelize.define('QuotationItem', {

  quotationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  warehouseName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
        isIn: [['central', 'macororo']],
    },
  },

  quantity: {
    type: DataTypes.DECIMAL(10,2),
    allowNull: false,
  },

  reservedQuantity: {
    type: DataTypes.DECIMAL(10,2),
    defaultValue: 0,
  },

  unitPrice: {
    type: DataTypes.DECIMAL(10,2),
    allowNull: false,
  },

  subtotal: {
    type: DataTypes.DECIMAL(10,2),
    allowNull: false,
  },

}, {
  tableName: 'quotation_items',
  timestamps: true,
});

module.exports = QuotationItem;