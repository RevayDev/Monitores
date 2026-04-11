import React, { useEffect, useState } from 'react';
import { Activity, Coffee, GraduationCap, ShieldCheck } from 'lucide-react';
import { getMeUserStats } from '../services/api';

const NumberCard = ({ label, value }) => (
  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
    <p className="text-[11px] uppercase font-black text-gray-500">{label}</p>
    <p className="text-xl font-black text-brand-blue mt-1">{value}</p>
  </div>
);

const ProfilePersonalStats = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getMeUserStats();
        setStats(data || null);
      } catch (err) {
        setError(err.message || 'No se pudieron cargar tus estadisticas.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <section className="bg-white p-6 sm:p-10 rounded-[32px] shadow-sm border border-gray-100">
        <p className="text-sm text-gray-500">Cargando estadisticas personales...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="bg-white p-6 sm:p-10 rounded-[32px] shadow-sm border border-gray-100">
        <p className="text-sm text-red-500">{error}</p>
      </section>
    );
  }

  const academic = stats?.academic || {};
  const meals = stats?.meals || {};
  const monitor = stats?.monitor_activity || null;

  return (
    <section className="bg-white p-6 sm:p-10 rounded-[32px] shadow-sm border border-gray-100 space-y-6">
      <h2 className="text-xl font-black text-gray-900">Mis Estadisticas</h2>

      <div className="space-y-4">
        <p className="text-sm font-black uppercase text-gray-500 flex items-center gap-2">
          <GraduationCap size={14} /> Mi actividad como estudiante
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <NumberCard label="Asistencias" value={academic.total_assistances || 0} />
          <NumberCard label="Inasistencias" value={academic.total_absences || 0} />
          <NumberCard label="Excusas" value={academic.total_excuses || 0} />
          <NumberCard label="Frecuencia %" value={academic.attendance_frequency || 0} />
        </div>
        <div className="rounded-2xl border border-gray-100 p-4">
          <p className="text-xs uppercase font-black text-gray-500 mb-2">Historial de sesiones</p>
          <div className="space-y-2 max-h-56 overflow-auto">
            {(academic.session_history || []).map((row) => (
              <div key={`ac-${row.id}`} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm">
                <p className="font-bold text-gray-900">{row.module_name || `Modulo #${row.module_id || '-'}`}</p>
                <p className="text-xs text-gray-500">{row.start_time ? new Date(row.start_time).toLocaleString() : '-'}</p>
                <p className="text-xs text-gray-700 mt-1">Estado: <span className="font-black">{row.status}</span></p>
                {row.status === 'EXCUSA' && (
                  <p className="text-xs text-gray-500">Excusa: {row.excuse_reason || '-'} {row.excuse_description ? `- ${row.excuse_description}` : ''}</p>
                )}
              </div>
            ))}
            {!academic.session_history?.length && <p className="text-sm text-gray-400">Sin historial academico.</p>}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-sm font-black uppercase text-gray-500 flex items-center gap-2">
          <Coffee size={14} /> Mi actividad administrativa (comedor)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <NumberCard label="Total comidas" value={meals.total_meals || 0} />
          <NumberCard label="Ultima comida" value={meals.last_meal_at ? new Date(meals.last_meal_at).toLocaleDateString() : '-'} />
          <NumberCard label="Frecuencia semanal" value={meals.usage_frequency || 0} />
          <NumberCard label="Dias con consumo" value={meals.active_days || 0} />
        </div>
        <div className="rounded-2xl border border-gray-100 p-4">
          <p className="text-xs uppercase font-black text-gray-500 mb-2">Historial de consumo</p>
          <div className="space-y-2 max-h-56 overflow-auto">
            {(meals.consumption_history || []).map((row) => (
              <div key={`meal-${row.id}`} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm">
                <p className="font-bold text-gray-900">{new Date(row.created_at).toLocaleString()}</p>
                <p className="text-xs text-gray-500">Registrado por: {row.scanner_name || '-'}</p>
              </div>
            ))}
            {!meals.consumption_history?.length && <p className="text-sm text-gray-400">Sin historial de consumo.</p>}
          </div>
        </div>
      </div>

      {monitor && (
        <div className="space-y-4">
          <p className="text-sm font-black uppercase text-gray-500 flex items-center gap-2">
            <ShieldCheck size={14} /> Mi actividad como monitor
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {monitor.type === 'MONITOR_ACADEMICO' ? (
              <>
                <NumberCard label="Sesiones" value={monitor.sessions_count || 0} />
                <NumberCard label="Estudiantes atendidos" value={monitor.students_attended || 0} />
                <NumberCard label="Promedio rating" value={monitor.average_rating_received || 0} />
              </>
            ) : (
              <>
                <NumberCard label="Total servidos" value={monitor.total_served || 0} />
                <NumberCard label="Escaneos validos" value={monitor.accepted_scans || 0} />
                <NumberCard label="Escaneos rechazados" value={monitor.rejected_scans || 0} />
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default ProfilePersonalStats;
