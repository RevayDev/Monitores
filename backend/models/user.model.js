/**
 * User Model
 */
class User {
  constructor({ id, nombre, email, password, role, baseRole, sede, cuatrimestre }) {
    this.id = id;
    this.nombre = nombre;
    this.email = email;
    this.password = password;
    this.role = role;
    this.baseRole = baseRole || role;
    this.sede = sede;
    this.cuatrimestre = cuatrimestre;
  }
}

module.exports = User;
