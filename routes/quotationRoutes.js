const express = require('express');

const router = express.Router();

const quotationController = require('../controllers/quotationController');

const authMiddleware = require('../middleware/authMiddleware');


// ======================================================
// CREAR COTIZACIÓN
// POST /api/quotations
// ======================================================

router.post(
  '/',
  authMiddleware,
  quotationController.createQuotation
);

router.get(
  '/',
  authMiddleware,
  quotationController.listQuotations
);

router.get(
  '/:id',
  authMiddleware,
  quotationController.getQuotation
);


router.patch(
  '/:id/approve',
  authMiddleware,
  quotationController.approveQuotation
);

router.patch(
  '/:id/cancel',
  authMiddleware,
  quotationController.cancelQuotation
);


module.exports = router;