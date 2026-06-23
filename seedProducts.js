require('dotenv').config();
const sequelize = require('./config/db');
const Product = require('./models/Product');
const ProductStock = require('./models/ProductStock');

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');

    const newProducts = [
      { code: 'INS-001', name: 'Base Ecopaper', category: 'insumo', unit: 'kilos', price: 10 },
      { code: 'INS-002', name: 'Base Machiato', category: 'insumo', unit: 'kilos', price: 15 },
      { code: 'INS-003', name: 'Base Mineral', category: 'insumo', unit: 'kilos', price: 12 },
      { code: 'INS-004', name: 'Agua', category: 'insumo', unit: 'litros', price: 1 },
      { code: 'INS-005', name: 'Aditivo', category: 'insumo', unit: 'litros', price: 20 },
      { code: 'INS-006', name: 'Aceite Especial', category: 'insumo', unit: 'litros', price: 30 },
      { code: 'INS-007', name: 'Pigmento', category: 'insumo', unit: 'kilos', price: 50 },
    ];

    for (const p of newProducts) {
      const [product, created] = await Product.findOrCreate({
        where: { code: p.code },
        defaults: p
      });
      
      if (created) {
        console.log(`Created product: ${product.name}`);
        // Add stock
        await ProductStock.create({
          productId: product.id,
          warehouseName: 'central',
          quantity: 1000,
          reservedQuantity: 0
        });
        console.log(`Added 1000 stock to ${product.name} in central`);
      } else {
        console.log(`Product ${product.name} already exists.`);
      }
    }

    console.log('Seeding finished.');
    process.exit(0);
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
}

seed();
