const { Product, ProductStock } = require('../models');
const logger = require('../logger');

const VALID_CATEGORIES = ['machiato', 'ecopaper', 'practstone'];
const VALID_UNITS = ['litros', 'kilos', 'bolsas', 'baldes', 'metros2', 'unidades'];
const VALID_WAREHOUSES = ['central', 'macororo'];

// POST /api/products
exports.createProduct = async (req, res) => {
  const { code, name, description, category, unit, price, color, minArea, lot, photo, attributes, stock, containerLiters, yieldM2 } = req.body;

  if (!code || !name || !category || !unit || !price) {
    return res.status(400).json({ message: 'Código, nombre, categoría, unidad y precio son obligatorios' });
  }

  if (!VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({ message: `Categoría inválida. Válidas: ${VALID_CATEGORIES.join(', ')}` });
  }

  if (!VALID_UNITS.includes(unit)) {
    return res.status(400).json({ message: `Unidad inválida. Válidas: ${VALID_UNITS.join(', ')}` });
  }

  if (price <= 0) {
    return res.status(400).json({ message: 'El precio debe ser mayor a 0' });
  }

  try {
    const existing = await Product.findOne({ where: { code } });
    if (existing) {
      return res.status(400).json({ message: 'Ya existe un producto con ese código' });
    }

    const product = await Product.create({
      code, name, description, category, unit,
      price, color, minArea, lot, photo,
      containerLiters: containerLiters ?? null, // ✅
      yieldM2: yieldM2 ?? null,                 // ✅
      attributes: attributes || {},
    });

    if (stock && Array.isArray(stock)) {
      for (const s of stock) {
        if (!VALID_WAREHOUSES.includes(s.warehouseName)) continue;
        await ProductStock.create({
          productId: product.id,
          warehouseName: s.warehouseName,
          quantity: s.quantity ?? 0,
        });
      }
    }

    logger.info(`✅ Producto creado: ${name} — por ID: ${req.user.id}`);
    res.status(201).json({ message: 'Producto creado correctamente', product });
  } catch (err) {
    logger.error(`❌ createProduct: ${err.message}`);
    res.status(500).json({ message: 'Error al crear producto' });
  }
};

// GET /api/products
exports.listProducts = async (req, res) => {
  const { page = 1, limit = 20, category } = req.query;
  const where = category ? { category } : {};

  try {
    const products = await Product.findAndCountAll({
      where,
      include: [{ model: ProductStock, as: 'stock' }],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['createdAt', 'DESC']],
    });

    res.json({
      total: products.count,
      page: parseInt(page),
      totalPages: Math.ceil(products.count / parseInt(limit)),
      data: products.rows,
    });
  } catch (err) {
    logger.error(`❌ listProducts: ${err.message}`);
    res.status(500).json({ message: 'Error al listar productos' });
  }
};

// GET /api/products/:id
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [{ model: ProductStock, as: 'stock' }],
    });

    if (!product) return res.status(404).json({ message: 'Producto no encontrado' });

    res.json(product);
  } catch (err) {
    logger.error(`❌ getProduct: ${err.message}`);
    res.status(500).json({ message: 'Error al obtener producto' });
  }
};

// PUT /api/products/:id
exports.updateProduct = async (req, res) => {
  const { name, description, category, unit, price, color, minArea, lot, photo, attributes, containerLiters, yieldM2 } = req.body;

  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ message: 'Producto no encontrado' });

    if (category && !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ message: `Categoría inválida. Válidas: ${VALID_CATEGORIES.join(', ')}` });
    }

    if (unit && !VALID_UNITS.includes(unit)) {
      return res.status(400).json({ message: `Unidad inválida. Válidas: ${VALID_UNITS.join(', ')}` });
    }

    if (price && price <= 0) {
      return res.status(400).json({ message: 'El precio debe ser mayor a 0' });
    }

    await product.update({
      name:           name           ?? product.name,
      description:    description    ?? product.description,
      category:       category       ?? product.category,
      unit:           unit           ?? product.unit,
      price:          price          ?? product.price,
      color:          color          ?? product.color,
      minArea:        minArea        ?? product.minArea,
      lot:            lot            ?? product.lot,
      photo:          photo          ?? product.photo,
      containerLiters: containerLiters ?? product.containerLiters, // ✅
      yieldM2:        yieldM2        ?? product.yieldM2,           // ✅
      attributes:     attributes     ?? product.attributes,
    });

    logger.info(`✏️ Producto actualizado ID: ${req.params.id} — por ID: ${req.user.id}`);
    res.json({ message: 'Producto actualizado correctamente', product });
  } catch (err) {
    logger.error(`❌ updateProduct: ${err.message}`);
    res.status(500).json({ message: 'Error al actualizar producto' });
  }
};

// PUT /api/products/:id/stock
exports.updateStock = async (req, res) => {
  const { warehouseName, quantity } = req.body;

  if (!VALID_WAREHOUSES.includes(warehouseName)) {
    return res.status(400).json({ message: `Almacén inválido. Válidos: ${VALID_WAREHOUSES.join(', ')}` });
  }

  if (quantity < 0) {
    return res.status(400).json({ message: 'La cantidad no puede ser negativa' });
  }

  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ message: 'Producto no encontrado' });

    const [stock] = await ProductStock.findOrCreate({
      where: { productId: req.params.id, warehouseName },
      defaults: { productId: req.params.id, warehouseName, quantity: 0 },
    });

    await stock.update({ quantity });

    logger.info(`📦 Stock actualizado — Producto ID: ${req.params.id}, Almacén: ${warehouseName}, Cantidad: ${quantity}`);
    res.json({ message: 'Stock actualizado correctamente', stock });
  } catch (err) {
    logger.error(`❌ updateStock: ${err.message}`);
    res.status(500).json({ message: 'Error al actualizar stock' });
  }
};

// DELETE /api/products/:id
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ message: 'Producto no encontrado' });

    await ProductStock.destroy({ where: { productId: req.params.id } });
    await product.destroy();

    logger.info(`🗑️ Producto eliminado ID: ${req.params.id} — por ID: ${req.user.id}`);
    res.json({ message: 'Producto eliminado correctamente' });
  } catch (err) {
    logger.error(`❌ deleteProduct: ${err.message}`);
    res.status(500).json({ message: 'Error al eliminar producto' });
  }
};

// PUT /api/products/:id/attributes
exports.updateAttributes = async (req, res) => {
  const { attributes } = req.body;

  if (typeof attributes !== 'object' || Array.isArray(attributes)) {
    return res.status(400).json({ message: 'Los atributos deben ser un objeto JSON' });
  }

  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ message: 'Producto no encontrado' });

    await product.update({ attributes });

    logger.info(`🔧 Atributos actualizados — Producto ID: ${req.params.id}`);
    res.json({ message: 'Atributos actualizados correctamente', attributes: product.attributes });
  } catch (err) {
    logger.error(`❌ updateAttributes: ${err.message}`);
    res.status(500).json({ message: 'Error al actualizar atributos' });
  }
};