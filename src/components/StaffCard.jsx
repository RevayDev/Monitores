import { Shield, UserCheck, Mail, User } from 'lucide-react';

const StaffCard = ({ user }) => {
  const isMonitor = user.role === 'monitor';
  const hasPhoto = !!user.foto;

  return (
    <div className="rounded-xl shadow-md overflow-hidden border border-gray-100 bg-white transition-all hover:shadow-lg flex flex-col h-full cursor-pointer group">
      {/* Header Banner - Same as MonitorCard style */}
      <div className={`px-4 py-3 flex justify-between items-center text-white transition-colors ${
        isMonitor ? 'bg-brand-blue' : 'bg-amber-600'
      }`}>
        <div className="flex items-center gap-2">
          {isMonitor ? <UserCheck size={18} /> : <Shield size={18} />}
          <span className="font-semibold text-sm">{isMonitor ? 'Monitor Académico' : 'Administrador'}</span>
        </div>
      </div>
      
      {/* Content Area */}
      <div className="p-4 flex flex-col flex-grow space-y-4">
        <div className="flex items-center gap-3 text-gray-700">
          <div className="relative">
            {hasPhoto ? (
              <img 
                src={user.foto} 
                alt={user.nombre} 
                className="w-12 h-12 rounded-full border-2 border-white shadow-sm relative z-10 transition-transform group-hover:scale-105 object-cover"
              />
            ) : (
              <div className={`w-12 h-12 rounded-full border-2 border-white shadow-sm flex items-center justify-center relative z-10 transition-transform group-hover:scale-105 ${
                isMonitor ? 'bg-blue-50 text-brand-blue' : 'bg-amber-50 text-amber-600'
              }`}>
                <User size={20} />
              </div>
            )}
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
              {isMonitor ? 'Personal Educativo' : 'Gestión Sistema'}
            </p>
            <p className="font-bold text-gray-900 text-sm line-clamp-1">{user.nombre}</p>
          </div>
        </div>

        <div className="pt-3 border-t border-gray-50 mt-auto">
          <div className="flex items-center gap-2 text-gray-500">
            <Mail size={14} className={isMonitor ? 'text-brand-blue/60' : 'text-amber-600/60'} />
            <span className="text-xs truncate">{user.email}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffCard;
