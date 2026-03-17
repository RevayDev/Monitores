import pool from '../../utils/mysql.helper.js';

class UsersRepositoryMySQL {
  async getAll() {
    const [rows] = await pool.query('SELECT * FROM users');
    return rows;
  }

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0];
  }

  async findByEmail(email) {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0];
  }

  async findByUsername(username) {
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    return rows[0];
  }

  async create(userData) {
    const { nombre, username, email, password, role, sede, cuatrimestre, foto, is_principal } = userData;
    const createdAt = new Date().toISOString();
    const [result] = await pool.query(
      'INSERT INTO users (nombre, username, email, password, role, sede, cuatrimestre, foto, is_principal, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [nombre, username, email, password, role, sede, cuatrimestre, foto || null, is_principal || false, createdAt]
    );
    return { id: result.insertId, ...userData, createdAt };
  }

  async update(id, userData) {
    const fields = [];
    const values = [];
    
    for (const [key, value] of Object.entries(userData)) {
      if (key !== 'id' && key !== 'currentUserId' && key !== 'baseRole') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    
    if (fields.length === 0) return this.findById(id);
    
    values.push(id);
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  }

  async delete(id) {
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
}

export default new UsersRepositoryMySQL();
