import pool from '../../utils/mysql.helper.js';

class MonitoriasRepositoryMySQL {
  // Modules
  async getAll(filters = {}) {
    let query = `
      SELECT m.*, u.role AS monitorRole, u.foto AS monitorFoto, u.createdAt AS monitorCreatedAt
      FROM modules m
      LEFT JOIN users u ON m.monitorId = u.id
    `;
    const params = [];

    if (filters.monitorId) {
      query += ' WHERE m.monitorId = ?';
      params.push(filters.monitorId);
    }

    const [rows] = await pool.query(query, params);
    return rows;
  }

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM modules WHERE id = ?', [id]);
    return rows[0];
  }

  async create(data) {
    const { 
      monitorId, monitor, monitorEmail, modulo, cuatrimestre, 
      modalidad, horario, salon, sede, descripcion, whatsapp, teams 
    } = data;
    const createdAt = new Date();
    const [result] = await pool.query(
      'INSERT INTO modules (monitorId, monitor, monitorEmail, modulo, cuatrimestre, modalidad, horario, salon, sede, descripcion, whatsapp, teams, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [monitorId, monitor, monitorEmail, modulo, cuatrimestre, modalidad, horario, salon || null, sede, descripcion, whatsapp || null, teams || null, createdAt]
    );
    return { id: result.insertId, ...data, createdAt };
  }

  async update(id, data) {
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(data)) {
      if (key !== 'id') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    
    if (fields.length === 0) return this.findById(id);
    
    values.push(id);
    await pool.query(`UPDATE modules SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  }

  async delete(id) {
    // Delete associated registrations safely before deleting the module to prevent constraints and orphans
    await pool.query('DELETE FROM registrations WHERE monitorId = ?', [id]);
    const [result] = await pool.query('DELETE FROM modules WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  // Registrations
  async getAllRegistrations(filters = {}) {
    let query = `
      SELECT r.*, 
             r.monitorId AS moduleId,
             m.monitorId AS monitorUserId,
             m.monitor, m.monitorEmail, m.sede, m.horario, m.cuatrimestre, m.modalidad, m.whatsapp, m.teams, m.descripcion,
             u.role AS monitorRole, u.foto AS monitorFoto
      FROM registrations r
      LEFT JOIN modules m ON r.monitorId = m.id
      LEFT JOIN users u ON m.monitorId = u.id
    `;
    const params = [];

    if (filters.monitorUserId) {
      query += ' WHERE m.monitorId = ?';
      params.push(filters.monitorUserId);
    } else if (filters.studentEmail) {
      query += ' WHERE r.studentEmail = ?';
      params.push(filters.studentEmail);
    }

    const [rows] = await pool.query(query, params);
    return rows;
  }

  async createRegistration(data) {
    const { studentName, studentEmail, studentId, modulo, moduleId, monitorId, registeredAt } = data;
    const resolvedModuleId = moduleId || monitorId;
    const [result] = await pool.query(
      'INSERT INTO registrations (studentName, studentEmail, modulo, monitorId, registeredAt) VALUES (?, ?, ?, ?, ?)',
      [studentName, studentEmail, modulo, resolvedModuleId, registeredAt || new Date()]
    );
    return { id: result.insertId, ...data };
  }

  async deleteRegistration(id) {
    const [result] = await pool.query('DELETE FROM registrations WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  // Maintenance
  async getMaintenance() {
    const [rows] = await pool.query('SELECT config_value FROM settings WHERE config_key = "maintenance"');
    return rows[0] ? JSON.parse(rows[0].config_value) : { global: false };
  }

  async updateMaintenance(config) {
    await pool.query(
      'INSERT INTO settings (config_key, config_value) VALUES ("maintenance", ?) ON DUPLICATE KEY UPDATE config_value = ?',
      [JSON.stringify(config), JSON.stringify(config)]
    );
    return config;
  }

  // Static Data (Sedes, Cuatrimestres, etc)
  async getStaticData(key) {
    const [rows] = await pool.query('SELECT item_value FROM static_data WHERE data_key = ?', [key]);
    return rows.map(r => r.item_value);
  }

  // Activity
  async addAttendance(data) {
    const { monitorId, studentName, date, rating, comment } = data;
    await pool.query(
      'INSERT INTO attendance (monitorId, studentName, date, rating, comment) VALUES (?, ?, ?, ?, ?)',
      [monitorId, studentName, date, rating, comment]
    );
    return data;
  }

  async getAllAttendance() {
    const [rows] = await pool.query('SELECT * FROM attendance');
    return rows;
  }

  async addComplaint(data) {
    const { monitorId, studentName, studentEmail, reason, details, date } = data;
    await pool.query(
      'INSERT INTO complaints (monitorId, studentName, studentEmail, reason, details, date) VALUES (?, ?, ?, ?, ?, ?)',
      [monitorId, studentName, studentEmail, reason, details, date || new Date()]
    );
    return data;
  }

  async getRegistrationsByModule(moduleId) {
    const [rows] = await pool.query(
      `
      SELECT id, studentName, studentEmail, registeredAt
      FROM registrations
      WHERE monitorId = ?
      ORDER BY studentName ASC
      `,
      [moduleId]
    );
    return rows;
  }

  async getAttendanceSheetByDate(moduleId, dateValue) {
    const [rows] = await pool.query(
      `
      SELECT id, studentName, rating, comment, date
      FROM attendance
      WHERE date = ?
        AND comment LIKE ?
      ORDER BY id ASC
      `,
      [dateValue, `MODULE_ID=${moduleId};%`]
    );
    return rows;
  }

  async saveAttendanceBatch(moduleId, dateValue, entries) {
    for (const item of entries) {
      await pool.query(
        `
        INSERT INTO attendance (monitorId, studentName, date, rating, comment)
        VALUES (?, ?, ?, ?, ?)
        `,
        [
          item.monitorUserId,
          item.studentName,
          dateValue,
          item.present ? 1 : 0,
          `MODULE_ID=${moduleId};EMAIL=${item.studentEmail};STATUS=${item.present ? 'present' : 'absent'}`
        ]
      );
    }
    return true;
  }

  async updateMonitorInfo(monitorId, { nombre, email }) {
    const updates = [];
    const values = [];
    if (nombre) {
      updates.push('monitor = ?');
      values.push(nombre);
    }
    if (email) {
      updates.push('monitorEmail = ?');
      values.push(email);
    }
    if (updates.length > 0) {
      values.push(monitorId);
      await pool.query(`UPDATE modules SET ${updates.join(', ')} WHERE monitorId = ?`, values);
    }
  }

  async updateStudentInfo(oldEmail, { nombre, email }) {
    const updates = [];
    const values = [];
    if (nombre) {
      updates.push('studentName = ?');
      values.push(nombre);
    }
    if (email) {
      updates.push('studentEmail = ?');
      values.push(email);
    }
    if (updates.length > 0) {
      values.push(oldEmail);
      await pool.query(`UPDATE registrations SET ${updates.join(', ')} WHERE studentEmail = ?`, values);
    }
  }

  async unassignModulesByMonitorUserId(monitorUserId) {
    await pool.query(
      'UPDATE modules SET monitorId = NULL, monitor = NULL, monitorEmail = NULL WHERE monitorId = ?',
      [monitorUserId]
    );
    return true;
  }
}

export default new MonitoriasRepositoryMySQL();
