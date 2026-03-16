/**
 * Monitoria/Module Model
 */
class Monitoria {
  constructor({ id, monitorId, monitor, monitorEmail, modulo, cuatrimestre, modalidad, horario, salon, sede, descripcion }) {
    this.id = id;
    this.monitorId = monitorId;
    this.monitor = monitor;
    this.monitorEmail = monitorEmail;
    this.modulo = modulo;
    this.cuatrimestre = cuatrimestre;
    this.modalidad = modalidad;
    this.horario = horario;
    this.salon = salon;
    this.sede = sede;
    this.descripcion = descripcion;
  }
}

module.exports = Monitoria;
