const {
  sequelize,
  Quotation,
  QuotationItem,
  Product,
  ProductStock,
  User,
  InventoryMovement,
  Project,
} = require('../models');

const logger = require('../logger');

const VALID_PROJECT_TYPES = [
  'mano_obra',
  'material',
  'mixto',
];

const VALID_WAREHOUSES = [
  'central',
  'macororo',
];


// ======================================================
// CREAR COTIZACIÓN
// POST /api/quotations
// ======================================================

exports.createQuotation = async (req, res) => {

  const {
    clientName,
    clientCompany,
    clientPhone,
    clientEmail,

    projectType,

    serviceDescription,
    workDuration,

    paymentTerms,
    termsConditions,
    notes,

    validUntil,

    items,
  } = req.body;


  // ======================================================
  // VALIDACIONES BÁSICAS
  // ======================================================

  if (!clientName) {
    return res.status(400).json({
      message: 'El nombre del cliente es obligatorio',
    });
  }

  if (!projectType) {
    return res.status(400).json({
      message: 'El tipo de proyecto es obligatorio',
    });
  }

  if (!VALID_PROJECT_TYPES.includes(projectType)) {
    return res.status(400).json({
      message: `Tipo inválido. Válidos: ${VALID_PROJECT_TYPES.join(', ')}`,
    });
  }

  if (!validUntil) {
    return res.status(400).json({
      message: 'La fecha de validez es obligatoria',
    });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      message: 'Debe agregar al menos un producto',
    });
  }


  // ======================================================
  // TRANSACTION
  // ======================================================

  const transaction = await sequelize.transaction();

  try {

    // ======================================================
    // GENERAR NÚMERO DE COTIZACIÓN
    // ======================================================

    const quotationCount = await Quotation.count({
      transaction,
    });

    const quotationNumber =
      `COT-${String(quotationCount + 1).padStart(5, '0')}`;


    // ======================================================
    // VARIABLES
    // ======================================================

    let subtotal = 0;

    const quotationItems = [];


    // ======================================================
    // VALIDAR ITEMS
    // ======================================================

    for (const item of items) {

      const {
        productId,
        warehouseName,
        quantity,
      } = item;


      // ----------------------------------------------
      // VALIDAR DATOS
      // ----------------------------------------------

      if (!productId) {
        throw new Error('El productId es obligatorio');
      }

      if (!warehouseName) {
        throw new Error('El warehouseName es obligatorio');
      }

      if (!VALID_WAREHOUSES.includes(warehouseName)) {
        throw new Error(
          `Almacén inválido: ${warehouseName}`
        );
      }

      if (!quantity || quantity <= 0) {
        throw new Error(
          'La cantidad debe ser mayor a 0'
        );
      }


      // ----------------------------------------------
      // BUSCAR PRODUCTO
      // ----------------------------------------------

      const product = await Product.findByPk(productId, {
        transaction,
      });

      if (!product) {
        throw new Error(
          `Producto ID ${productId} no encontrado`
        );
      }


      // ----------------------------------------------
      // BUSCAR STOCK
      // ----------------------------------------------

      const stock = await ProductStock.findOne({
        where: {
          productId,
          warehouseName,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!stock) {
        throw new Error(
          `No existe stock del producto ${product.name} en ${warehouseName}`
        );
      }


      // ----------------------------------------------
      // VALIDAR DISPONIBILIDAD (SE PERMITE NEGATIVO)
      // ----------------------------------------------

      const available =
        parseFloat(stock.quantity) -
        parseFloat(stock.reservedQuantity);

      // Ahora permitimos stock negativo para que se pueda crear la cotización
      // y posteriormente se prepare el material.


      // ----------------------------------------------
      // RESERVAR STOCK
      // ----------------------------------------------

      stock.reservedQuantity =
        parseFloat(stock.reservedQuantity) +
        parseFloat(quantity);

      await stock.save({ transaction });


      // ----------------------------------------------
      // CALCULAR SUBTOTAL
      // ----------------------------------------------

      const itemSubtotal =
        parseFloat(product.price) *
        parseFloat(quantity);

      subtotal += itemSubtotal;


      // ----------------------------------------------
      // PREPARAR ITEM
      // ----------------------------------------------

      quotationItems.push({

        productId,

        warehouseName,

        quantity,

        reservedQuantity: quantity,

        unitPrice: product.price,

        subtotal: itemSubtotal,
      });
    }


    // ======================================================
    // CREAR COTIZACIÓN
    // ======================================================

    const quotation = await Quotation.create({

      quotationNumber,

      clientName,
      clientCompany,
      clientPhone,
      clientEmail,

      projectType,

      serviceDescription,
      workDuration,

      paymentTerms,
      termsConditions,
      notes,

      validUntil,

      subtotal,
      total: subtotal,

      status: 'pendiente',

      createdBy: req.user.id,

    }, { transaction });


    // ======================================================
    // CREAR ITEMS
    // ======================================================

    for (const itemData of quotationItems) {

      await QuotationItem.create({

        quotationId: quotation.id,

        ...itemData,

      }, { transaction });
    }


    // ======================================================
    // COMMIT
    // ======================================================

    await transaction.commit();


    logger.info(
      `📄 Cotización creada ${quotationNumber} por usuario ID ${req.user.id}`
    );


    // ======================================================
    // RESPUESTA
    // ======================================================

    const quotationCreated = await Quotation.findByPk(
      quotation.id,
      {
        include: [
          {
            model: QuotationItem,
            as: 'items',
            include: [
              {
                model: Product,
                as: 'product',
              },
            ],
          },
          {
            model: User,
            as: 'advisor',
            attributes: ['id', 'name', 'email'],
          },
        ],
      }
    );


    return res.status(201).json({

      message: 'Cotización creada correctamente',

      quotation: quotationCreated,
    });

  } catch (err) {

    // ======================================================
    // ROLLBACK
    // ======================================================

    await transaction.rollback();

    logger.error(
      `❌ createQuotation: ${err.message}`
    );

    return res.status(500).json({
      message: err.message,
    });
  }
};

// ======================================================
// APROBAR COTIZACIÓN
// PATCH /api/quotations/:id/approve
// ======================================================

exports.approveQuotation = async (req, res) => {

  const transaction = await sequelize.transaction();

  try {

    // ======================================================
    // BUSCAR COTIZACIÓN
    // ======================================================

    const quotation = await Quotation.findByPk(
      req.params.id,
      {
        include: [
          {
            model: QuotationItem,
            as: 'items',
          },
        ],
        transaction,
      }
    );

    if (!quotation) {
      throw new Error('Cotización no encontrada');
    }

    if (quotation.status !== 'pendiente') {
      throw new Error(
        'Solo se pueden aprobar cotizaciones pendientes'
      );
    }


    // ======================================================
    // RECORRER ITEMS
    // ======================================================

    for (const item of quotation.items) {

      const stock = await ProductStock.findOne({
        where: {
          productId: item.productId,
          warehouseName: item.warehouseName,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!stock) {
        throw new Error(
          `Stock no encontrado para producto ${item.productId}`
        );
      }


      // ======================================================
      // DESCONTAR STOCK REAL
      // ======================================================

      stock.quantity =
        parseFloat(stock.quantity) -
        parseFloat(item.quantity);


      // ======================================================
      // LIBERAR RESERVA
      // ======================================================

      stock.reservedQuantity =
        parseFloat(stock.reservedQuantity) -
        parseFloat(item.quantity);


      // ======================================================
      // VALIDACIONES
      // ======================================================

      // Se permite que stock.quantity quede en negativo para la preparación posterior
      // if (stock.quantity < 0) { ... }

      if (stock.reservedQuantity < 0) {
        stock.reservedQuantity = 0;
      }


      // ======================================================
      // GUARDAR STOCK
      // ======================================================

      await stock.save({ transaction });

      await InventoryMovement.create({
        productId:       item.productId,
        warehouseName:   item.warehouseName,
        type:            'salida',
        quantity:        parseFloat(item.quantity),
        reason:          'aprobacion_cotizacion',
        referenceId:     quotation.id,
        referenceNumber: quotation.quotationNumber,
        createdBy:       req.user.id,
        stockAfter:      parseFloat(stock.quantity),
      }, { transaction });
    }


    // ======================================================
    // CAMBIAR ESTADO A APROBADA Y CREAR PROYECTO
    // ======================================================

    quotation.status = 'aprobada';

    await quotation.save({ transaction });

    // Crear el proyecto automáticamente
    await Project.create({
      quotationId: quotation.id,
      status: 'en_ejecucion',
    }, { transaction });


    // ======================================================
    // COMMIT
    // ======================================================

    await transaction.commit();


    logger.info(
      `✅ Cotización aprobada ID ${quotation.id}`
    );

    return res.json({
      message: 'Cotización aprobada correctamente',
    });

  } catch (err) {

    // ======================================================
    // ROLLBACK
    // ======================================================

    await transaction.rollback();

    logger.error(
      `❌ approveQuotation: ${err.message}`
    );

    return res.status(500).json({
      message: err.message,
    });
  }
};

// ======================================================
// CANCELAR COTIZACIÓN
// PATCH /api/quotations/:id/cancel
// ======================================================

exports.cancelQuotation = async (req, res) => {

  const transaction = await sequelize.transaction();

  try {

    // ======================================================
    // BUSCAR COTIZACIÓN
    // ======================================================

    const quotation = await Quotation.findByPk(
      req.params.id,
      {
        include: [
          {
            model: QuotationItem,
            as: 'items',
          },
        ],
        transaction,
      }
    );

    if (!quotation) {
      throw new Error('Cotización no encontrada');
    }

    if (quotation.status !== 'pendiente') {
      throw new Error(
        'Solo se pueden cancelar cotizaciones pendientes'
      );
    }


    // ======================================================
    // LIBERAR RESERVAS
    // ======================================================

    for (const item of quotation.items) {

      const stock = await ProductStock.findOne({
        where: {
          productId: item.productId,
          warehouseName: item.warehouseName,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!stock) continue;


      // ======================================================
      // LIBERAR RESERVA
      // ======================================================

      stock.reservedQuantity =
        parseFloat(stock.reservedQuantity) -
        parseFloat(item.quantity);


      // ======================================================
      // VALIDACIÓN
      // ======================================================

      if (stock.reservedQuantity < 0) {
        stock.reservedQuantity = 0;
      }


      // ======================================================
      // GUARDAR
      // ======================================================

      await stock.save({ transaction });
    }


    // ======================================================
    // CAMBIAR ESTADO
    // ======================================================

    quotation.status = 'cancelada';

    await quotation.save({ transaction });


    // ======================================================
    // COMMIT
    // ======================================================

    await transaction.commit();


    logger.info(
      `❌ Cotización cancelada ID ${quotation.id}`
    );

    return res.json({
      message: 'Cotización cancelada correctamente',
    });

  } catch (err) {

    // ======================================================
    // ROLLBACK
    // ======================================================

    await transaction.rollback();

    logger.error(
      `❌ cancelQuotation: ${err.message}`
    );

    return res.status(500).json({
      message: err.message,
    });
  }
};



// ======================================================
// LISTAR COTIZACIONES
// GET /api/quotations
// ======================================================

exports.listQuotations = async (req, res) => {

  try {

    const quotations = await Quotation.findAll({

      include: [

        // ==================================================
        // ITEMS
        // ==================================================

        {
          model: QuotationItem,
          as: 'items',

          include: [
            {
              model: Product,
              as: 'product',
            },
          ],
        },

        // ==================================================
        // ASESOR
        // ==================================================

        {
          model: User,
          as: 'advisor',
          attributes: ['id', 'name', 'email'],
        },
      ],

      order: [['createdAt', 'DESC']],
    });


    return res.json({
      total: quotations.length,
      data: quotations,
    });

  } catch (err) {

    logger.error(
      `❌ listQuotations: ${err.message}`
    );

    return res.status(500).json({
      message: 'Error al listar cotizaciones',
    });
  }
};

// ======================================================
// OBTENER UNA COTIZACIÓN
// GET /api/quotations/:id
// ======================================================

exports.getQuotation = async (req, res) => {

  try {

    const quotation = await Quotation.findByPk(
      req.params.id,
      {

        include: [

          // ==============================================
          // ITEMS
          // ==============================================

          {
            model: QuotationItem,
            as: 'items',

            include: [
              {
                model: Product,
                as: 'product',
              },
            ],
          },

          // ==============================================
          // ASESOR
          // ==============================================

          {
            model: User,
            as: 'advisor',
            attributes: ['id', 'name', 'email'],
          },
        ],
      }
    );


    // ==================================================
    // NO ENCONTRADA
    // ==================================================

    if (!quotation) {

      return res.status(404).json({
        message: 'Cotización no encontrada',
      });
    }


    // ==================================================
    // RESPUESTA
    // ==================================================

    return res.json(quotation);

  } catch (err) {

    logger.error(
      `❌ getQuotation: ${err.message}`
    );

    return res.status(500).json({
      message: 'Error al obtener cotización',
    });
  }
};