const { GoogleGenerativeAI } = require('@google/generative-ai');
const { 
  Quotation, Product, ProductStock, 
  InventoryMovement, User, QuotationItem 
} = require('../models');
const { fn, col, Op, literal } = require('sequelize');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });

const jsonModel = genAI.getGenerativeModel({
  model: 'gemini-3.1-flash-lite',
  generationConfig: { responseMimeType: 'application/json' },
});

// Función interna que obtiene los KPIs sin HTTP
const fetchKpis = async () => {
  const totalProducts   = await Product.count();
  const totalQuotations = await Quotation.count();
  const totalMovements  = await InventoryMovement.count();
  const totalBilled     = await Quotation.sum('total', { where: { status: 'aprobada' } });

  const quotationsByStatus = await Quotation.findAll({
    attributes: ['status', [fn('COUNT', col('id')), 'total']],
    group: ['status'],
    raw: true,
  });

  const lowStockProducts = await ProductStock.findAll({
    where: { quantity: { [Op.lt]: 10 } },
    include: [{ model: Product, attributes: ['id', 'code', 'name', 'unit', 'category'] }],
    order: [['quantity', 'ASC']],
  });

  const topProducts = await QuotationItem.findAll({
    attributes: [
      'productId',
      [fn('SUM', col('QuotationItem.quantity')), 'totalQuantity'],
      [fn('SUM', col('QuotationItem.subtotal')), 'totalRevenue'],
    ],
    include: [
      { model: Product, as: 'product', attributes: ['id', 'code', 'name', 'unit', 'category'] },
      { model: Quotation, attributes: [], where: { status: 'aprobada' } },
    ],
    group: ['productId', 'product.id'],
    order: [[literal('"totalRevenue"'), 'DESC']],
    limit: 5,
    raw: false,
  });

  return {
    summary: {
      totalProducts,
      totalQuotations,
      totalMovements,
      totalBilled: parseFloat(totalBilled || 0),
    },
    quotations: { byStatus: quotationsByStatus },
    lowStockProducts: lowStockProducts.map((s) => ({
      product: s.Product,
      quantity: parseFloat(s.quantity),
      reserved: parseFloat(s.reservedQuantity),
      available: parseFloat(s.quantity) - parseFloat(s.reservedQuantity),
    })),
    topProducts: topProducts.map((p) => ({
      product: p.product,
      totalQuantity: parseFloat(p.dataValues.totalQuantity || 0),
      totalRevenue: parseFloat(p.dataValues.totalRevenue || 0),
    })),
  };
};

// POST /api/ai/text
const generateText = async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt es requerido' });
    const result = await model.generateContent(prompt);
    res.json({ response: result.response.text() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/ai/json
const generateJson = async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt es requerido' });
    const result = await jsonModel.generateContent(prompt);
    res.json({ response: JSON.parse(result.response.text()) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/ai/chat
const chat = async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message) return res.status(400).json({ error: 'message es requerido' });

    const chatSession = model.startChat({
      systemInstruction: {
        parts: [{ text: 'Eres un asistente útil y conciso.' }],
      },
      history: history.map((msg) => ({
        role: msg.role,
        parts: [{ text: msg.content }],
      })),
    });

    const result = await chatSession.sendMessage(message);
    res.json({ response: result.response.text() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/ai/chat-inventario
const chatInventario = async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message) return res.status(400).json({ error: 'message es requerido' });

    // 1. Obtener KPIs directo desde los modelos
    const kpis = await fetchKpis();

    // 2. System prompt con contexto real
    const systemPrompt = `
      Eres un asistente de negocio experto en inventario y ventas de materiales de decoración.
      Tienes acceso a los datos actuales del sistema. Responde siempre en español, de forma clara y concisa.
      Si el usuario pregunta algo que no está en los datos, indícalo amablemente.

      === DATOS ACTUALES DEL SISTEMA ===
      ${JSON.stringify(kpis, null, 2)}
      =================================
    `;

    // 3. Chat con contexto
    const chatSession = model.startChat({
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      history: history.map((msg) => ({
        role: msg.role,
        parts: [{ text: msg.content }],
      })),
    });

    const result = await chatSession.sendMessage(message);
    res.json({ response: result.response.text() });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { generateText, generateJson, chat, chatInventario };