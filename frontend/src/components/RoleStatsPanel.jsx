import React, { useEffect, useMemo, useState } from 'react';
import { getCurrentUser, getGlobalStats, getUserStats } from '../services/api';

const GLOBAL_ROLES = new Set(['admin', 'dev', 'monitor', 'monitor_academico', 'monitor_administrativo']);

const PieChart = ({ data }) => {
  const colors = ['#2563eb', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
  const total = data.reduce((acc, item) => acc + Number(item.total || 0), 0);
  const gradient = useMemo(() => {
    if (!total) return '#e5e7eb';
    let cursor = 0;
    return data
      .map((item, idx) => {
        const size = (Number(item.total || 0) / total) * 100;
        const from = cursor;
        const to = cursor + size;
        cursor = to;
        return `${colors[idx % colors.length]} ${from}% ${to}%`;
      })
      .join(', ');
  }, [data, total]);

  return (
    <div className="flex items-center gap-4">
      <div className="w-32 h-32 rounded-full border border-gray-100" style={{ background: `conic-gradient(${gradient})` }} />
      <div className="space-y-1">
        {data.map((item, idx) => (
          <p key={item.rating} className="text-xs text-gray-600 flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: colors[idx % colors.length] }} />
            {item.rating} estrella(s): <span className="font-black text-gray-900">{item.total}</span>
          </p>
        ))}
        {!data.length && <p className="text-xs text-gray-400">Sin calificaciones.</p>}
      </div>
    </div>
  );
};

const DateBars = ({ items }) => {
  const max = Math.max(1, ...(items || []).map((x) => Number(x.total || 0)));
  return (
    <div className="space-y-2">
      {(items || []).slice(0, 8).map((item) => {
        const value = Number(item.total || 0);
        const width = `${Math.max(8, (value / max) * 100)}%`;
        return (
          <div key={item.date}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-500">{item.date}</span>
              <span className="font-black text-brand-blue">{value}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-brand-blue rounded-full" style={{ width }} />
            </div>
          </div>
        );
      })}
      {!items?.length && <p className="text-sm text-gray-400">Sin datos.</p>}
    </div>
  );
};

const LineTrend = ({ items }) => {
  const points = (items || [])
    .slice()
    .reverse()
    .slice(-12)
    .map((row, idx, arr) => {
      const max = Math.max(1, ...arr.map((x) => Number(x.total || 0)));
      const x = arr.length === 1 ? 0 : (idx / (arr.length - 1)) * 100;
      const y = 100 - (Number(row.total || 0) / max) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  if (!(items || []).length) return <p className="text-sm text-gray-400">Sin datos.</p>;

  return (
    <svg viewBox="0 0 100 100" className="w-full h-32">
      <polyline fill="none" stroke="#2563eb" strokeWidth="2.5" points={points} />
    </svg>
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

      const requests = [getUserStats(current.id)];
      if (GLOBAL_ROLES.has(userRole)) requests.push(getGlobalStats());
      const [userData, globalData] = await Promise.all(requests);
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
        <>
          {globalStats && (
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase text-gray-500">Globales</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl border border-gray-100 p-4 bg-gray-50">
                  <p className="text-[11px] uppercase font-black text-gray-500">Total asistencias</p>
                  <p className="text-xl font-black text-brand-blue">{globalStats?.totals?.total_assistances || 0}</p>
                </div>
                <div className="rounded-2xl border border-gray-100 p-4 bg-gray-50">
                  <p className="text-[11px] uppercase font-black text-gray-500">Promedio rating</p>
                  <p className="text-xl font-black text-brand-blue">{globalStats?.totals?.average_rating || 0}</p>
                </div>
                <div className="rounded-2xl border border-gray-100 p-4 bg-gray-50">
                  <p className="text-[11px] uppercase font-black text-gray-500">Estudiantes unicos</p>
                  <p className="text-xl font-black text-brand-blue">{globalStats?.totals?.unique_students || 0}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-gray-100 p-4">
                  <p className="text-xs uppercase font-black text-gray-500 mb-3">Asistencias por fecha</p>
                  <DateBars items={globalStats?.assistances_by_date || []} />
                </div>
                <div className="rounded-2xl border border-gray-100 p-4">
                  <p className="text-xs uppercase font-black text-gray-500 mb-3">Distribucion de calificaciones</p>
                  <PieChart data={globalStats?.rating_distribution || []} />
                </div>
              </div>
              <div className="rounded-2xl border border-gray-100 p-4">
                <p className="text-xs uppercase font-black text-gray-500 mb-3">Evolucion de asistencias</p>
                <LineTrend items={globalStats?.assistances_by_date || []} />
              </div>
            </div>
          )}

          {userStats?.role === 'student' && (
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase text-gray-500">Personales - Estudiante</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl border border-gray-100 p-4 bg-gray-50">
                  <p className="text-[11px] uppercase font-black text-gray-500">Monitorias asistidas</p>
                  <p className="text-xl font-black text-brand-blue">{userStats?.totals?.monitorias_attended || 0}</p>
                </div>
                <div className="rounded-2xl border border-gray-100 p-4 bg-gray-50">
                  <p className="text-[11px] uppercase font-black text-gray-500">Asistencias totales</p>
                  <p className="text-xl font-black text-brand-blue">{userStats?.totals?.total_attendances || 0}</p>
                </div>
                <div className="rounded-2xl border border-gray-100 p-4 bg-gray-50">
                  <p className="text-[11px] uppercase font-black text-gray-500">Prom. calificaciones dadas</p>
                  <p className="text-xl font-black text-brand-blue">{userStats?.totals?.average_rating_given || 0}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-gray-100 p-4">
                <p className="text-xs uppercase font-black text-gray-500 mb-3">Historial de asistencia</p>
                <div className="max-h-56 overflow-auto space-y-2 pr-1">
                  {(userStats?.attendance_history || []).map((row) => (
                    <div key={row.id} className="text-xs rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 flex items-center justify-between gap-2">
                      <span className="font-semibold text-gray-700">{row.module_name || `Modulo #${row.module_id || '-'}`}</span>
                      <span className="text-gray-500">{row.date}</span>
                      <span className="font-black text-brand-blue">{Number(row.rating || 0)}</span>
                    </div>
                  ))}
                  {!userStats?.attendance_history?.length && <p className="text-sm text-gray-400">Sin historial.</p>}
                </div>
              </div>
            </div>
          )}

          {userStats?.role === 'monitor' && (
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase text-gray-500">Personales - Monitor</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl border border-gray-100 p-4 bg-gray-50">
                  <p className="text-[11px] uppercase font-black text-gray-500">Estudiantes atendidos</p>
                  <p className="text-xl font-black text-brand-blue">{userStats?.totals?.total_students_attended || 0}</p>
                </div>
                <div className="rounded-2xl border border-gray-100 p-4 bg-gray-50">
                  <p className="text-[11px] uppercase font-black text-gray-500">Prom. rating recibido</p>
                  <p className="text-xl font-black text-brand-blue">{userStats?.totals?.average_rating_received || 0}</p>
                </div>
                <div className="rounded-2xl border border-gray-100 p-4 bg-gray-50">
                  <p className="text-[11px] uppercase font-black text-gray-500">Sesiones realizadas</p>
                  <p className="text-xl font-black text-brand-blue">{userStats?.totals?.sessions_count || 0}</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default RoleStatsPanel;
