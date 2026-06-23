const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, projectController.listProjects);
router.get('/:id', authMiddleware, projectController.getProjectDetails);
router.post('/:id/movements', authMiddleware, projectController.addMaterialMovement);
router.patch('/:id/finish', authMiddleware, projectController.finishProject);

module.exports = router;
