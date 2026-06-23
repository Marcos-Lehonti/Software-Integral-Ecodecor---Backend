const { Router } = require('express');
const { generateText, generateJson, chat, chatInventario } = require('../controllers/aiController');
const router = Router();

router.post('/text', generateText);
router.post('/json', generateJson);
router.post('/chat', chat);
router.post('/chat-inventario', chatInventario); 

module.exports = router;