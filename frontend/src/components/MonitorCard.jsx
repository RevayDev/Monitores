import { User, Users, Book, Calendar, MapPin, Monitor, Clock, ExternalLink, MessageCircle, Video, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import UserAvatar from './UserAvatar';

const MonitorCard = ({ data, onAction, actionLabel, isRegistered, registrationCount = 0 }) => {
  const navigate = useNavigate();
  const LIMIT = 32;
  const isFull = registrationCount >= LIMIT;

  const handleAction = () => {
    if (isRegistered) {
      navigate('/mis-monitorias');
    } else if (!isFull) {
      onAction(data);
    }
  };

  return (
    <div className={`rounded-xl shadow-md overflow-hidden border transition-all hover:shadow-lg flex flex-col h-full cursor-pointer relative ${isRegistered
        ? 'bg-yellow-50 border-yellow-200'
        : isFull
          ? 'bg-red-50 border-red-200'
          : 'bg-white border-gray-100'
      }`}>
      <div className={`${isRegistered
          ? 'bg-yellow-400'
          : isFull
            ? 'bg-red-600'
            : 'bg-brand-blue'
        } px-4 py-3 flex justify-between items-center text-white`}>
        <div className="flex items-center gap-2">
          {isRegistered ? <Monitor size={16} /> : <Book size={18} />}
          <span className="font-semibold text-sm">{data.modulo}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-lg">{data.modalidad}</span>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-grow space-y-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3 text-gray-700">
            <UserAvatar
              user={{
                nombre: data.monitor,
                role: data.monitorRole || 'monitor',
                foto: data.monitorFoto,
                createdAt: data.monitorCreatedAt
              }}
              size="sm"
              rounded="rounded-md"
            />
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Monitor</p>
              <p className="font-bold text-gray-900 text-sm">{data.monitor}</p>
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
            disabled={isFull && !isRegistered}
            className={`w-full py-2.5 px-4 rounded-xl font-black text-xs transition-all shadow-sm flex items-center justify-center gap-2 ${isRegistered
                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200'
                : isFull
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-brand-blue text-white hover:bg-brand-dark-blue active:scale-[0.98] cursor-pointer'
              }`}
          >
            {isRegistered && <ExternalLink size={14} />}
            {isRegistered ? actionLabel : isFull ? 'Cupo Lleno' : actionLabel || 'Ver Detalle'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MonitorCard;
