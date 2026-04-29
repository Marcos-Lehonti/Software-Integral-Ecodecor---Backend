const { AbilityBuilder, Ability } = require('@casl/ability');

function defineAbilitiesFor(role) {
  const { can, cannot, rules } = new AbilityBuilder(Ability);

  switch (role) {
    case 'administrador':
      can('manage', 'all'); // puede todo
      break;

    case 'asesor':
      can('read', 'User');    // puede ver usuarios
      can('read', 'Product'); // puede ver productos
      break;

    case 'supervisor':
      can('read', 'User');    // puede ver usuarios
      cannot('update', 'User');
      cannot('delete', 'User');
      can('read', 'Product'); // puede ver productos
      break;

    default:
      cannot('manage', 'all');
  }

  return new Ability(rules);
}

module.exports = { defineAbilitiesFor };