const {
  sequelize,
  Project,
  Quotation,
  QuotationItem,
  Product,
  ProductStock,
  MaterialPreparation,
  MaterialPreparationItem,
  InventoryMovement,
  User
} = require('../models');
const logger = require('../logger');

// ======================================================
// OBTENER SOLICITUDES PENDIENTES (Proyectos Activos)
// GET /api/preparations/pending
// ======================================================
exports.getPendingRequests = async (req, res) => {
  try {
    const projects = await Project.findAll({
      where: { status: 'en_ejecucion' },
      include: [
        {
          model: Quotation,
          as: 'quotation',
          include: [
            {
              model: QuotationItem,
              as: 'items',
              include: [{ model: Product, as: 'product' }],
            },
          ],
        },
        {
          model: MaterialPreparation,
          as: 'preparations',
          include: [
            {
              model: MaterialPreparationItem,
              as: 'items',
              include: [{ model: Product, as: 'inputProduct' }]
            },
            { model: Product, as: 'outputProduct' },
            { model: User, as: 'user', attributes: ['name'] }
          ]
        }
      ],
      order: [['createdAt', 'DESC']],
    });

    return res.json({ data: projects });
  } catch (error) {
    logger.error(`❌ getPendingRequests: ${error.message}`);
    return res.status(500).json({ message: 'Error al obtener solicitudes pendientes' });
  }
};

// ======================================================
// REGISTRAR PREPARACIÓN DE MATERIAL
// POST /api/preparations
// ======================================================
exports.createPreparation = async (req, res) => {
  const { outputProductId, outputQuantity, warehouseName, projectId, items } = req.body;

  if (!outputProductId || !outputQuantity || !warehouseName || !items || items.length === 0) {
    return res.status(400).json({ message: 'Faltan datos obligatorios para la preparación' });
  }

  const transaction = await sequelize.transaction();

  try {
    // 1. Crear Cabecera de Preparación
    const preparation = await MaterialPreparation.create({
      outputProductId,
      outputQuantity: parseFloat(outputQuantity),
      warehouseName,
      projectId: projectId || null,
      createdBy: req.user.id,
    }, { transaction });

    // Obtener nAomero de cotizaciAon si aplica
    let refNumber = `PREP-${preparation.id}`;
    if (projectId) {
      const project = await Project.findByPk(projectId, {
        include: [{ model: Quotation, as: 'quotation' }],
        transaction
      });
      if (project && project.quotation) {
        refNumber = `PREP-${preparation.id} / ${project.quotation.quotationNumber}`;
      }
    }

    // 2. Procesar Insumos Consumidos
    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity <= 0) {
        throw new Error('Insumo inválido en la lista');
      }

      // Descontar stock del insumo
      const inputStock = await ProductStock.findOne({
        where: { productId: item.productId, warehouseName },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!inputStock) {
        throw new Error(`Stock no encontrado para insumo ID ${item.productId}`);
      }

      inputStock.quantity = parseFloat(inputStock.quantity) - parseFloat(item.quantity);
      await inputStock.save({ transaction });

      // Registrar movimiento de salida para insumo
      await InventoryMovement.create({
        productId: item.productId,
        warehouseName,
        type: 'salida',
        quantity: parseFloat(item.quantity),
        reason: 'ajuste_manual', // Deberíamos agregar 'preparacion_insumo' al ENUM idealmente, usamos ajuste por ahora para no romper DB
        referenceId: preparation.id,
        referenceNumber: refNumber,
        createdBy: req.user.id,
        stockAfter: parseFloat(inputStock.quantity),
      }, { transaction });

      // Guardar detalle de la receta
      await MaterialPreparationItem.create({
        preparationId: preparation.id,
        inputProductId: item.productId,
        consumedQuantity: parseFloat(item.quantity),
      }, { transaction });
    }

    // 3. Incrementar Stock del Producto Final
    let outputStock = await ProductStock.findOne({
      where: { productId: outputProductId, warehouseName },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!outputStock) {
      // Si no existe, crearlo (muy raro en un sistema configurado pero posible)
      outputStock = await ProductStock.create({
        productId: outputProductId,
        warehouseName,
        quantity: parseFloat(outputQuantity),
        reservedQuantity: 0,
        minQuantity: 0,
      }, { transaction });
    } else {
      outputStock.quantity = parseFloat(outputStock.quantity) + parseFloat(outputQuantity);
      await outputStock.save({ transaction });
    }

    // Registrar movimiento de ingreso para producto final
    await InventoryMovement.create({
      productId: outputProductId,
      warehouseName,
      type: 'ingreso',
      quantity: parseFloat(outputQuantity),
      reason: 'ajuste_manual', // idealmente 'preparacion_producto'
      referenceId: preparation.id,
      referenceNumber: refNumber,
      createdBy: req.user.id,
      stockAfter: parseFloat(outputStock.quantity),
    }, { transaction });

    await transaction.commit();
    logger.info(`🧪 Preparación de material creada con éxito: PREP-${preparation.id}`);

    return res.status(201).json({ message: 'Material preparado exitosamente', preparation });
  } catch (error) {
    await transaction.rollback();
    logger.error(`❌ createPreparation: ${error.message}`);
    return res.status(500).json({ message: error.message });
  }
};
