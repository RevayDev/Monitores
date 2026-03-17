import { readDB, writeDB } from '../../utils/db.helper.js';

class MonitoriasRepository {
  async getAll() {
    const db = await readDB();
    return db.modules;
  }

  async findById(id) {
    const db = await readDB();
    return db.modules.find(m => m.id == id);
  }

  async create(moduleData) {
    const db = await readDB();
    const newModule = { id: Date.now(), ...moduleData };
    db.modules.push(newModule);
    await writeDB(db);
    return newModule;
  }

  async update(id, moduleData) {
    const db = await readDB();
    const index = db.modules.findIndex(m => m.id == id);
    if (index !== -1) {
      db.modules[index] = { ...db.modules[index], ...moduleData };
      await writeDB(db);
      return db.modules[index];
    }
    return null;
  }

  async delete(id) {
    const db = await readDB();
    db.modules = db.modules.filter(m => m.id != id);
    await writeDB(db);
    return true;
  }

  // Registrations
  async getAllRegistrations() {
    const db = await readDB();
    return db.registrations;
  }

  async createRegistration(regData) {
    const db = await readDB();
    db.registrations.push(regData);
    await writeDB(db);
    return regData;
  }

  async deleteRegistration(id) {
    const db = await readDB();
    db.registrations = db.registrations.filter(r => r.registrationId != id && r.id != id);
    await writeDB(db);
    return true;
  }

  // Config & Logs
  async getMaintenance() {
    const db = await readDB();
    return db.maintenance;
  }

  async updateMaintenance(config) {
    const db = await readDB();
    db.maintenance = config;
    await writeDB(db);
    return db.maintenance;
  }

  async getStaticData(key) {
    const db = await readDB();
    return db[key];
  }

  async addAttendance(data) {
    const db = await readDB();
    db.attendance.push({ id: Date.now(), ...data });
    await writeDB(db);
    return true;
  }

  async getAllAttendance() {
    const db = await readDB();
    return db.attendance;
  }

  async addComplaint(data) {
    const db = await readDB();
    db.complaints.push({ id: Date.now(), ...data, date: new Date().toISOString() });
    await writeDB(db);
    return true;
  }
}

export default new MonitoriasRepository();
