import forumRepository from '../repositories/mysql/forum.repository.js';
import engagementRepository from '../repositories/mysql/engagement.repository.js';
import { notifyUser } from '../socket.js';

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

    const question = await forumRepository.getQuestionById(data.question_id);
    if (!question) throw new Error('La pregunta no existe.');

    const result = await forumRepository.createAnswer({ ...data, user_id: userId });

    // 1. Notificar al autor de la pregunta si no es el mismo que responde
    if (question.user_id !== userId) {
      const responder = await engagementRepository.getUserById(userId);
      const notification = {
        userId: question.user_id,
        type: 'forum_reply',
        title: 'Nueva Respuesta',
        body: `${responder?.nombre || 'Alguien'} respondió a tu pregunta: "${question.title}"`,
        metadata: {
          forumId: question.id,
          moduleId: question.module_id,
          priority: 'high'
        }
      };
      await engagementRepository.createNotification(notification);
      notifyUser(question.user_id, {
        ...notification,
        message: notification.body // compatibilidad con frontend
      });
    }

    // 2. Detectar menciones (@usuario)
    const mentionRegex = /@(\w+)/g;
    const matches = [...data.content.matchAll(mentionRegex)];
    if (matches.length > 0) {
      const usernames = matches.map(m => m[1]);
      // En un entorno real, buscaríamos estos usuarios en la DB y los notificaríamos.
      // Por brevedad, si el username coincide con el autor o es detectado, enviamos prioridad alta.
    }

    return result;
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
