import { User, Users, Book, Calendar, MapPin, Monitor, Clock, ExternalLink, MessageCircle, Video, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import UserAvatar from './UserAvatar';

const MonitorCard = ({ data, onAction, actionLabel, isRegistered, registrationCount = 0 }) => {
  const navigate = useNavigate();
  const LIMIT = 32;
  const hasNoMonitor = !data.monitorId || data.monitorId === 0 || !data.monitor;
  const isFull = (registrationCount >= LIMIT) && !hasNoMonitor;

  const handleAction = () => {
    if (hasNoMonitor) return;
    if (isRegistered || !isFull) {
      if (onAction) onAction(data);
    }
  };

  return (
    <div 
      onClick={handleAction}
      className={`rounded-2xl shadow-sm overflow-hidden border transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 flex flex-col h-full relative group ${
        hasNoMonitor
        ? 'bg-gray-200 border-gray-300 opacity-60 cursor-not-allowed grayscale'
        : isRegistered
          ? 'bg-amber-50 border-amber-200 ring-4 ring-amber-500/5 shadow-amber-100 shadow-lg'
          : isFull
            ? 'bg-red-50 border-red-200'
            : 'bg-white border-slate-100 hover:border-brand-blue/30 shadow-md hover:shadow-2xl'
      }`}>
      <div className={`${
          hasNoMonitor
          ? 'bg-gray-500'
          : isRegistered
            ? 'bg-amber-500'
            : isFull
              ? 'bg-red-600'
              : 'bg-brand-blue group-hover:bg-brand-dark-blue'
        } px-5 py-4 flex justify-between items-center text-white transition-colors duration-300`}>
        <div className="flex items-center gap-3">
          {isRegistered ? <Monitor size={18} className="animate-pulse" /> : <Book size={18} />}
          <span className="font-black text-[13px] uppercase tracking-tight">{data.modulo}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[9px] font-black uppercase tracking-widest bg-white/20 px-2 py-1 rounded-lg backdrop-blur-sm">
            {data.modalidad}
          </span>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-grow space-y-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3 text-gray-700">
            <UserAvatar
              user={{
                nombre: hasNoMonitor ? 'No hay monitor asignado' : data.monitor,
                role: hasNoMonitor ? 'unassigned' : (data.monitorRole || 'monitor'),
                foto: data.monitorFoto,
                createdAt: data.monitorCreatedAt
              }}
              size="sm"
            />
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Tutor</p>
              <p className={`font-bold text-sm ${hasNoMonitor ? 'text-gray-400 italic' : 'text-gray-900'}`}>
                {hasNoMonitor ? 'No hay monitor asignado' : data.monitor}
              </p>
            </div>
          </div>

          <div className="flex gap-1">
            {data.whatsapp && (
              <a
                href={data.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                title="WhatsApp Contact"
              >
                <MessageCircle size={16} />
              </a>
            )}
            {data.teams && (
              <a
                href={data.teams}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                title="Teams Meeting"
              >
                <Video size={16} />
              </a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-gray-600 pb-1">
          <div className="flex items-center gap-1.5">
            <Calendar size={14} className={isFull ? "text-red-500" : "text-brand-blue"} />
            <span className="text-xs truncate font-medium">{data.cuatrimestre}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin size={14} className={isFull ? "text-red-500" : "text-brand-blue"} />
            <span className="text-xs truncate font-medium">{data.sede}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={14} className={isFull ? "text-red-500" : "text-brand-blue"} />
            <span className="text-xs truncate font-medium">{data.horario}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users size={14} className={isFull ? "text-red-500" : "text-brand-blue"} />
            <span className={`text-xs font-bold ${isFull ? 'text-red-600' : 'text-gray-600'}`}>
              {registrationCount}/{LIMIT} Cupos
            </span>
          </div>
        </div>

        <div className="mt-auto pt-3 border-t border-gray-50">
          <button
            onClick={handleAction}
            disabled={(isFull && !isRegistered) || hasNoMonitor}
            className={`w-full py-2.5 px-4 rounded-xl font-black text-xs transition-all shadow-sm flex items-center justify-center gap-2 ${
                hasNoMonitor
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                : isRegistered
                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200'
                  : isFull
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-brand-blue text-white hover:bg-brand-dark-blue active:scale-[0.98] cursor-pointer shadow-lg shadow-brand-blue/20'
              }`}
          >
            {isRegistered && <ExternalLink size={14} />}
            {hasNoMonitor ? 'Sin Monitor' : (isRegistered ? actionLabel : isFull ? 'Cupo Lleno' : actionLabel || 'Ver Detalle')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MonitorCard;
