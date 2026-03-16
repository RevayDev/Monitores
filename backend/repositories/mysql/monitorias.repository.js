/**
 * MySQL Repositories placeholders
 */
class MonitoriasRepositoryMySQL {
  async getAll() { throw new Error('MySQL Repository not implemented'); }
  async findById(id) { throw new Error('MySQL Repository not implemented'); }
  async create(data) { throw new Error('MySQL Repository not implemented'); }
  async update(id, data) { throw new Error('MySQL Repository not implemented'); }
  async delete(id) { throw new Error('MySQL Repository not implemented'); }
  async getAllRegistrations() { throw new Error('MySQL Repository not implemented'); }
  async createRegistration(data) { throw new Error('MySQL Repository not implemented'); }
  async deleteRegistration(id) { throw new Error('MySQL Repository not implemented'); }
  async getMaintenance() { throw new Error('MySQL Repository not implemented'); }
  async updateMaintenance(config) { throw new Error('MySQL Repository not implemented'); }
  async getStaticData(key) { throw new Error('MySQL Repository not implemented'); }
  async addAttendance(data) { throw new Error('MySQL Repository not implemented'); }
  async addComplaint(data) { throw new Error('MySQL Repository not implemented'); }
}

module.exports = new MonitoriasRepositoryMySQL();
