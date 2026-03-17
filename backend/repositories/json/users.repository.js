import { readDB, writeDB } from '../../utils/db.helper.js';

class UsersRepository {
  async getAll() {
    const db = await readDB();
    return db.users;
  }

  async findById(id) {
    const db = await readDB();
    return db.users.find(u => u.id == id);
  }

  async findByEmail(email) {
    const db = await readDB();
    return db.users.find(u => u.email.toLowerCase().trim() === email.toLowerCase().trim());
  }

  async create(userData) {
    const db = await readDB();
    const newUser = { id: Date.now(), ...userData };
    db.users.push(newUser);
    await writeDB(db);
    return newUser;
  }

  async update(id, userData) {
    const db = await readDB();
    const index = db.users.findIndex(u => u.id == id);
    if (index !== -1) {
      db.users[index] = { ...db.users[index], ...userData };
      await writeDB(db);
      return db.users[index];
    }
    return null;
  }

  async delete(id) {
    const db = await readDB();
    const user = db.users.find(u => u.id == id);
    if (!user) return false;
    
    db.users = db.users.filter(u => u.id != id);
    db.registrations = db.registrations.filter(r => r.studentEmail !== user.email);
    await writeDB(db);
    return true;
  }
}

export default new UsersRepository();
