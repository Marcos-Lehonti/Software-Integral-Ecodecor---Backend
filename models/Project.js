const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Project = sequelize.define('Project', {
  quotationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true, // Una cotización solo puede tener un proyecto
  },
  startDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('en_ejecucion', 'finalizado'),
    defaultValue: 'en_ejecucion',
  },
  observations: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'projects',
  timestamps: true,
});

module.exports = Project;
