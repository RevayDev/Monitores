export const getRoleColors = (role) => {
  switch (role?.toLowerCase()) {
    case 'dev': return {
      color: 'bg-purple-600',
      textColor: 'text-purple-600',
      lightBg: 'bg-purple-50',
    };
    case 'admin': return {
      color: 'bg-amber-600',
      textColor: 'text-amber-600',
      lightBg: 'bg-amber-50',
    };
    case 'monitor': return {
      color: 'bg-emerald-600',
      textColor: 'text-emerald-600',
      lightBg: 'bg-emerald-50',
    };
    case 'student': return {
      color: 'bg-brand-blue',
      textColor: 'text-brand-blue',
      lightBg: 'bg-blue-50',
    };
    default: return {
      color: 'bg-gray-400',
      textColor: 'text-gray-400',
      lightBg: 'bg-gray-50',
    };
  }
};
