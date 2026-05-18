import React from 'react';
import { getRoleColors } from '../utils/roleHelpers';

const StatCard = ({ icon, title, value, role }) => {
  const { lightBg, textColor } = getRoleColors(role);
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 group hover:shadow-md transition-all">
      <div className={`${lightBg} ${textColor} p-3 rounded-lg group-hover:scale-110 transition-transform`}>
        {React.cloneElement(icon, { size: 20 })}
      </div>
      <div>
        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{title}</p>
        <p className="text-xl font-black text-gray-900 tracking-tighter">{value}</p>
      </div>
    </div>
  );
};

export default StatCard;
