const { Op } = require('sequelize');
const {
  InventoryMovement,
  Product,
  User,
  Quotation,
} = require('../models');

const logger = require('../logger');

const VALID_WAREHOUSES = ['central', 'macororo'];
const VALID_TYPES      = ['ingreso', 'salida'];
const VALID_REASONS    = ['registro_manual', 'aprobacion_cotizacion', 'ajuste_manual'];


// ======================================================
// LISTAR MOVIMIENTOS
// GET /api/inventory-movements
//
// Query params opcionales:
//   productId    — filtrar por producto
//   warehouseName — filtrar por almacén
//   type         — 'ingreso' | 'salida'
//   reason       — razón del movimiento
//   from         — fecha inicio (ISO)
//   to           — fecha fin (ISO)
//   page         — página (default 1)
//   limit        — por página (default 20)
// ======================================================

exports.listMovements = async (req, res) => {

  const {
    productId,
    warehouseName,
    type,
    reason,
    from,
    to,
    page  = 1,
    limit = 20,
  } = req.query;

  try {

    const where = {};

    if (productId)    where.productId     = productId;
    if (warehouseName) where.warehouseName = warehouseName;
    if (type)         where.type          = type;
    if (reason)       where.reason        = reason;

    // Filtro de rango de fechas
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt[Op.gte] = new Date(from);
      if (to)   where.createdAt[Op.lte] = new Date(to);
    }

    const movements = await InventoryMovement.findAndCountAll({
      where,
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'code', 'name', 'unit', 'category'],
        },
        {
          model: User,
          as: 'createdByUser',
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit:  parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    return res.json({
      total:      movements.count,
      page:       parseInt(page),
      totalPages: Math.ceil(movements.count / parseInt(limit)),
      data:       movements.rows,
    });

  } catch (err) {
    logger.error(`❌ listMovements: ${err.message}`);
    return res.status(500).json({ message: 'Error al listar movimientos' });
  }
};


// ======================================================
// OBTENER UN MOVIMIENTO
// GET /api/inventory-movements/:id
// ======================================================

exports.getMovement = async (req, res) => {

  try {

    const movement = await InventoryMovement.findByPk(req.params.id, {
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'code', 'name', 'unit', 'category'],
        },
        {
          model: User,
          as: 'createdByUser',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: Quotation,
          as: 'quotation',
          attributes: ['id', 'quotationNumber', 'clientName', 'status'],
          required: false,
        },
      ],
    });

    if (!movement) {
      return res.status(404).json({ message: 'Movimiento no encontrado' });
    }

    return res.json(movement);

  } catch (err) {
    logger.error(`❌ getMovement: ${err.message}`);
    return res.status(500).json({ message: 'Error al obtener movimiento' });
  }
};


// ======================================================
// LISTAR MOVIMIENTOS DE UN PRODUCTO
// GET /api/inventory-movements/product/:productId
// ======================================================

exports.getMovementsByProduct = async (req, res) => {

  const { page = 1, limit = 20 } = req.query;

  try {

    const movements = await InventoryMovement.findAndCountAll({
      where: { productId: req.params.productId },
      include: [
        {
          model: User,
          as: 'createdByUser',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: Quotation,
          as: 'quotation',
          attributes: ['id', 'quotationNumber', 'clientName'],
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
      limit:  parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    return res.json({
      total:      movements.count,
      page:       parseInt(page),
      totalPages: Math.ceil(movements.count / parseInt(limit)),
      data:       movements.rows,
    });

  } catch (err) {
    logger.error(`❌ getMovementsByProduct: ${err.message}`);
    return res.status(500).json({ message: 'Error al obtener movimientos del producto' });
  }
};


// ======================================================
// RESUMEN DE MOVIMIENTOS
// GET /api/inventory-movements/summary
//
// Devuelve totales agrupados por tipo y almacén
// útil para un dashboard de inventario
// ======================================================

exports.getMovementsSummary = async (req, res) => {

  const { productId, warehouseName, from, to } = req.query;

  try {

    const where = {};

    if (productId)     where.productId     = productId;
    if (warehouseName) where.warehouseName = warehouseName;

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt[Op.gte] = new Date(from);
      if (to)   where.createdAt[Op.lte] = new Date(to);
    }

    const movements = await InventoryMovement.findAll({ where });

    // Calcular totales
    const summary = {
      totalIngresos: 0,
      totalSalidas:  0,
      byWarehouse: {
        central:  { ingresos: 0, salidas: 0 },
        macororo: { ingresos: 0, salidas: 0 },
      },
      byReason: {},
    };

    movements.forEach((m) => {

      const qty  = parseFloat(m.quantity);
      const wh   = m.warehouseName;
      const type = m.type;

      if (type === 'ingreso') {
        summary.totalIngresos += qty;
        if (summary.byWarehouse[wh]) summary.byWarehouse[wh].ingresos += qty;
      } else {
        summary.totalSalidas += qty;
        if (summary.byWarehouse[wh]) summary.byWarehouse[wh].salidas += qty;
      }

      // Por razón
      if (!summary.byReason[m.reason]) {
        summary.byReason[m.reason] = 0;
      }
      summary.byReason[m.reason] += qty;
    });

    return res.json(summary);

  } catch (err) {
    logger.error(`❌ getMovementsSummary: ${err.message}`);
    return res.status(500).json({ message: 'Error al obtener resumen' });
  }
};