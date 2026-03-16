/**
 * MySQL Repositories placeholders
 * In the future, these will use a MySQL connection instead of JSON helpers.
 */
class UsersRepositoryMySQL {
  async getAll() { throw new Error('MySQL Repository not implemented'); }
  async findById(id) { throw new Error('MySQL Repository not implemented'); }
  async findByEmail(email) { throw new Error('MySQL Repository not implemented'); }
  async create(userData) { throw new Error('MySQL Repository not implemented'); }
  async update(id, userData) { throw new Error('MySQL Repository not implemented'); }
  async delete(id) { throw new Error('MySQL Repository not implemented'); }
}

module.exports = new UsersRepositoryMySQL();
