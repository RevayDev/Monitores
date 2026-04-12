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
              {forumHistory.map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => navigate(`/modulo/${item.modulo_id || 0}?forumId=${item.id}&readOnly=true`)}
                  className="bg-blue-50/40 rounded-xl p-3 border border-transparent hover:border-blue-200 hover:bg-blue-100/50 cursor-pointer transition-all active:scale-[0.98] group relative"
                >
                  <div className="flex justify-between items-start pr-8">
                    <div>
                      <p className="text-sm font-black text-gray-800 group-hover:text-blue-700 transition-colors uppercase tracking-tight">{item.title}</p>
                      <p className="text-[10px] text-gray-500 font-bold uppercase trekking-widest mt-0.5">{item.module_name || 'Desconocido'}</p>
                      <p className="text-[9px] text-gray-400 mt-1 italic">{formatDate(item.created_at)}</p>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setPendingDeleteForumId(item.id); }}
                    className="absolute top-3 right-3 p-1.5 text-gray-300 hover:text-red-500 hover:bg-white rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {!forumHistory.length && <p className="text-sm text-gray-400 italic">No has creado preguntas.</p>}
            </div>
          </div>
          </div>

          <div className="border border-amber-100 rounded-2xl p-4">
            <p className="text-xs uppercase font-black text-amber-500 mb-3 flex items-center gap-2">
              <Bookmark size={14} /> Foros guardados
            </p>
            <div className="space-y-2 max-h-56 overflow-auto">
              {savedForums.map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => navigate(`/modulo/${item.modulo_id || 0}?forumId=${item.id}&readOnly=true`)}
                  className="bg-amber-50/40 rounded-xl p-3 border border-transparent hover:border-amber-200 hover:bg-amber-100/50 cursor-pointer transition-all active:scale-[0.98] group"
                >
                  <p className="text-sm font-black text-gray-800 group-hover:text-amber-700 transition-colors uppercase tracking-tight">{item.title}</p>
                  <p className="text-[10px] text-gray-500 font-bold uppercase trekking-widest mt-0.5">{item.module_name || 'Desconocido'}</p>
                  <p className="text-[9px] text-gray-400 mt-1 italic">Guardado el {formatDate(item.saved_at)}</p>
                </div>
              ))}
              {!savedForums.length && <p className="text-sm text-gray-400 italic">No tienes foros guardados.</p>}
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
