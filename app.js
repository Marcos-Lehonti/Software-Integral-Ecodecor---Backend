const express = require('express');
const cors = require('cors');
const sequelize = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');

const app = express();

// CORS
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

// Parsear JSON
app.use(express.json());

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products',productRoutes);

// Sincronización de DB
sequelize.sync({ alter: true })
  .then(() => console.log('✅ Tablas sincronizadas'))
  .catch(err => console.error('❌ Error al sincronizar DB:', err));

module.exports = app;