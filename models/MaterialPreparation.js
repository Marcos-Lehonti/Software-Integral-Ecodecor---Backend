const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const MaterialPreparation = sequelize.define('MaterialPreparation', {
  outputProductId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  outputQuantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: { min: 0 },
  },
  warehouseName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['central', 'macororo']],
    },
  },
  projectId: {
    type: DataTypes.INTEGER,
    allowNull: true, // Opcional, si se preparó para un proyecto específico
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  tableName: 'material_preparations',
  timestamps: true,
});

module.exports = MaterialPreparation;
