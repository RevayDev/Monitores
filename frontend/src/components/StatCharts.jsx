import React from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  AreaChart, Area
} from 'recharts';
import { LayoutGrid, BarChart3, PieChart as PieIcon } from 'lucide-react';

const COLORS = {
  blue: ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'],
  purple: ['#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd'],
  emerald: ['#059669', '#10b981', '#34d399', '#6ee7b7'],
  amber: ['#d97706', '#f59e0b', '#fbbf24', '#fcd34d'],
  red: ['#dc2626', '#ef4444', '#f87171', '#fca5a5'],
  brand: ['#1e40af', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa']
};

export const VisualToggle = ({ mode, onChange }) => (
  <div className="flex bg-gray-100/80 p-1 rounded-xl border border-gray-200 shadow-inner">
    <button
      onClick={() => onChange('classic')}
      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${
        mode === 'classic' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
      }`}
    >
      <LayoutGrid size={12} /> Datos
    </button>
    <button
      onClick={() => onChange('visual')}
      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${
        mode === 'visual' ? 'bg-white text-brand-blue shadow-sm' : 'text-gray-400 hover:text-gray-600'
      }`}
    >
      <BarChart3 size={12} /> Visual
    </button>
  </div>
);

export const CustomPieChart = ({ data, palette = 'brand' }) => {
  const colors = COLORS[palette] || COLORS.brand;
  
  return (
    <div className="h-48 w-full animate-fade-in">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
            animationBegin={0}
            animationDuration={800}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} stroke="rgba(255,255,255,0.2)" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontWeight: '800' }}
            itemStyle={{ color: '#1e293b' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export const CustomBarChart = ({ data, palette = 'blue', dataKey = "value" }) => {
  const colors = COLORS[palette] || COLORS.blue;
  
  return (
    <div className="h-48 w-full animate-fade-in">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} 
            interval={0}
          />
          <YAxis hide />
          <Tooltip 
            cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }}
            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontWeight: '800' }}
          />
          <Bar dataKey={dataKey} radius={[6, 6, 0, 0]} animationBegin={0} animationDuration={1000}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[0]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const CustomAreaChart = ({ data, palette = 'brand' }) => {
  const colors = COLORS[palette] || COLORS.brand;
  
  return (
    <div className="h-48 w-full animate-fade-in">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors[0]} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={colors[0]} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} 
          />
          <Tooltip 
            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontWeight: '800' }}
          />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke={colors[0]} 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorValue)" 
            animationBegin={0} 
            animationDuration={1200}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
