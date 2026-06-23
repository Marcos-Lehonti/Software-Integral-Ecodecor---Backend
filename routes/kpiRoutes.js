const express = require('express');
const router  = express.Router();

const kpiController  = require('../controllers/kpiController');
const authMiddleware = require('../middleware/authMiddleware');
const authorize      = require('../middleware/authorize');


// ======================================================
// GET /api/kpis
// Solo administrador puede ver los KPIs
// ======================================================

router.get(
  '/',
  authMiddleware,
  authorize('read', 'Kpi'),
  kpiController.getKpis
);


module.exports = router;