import { User, Book, Calendar, MapPin, Monitor, Clock, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MonitorCard = ({ data, onAction, actionLabel, isRegistered }) => {
  const navigate = useNavigate();

  const handleAction = () => {
    if (isRegistered) {
      navigate('/mis-monitorias');
    } else {
      onAction(data);
    }
  };

  return (
    <div className={`rounded-xl shadow-md overflow-hidden border transition-all hover:shadow-lg flex flex-col h-full ${
      isRegistered 
        ? 'bg-amber-50/50 border-amber-200' 
        : 'bg-white border-gray-100'
    }`}>
      <div className={`${isRegistered ? 'bg-amber-500' : 'bg-brand-blue'} px-4 py-3 flex justify-between items-center text-white`}>
        <div className="flex items-center gap-2">
          {isRegistered ? <Monitor size={16} /> : <Book size={18} />}
          <span className="font-semibold">{data.modulo}</span>
        </div>
        <span className="text-[10px] bg-white/20 px-2 py-1 rounded-full">{data.modalidad}</span>
      </div>
      
      <div className="p-4 flex flex-col flex-grow space-y-3">
        {/* ... component middle ... */}
        <div className="flex items-center gap-3 text-gray-700">
          <div className="p-1.5 bg-blue-50 rounded-full text-brand-blue">
            <User size={18} />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Monitor</p>
            <p className="font-bold text-gray-900 text-sm">{data.monitor}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-gray-600 pb-1">
          <div className="flex items-center gap-1.5">
            <Calendar size={14} className="text-brand-blue" />
            <span className="text-xs">{data.cuatrimestre}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin size={14} className="text-brand-blue" />
            <span className="text-xs line-clamp-1">{data.sede}</span>
          </div>
        </div>

        <div className="mt-auto pt-3 border-t border-gray-50">
          <button
            onClick={handleAction}
            className={`w-full py-2.5 px-4 rounded-lg font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 ${
              isRegistered 
                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200' 
                : 'bg-brand-blue text-white hover:bg-brand-dark-blue active:scale-[0.98]'
            }`}
          >
            {isRegistered && <ExternalLink size={14} />}
            {actionLabel || 'Ver Detalle'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MonitorCard;
