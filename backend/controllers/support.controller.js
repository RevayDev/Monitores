import supportService from '../services/support.service.js';

const submitSupportRequest = async (req, res) => {
  try {
    const requester = req.user || { id: req.userContext?.userId || null };
    const result = await supportService.submitTicket(req.body, requester);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const listSupportTickets = async (req, res) => {
  try {
    const tickets = await supportService.listTickets({
      status: req.query.status || '',
      limit: req.query.limit || 50
    });
    res.json(tickets);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const respondSupportTicket = async (req, res) => {
  try {
    const result = await supportService.respondTicket(req.params.id, req.body, req.user || null);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const updateSupportTicketStatus = async (req, res) => {
  try {
    const result = await supportService.updateTicketStatus(req.params.id, req.body, req.user || null);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteSupportTicket = async (req, res) => {
  try {
    const result = await supportService.deleteTicket(req.params.id, req.user || null);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getTicketMessages = async (req, res) => {
  try {
    const messages = await supportService.getTicketMessages(req.params.id);
    res.json(messages);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const addTicketMessage = async (req, res) => {
  try {
    const message = await supportService.addTicketMessage(req.params.id, req.body, req.user || null);
    res.status(201).json(message);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const assignTicketToAdvisor = async (req, res) => {
  try {
    const result = await supportService.assignTicketToAdvisor(req.params.id, req.user);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export default {
  submitSupportRequest,
  listSupportTickets,
  respondSupportTicket,
  updateSupportTicketStatus,
  deleteSupportTicket,
  getTicketMessages,
  addTicketMessage,
  assignTicketToAdvisor
};
