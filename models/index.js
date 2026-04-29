const sequelize = require('../config/db');
const User = require('./User');
const Product = require('./Product');
const ProductStock = require('./ProductStock');

//Relaciones
Product.hasMany(ProductStock,{foreignKey:'productId', as:'stock'});
ProductStock.belongsTo(Product,{foreignKey: 'productId'});

module.exports = { sequelize, User, Product, ProductStock };