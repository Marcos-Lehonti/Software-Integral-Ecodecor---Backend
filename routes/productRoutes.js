const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorize');

// Cualquier usuario autenticado puede ver productos
router.get('/', authMiddleware, productController.listProducts);
router.get('/:id', authMiddleware, productController.getProduct);

// Solo administrador puede crear, editar y eliminar
router.post('/', authMiddleware, authorize('create', 'Product'), productController.createProduct);
router.put('/:id', authMiddleware, authorize('update', 'Product'), productController.updateProduct);
router.delete('/:id', authMiddleware, authorize('delete', 'Product'), productController.deleteProduct);
router.put('/:id/stock', authMiddleware, authorize('update', 'Product'), productController.updateStock);
router.put('/:id/attributes', authMiddleware, authorize('update', 'Product'), productController.updateAttributes);

module.exports = router;