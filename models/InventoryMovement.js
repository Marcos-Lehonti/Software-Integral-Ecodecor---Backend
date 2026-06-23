const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const InventoryMovement = sequelize.define('InventoryMovement', {

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

  // 'ingreso' | 'salida'
  type: {
    type: DataTypes.ENUM('ingreso', 'salida'),
    allowNull: false,
  },

  quantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: { min: 0 },
  },

  // Razón del movimiento
  reason: {
    type: DataTypes.ENUM(
      'registro_manual',       // stock cargado manualmente por admin
      'aprobacion_cotizacion', // salida por cotización aprobada
      'ajuste_manual'          // corrección/ajuste de inventario
    ),
    allowNull: false,
  },

  // ID de cotización si aplica (nullable para ingresos manuales)
  referenceId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },

  // Número de cotización legible (ej: COT-00012)
  referenceNumber: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  // Usuario que realizó la acción
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  // Snapshot del stock después del movimiento
  stockAfter: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },

}, {
  tableName: 'inventory_movements',
  timestamps: true,
});

module.exports = InventoryMovement;