const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Quotation = sequelize.define('Quotation', {

  quotationNumber: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },

  clientName: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  clientCompany: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  clientPhone: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  clientEmail: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  projectType: {
    type: DataTypes.ENUM('mano_obra', 'material', 'mixto'),
    allowNull: false,
  },

  serviceDescription: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  workDuration: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  paymentTerms: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  termsConditions: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  validUntil: {
    type: DataTypes.DATE,
    allowNull: false,
  },

  subtotal: {
    type: DataTypes.DECIMAL(10,2),
    defaultValue: 0,
  },

  total: {
    type: DataTypes.DECIMAL(10,2),
    defaultValue: 0,
  },

  status: {
    type: DataTypes.ENUM(
      'pendiente',
      'aprobada',
      'rechazada',
      'cancelada'
    ),
    defaultValue: 'pendiente',
  },

}, {
  tableName: 'quotations',
  timestamps: true,
});

module.exports = Quotation;