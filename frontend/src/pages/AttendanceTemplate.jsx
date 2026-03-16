import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMonitorias, getStudentsByMonitor } from '../services/api';
import { ClipboardList, Printer, ArrowLeft, Users, Calendar, MapPin, BookOpen, Clock } from 'lucide-react';

const AttendanceTemplate = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [module, setModule] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const allModules = await getMonitorias();
      const target = allModules.find(m => m.id === parseInt(id));
      if (target) {
        setModule(target);
        const regs = await getStudentsByMonitor(target.monitorId);
        // Filter students for this specific module name just in case
        setStudents(regs.filter(r => r.id === target.id));
      }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div>
    </div>
  );

  if (!module) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 space-y-4">
      <h2 className="text-2xl font-bold text-gray-800">Monitoría no encontrada</h2>
      <button onClick={() => navigate(-1)} className="text-brand-blue font-bold flex items-center gap-2">
        <ArrowLeft size={20} /> Volver
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-brand-gray py-10 px-6 print:bg-white print:py-0 print:px-0">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Navigation - Hidden on Print */}
        <div className="flex items-center justify-between print:hidden">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-500 hover:text-brand-blue font-bold transition-all"
          >
            <ArrowLeft size={20} /> Volver al Panel
          </button>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 bg-brand-blue text-white px-6 py-3 rounded-2xl font-black shadow-lg hover:bg-brand-dark-blue transition-all"
          >
            <Printer size={20} /> Imprimir Planilla
          </button>
        </div>

        {/* Main Document Body */}
        <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden border border-gray-100 print:shadow-none print:border-none print:rounded-none">
          
          {/* Document Header */}
          <div className="bg-brand-blue p-10 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                  <ClipboardList size={32} />
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight tracking-widest uppercase">Planilla de Asistencia</h1>
                  <p className="text-blue-100 font-medium opaacity-80">Control de asistencia - Monitorías Académicas</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-10 space-y-10">
            {/* Module Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <InfoItem icon={<BookOpen />} label="Módulo / Asignatura" value={module.modulo} color="blue" />
              <InfoItem icon={<User />} label="Monitor Encargado" value={module.monitor} color="emerald" />
              <InfoItem icon={<Calendar />} label="Cuatrimestre" value={module.cuatrimestre} color="amber" />
              <InfoItem icon={<Clock />} label="Horario Programado" value={module.horario} color="purple" />
              <InfoItem icon={<MapPin />} label="Sede / Salón" value={`${module.sede} - ${module.salon || 'TBD'}`} color="rose" />
              <div className="flex flex-col gap-1 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                 <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Modalidad</span>
                 <span className={`text-sm font-extrabold px-3 py-1 rounded-lg w-fit ${
                   module.modalidad === 'Presencial' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                 }`}>{module.modalidad}</span>
              </div>
            </div>

            {/* Student Table */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b-2 border-gray-100 pb-4">
                <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                  <Users size={24} className="text-brand-blue" /> Estudiantes Registrados
                </h3>
                <span className="bg-brand-blue/10 text-brand-blue px-4 py-1 rounded-full text-sm font-black">
                  {students.length} Total
                </span>
              </div>

              <div className="overflow-hidden bg-gray-50 rounded-3xl border border-gray-100">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-100/50">
                      <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Nombre del Estudiante</th>
                      <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Correo Institucional</th>
                      <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Firma / Asistencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {students.length > 0 ? students.map((s, i) => (
                      <tr key={i} className="hover:bg-white transition-colors group">
                        <td className="px-6 py-5 font-bold text-gray-800">{s.studentName}</td>
                        <td className="px-6 py-5 text-gray-500 font-medium">{s.studentEmail}</td>
                        <td className="px-6 py-5">
                          <div className="w-full h-8 border-b-2 border-gray-200 border-dashed"></div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="3" className="px-6 py-12 text-center text-gray-400 font-bold italic">
                          Aún no hay estudiantes registrados en este módulo.
                        </td>
                      </tr>
                    )}
                    {/* Add empty rows for manual registration if needed on print */}
                    {[1, 2, 3, 4, 5].map(i => (
                      <tr key={`empty-${i}`} className="print:table-row hidden">
                        <td className="px-6 py-8 border-b border-gray-100"></td>
                        <td className="px-6 py-8 border-b border-gray-100"></td>
                        <td className="px-6 py-8 border-b border-gray-100">
                           <div className="w-full h-8 border-b-2 border-gray-200 border-dashed"></div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer / Notes */}
            <div className="pt-10 border-t-2 border-gray-100 text-center space-y-4">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-[0.2em]">
                Sistema de Gestión de Monitorías Académicas • Generado el {new Date().toLocaleDateString()}
              </p>
              <div className="flex justify-center gap-10 opacity-30 print:opacity-100 pt-10">
                 <div className="w-48 border-t border-gray-900 pt-2 text-[10px] font-bold uppercase">Firma del Monitor</div>
                 <div className="w-48 border-t border-gray-900 pt-2 text-[10px] font-bold uppercase">Sello de Facultad</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoItem = ({ icon, label, value, color }) => {
  const colors = {
    blue: 'text-blue-600 bg-blue-50',
    emerald: 'text-emerald-600 bg-emerald-50',
    amber: 'text-amber-600 bg-amber-50',
    purple: 'text-purple-600 bg-purple-50',
    rose: 'text-rose-600 bg-rose-50',
  };
  return (
    <div className="flex flex-col gap-1 p-4 bg-gray-50 rounded-2xl border border-gray-100">
      <div className="flex items-center gap-2 mb-1">
        <div className={`p-1.5 rounded-lg ${colors[color] || colors.blue}`}>
          {React.cloneElement(icon, { size: 14 })}
        </div>
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
      </div>
      <span className="text-sm font-extrabold text-gray-800">{value}</span>
    </div>
  );
}

const User = ({ size }) => <Users size={size} />;

export default AttendanceTemplate;
