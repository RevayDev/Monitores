import forumRepository from '../repositories/mysql/forum.repository.js';

class ForumService {
  async getQuestionsByModule(moduleId, searchTerm) {
    return await forumRepository.getQuestionsByModule(moduleId, searchTerm);
  }

  async getHistoryByUser(userId) {
    return await forumRepository.getHistoryByUser(userId);
  }

  async createQuestion(data, userId) {
    if (!data.title || !data.content || !data.module_id) {
      throw new Error('Faltan campos obligatorios para crear la pregunta.');
    }
    return await forumRepository.createQuestion({ ...data, user_id: userId });
  }

  async createAnswer(data, userId) {
    if (!data.content || !data.question_id) {
      throw new Error('Faltan campos obligatorios para crear la respuesta.');
    }
    // Could add validation here: is user allowed to answer this module?
    // The prompt says "Monitores y estudiantes pueden responder". 
    // We already have authMiddleware doing role authorization at the route level.
    return await forumRepository.createAnswer({ ...data, user_id: userId });
  }

  async acceptAnswer(answerId, userId) {
    const answer = await forumRepository.getAnswerById(answerId);
    if (!answer) throw new Error('Respuesta no encontrada.');

    const question = await forumRepository.getQuestionById(answer.question_id);
    if (!question) throw new Error('Pregunta no encontrada.');

    // Regla: Solo el creador de la pregunta puede aceptar respuesta
    if (question.user_id !== userId) {
      throw new Error('Solo el creador de la pregunta puede aceptar una respuesta.');
    }

    return await forumRepository.acceptAnswer(answerId, question.id);
  }
}

export default new ForumService();
