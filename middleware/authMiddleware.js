const jwt = require('jsonwebtoken');
const logger = require('../logger');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Verificar que venga el header y tenga formato "Bearer TOKEN"
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('⚠️ Token no proporcionado o formato incorrecto');
    return res.status(401).json({ message: 'Token requerido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      id: decoded.id,
      role: decoded.role,
    };

    next();
  } catch (err) {
    logger.warn(`⚠️ Token inválido: ${err.message}`);
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
};

module.exports = authMiddleware;