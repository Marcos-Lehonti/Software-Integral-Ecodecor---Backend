const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ProjectMaterialMovement = sequelize.define('ProjectMaterialMovement', {
  projectId: {
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
  type: {
    type: DataTypes.ENUM('entrada', 'salida'),
    allowNull: false,
    // entrada = devolución al inventario
    // salida = material adicional sacado del inventario
  },
  quantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: { min: 0 },
  },
  reason: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  tableName: 'project_material_movements',
  timestamps: true,
});

module.exports = ProjectMaterialMovement;
