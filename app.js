const express = require('express');
const cors = require('cors');
const sequelize = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const quotationRoutes = require('./routes/quotationRoutes');
const quotationPdfRoutes = require('./routes/quotationPdfRoutes');
const quotationEmailRoutes = require('./routes/quotationEmailRoutes');
const inventoryMovementRoutes = require('./routes/inventoryMovementRoutes');
const kpiRoutes = require('./routes/kpiRoutes');
const aiRoutes = require('./routes/aiRoutes');
const projectRoutes = require('./routes/projectRoutes');
const preparationRoutes = require('./routes/preparationRoutes');


const app = express();

// CORS
app.use(cors({
  origin: ['http://localhost:5173', 'https://ecodecor-three.vercel.app', 'https://ecodecormrp.vercel.app'],
  credentials: true
}));

// Parsear JSON
app.use(express.json());

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products',productRoutes);
app.use('/api/quotations',quotationRoutes);
app.use('/api/quotation-pdf',quotationPdfRoutes);
app.use('/api/quotation-email',quotationEmailRoutes);
app.use('/api/inventory-movements', inventoryMovementRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/kpis', kpiRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/preparations', preparationRoutes);


// Sincronización de DB
sequelize.sync({ alter: true })
  .then(() => console.log('✅ Tablas sincronizadas'))
  .catch(err => console.error('❌ Error al sincronizar DB:', err));

module.exports = app;