const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const logger = require('../logger');

// POST /api/auth/register
const VALID_ROLES = ['administrador', 'asesor', 'supervisor'];

// POST /api/auth/register
exports.register = async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
  }

  // ✅ Validar rol (si viene en la solicitud)
  if (role && !VALID_ROLES.includes(role)) {
    return res.status(400).json({
      message: `Rol no válido. Roles permitidos: ${VALID_ROLES.join(', ')}`
    });
  }

  try {
    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      logger.warn(`⚠️ Email ya registrado: ${email}`);
      return res.status(400).json({ message: 'El correo ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'supervisor', // 👈 AQUÍ el cambio clave
    });

    logger.info(`✅ Usuario registrado: ${email}`);
    res.status(201).json({ message: 'Usuario registrado correctamente' });
  } catch (error) {
    logger.error(`❌ register: ${error.message}`);
    res.status(500).json({ message: 'Error al registrar' });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email y contraseña son obligatorios' });
  }

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      logger.warn(`⚠️ Usuario no encontrado: ${email}`);
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      logger.warn(`⚠️ Contraseña incorrecta: ${email}`);
      return res.status(401).json({ message: 'Contraseña incorrecta' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    logger.info(`✅ Login exitoso: ${email}`);
    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error(`❌ login: ${error.message}`);
    res.status(500).json({ message: 'Error al iniciar sesión' });
  }
};