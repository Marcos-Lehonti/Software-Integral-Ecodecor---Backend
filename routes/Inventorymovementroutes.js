const express = require('express');
const router  = express.Router();

const inventoryMovementController = require('../controllers/inventoryMovementController');
const authMiddleware              = require('../middleware/authMiddleware');
const authorize                   = require('../middleware/authorize');


// ======================================================
// Todos los autenticados pueden consultar movimientos
// ======================================================

// GET /api/inventory-movements
router.get(
  '/',
  authMiddleware,
  inventoryMovementController.listMovements
);

// GET /api/inventory-movements/summary
router.get(
  '/summary',
  authMiddleware,
  inventoryMovementController.getMovementsSummary
);

// GET /api/inventory-movements/product/:productId
router.get(
  '/product/:productId',
  authMiddleware,
  inventoryMovementController.getMovementsByProduct
);

// GET /api/inventory-movements/:id
router.get(
  '/:id',
  authMiddleware,
  inventoryMovementController.getMovement
);


module.exports = router;