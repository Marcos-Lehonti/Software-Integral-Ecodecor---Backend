const express = require('express');
const router = express.Router();
const preparationController = require('../controllers/preparationController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/pending', preparationController.getPendingRequests);
router.post('/', preparationController.createPreparation);

module.exports = router;
