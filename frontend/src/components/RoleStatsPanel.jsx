import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  getAdminStats,
  getCurrentUser,
  getMonitorAcademicStats,
  getMonitorAdminStats,
  getStudentStats
} from '../services/api';

const normalizeRole = (role) => {
  if (role === 'student') return 'estudiante';
  if (role === 'monitor') return 'monitor_academico';
  return role || 'estudiante';
};

const maxOf = (items, key) => Math.max(1, ...(items || []).map((i) => Number(i?.[key] || 0)));

const BarList = ({ title, items, labelKey, valueKey }) => {
  const max = maxOf(items, valueKey);
  return (
    <div className="border border-gray-100 rounded-2xl p-4">
      <p className="text-xs uppercase font-black text-gray-500 mb-3">{title}</p>
      <div className="space-y-2">
        {(items || []).slice(0, 8).map((item, idx) => {
          const value = Number(item?.[valueKey] || 0);
          const width = `${Math.max(8, (value / max) * 100)}%`;
          return (
            <div key={`${idx}-${item?.[labelKey] || ''}`}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-gray-700 truncate">{item?.[labelKey] || '-'}</span>
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
    </div>
  );
};

const RoleStatsPanel = () => {
  const [role, setRole] = useState('estudiante');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    setLoading(true);
    try {
      const current = await getCurrentUser();
      const r = normalizeRole(current?.role);
      setRole(r);
      let stats = null;
      if (r === 'estudiante') stats = await getStudentStats();
      else if (r === 'monitor_academico') stats = await getMonitorAcademicStats();
      else if (r === 'monitor_administrativo') stats = await getMonitorAdminStats();
      else stats = await getAdminStats();
      setData(stats);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const totalCards = useMemo(() => {
    if (!data?.totals) return [];
    return Object.entries(data.totals).map(([k, v]) => ({ key: k, value: Number(v || 0) }));
  }, [data]);

  const exportExcel = () => {
    if (!data) return;
    const wb = XLSX.utils.book_new();

    const totalsSheet = XLSX.utils.json_to_sheet(totalCards.map((i) => ({ metric: i.key, value: i.value })));
    XLSX.utils.book_append_sheet(wb, totalsSheet, 'totals');

    if (data?.attendance_history) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.attendance_history), 'attendance_history');
    }
    if (data?.lunch_history) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.lunch_history), 'lunch_history');
    }
    if (data?.assistances_by_session) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.assistances_by_session), 'assistances_by_session');
    }
    if (data?.most_active_students) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.most_active_students), 'most_active_students');
    }
    if (data?.lunches_by_day) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.lunches_by_day), 'lunches_by_day');
    }
    if (data?.students) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.students), 'students');
    }
    XLSX.writeFile(wb, `stats-${role}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <section className="bg-white p-6 sm:p-10 rounded-[32px] shadow-sm border border-gray-100 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-gray-900">Estadisticas</h2>
          <p className="text-xs text-gray-500">Panel por rol: {role}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadStats} className="px-3 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-black">
            Actualizar
          </button>
          <button onClick={exportExcel} className="px-3 py-2 rounded-xl bg-brand-blue text-white text-xs font-black">
            Exportar Excel
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Cargando estadisticas...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {totalCards.map((item) => (
              <div key={item.key} className="rounded-2xl border border-gray-100 p-3 bg-gray-50">
                <p className="text-[11px] uppercase font-black text-gray-500">{item.key.replaceAll('_', ' ')}</p>
                <p className="text-xl font-black text-brand-blue">{item.value}</p>
              </div>
            ))}
          </div>

          {role === 'estudiante' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <BarList title="Asistencias por modulo" items={data?.attendance_history || []} labelKey="modulo" valueKey="id" />
              <BarList title="Almuerzos por fecha" items={data?.lunch_history || []} labelKey="date" valueKey="id" />
            </div>
          )}
          {role === 'monitor_academico' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <BarList title="Asistencia por sesion" items={data?.assistances_by_session || []} labelKey="session_date" valueKey="attendance_count" />
              <BarList title="Estudiantes mas activos" items={data?.most_active_students || []} labelKey="student_name" valueKey="attendance_count" />
            </div>
          )}
          {role === 'monitor_administrativo' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <BarList title="Almuerzos por dia" items={data?.lunches_by_day || []} labelKey="date" valueKey="lunches_count" />
              <BarList title="Estudiantes atendidos" items={data?.students || []} labelKey="student_name" valueKey="lunches_count" />
            </div>
          )}
          {role === 'admin' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <BarList
                title="Promedios globales"
                items={[
                  { label: 'Asistencias/dia', value: Number(data?.averages?.assistances_per_day || 0) },
                  { label: 'Almuerzos/dia', value: Number(data?.averages?.lunches_per_day || 0) }
                ]}
                labelKey="label"
                valueKey="value"
              />
              <BarList
                title="Totales globales"
                items={Object.entries(data?.totals || {}).map(([k, v]) => ({ label: k, value: Number(v || 0) }))}
                labelKey="label"
                valueKey="value"
              />
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default RoleStatsPanel;
