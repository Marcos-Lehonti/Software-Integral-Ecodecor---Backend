const { Op, fn, col, literal } = require('sequelize');
const {
  sequelize,
  Quotation,
  QuotationItem,
  Product,
  ProductStock,
  InventoryMovement,
  Project,
  ProjectMaterialMovement,
  User,
} = require('../models');

const logger = require('../logger');


// ======================================================
// GET /api/kpis
// Devuelve todos los KPIs del negocio en una sola llamada
// ======================================================

exports.getKpis = async (req, res) => {

  try {

    // ======================================================
    // KPI 1 — COTIZACIONES POR ESTADO
    // ======================================================

    const quotationsByStatus = await Quotation.findAll({
      attributes: [
        'status',
        [fn('COUNT', col('id')), 'total'],
      ],
      group: ['status'],
      raw: true,
    });


    // ======================================================
    // KPI 2 — MONTO TOTAL FACTURADO (solo aprobadas)
    // ======================================================

    const totalBilled = await Quotation.sum('total', {
      where: { status: 'aprobada' },
    });


    // ======================================================
    // KPI 3 — COTIZACIONES POR TIPO DE PROYECTO
    // ======================================================

    const quotationsByType = await Quotation.findAll({
      attributes: [
        'projectType',
        [fn('COUNT', col('id')), 'total'],
      ],
      group: ['projectType'],
      raw: true,
    });


    // ======================================================
    // KPI 4 — TOP 5 ASESORES POR COTIZACIONES GENERADAS
    // ======================================================

    const topAdvisors = await Quotation.findAll({
      attributes: [
        'createdBy',
        [fn('COUNT', col('Quotation.id')), 'totalQuotations'],
        [fn('SUM', col('total')), 'totalAmount'],
      ],
      include: [
        {
          model: User,
          as: 'advisor',
          attributes: ['id', 'name', 'email'],
        },
      ],
      group: ['createdBy', 'advisor.id'],
      order: [[literal('"totalQuotations"'), 'DESC']],
      limit: 5,
      raw: false,
    });


    // ======================================================
    // KPI 5 — TOTAL INGRESOS VS SALIDAS DE INVENTARIO
    // ======================================================

    const movementsTotals = await InventoryMovement.findAll({
      attributes: [
        'type',
        [fn('SUM', col('quantity')), 'totalQuantity'],
        [fn('COUNT', col('id')), 'totalMovements'],
      ],
      group: ['type'],
      raw: true,
    });


    // ======================================================
    // KPI 6 — MOVIMIENTOS POR ALMACÉN
    // ======================================================

    const movementsByWarehouse = await InventoryMovement.findAll({
      attributes: [
        'warehouseName',
        'type',
        [fn('SUM', col('quantity')), 'totalQuantity'],
      ],
      group: ['warehouseName', 'type'],
      raw: true,
    });


    // ======================================================
    // KPI 7 — MOVIMIENTOS POR RAZÓN
    // ======================================================

    const movementsByReason = await InventoryMovement.findAll({
      attributes: [
        'reason',
        [fn('COUNT', col('id')), 'total'],
        [fn('SUM', col('quantity')), 'totalQuantity'],
      ],
      group: ['reason'],
      raw: true,
    });


    // ======================================================
    // KPI 8 — PRODUCTOS CON STOCK BAJO (menos de 10 unidades disponibles)
    // ======================================================

    const lowStockProducts = await ProductStock.findAll({
      where: {
        quantity: { [Op.lt]: 10 },
      },
      include: [
        {
          model: Product,
          attributes: ['id', 'code', 'name', 'unit', 'category'],
        },
      ],
      order: [['quantity', 'ASC']],
    });


    // ======================================================
    // KPI 9 — STOCK TOTAL POR CATEGORÍA
    // ======================================================

    const stockByCategory = await ProductStock.findAll({
      attributes: [
        [fn('SUM', col('ProductStock.quantity')), 'totalStock'],
        [fn('SUM', col('ProductStock.reservedQuantity')), 'totalReserved'],
      ],
      include: [
        {
          model: Product,
          attributes: ['category'],
        },
      ],
      group: ['Product.category', 'Product.id'],
      raw: false,
    });

    // Agrupar por categoría manualmente
    const stockByCategoryMap = {};
    stockByCategory.forEach((row) => {
      const cat = row.Product?.category || 'sin_categoria';
      if (!stockByCategoryMap[cat]) {
        stockByCategoryMap[cat] = { totalStock: 0, totalReserved: 0 };
      }
      stockByCategoryMap[cat].totalStock    += parseFloat(row.dataValues.totalStock   || 0);
      stockByCategoryMap[cat].totalReserved += parseFloat(row.dataValues.totalReserved || 0);
    });


    // ======================================================
    // KPI 10 — TOP 5 PRODUCTOS MÁS COTIZADOS (en cotizaciones aprobadas)
    // ======================================================

    const topProducts = await QuotationItem.findAll({
      attributes: [
        'productId',
        [fn('COUNT', col('QuotationItem.id')), 'timesCotized'],
        [fn('SUM', col('QuotationItem.quantity')), 'totalQuantity'],
        [fn('SUM', col('QuotationItem.subtotal')), 'totalRevenue'],
      ],
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'code', 'name', 'unit', 'category'],
        },
        {
          model: Quotation,
          attributes: [],
          where: { status: 'aprobada' },
        },
      ],
      group: ['productId', 'product.id'],
      order: [[literal('"totalRevenue"'), 'DESC']],
      limit: 5,
      raw: false,
    });


    // ======================================================
    // KPI 11 — RESUMEN GENERAL (tarjetas principales)
    // ======================================================

    const totalProducts   = await Product.count();
    const totalUsers      = await User.count();
    const totalQuotations = await Quotation.count();
    const totalMovements  = await InventoryMovement.count();


    // ======================================================
    // KPI 12 — COTIZACIONES ÚLTIMOS 7 DÍAS
    // ======================================================

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentQuotations = await Quotation.findAll({
      attributes: [
        [fn('DATE', col('createdAt')), 'date'],
        [fn('COUNT', col('id')), 'total'],
        [fn('SUM', col('total')), 'amount'],
      ],
      where: {
        createdAt: { [Op.gte]: sevenDaysAgo },
      },
      group: [fn('DATE', col('createdAt'))],
      order: [[fn('DATE', col('createdAt')), 'ASC']],
      raw: true,
    });


    // ======================================================
    // KPI 13 — RENTABILIDAD POR PROYECTO (Ingresos vs Costos)
    // ======================================================

    const projectProfitability = await sequelize.query(`
      SELECT 
        p.id AS "projectId",
        q."quotationNumber",
        q."clientName",
        q.total AS ingresos,
        (
          -- Costo base de los items de la cotización
          COALESCE((SELECT SUM(qi.subtotal) FROM quotation_items qi WHERE qi."quotationId" = q.id), 0)
          +
          -- Costo de movimientos extra (salidas sumadas, entradas restadas)
          COALESCE((
            SELECT SUM(
              CASE 
                WHEN pmm.type = 'salida' THEN pmm.quantity * pr.price
                WHEN pmm.type = 'entrada' THEN -(pmm.quantity * pr.price)
                ELSE 0
              END
            )
            FROM project_material_movements pmm
            JOIN products pr ON pr.id = pmm."productId"
            WHERE pmm."projectId" = p.id
          ), 0)
        ) AS costos
      FROM projects p
      JOIN quotations q ON q.id = p."quotationId"
      ORDER BY p.id DESC
      LIMIT 10
    `, { type: sequelize.QueryTypes.SELECT });

    // Calculamos ganancia para cada proyecto
    const profitability = projectProfitability.map(p => {
      const ing = parseFloat(p.ingresos || 0);
      const cst = parseFloat(p.costos || 0);
      return {
        ...p,
        ingresos: ing,
        costos: cst,
        ganancia: ing - cst
      };
    });


    // ======================================================
    // RESPUESTA FINAL
    // ======================================================

    return res.json({

      // Tarjetas resumen
      summary: {
        totalProducts,
        totalUsers,
        totalQuotations,
        totalMovements,
        totalBilled: parseFloat(totalBilled || 0),
      },

      // Cotizaciones
      quotations: {
        byStatus:      quotationsByStatus,
        byProjectType: quotationsByType,
        last7Days:     recentQuotations,
      },

      // Asesores
      topAdvisors: topAdvisors.map((a) => ({
        id:              a.advisor?.id,
        name:            a.advisor?.name,
        email:           a.advisor?.email,
        totalQuotations: parseInt(a.dataValues.totalQuotations),
        totalAmount:     parseFloat(a.dataValues.totalAmount || 0),
      })),

      // Inventario
      inventory: {
        movementsTotals,
        byWarehouse:    movementsByWarehouse,
        byReason:       movementsByReason,
        lowStockProducts: lowStockProducts.map((s) => ({
          productId:     s.productId,
          warehouseName: s.warehouseName,
          quantity:      parseFloat(s.quantity),
          reserved:      parseFloat(s.reservedQuantity),
          available:     parseFloat(s.quantity) - parseFloat(s.reservedQuantity),
          product:       s.Product,
        })),
        stockByCategory: stockByCategoryMap,
      },

      // Productos
      topProducts: topProducts.map((p) => ({
        productId:     p.productId,
        product:       p.product,
        timesCotized:  parseInt(p.dataValues.timesCotized),
        totalQuantity: parseFloat(p.dataValues.totalQuantity || 0),
        totalRevenue:  parseFloat(p.dataValues.totalRevenue  || 0),
      })),

      // Rentabilidad
      profitability,

    });

  } catch (err) {
    logger.error(`❌ getKpis: ${err.message}`);
    return res.status(500).json({ message: 'Error al obtener KPIs' });
  }
};