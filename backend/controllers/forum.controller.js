import forumService from '../services/forum.service.js';

const getQuestionsByModule = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const { search } = req.query;
    const questions = await forumService.getQuestionsByModule(moduleId, search);
    res.json(questions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getHistory = async (req, res) => {
  try {
    const questions = await forumService.getHistoryByUser(req.user.id);
    res.json(questions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createQuestion = async (req, res) => {
  try {
    const result = await forumService.createQuestion(req.body, req.user.id);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const createAnswer = async (req, res) => {
  try {
    const result = await forumService.createAnswer(req.body, req.user.id);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const acceptAnswer = async (req, res) => {
  try {
    const { id } = req.params; // Answer ID
    await forumService.acceptAnswer(id, req.user.id);
    res.json({ message: 'Respuesta aceptada correctamente.' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export default {
  getQuestionsByModule,
  getHistory,
  createQuestion,
  createAnswer,
  acceptAnswer
};
