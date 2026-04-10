import React, { useEffect, useState } from 'react';
import { Activity, CalendarHeart, FileClock } from 'lucide-react';
import { getMyAttendance, getMyForumHistory } from '../services/api';

const formatDate = (dateValue) => {
  if (!dateValue) return '-';
  return new Date(dateValue).toLocaleString();
};

const ProfileMedicalHistory = () => {
  const [attendance, setAttendance] = useState([]);
  const [forumHistory, setForumHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [att, forum] = await Promise.all([getMyAttendance(), getMyForumHistory()]);
        setAttendance(att || []);
        const forumMessages = Array.isArray(forum)
          ? forum
          : Array.isArray(forum?.messages)
            ? forum.messages
            : [];
        setForumHistory(forumMessages);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const exportCsv = () => {
    const rows = [
      ['Tipo', 'Modulo', 'Detalle', 'Fecha'],
      ...attendance.map((a) => ['Asistencia', a.modulo || '-', a.attendance_status || 'present', a.scan_time || a.created_at]),
      ...forumHistory.map((f) => ['Foro', f.modulo || '-', f.thread_title || '-', f.created_at])
    ];
    const csv = rows.map((line) => line.map((v) => `"${String(v || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historial-estudiante-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="bg-white p-6 sm:p-10 rounded-[32px] shadow-sm border border-gray-100 space-y-5">
      <header className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-red-50 text-red-600">
          <FileClock size={18} />
        </div>
        <div>
          <h2 className="text-xl font-black text-gray-900">Historial Academico</h2>
          <p className="text-xs text-gray-500">Registro cronologico de actividad y seguimiento.</p>
        </div>
        <button onClick={exportCsv} className="ml-auto px-3 py-2 rounded-xl bg-gray-900 text-white text-xs font-black">
          Exportar CSV
        </button>
      </header>

      {loading ? (
        <div className="py-6 text-sm text-gray-500">Cargando historial...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-red-100 rounded-2xl p-4">
            <p className="text-xs uppercase font-black text-red-500 mb-3 flex items-center gap-2">
              <CalendarHeart size={14} /> Asistencias
            </p>
            <div className="space-y-2 max-h-56 overflow-auto">
              {attendance.slice(0, 15).map((item) => (
                <div key={item.id} className="bg-red-50/40 rounded-xl p-2">
                  <p className="text-sm font-bold text-gray-800">{item.modulo || 'Modulo'}</p>
                  <p className="text-xs text-gray-500">{formatDate(item.scan_time || item.created_at)}</p>
                </div>
              ))}
              {!attendance.length && <p className="text-sm text-gray-500">Sin asistencias registradas.</p>}
            </div>
          </div>

          <div className="border border-blue-100 rounded-2xl p-4">
            <p className="text-xs uppercase font-black text-blue-500 mb-3 flex items-center gap-2">
              <Activity size={14} /> Respuestas en foro
            </p>
            <div className="space-y-2 max-h-56 overflow-auto">
              {forumHistory.slice(0, 15).map((item) => (
                <div key={item.id} className="bg-blue-50/40 rounded-xl p-2">
                  <p className="text-sm font-bold text-gray-800">{item.modulo}</p>
                  <p className="text-xs text-gray-600">{item.thread_title}</p>
                  <p className="text-xs text-gray-500 truncate">{item.message}</p>
                  <p className="text-xs text-gray-500">{formatDate(item.created_at)}</p>
                </div>
              ))}
              {!forumHistory.length && <p className="text-sm text-gray-500">Sin mensajes en foro.</p>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ProfileMedicalHistory;
