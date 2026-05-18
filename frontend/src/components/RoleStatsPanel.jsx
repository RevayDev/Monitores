import React, { useEffect, useMemo, useState } from 'react';
import { getCurrentUser, getGlobalStats, getUserStats } from '../services/api';
import { Activity } from 'lucide-react';

const GLOBAL_ROLES = new Set(['admin', 'dev', 'monitor_academico', 'monitor_administrativo']);

const getRoleColor = (role) => {
  const map = {
    'admin': 'orange',
    'dev': 'violet',
    'monitor_academico': 'emerald',
    'monitor_administrativo': 'teal',
    'student': 'blue'
  };
  return map[String(role).toLowerCase()] || 'blue';
};

const DateBars = ({ items, color = 'blue' }) => {
  const max = Math.max(1, ...(items || []).map((x) => Number(x.total || 0)));
  const barColor = `bg-${color}-600`;
  const textColor = `text-${color}-600`;
  
  return (
    <div className="space-y-2">
      {(items || []).slice(0, 8).map((item) => {
        const value = Number(item.total || 0);
        const width = `${Math.max(8, (value / max) * 100)}%`;
        return (
          <div key={item.date}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-500 font-medium">{item.date}</span>
              <span className={`font-black ${textColor}`}>{value}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full ${barColor} rounded-full transition-all duration-1000`} style={{ width }} />
            </div>
          </div>
        );
      })}
      {!items?.length && <p className="text-sm text-gray-400 italic">No hay datos de actividad recientes.</p>}
    </div>
  );
};

const LineTrend = ({ items, color = 'blue' }) => {
  const hexMap = {
    'orange': '#ea580c',
    'violet': '#7c3aed',
    'emerald': '#059669',
    'teal': '#0d9488',
    'blue': '#2563eb'
  };
  const strokeColor = hexMap[color] || '#2563eb';

  const points = (items || [])
    .slice()
    .reverse()
    .slice(-12)
    .map((row, idx, arr) => {
      const max = Math.max(1, ...arr.map((x) => Number(x.total || 0)));
      const x = arr.length === 1 ? 50 : (idx / (arr.length - 1)) * 100;
      const y = 100 - (Number(row.total || 0) / max) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  if (!(items || []).length) return <p className="text-sm text-gray-400 italic">Sin datos de tendencia.</p>;

  return (
    <div className="relative h-32 w-full mt-4">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
        <polyline 
          fill="none" 
          stroke={strokeColor} 
          strokeWidth="3" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          points={points} 
          className="transition-all duration-1000"
        />
      </svg>
    </div>
  );
};

const RoleStatsPanel = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userStats, setUserStats] = useState(null);
  const [globalStats, setGlobalStats] = useState(null);
  const [role, setRole] = useState('student');

  const loadStats = async () => {
    setLoading(true);
    setError('');
    try {
      const current = await getCurrentUser();
      const userRole = String(current?.role || 'student').toLowerCase();
      setRole(userRole);

      const requests = [];
      if (current?.id) requests.push(getUserStats(current.id));
      if (GLOBAL_ROLES.has(userRole)) requests.push(getGlobalStats());
      const [userData, globalData] = await Promise.all(requests.length ? requests : [Promise.resolve(null)]);
      setUserStats(userData || null);
      setGlobalStats(globalData || null);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar las estadisticas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <section className="bg-white p-6 sm:p-10 rounded-[32px] shadow-sm border border-gray-100 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-gray-900">Estadisticas</h2>
          <p className="text-xs text-gray-500 uppercase">Rol activo: {role}</p>
        </div>
        <button onClick={loadStats} className="px-3 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-black">
          Actualizar
        </button>
      </div>

      {loading && <p className="text-sm text-gray-500">Cargando estadisticas...</p>}
      {!loading && error && <p className="text-sm text-red-500">{error}</p>}

      {!loading && !error && (
        <div className="space-y-10">
          {userStats && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-1.5 h-6 rounded-full bg-${getRoleColor(role)}-500`} />
                <h3 className="text-sm font-black uppercase text-gray-800 tracking-wider">Tu Impacto Personal</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-3xl border border-gray-100 p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-[10px] uppercase font-black text-gray-400 mb-2 tracking-widest">Estudiantes Atendidos</p>
                  <p className={`text-4xl font-black text-${getRoleColor(role)}-600`}>
                    {userStats?.role === 'student' 
                      ? userStats?.totals?.monitorias_attended 
                      : userStats?.totals?.total_students_attended || 0}
                  </p>
                  <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase">Alcance total acumulado</p>
                </div>
                
                <div className="rounded-3xl border border-gray-100 p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-[10px] uppercase font-black text-gray-400 mb-2 tracking-widest">
                    {userStats?.role === 'student' ? 'Asistencias Totales' : 'Sesiones Realizadas'}
                  </p>
                  <p className={`text-4xl font-black text-${getRoleColor(role)}-600`}>
                    {userStats?.role === 'student' 
                      ? userStats?.totals?.total_attendances 
                      : userStats?.totals?.sessions_count || 0}
                  </p>
                  <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase">Registros en plataforma</p>
                </div>
              </div>

              {userStats?.role === 'student' && (
                <div className="rounded-3xl border border-gray-100 p-6 bg-gray-50/50">
                  <p className="text-[10px] uppercase font-black text-gray-500 mb-4 tracking-widest">Historial Reciente de Asistencia</p>
                  <div className="max-h-56 overflow-auto space-y-2 pr-1">
                    {(userStats?.attendance_history || []).map((row) => (
                      <div key={row.id} className="text-xs rounded-xl border border-gray-100 bg-white px-3 py-3 flex items-center justify-between gap-2 hover:shadow-sm transition-all cursor-default">
                        <span className="font-bold text-gray-700">{row.module_name || `Módulo #${row.module_id || '-'}`}</span>
                        <span className="text-[10px] font-black uppercase text-gray-400">{row.date}</span>
                      </div>
                    ))}
                    {!userStats?.attendance_history?.length && <p className="text-sm text-gray-400 italic text-center py-4">No tienes asistencias registradas aún.</p>}
                  </div>
                </div>
              )}
            </div>
          )}

          {globalStats && (role === 'admin' || role === 'dev' || !userStats?.totals?.total_students_attended) && (
            <div className="space-y-6 pt-6 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-gray-400" />
                  <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest">Actividad Global del Sistema</h3>
                </div>
                <span className="text-[9px] font-black bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full uppercase tracking-tighter">Vista Informativa</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-gray-50 p-4 bg-gray-50/50">
                  <p className="text-[9px] uppercase font-black text-gray-400 mb-1">Total Asistencias Sistema</p>
                  <p className="text-2xl font-black text-gray-700">{globalStats?.totals?.total_assistances || 0}</p>
                </div>
                <div className="rounded-2xl border border-gray-50 p-4 bg-gray-50/50">
                  <p className="text-[9px] uppercase font-black text-gray-400 mb-1">Estudiantes Únicos (Global)</p>
                  <p className="text-2xl font-black text-gray-700">{globalStats?.totals?.unique_students || 0}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <p className="text-[9px] uppercase font-black text-gray-400 tracking-widest">Registros (Últimos días)</p>
                  <DateBars items={globalStats?.assistances_by_date || []} color="gray" />
                </div>
                <div className="space-y-3">
                  <p className="text-[9px] uppercase font-black text-gray-400 tracking-widest">Tendencia Global</p>
                  <LineTrend items={globalStats?.assistances_by_date || []} color="gray" />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default RoleStatsPanel;

