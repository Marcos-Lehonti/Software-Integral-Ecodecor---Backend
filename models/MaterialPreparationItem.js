const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const MaterialPreparationItem = sequelize.define('MaterialPreparationItem', {
  preparationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  inputProductId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  consumedQuantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: { min: 0 },
  },
}, {
  tableName: 'material_preparation_items',
  timestamps: true,
});

module.exports = MaterialPreparationItem;
