/**
 * User Model
 */
export default class User {
  constructor({ id, nombre, username, email, password, role, baseRole, sede, cuatrimestre }) {
    this.id = id;
    this.nombre = nombre;
    this.username = username;
    this.email = email;
    this.password = password;
    this.role = role;
    this.baseRole = baseRole || role;
    this.sede = sede;
    this.cuatrimestre = cuatrimestre;
  }
}
