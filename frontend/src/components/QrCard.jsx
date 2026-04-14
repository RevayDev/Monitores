import React, { useEffect, useMemo, useState } from 'react';
import { Clock, QrCode, RefreshCw, ShieldAlert } from 'lucide-react';
import { generateQr, getCurrentQr } from '../services/api';
import Modal from './Modal';

const formatRemaining = (ms) => {
  if (ms <= 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
};

const QrCard = () => {
  const [qr, setQr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [showSecurityModal, setShowSecurityModal] = useState(false);

  const fetchQr = async () => {
    const data = await getCurrentQr();
    setQr(data || null);
  };

  useEffect(() => {
    fetchQr();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const remainingMs = useMemo(() => {
    if (!qr?.expires_at) return 0;
    return new Date(qr.expires_at).getTime() - now;
  }, [qr, now]);

  const isExpired = remainingMs <= 0;
  const canGenerate = qr ? (qr.can_generate !== false) : true;

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const generated = await generateQr();
      setQr(generated);
      setShowSecurityModal(true);
    } finally {
      setLoading(false);
    }
  };

  const qrImageSrc = qr?.token
    ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(qr.token)}`
    : null;

  return (
    <section className="bg-white p-6 sm:p-10 rounded-[32px] shadow-sm border border-gray-100 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
          <QrCode className="text-brand-blue" /> QR dinamico
        </h2>
        <button
          onClick={handleGenerate}
          disabled={loading || !canGenerate || (!!qr && !isExpired)}
          className="px-6 py-3 rounded-xl bg-brand-blue text-white text-base font-black disabled:opacity-40 flex items-center gap-2"
        >
          <RefreshCw size={14} /> {qr && !isExpired ? 'Activo' : 'Generar'}
        </button>
      </div>

      {!qr ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock size={14} className="text-brand-blue" />
          <span>Sin QR activo. Pulsa Generar.</span>
        </div>
      ) : (
        <>
          {!isExpired && (
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-2">
              <p className="text-xs text-gray-500 font-bold uppercase">Token</p>
              <p className="text-sm font-mono break-all text-gray-800">{qr.token}</p>
            </div>
          )}

          <div className="flex justify-center">
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm min-h-[220px] flex items-center justify-center">
              {!isExpired && qrImageSrc ? (
                <img src={qrImageSrc} alt="QR dinamico" className="w-52 h-52 sm:w-64 sm:h-64 object-contain" />
              ) : (
                <div className="text-center space-y-2 p-8">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-gray-200">
                    <QrCode className="text-gray-300" size={32} />
                  </div>
                  <p className="text-gray-400 font-bold text-xs uppercase tracking-wider">QR No Disponible</p>
                  <p className="text-[10px] text-gray-400 max-w-[140px] mx-auto italic">
                    {isExpired ? 'Este codigo ya ha expirado.' : 'Pulsa generar para obtener un codigo.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Clock size={14} className="text-brand-blue" />
            <span className="font-bold text-gray-800">
              {qr?.expires_at ? `Expira en ${formatRemaining(remainingMs)}` : 'Sin QR activo'}
            </span>
          </div>
          {qr?.valid_from && (
            <p className="text-xs text-gray-500">
              Ventana: {new Date(qr.valid_from).toLocaleString()} - {new Date(qr.expires_at).toLocaleString()}
            </p>
          )}
          {!canGenerate && (
            <p className="text-xs text-amber-600 font-bold">
              QR bloqueado hasta mañana.
            </p>
          )}
        </>
      )}

      <Modal 
        isOpen={showSecurityModal} 
        onClose={() => setShowSecurityModal(false)} 
        title="¡Aviso de Seguridad!"
      >
        <div className="py-6 text-center space-y-6">
          <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-500 shadow-inner">
            <ShieldAlert size={42} />
          </div>
          <div className="space-y-2 px-4">
            <h3 className="text-xl font-black text-gray-900 tracking-tight">Tu código es ÚNICO</h3>
            <p className="text-sm font-medium text-gray-500 leading-relaxed">
              Este código QR es personal e intransferible. No lo compartas con nadie, ni lo envíes por fotos. 
              Compartirlo puede comprometer la seguridad de tu cuenta y tus beneficios de alimentación.
            </p>
          </div>
          <button 
            onClick={() => setShowSecurityModal(false)}
            className="w-full py-4 bg-brand-blue text-white font-black rounded-2xl shadow-xl shadow-brand-blue/20 hover:bg-brand-dark-blue active:scale-95 transition-all text-sm uppercase tracking-widest"
          >
            Entendido, lo cuidaré
          </button>
        </div>
      </Modal>
    </section>
  );
};

export default QrCard;
