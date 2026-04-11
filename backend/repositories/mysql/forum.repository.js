import pool from '../../utils/mysql.helper.js';

class ForumRepositoryMySQL {
  async getQuestionsByModule(moduleId, searchTerm = '') {
    let query = `
      SELECT q.*, u.nombre as author_name, u.role as author_role
      FROM questions q
      JOIN users u ON q.user_id = u.id
      WHERE q.module_id = ?
    `;
    const params = [moduleId];

    if (searchTerm) {
      query += ` AND (q.title LIKE ? OR q.content LIKE ?)`;
      params.push(`%${searchTerm}%`, `%${searchTerm}%`);
    }

    query += ' ORDER BY q.created_at DESC';

    const [questions] = await pool.query(query, params);

    // Fetch answers for these questions
    if (questions.length > 0) {
      const qIds = questions.map(q => q.id);
      const [answers] = await pool.query(`
        SELECT a.*, u.nombre as author_name, u.role as author_role
        FROM answers a
        JOIN users u ON a.user_id = u.id
        WHERE a.question_id IN (?)
        ORDER BY a.created_at ASC
      `, [qIds]);

      // Map answers to questions
      questions.forEach(q => {
        q.answers = answers.filter(a => a.question_id === q.id);
      });
    }

    return questions;
  }

  async getHistoryByUser(userId) {
    const [questions] = await pool.query(`
      SELECT q.*, m.modulo as module_name
      FROM questions q
      LEFT JOIN modules m ON q.module_id = m.id
      WHERE q.user_id = ?
      ORDER BY q.created_at DESC
    `, [userId]);

    if (questions.length > 0) {
      const qIds = questions.map(q => q.id);
      const [answers] = await pool.query(`
        SELECT a.*, u.nombre as author_name, u.role as author_role
        FROM answers a
        JOIN users u ON a.user_id = u.id
        WHERE a.question_id IN (?)
        ORDER BY a.created_at ASC
      `, [qIds]);

      questions.forEach(q => {
        q.answers = answers.filter(a => a.question_id === q.id);
      });
    }

    return questions;
  }

  async createQuestion(data) {
    const { user_id, module_id, title, content } = data;
    const [result] = await pool.query(
      'INSERT INTO questions (user_id, module_id, title, content) VALUES (?, ?, ?, ?)',
      [user_id, module_id, title, content]
    );
    return { id: result.insertId, ...data, created_at: new Date() };
  }

  async createAnswer(data) {
    const { question_id, user_id, content } = data;
    const [result] = await pool.query(
      'INSERT INTO answers (question_id, user_id, content) VALUES (?, ?, ?)',
      [question_id, user_id, content]
    );
    return { id: result.insertId, ...data, is_accepted: false, created_at: new Date() };
  }

  async getQuestionById(id) {
    const [rows] = await pool.query('SELECT * FROM questions WHERE id = ?', [id]);
    return rows[0];
  }

  async acceptAnswer(answerId, questionId) {
    // First, un-accept all answers for this question
    await pool.query('UPDATE answers SET is_accepted = FALSE WHERE question_id = ?', [questionId]);
    // Then accept the specific answer
    await pool.query('UPDATE answers SET is_accepted = TRUE WHERE id = ?', [answerId]);
    return true;
  }

  async getAnswerById(id) {
    const [rows] = await pool.query('SELECT * FROM answers WHERE id = ?', [id]);
    return rows[0];
  }
}

export default new ForumRepositoryMySQL();
