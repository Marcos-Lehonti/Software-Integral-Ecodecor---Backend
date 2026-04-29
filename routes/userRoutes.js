const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorize');

// Perfil propio (cualquier usuario autenticado)
router.get('/profile', authMiddleware, userController.getProfile);
router.put('/profile', authMiddleware, userController.updateProfile);
router.put('/profile/password', authMiddleware, userController.changePassword);

// Solo administrador
router.get('/list', authMiddleware, authorize('read', 'User'), userController.listUsers);
router.put('/:id/role', authMiddleware, authorize('update', 'User'), userController.changeUserRole);
// 🧨 ELIMINAR USUARIO
router.delete('/:id', authMiddleware, authorize('delete', 'User'), userController.deleteUser);

module.exports = router;