const express = require('express');

const router = express.Router();

const quotationPdfController = require(
  '../controllers/quotationPdfController'
);

const authMiddleware = require(
  '../middleware/authMiddleware'
);


// ======================================================
// GENERAR PDF DE COTIZACIÓN
// GET /api/quotation-pdf/:id/pdf
// ======================================================

router.get(
  '/:id/pdf',
  authMiddleware,
  quotationPdfController.generateQuotationPdf
);


module.exports = router;