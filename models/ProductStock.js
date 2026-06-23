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

  // STOCK FÍSICO REAL
  quantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0 },
  },

  // STOCK RESERVADO EN COTIZACIONES
  reservedQuantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0 },
  },

  // STOCK DISPONIBLE REAL
  availableQuantity: {
    type: DataTypes.VIRTUAL,
    get() {

      const quantity = parseFloat(this.quantity || 0);
      const reserved = parseFloat(this.reservedQuantity || 0);

      return quantity - reserved;
    },
  },

}, {
  tableName: 'product_stock',
  timestamps: true,
});

module.exports = ProductStock;