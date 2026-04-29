// middleware/authorize.js
const { defineAbilitiesFor } = require('../abilities');

function authorize(action, resource) {
  return (req, res, next) => {
    const user = req.user;  // Suponemos que ya tienes autenticación y el usuario está en req.user
    const ability = defineAbilitiesFor(user.role);

    if (ability.can(action, resource)) {
      next();
    } else {
      res.status(403).json({ message: '🚫 No tienes permiso para esta acción' });
    }
  };
}

module.exports = authorize;
