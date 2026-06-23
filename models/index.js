const sequelize = require('../config/db');

const User              = require('./User');
const Product           = require('./Product');
const ProductStock      = require('./ProductStock');
const Quotation         = require('./Quotation');
const QuotationItem     = require('./QuotationItem');
const InventoryMovement = require('./InventoryMovement');
const Project           = require('./Project');
const ProjectMaterialMovement = require('./ProjectMaterialMovement');
const MaterialPreparation     = require('./MaterialPreparation');
const MaterialPreparationItem = require('./MaterialPreparationItem');


// =============================
// PRODUCTOS / STOCK
// =============================

Product.hasMany(ProductStock, {
  foreignKey: 'productId',
  as: 'stock',
});

ProductStock.belongsTo(Product, {
  foreignKey: 'productId',
});


// =============================
// COTIZACIONES / ITEMS
// =============================

Quotation.hasMany(QuotationItem, {
  foreignKey: 'quotationId',
  as: 'items',
});

QuotationItem.belongsTo(Quotation, {
  foreignKey: 'quotationId',
});


// =============================
// PRODUCTOS / ITEMS DE COTIZACIÓN
// =============================

Product.hasMany(QuotationItem, {
  foreignKey: 'productId',
});

QuotationItem.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product',
});


// =============================
// USUARIOS / COTIZACIONES
// =============================

User.hasMany(Quotation, {
  foreignKey: 'createdBy',
  as: 'quotations',
});

Quotation.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'advisor',
});


// =============================
// MOVIMIENTOS DE INVENTARIO
// =============================

// Un producto tiene muchos movimientos
Product.hasMany(InventoryMovement, {
  foreignKey: 'productId',
  as: 'movements',
});

InventoryMovement.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product',
});

// Un usuario tiene muchos movimientos registrados
User.hasMany(InventoryMovement, {
  foreignKey: 'createdBy',
  as: 'movements',
});

InventoryMovement.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'createdByUser',
});

// Una cotización puede tener movimientos de salida asociados
Quotation.hasMany(InventoryMovement, {
  foreignKey: 'referenceId',
  as: 'movements',
});

InventoryMovement.belongsTo(Quotation, {
  foreignKey: 'referenceId',
  as: 'quotation',
});


// =============================
// PROYECTOS Y MOVIMIENTOS
// =============================

Quotation.hasOne(Project, {
  foreignKey: 'quotationId',
  as: 'project',
});

Project.belongsTo(Quotation, {
  foreignKey: 'quotationId',
  as: 'quotation',
});

Project.hasMany(ProjectMaterialMovement, {
  foreignKey: 'projectId',
  as: 'materialMovements',
});

ProjectMaterialMovement.belongsTo(Project, {
  foreignKey: 'projectId',
  as: 'project',
});

Product.hasMany(ProjectMaterialMovement, {
  foreignKey: 'productId',
});

ProjectMaterialMovement.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product',
});

User.hasMany(ProjectMaterialMovement, {
  foreignKey: 'createdBy',
});

ProjectMaterialMovement.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'user',
});

// =============================
// PREPARACIÓN DE MATERIALES
// =============================

MaterialPreparation.hasMany(MaterialPreparationItem, {
  foreignKey: 'preparationId',
  as: 'items',
});
MaterialPreparationItem.belongsTo(MaterialPreparation, {
  foreignKey: 'preparationId',
});

Product.hasMany(MaterialPreparation, {
  foreignKey: 'outputProductId',
});
MaterialPreparation.belongsTo(Product, {
  foreignKey: 'outputProductId',
  as: 'outputProduct',
});

Product.hasMany(MaterialPreparationItem, {
  foreignKey: 'inputProductId',
});
MaterialPreparationItem.belongsTo(Product, {
  foreignKey: 'inputProductId',
  as: 'inputProduct',
});

Project.hasMany(MaterialPreparation, {
  foreignKey: 'projectId',
  as: 'preparations',
});
MaterialPreparation.belongsTo(Project, {
  foreignKey: 'projectId',
  as: 'project',
});

User.hasMany(MaterialPreparation, {
  foreignKey: 'createdBy',
});
MaterialPreparation.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'user',
});

// =============================
// EXPORTS
// =============================

module.exports = {
  sequelize,
  User,
  Product,
  ProductStock,
  Quotation,
  QuotationItem,
  InventoryMovement,
  Project,
  ProjectMaterialMovement,
  MaterialPreparation,
  MaterialPreparationItem,
};