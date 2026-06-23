const express = require('express');

const router = express.Router();

const quotationEmailController = require(
  '../controllers/quotationEmailController'
);

const authMiddleware = require(
  '../middleware/authMiddleware'
);


// ======================================================
// ENVIAR PDF POR EMAIL
// POST /api/quotation-email/:id/send
// ======================================================

router.post(
  '/:id/send',
  authMiddleware,
  quotationEmailController.sendQuotationPdfEmail
);

module.exports = router;