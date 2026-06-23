const {
  sequelize,
  Project,
  ProjectMaterialMovement,
  Quotation,
  QuotationItem,
  Product,
  ProductStock,
  User,
  InventoryMovement,
} = require('../models');

const logger = require('../logger');

// ======================================================
// LISTAR PROYECTOS
// GET /api/projects
// ======================================================
exports.listProjects = async (req, res) => {
  try {
    const projects = await Project.findAll({
      include: [
        {
          model: Quotation,
          as: 'quotation',
          attributes: ['quotationNumber', 'clientName', 'clientCompany', 'total'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    return res.json({
      total: projects.length,
      data: projects,
    });
  } catch (err) {
    logger.error(`❌ listProjects: ${err.message}`);
    return res.status(500).json({ message: 'Error al listar proyectos' });
  }
};

// ======================================================
// OBTENER DETALLE DE UN PROYECTO
// GET /api/projects/:id
// ======================================================
exports.getProjectDetails = async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id, {
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
            {
              model: User,
              as: 'advisor',
              attributes: ['id', 'name', 'email'],
            },
          ],
        },
        {
          model: ProjectMaterialMovement,
          as: 'materialMovements',
          include: [
            { model: Product, as: 'product' },
            { model: User, as: 'user', attributes: ['id', 'name'] },
          ],
        },
      ],
      order: [[{ model: ProjectMaterialMovement, as: 'materialMovements' }, 'createdAt', 'DESC']],
    });

    if (!project) {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }

    return res.json(project);
  } catch (err) {
    logger.error(`❌ getProjectDetails: ${err.message}`);
    return res.status(500).json({ message: 'Error al obtener proyecto' });
  }
};

// ======================================================
// AÑADIR MOVIMIENTO DE MATERIAL AL PROYECTO
// POST /api/projects/:id/movements
// ======================================================
exports.addMaterialMovement = async (req, res) => {
  const { productId, warehouseName, type, quantity, reason } = req.body;
  
  if (!productId || !warehouseName || !type || !quantity) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios' });
  }

  if (!['entrada', 'salida'].includes(type)) {
    return res.status(400).json({ message: 'El tipo debe ser entrada o salida' });
  }

  const transaction = await sequelize.transaction();

  try {
    const project = await Project.findByPk(req.params.id, { 
      include: [{ model: Quotation, as: 'quotation', attributes: ['id', 'quotationNumber'] }],
      transaction 
    });

    if (!project) {
      throw new Error('Proyecto no encontrado');
    }

    if (project.status === 'finalizado') {
      throw new Error('No se pueden agregar movimientos a un proyecto finalizado');
    }

    const stock = await ProductStock.findOne({
      where: { productId, warehouseName },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!stock) {
      throw new Error(`Stock no encontrado para producto en ${warehouseName}`);
    }

    // Actualizar inventario físico
    if (type === 'salida') {
      // Solicitud de material adicional (sale del inventario)
      if (parseFloat(stock.quantity) < parseFloat(quantity)) {
        throw new Error('Stock insuficiente en el almacén');
      }
      stock.quantity = parseFloat(stock.quantity) - parseFloat(quantity);
    } else {
      // Devolución de material (entra al inventario)
      stock.quantity = parseFloat(stock.quantity) + parseFloat(quantity);
    }

    await stock.save({ transaction });

    // Registrar el movimiento en el historial general de inventario
    await InventoryMovement.create({
      productId,
      warehouseName,
      type: type === 'salida' ? 'salida' : 'ingreso', // en InventoryMovement es 'ingreso' o 'salida'
      quantity: parseFloat(quantity),
      reason: 'aprobacion_cotizacion',
      referenceId: project.quotationId,
      referenceNumber: project.quotation.quotationNumber,
      createdBy: req.user.id,
      stockAfter: parseFloat(stock.quantity),
    }, { transaction });

    // Registrar el movimiento en el historial del proyecto
    const projectMovement = await ProjectMaterialMovement.create({
      projectId: project.id,
      productId,
      warehouseName,
      type,
      quantity: parseFloat(quantity),
      reason,
      createdBy: req.user.id,
    }, { transaction });

    await transaction.commit();

    logger.info(`📦 Movimiento de proyecto agregado (Proyecto: ${project.id})`);
    
    // Obtener el movimiento con relaciones para devolverlo al frontend
    const newMovement = await ProjectMaterialMovement.findByPk(projectMovement.id, {
      include: [
        { model: Product, as: 'product' },
        { model: User, as: 'user', attributes: ['id', 'name'] },
      ]
    });

    return res.status(201).json({
      message: 'Movimiento registrado correctamente',
      movement: newMovement,
    });

  } catch (err) {
    await transaction.rollback();
    logger.error(`❌ addMaterialMovement: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
};

// ======================================================
// FINALIZAR PROYECTO
// PATCH /api/projects/:id/finish
// ======================================================
exports.finishProject = async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }

    if (project.status === 'finalizado') {
      return res.status(400).json({ message: 'El proyecto ya está finalizado' });
    }

    project.status = 'finalizado';
    project.endDate = new Date();
    await project.save();

    logger.info(`✅ Proyecto finalizado ID: ${project.id}`);

    return res.json({ message: 'Proyecto finalizado correctamente', project });
  } catch (err) {
    logger.error(`❌ finishProject: ${err.message}`);
    return res.status(500).json({ message: 'Error al finalizar proyecto' });
  }
};
