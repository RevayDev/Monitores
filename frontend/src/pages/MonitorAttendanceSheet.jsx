import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Download, Wine } from 'lucide-react';
import { getModuleAttendanceSheet, saveModuleAttendanceSheet } from '../services/api';
import { ToastContext } from '../context/ToastContext';

const exportCsv = (fileName, rows) => {
  const header = ['Nombre', 'Email', 'Estado'];
  const body = rows.map((r) => [r.studentName, r.studentEmail, r.present ? 'PRESENTE' : 'AUSENTE']);
  const csv = [header, ...body].map((line) => line.map((v) => `"${String(v || '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
};

const MonitorAttendanceSheet = () => {
  const { id } = useParams();
  const moduleId = Number(id);
  const navigate = useNavigate();
  const { showToast } = React.useContext(ToastContext);

  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState(null);
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);

  const fetchSheet = async () => {
    try {
      setLoading(true);
      const data = await getModuleAttendanceSheet(moduleId);
      setSheet(data);
      setRows(data.students || []);
    } catch (error) {
      showToast(error.message || 'Error cargando planilla.', 'error');
      navigate('/monitor-dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSheet();
  }, [moduleId]);

  const presentCount = useMemo(() => rows.filter((r) => r.present).length, [rows]);

  const togglePresent = (idx) => {
    if (sheet?.locked) return;
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, present: !r.present } : r)));
  };

  const saveSheet = async () => {
    try {
      setSaving(true);
      await saveModuleAttendanceSheet(moduleId, rows);
      showToast('Asistencia guardada.', 'success');
      await fetchSheet();
    } catch (error) {
      showToast(error.message || 'No se pudo guardar.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-[calc(100vh-64px)] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div></div>;
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-brand-gray py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-5">
        <button onClick={() => navigate('/monitor-dashboard')} className="flex items-center gap-2 text-gray-500 hover:text-brand-blue font-bold">
          <ArrowLeft size={18} /> Volver
        </button>

        <div className="bg-white border border-gray-100 rounded-3xl p-5">
          <h1 className="text-2xl font-black text-gray-900">Asistencia del módulo</h1>
          <p className="text-sm text-gray-500">{sheet?.module?.modulo} · {sheet?.date}</p>
          <p className="text-xs mt-2 font-bold text-gray-600">
            {sheet?.locked
              ? 'Asistencia ya guardada hoy. No se puede modificar.'
              : 'Por defecto todos estan ausentes. Marca presente con el icono.'}
          </p>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-black text-gray-800">Presentes: {presentCount}/{rows.length}</p>
            <button
              onClick={() => exportCsv(`asistencia-${sheet?.module?.modulo || 'modulo'}-${sheet?.date || ''}.csv`, rows)}
              className="px-3 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold flex items-center gap-2"
            >
              <Download size={14} /> Exportar CSV
            </button>
          </div>

          <div className="divide-y divide-gray-100">
            {rows.map((row, idx) => (
              <div key={`${row.studentEmail}-${idx}`} className="px-5 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-gray-900">{row.studentName}</p>
                  <p className="text-xs text-gray-500">{row.studentEmail}</p>
                </div>
                <button
                  onClick={() => togglePresent(idx)}
                  disabled={sheet?.locked}
                  className={`p-2 rounded-xl border ${row.present ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-gray-400 border-gray-200'} disabled:opacity-50`}
                  title={row.present ? 'Presente' : 'Ausente'}
                >
                  <Wine size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={saveSheet}
          disabled={sheet?.locked || saving || rows.length === 0}
          className="w-full py-4 rounded-2xl bg-brand-blue text-white font-black disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <CheckCircle2 size={18} /> Guardar asistencia de hoy
        </button>
      </div>
    </div>
  );
};

export default MonitorAttendanceSheet;
