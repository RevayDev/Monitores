import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Bookmark, CalendarHeart, FileClock, Trash2 } from 'lucide-react';
import { deleteForum, getMyAttendance, getMyForumHistory } from '../services/api';

const formatDate = (dateValue) => {
  if (!dateValue) return '-';
  return new Date(dateValue).toLocaleString();
};

const ProfileMedicalHistory = () => {
  const navigate = useNavigate();
  const [attendance, setAttendance] = useState([]);
  const [forumHistory, setForumHistory] = useState([]);
  const [savedForums, setSavedForums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingDeleteForumId, setPendingDeleteForumId] = useState(null);

  const loadData = async () => {
    const [att, forum] = await Promise.all([getMyAttendance(), getMyForumHistory()]);
    setAttendance(att || []);
    const ownForums = Array.isArray(forum?.own_forums) ? forum.own_forums : [];
    const saved = Array.isArray(forum?.saved_forums) ? forum.saved_forums : [];
    setForumHistory(ownForums);
    setSavedForums(saved);
  };

  useEffect(() => {
    const load = async () => {
      try {
        await loadData();
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
      ...forumHistory.map((f) => ['Foro (creado)', f.module_name || '-', f.title || '-', f.created_at]),
      ...savedForums.map((f) => ['Foro (guardado)', f.module_name || '-', f.title || '-', f.saved_at || f.created_at])
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

  const handleDeleteForum = async (forumId) => {
    await deleteForum(forumId);
    await loadData();
    setPendingDeleteForumId(null);
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
        <div className="space-y-4">
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
              <Activity size={14} /> Foros creados por ti
            </p>
            <div className="space-y-2 max-h-56 overflow-auto">
              {forumHistory.slice(0, 15).map((item) => (
                <div key={item.id} className="bg-blue-50/40 rounded-xl p-2">
                  <button onClick={() => navigate(`/modules/${item.modulo_id}/forum`)} className="text-left w-full">
                    <p className="text-sm font-bold text-gray-800">{item.module_name || `Modulo #${item.modulo_id}`}</p>
                    <p className="text-xs text-gray-600">{item.title}</p>
                    <p className="text-xs text-gray-500">{formatDate(item.created_at)} · {item.responses_count || 0} respuestas</p>
                  </button>
                  <button onClick={() => setPendingDeleteForumId(item.id)} className="mt-2 px-2 py-1 rounded-lg bg-red-100 text-red-600 text-[11px] font-black inline-flex items-center gap-1">
                    <Trash2 size={11} /> Borrar
                  </button>
                </div>
              ))}
              {!forumHistory.length && <p className="text-sm text-gray-500">Sin foros creados.</p>}
            </div>
          </div>
          </div>

          <div className="border border-amber-100 rounded-2xl p-4 w-full">
            <p className="text-xs uppercase font-black text-amber-600 mb-3 flex items-center gap-2">
              <Bookmark size={14} /> Foros guardados
            </p>
            <div className="space-y-2 max-h-72 overflow-auto">
              {savedForums.slice(0, 15).map((item) => (
                <button key={`${item.id}-${item.saved_at}`} onClick={() => navigate(`/modules/${item.modulo_id}/forum`)} className="text-left w-full bg-amber-50/50 rounded-xl p-2">
                  <p className="text-sm font-bold text-gray-800">{item.module_name || `Modulo #${item.modulo_id}`}</p>
                  <p className="text-xs text-gray-600">{item.title}</p>
                  <p className="text-xs text-gray-500">Guardado: {formatDate(item.saved_at)}</p>
                </button>
              ))}
              {!savedForums.length && <p className="text-sm text-gray-500">Sin foros guardados.</p>}
            </div>
          </div>
        </div>
      )}

      <div className={`fixed inset-0 z-[120] ${pendingDeleteForumId ? 'flex' : 'hidden'} items-center justify-center p-4`}>
        <div className="absolute inset-0 bg-black/40" onClick={() => setPendingDeleteForumId(null)}></div>
        <div className="relative bg-white rounded-2xl border border-gray-100 p-5 w-full max-w-sm space-y-4">
          <p className="text-sm text-gray-700">¿Eliminar este foro de tu historial?</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setPendingDeleteForumId(null)} className="px-3 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold">Cancelar</button>
            <button onClick={() => handleDeleteForum(pendingDeleteForumId)} className="px-3 py-2 rounded-xl bg-red-600 text-white text-sm font-bold">Eliminar</button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProfileMedicalHistory;
