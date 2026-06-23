const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,      // nombre de la BD
  process.env.DB_USER,      // usuario
  process.env.DB_PASSWORD,  // contraseña
  {
    host: process.env.DB_HOST,
    dialect: 'postgres',    // o 'mysql' según tu BD
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  }
);

module.exports = sequelize;