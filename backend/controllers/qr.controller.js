import qrService from '../services/qr.service.js';

const generateQR = async (req, res) => {
  try {
    const qrText = await qrService.generateQR(req.user.id);
    res.json({ qrText });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const validateQR = async (req, res) => {
  try {
    const { qrData } = req.body;
    if (!qrData) return res.status(400).json({ error: 'Data de QR no proporcionada' });

    const result = await qrService.validateQR(qrData, req.user.id);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export default {
  generateQR,
  validateQR
};
