const bcrypt = require('bcryptjs');
const { User } = require('../models');
const logger = require('../logger');

const VALID_ROLES = ['administrador', 'asesor', 'supervisor'];

// GET /api/users/profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'name', 'email', 'role'],
    });

    if (!user) {
      logger.warn(`⚠️ Perfil no encontrado — ID: ${req.user.id}`);
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    logger.info(`✅ Perfil obtenido — ID: ${req.user.id}`);
    res.json(user);
  } catch (err) {
    logger.error(`❌ getProfile: ${err.message}`);
    res.status(500).json({ message: 'Error al obtener perfil' });
  }
};

// PUT /api/users/profile
exports.updateProfile = async (req, res) => {
  const { name, email } = req.body;

  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      logger.warn(`⚠️ Usuario no encontrado — ID: ${req.user.id}`);
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    if (email && email !== user.email) {
      const existing = await User.findOne({ where: { email } });
      if (existing) {
        return res.status(400).json({ message: 'El email ya está en uso' });
      }
    }

    user.name  = name  ?? user.name;
    user.email = email ?? user.email;

    await user.save();

    logger.info(`✏️ Perfil actualizado — ID: ${req.user.id}`);
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    logger.error(`❌ updateProfile: ${err.message}`);
    res.status(500).json({ message: 'Error al actualizar perfil' });
  }
};

// PUT /api/users/profile/password
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Debes enviar la contraseña actual y la nueva' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres' });
  }

  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      logger.warn(`⚠️ Contraseña incorrecta — ID: ${req.user.id}`);
      return res.status(400).json({ message: 'Contraseña actual incorrecta' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hashed });

    logger.info(`🔒 Contraseña actualizada — ID: ${req.user.id}`);
    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    logger.error(`❌ changePassword: ${err.message}`);
    res.status(500).json({ message: 'Error al cambiar contraseña' });
  }
};

// GET /api/users/list
exports.listUsers = async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  try {
    const users = await User.findAndCountAll({
      attributes: ['id', 'name', 'email', 'role'],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['createdAt', 'DESC']],
    });

    logger.info(`📋 Usuarios listados — por ID: ${req.user.id}`);
    res.json({
      total: users.count,
      page: parseInt(page),
      totalPages: Math.ceil(users.count / parseInt(limit)),
      data: users.rows,
    });
  } catch (err) {
    logger.error(`❌ listUsers: ${err.message}`);
    res.status(500).json({ message: 'Error al listar usuarios' });
  }
};

// PUT /api/users/:id/role
exports.changeUserRole = async (req, res) => {
  const userId = req.params.id;
  const { role } = req.body;

  if (!VALID_ROLES.includes(role)) {
    logger.warn(`⚠️ Rol inválido: "${role}" — por ID: ${req.user.id}`);
    return res.status(400).json({
      message: `Rol no válido. Roles permitidos: ${VALID_ROLES.join(', ')}`,
    });
  }

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      logger.warn(`⚠️ Usuario inexistente ID: ${userId}`);
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    await user.update({ role });

    logger.info(`🔧 Rol de ID ${userId} → "${role}" — por admin ID: ${req.user.id}`);
    res.json({ message: `Rol actualizado a "${role}" correctamente` });
  } catch (err) {
    logger.error(`❌ changeUserRole: ${err.message}`);
    res.status(500).json({ message: 'Error al actualizar rol' });
  }
};

 // DELETE /api/users/:id
exports.deleteUser = async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await User.findByPk(userId);

    if (!user) {
      logger.warn(`⚠️ Usuario no encontrado ID: ${userId}`);
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    await user.destroy();

    logger.info(`🗑️ Usuario eliminado ID: ${userId} — por admin ID: ${req.user.id}`);
    res.json({ message: 'Usuario eliminado correctamente' });

  } catch (err) {
    logger.error(`❌ deleteUser: ${err.message}`);
    res.status(500).json({ message: 'Error al eliminar usuario' });
  }
};



// GET /api/users/:id
// VULNERABLE A BROKEN ACCESS CONTROL

exports.getUserByIdVulnerable = async (req, res) => {

  const userId = req.params.id;

  try {

    // SIN VALIDAR PROPIEDAD NI ROL
    const user = await User.findByPk(userId, {
      attributes: ['id', 'name', 'email', 'role']
    });

    if (!user) {
      return res.status(404).json({
        message: 'Usuario no encontrado'
      });
    }

    // CUALQUIER USUARIO PUEDE VER OTRO USUARIO
    res.json(user);

  } catch (error) {

    logger.error(error.message);

    res.status(500).json({
      message: 'Error'
    });

  }

};


//VERSION SEGURA: 

exports.getUserByIdSecure = async (req, res) => {

  const userId = parseInt(req.params.id);

  try {

    // SOLO ADMIN O DUEÑO
    if (
      req.user.role !== 'administrador' &&
      req.user.id !== userId
    ) {
      return res.status(403).json({
        message: 'Acceso denegado'
      });
    }

    const user = await User.findByPk(userId, {
      attributes: ['id', 'name', 'email', 'role']
    });

    if (!user) {
      return res.status(404).json({
        message: 'Usuario no encontrado'
      });
    }

    res.json(user);

  } catch (error) {

    logger.error(error.message);

    res.status(500).json({
      message: 'Error'
    });

  }

};