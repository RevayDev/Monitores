import React from 'react';

const UserAvatar = ({
  user,
  size = 'md',
  className = '',
  showBadge = false,
  rounded = 'rounded-2xl'
}) => {

  const getInitials = (name) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  const getRoleColor = (role) => {
    switch (role?.toLowerCase()) {
      case 'dev': return 'bg-purple-600';
      case 'admin': return 'bg-amber-600';
      case 'monitor': return 'bg-emerald-600';
      case 'student': return 'bg-brand-blue';
      default: return 'bg-gray-400';
    }
  };

  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-lg',
    lg: 'w-24 h-24 text-3xl',
    xl: 'w-32 h-32 text-4xl'
  };

  const isNew = () => {
    const date = user?.createdAt || user?.registeredAt;
    if (!date) return false;
    const created = new Date(date);
    const now = new Date();
    const diffDays = Math.ceil(Math.abs(now - created) / (1000 * 60 * 60 * 24));
    return diffDays <= 14;
  };

  const badgeSize = size === 'sm' ? 'px-1 py-0.5 text-[8px]' : 'px-2 py-1 text-[10px]';

  return (
    <div className={`relative inline-block ${className}`}>
      <div className={`${sizes[size]} aspect-square ${rounded} flex items-center justify-center text-white font-black overflow-hidden shadow-inner border-2 border-white ring-1 ring-gray-100/50 ${getRoleColor(user?.role)}`}>

        {user?.foto ? (
          <img
            src={`${user.foto.startsWith('http') ? user.foto : `http://localhost:3000${user.foto}`}?t=${new Date().getTime()}`}
            alt={user.nombre}
            className={`w-full h-full object-cover ${rounded}`}
            onError={(e) => {
              e.target.onerror = null;
              e.target.style.display = 'none';
              e.target.parentNode.innerHTML = getInitials(user.nombre);
            }}
          />
        ) : (
          getInitials(user?.nombre)
        )}

      </div>

      {showBadge && isNew() && (
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10 w-full flex justify-center text-center">
          <span className={`${badgeSize} bg-brand-blue text-white font-black uppercase rounded-lg border-2 border-white shadow-md animate-pulse whitespace-nowrap`}>
            NUEVO
          </span>
        </div>
      )}
    </div>
  );
};

export default UserAvatar;