const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Product = sequelize.define('Product', {
  code: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['machiato', 'ecopaper', 'practstone', 'insumo']],
    },
  },
  unit: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['litros', 'kilos', 'bolsas', 'baldes', 'metros2', 'unidades']],
    },
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: { min: 0 },
  },
  color: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  minArea: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  lot: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  photo: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  containerLiters: {        // ✅ envase en litros
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  yieldM2: {               // ✅ rendimiento en metros cuadrados
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  attributes: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
  },
}, {
  tableName: 'products',
  timestamps: true,
});

module.exports = Product;