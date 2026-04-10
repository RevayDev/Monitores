export const validateQrPayload = (req, res, next) => {
  const token = req.body?.token;
  const moduleId = Number(req.body?.moduleId);

  if (!token || typeof token !== 'string' || token.length < 20) {
    return res.status(400).json({ error: 'Token QR inválido.' });
  }

  if (!Number.isInteger(moduleId) || moduleId <= 0) {
    return res.status(400).json({ error: 'moduleId inválido.' });
  }

  next();
};

export default validateQrPayload;
