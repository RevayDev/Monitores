import React from 'react';
import { getRoleColors } from '../utils/roleHelpers';

const StatCard = ({ icon, title, value, role }) => {
  const { lightBg, textColor } = getRoleColors(role);
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-5 group hover:shadow-md transition-all">
      <div className={`${lightBg} ${textColor} p-4 rounded-xl group-hover:scale-110 transition-transform`}>
        {React.cloneElement(icon, { size: 28 })}
      </div>
      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[2px] mb-0.5">{title}</p>
        <p className="text-2xl font-black text-gray-900 tracking-tighter">{value}</p>
      </div>
    </div>
  );
};

export default StatCard;
