import { Shield, UserCheck, Mail, User, Wrench, BriefcaseBusiness } from 'lucide-react';
import UserAvatar from './UserAvatar';

const StaffCard = ({ user }) => {
  const role = user.role;
  const hasPhoto = !!user.foto;

  // Define role-specific configuration
  const roleConfig = {
    monitor: {
      color: 'bg-emerald-500',
      textColor: 'text-emerald-500',
      lightBg: 'bg-emerald-50',
      icon: <UserCheck size={18} />,
      title: 'Monitor Académico',
      subtitle: 'Personal Educativo'
    },
    monitor_academico: {
      color: 'bg-emerald-500',
      textColor: 'text-emerald-500',
      lightBg: 'bg-emerald-50',
      icon: <UserCheck size={18} />,
      title: 'Monitor Académico',
      subtitle: 'Apoyo Pedagógico'
    },
    monitor_administrativo: {
      color: 'bg-indigo-600',
      textColor: 'text-indigo-600',
      lightBg: 'bg-indigo-50',
      icon: <BriefcaseBusiness size={18} />,
      title: 'Monitor Administrativo',
      subtitle: 'Gestión Institucional'
    },
    admin: {
      color: 'bg-amber-600',
      textColor: 'text-amber-600',
      lightBg: 'bg-amber-50',
      icon: <Shield size={18} />,
      title: 'Administrador',
      subtitle: 'Gestión Sistema'
    },
    dev: {
      color: 'bg-purple-600',
      textColor: 'text-purple-600',
      lightBg: 'bg-purple-50',
      icon: <Wrench size={18} />,
      title: 'Desarrollador',
      subtitle: 'Soporte Técnico'
    },
    student: {
      color: 'bg-brand-blue',
      textColor: 'text-brand-blue',
      lightBg: 'bg-blue-50',
      icon: <User size={18} />,
      title: 'Estudiante',
      subtitle: 'Comunidad'
    }
  };

  const config = roleConfig[role] || roleConfig.student;

  return (
    <div className="rounded-xl shadow-md overflow-hidden border border-gray-100 bg-white transition-all hover:shadow-lg flex flex-col h-full cursor-pointer group hover:-translate-y-1">
      {/* Header Banner */}
      <div className={`px-4 py-3 flex justify-between items-center text-white transition-colors ${config.color}`}>
        <div className="flex items-center gap-2">
          {config.icon}
          <span className="font-semibold text-sm">{config.title}</span>
        </div>
      </div>
      
      {/* Content Area */}
      <div className="p-4 flex flex-col flex-grow space-y-4">
        <div className="flex items-center gap-3 text-gray-700">
          <UserAvatar user={user} size="md" />
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">
              {config.subtitle}
            </p>
            <p className="font-bold text-gray-900 text-sm line-clamp-1">{user.nombre}</p>
          </div>
        </div>

        <div className="pt-3 border-t border-gray-50 mt-auto">
          <div className="flex items-center gap-2 text-gray-500">
            <Mail size={14} className={`${config.textColor} opacity-70`} />
            <span className="text-xs truncate font-medium">{user.email}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffCard;
