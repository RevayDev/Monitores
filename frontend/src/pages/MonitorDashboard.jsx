import React, { useState, useEffect } from 'react';
import { getStudentsByMonitor, deleteMonitoria, updateMonitoriaInfo, getMonitorias, getAllUsers, getMaintenanceConfig, getSedes, deleteModule, createMonitoria, getModalidades, getCuatrimestres, getAllRegistrations } from '../services/api';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import { Users, BookOpen, Trash2, Edit3, Link, ClipboardList, UserCircle2, MessageSquare, AlertCircle, MessageCircle, Video, PlusCircle, Search, UserCheck } from 'lucide-react';
import { ToastContext } from '../App';
import UserAvatar from '../components/UserAvatar';
import InputField from '../components/InputField';

const MonitorDashboard = () => {
  const navigate = useNavigate();
  const { showToast } = React.useContext(ToastContext);
  const [students, setStudents] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [monitorModules, setMonitorModules] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteComment, setDeleteComment] = useState('');
  const [isEditModuleOpen, setIsEditModuleOpen] = useState(false);
  const [isCreateModuleOpen, setIsCreateModuleOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState(null);
  const [moduleToDelete, setModuleToDelete] = useState(null);
  const [isConfirmDeleteModuleOpen, setIsConfirmDeleteModuleOpen] = useState(false);
  const [dbSedes, setDbSedes] = useState([]);
  const [dbModalidades, setDbModalidades] = useState([]);
  const [dbCuatrimestres, setDbCuatrimestres] = useState([]);
  const [createFormData, setCreateFormData] = useState({
    modulo: '',
    cuatrimestre: '',
    modalidad: 'Presencial',
    sede: 'Sede Centro',
    dias: [],
    horaInicio: '08:00',
    horaFin: '10:00',
    descripcion: '',
    whatsapp: '',
    teams: ''
  });
  const [editFormData, setEditFormData] = useState({
    descripcion: '',
    sede: 'Sede Centro',
    modalidad: 'Presencial',
    salon: '',
    dias: [],
    horaInicio: '08:00',
    horaFin: '10:00',
    whatsapp: '',
    teams: ''
  });
  const [filterModulo, setFilterModulo] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const session = JSON.parse(localStorage.getItem('monitores_current_role') || '{}');

  const monitorId = session.id; // Use real session ID now

  useEffect(() => {
    const checkMaintenance = async () => {
      const config = await getMaintenanceConfig();
      const restrictions = typeof session?.restrictions === 'string' 
        ? JSON.parse(session.restrictions) 
        : (session?.restrictions || {});

      if ((config?.monitorPanel || restrictions.dashboards) && session?.baseRole !== 'dev' && session?.role !== 'dev' && !session?.is_principal) {
        showToast(restrictions.dashboards ? 'Tu acceso a este panel ha sido restringido.' : 'El panel del monitor está restringido por mantenimiento.', 'error');
        navigate('/');
        return;
      }
      fetchData();
    };
    checkMaintenance();
  }, []);

  async function fetchData() {
    const [myRegistrations, myModules, users, sedes, mods, cuats] = await Promise.all([
      getAllRegistrations({ monitorUserId: monitorId }),
      getMonitorias({ monitorId: monitorId }),
      getAllUsers(),
      getSedes(),
      getModalidades(),
      getCuatrimestres()
    ]);

    setMonitorModules(myModules);
    setStudents(myRegistrations);

    setAllUsers(users);
    setDbSedes(sedes || []);
    setDbModalidades(mods || []);
    setDbCuatrimestres(cuats || []);
    setLoading(false);
  };

  const handleOpenDelete = (student) => {
    setSelectedStudent(student);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteComment) {
      showToast("Por favor ingresa un comentario para la baja", "error");
      return;
    }
    const targetId = deleteTargetId || selectedStudent.id;
    await deleteMonitoria(targetId, "Baja por Monitor", deleteComment);
    setIsDeleteOpen(false);
    setSelectedStudent(null);
    setDeleteTargetId(null);
    setDeleteComment('');
    fetchData();
    showToast('Estudiante dado de baja correctamente', 'success');
  };

  const [deleteTargetId, setDeleteTargetId] = useState(null);

  const handleOpenEdit = (mod) => {
    setSelectedModule(mod);
    // Parse horario: "Lunes, Martes 08:00 - 10:00"
    const horarioMatch = mod.horario?.match(/^(.*?)\s(\d{2}:\d{2})\s-\s(\d{2}:\d{2})$/);
    const dias = horarioMatch ? horarioMatch[1].split(', ') : [];
    const horaInicio = horarioMatch ? horarioMatch[2] : '08:00';
    const horaFin = horarioMatch ? horarioMatch[3] : '10:00';

    setEditFormData({
      descripcion: mod.descripcion || '',
      sede: mod.sede || 'Sede Centro',
      salon: mod.salon || '',
      modalidad: mod.modalidad || 'Presencial',
      dias,
      horaInicio,
      horaFin,
      whatsapp: mod.whatsapp || '',
      teams: mod.teams || ''
    });
    setIsEditModuleOpen(true);
  };

  const saveModuleInfo = async () => {
    const horario = `${editFormData.dias.join(', ')} ${editFormData.horaInicio} - ${editFormData.horaFin}`;
    const { dias, horaInicio, horaFin, ...submitData } = editFormData;
    await updateMonitoriaInfo(selectedModule.id, { ...submitData, horario });
    setIsEditModuleOpen(false);
    fetchData();
    showToast('¡Información del módulo actualizada!', 'success');
    window.dispatchEvent(new Event('data-updated'));
  };

  const handleDeleteModule = (mod) => {
    setModuleToDelete(mod);
    setIsConfirmDeleteModuleOpen(true);
  };

  const executeDeleteModule = async () => {
    if (!moduleToDelete) return;
    await deleteModule(moduleToDelete.id);
    showToast('Monitoría eliminada correctamente', 'success');
    setIsConfirmDeleteModuleOpen(false);
    setModuleToDelete(null);
    fetchData();
    window.dispatchEvent(new Event('data-updated'));
  };

  const handlePrint = () => {
    showToast("Estamos trabajando en esta función", "info");
  };

  const handleCopySurvey = (mod) => {
    navigate(`/survey/${session.id}?modulo=${encodeURIComponent(mod.modulo)}`);
  };

  const exportStudentsCsv = () => {
    const rows = students.map((s) => [s.studentName, s.studentEmail, s.modulo, s.registeredAt]);
    const csv = [['Nombre', 'Email', 'Modulo', 'Fecha'], ...rows]
      .map((line) => line.map((v) => `"${String(v || '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monitor-estudiantes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyTemplate = (mod) => {
    navigate(`/monitor-attendance/${mod.id}`);
  };

  const handleCreateModule = async (e) => {
    e.preventDefault();
    if (createFormData.dias.length === 0) {
      showToast("Por favor selecciona al menos un día", "error");
      return;
    }
    const horario = `${createFormData.dias.join(', ')} ${createFormData.horaInicio} - ${createFormData.horaFin}`;
    const { dias, horaInicio, horaFin, ...submitData } = createFormData;
    
    await createMonitoria({
      ...submitData,
      horario,
      monitorId: session.id,
      monitor: session.nombre,
      monitorEmail: session.email
    });
    setIsCreateModuleOpen(false);
    setCreateFormData({
      modulo: '',
      cuatrimestre: dbCuatrimestres[0] || '',
      modalidad: 'Presencial',
      sede: 'Sede Centro',
      salon: '',
      dias: [],
      horaInicio: '08:00',
      horaFin: '10:00',
      descripcion: '',
      whatsapp: '',
      teams: ''
    });
    fetchData();
    showToast('¡Nueva monitoría creada!', 'success');
    window.dispatchEvent(new Event('data-updated'));
  };

  const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

  const DayPicker = ({ selected, onChange }) => (
    <div className="space-y-2">
      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider ml-1">Días de la Monitoría</label>
      <div className="flex flex-wrap gap-2">
        {diasSemana.map(dia => (
          <button
            key={dia}
            type="button"
            onClick={() => {
              if (selected.includes(dia)) {
                onChange(selected.filter(d => d !== dia));
              } else {
                onChange([...selected, dia]);
              }
            }}
            className={`px-3 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all border-2 ${
              selected.includes(dia)
                ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-200'
                : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
            }`}
          >
            {dia.substring(0, 3)}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-brand-gray p-4 sm:p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="bg-emerald-600 rounded-[32px] p-6 md:p-8 text-white relative overflow-hidden shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-800/40 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl"></div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10 text-center sm:text-left">
            <div className={`w-24 h-24 rounded-2xl flex items-center justify-center text-white font-black overflow-hidden shadow-2xl bg-emerald-700/50 backdrop-blur-md ring-4 ring-white/20`}>
              <Users size={48} className="text-emerald-100" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-white/20 rounded-full text-[9px] font-black uppercase tracking-widest mb-2 backdrop-blur-sm border border-white/10">
                <Users size={10} className="text-emerald-100" />
                <span className="text-emerald-50 text-center">Bienvenido, {session?.nombre || 'Monitor'}</span>
              </div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tighter leading-tight mb-1.5">
                Panel de Monitor
              </h1>
              <p className="text-emerald-100 text-sm font-medium leading-relaxed max-w-lg">
                Gestiona tus monitorías, comparte enlaces y supervisa tus asistencias.
              </p>
            </div>
          </div>

          {/* Action Buttons Removed as per user request */}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Managed Modules */}
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-xl font-bold text-brand-blue flex items-center gap-2">
                <BookOpen size={24} /> Mis Monitorías
              </h2>
              <button
                onClick={() => setIsCreateModuleOpen(true)}
                className="px-4 py-2 bg-emerald-100 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-600 hover:text-white transition-all border border-emerald-200"
              >
                <PlusCircle size={14} /> Nueva Monitoría
              </button>
            </div>
            <div className="space-y-4">
              {monitorModules.map(mod => (
                <div key={mod.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 group">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-extrabold text-gray-900 uppercase tracking-tight">{mod.modulo}</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenEdit(mod)}
                        className="text-gray-400 hover:text-brand-blue transition-colors p-1"
                        title="Editar Datos"
                      >
                        <Edit3 size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteModule(mod)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                        title="Eliminar Monitoría"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-3 italic">"{mod.descripcion}"</p>
                  <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                    <span>{mod.sede}</span>
                    <span>{mod.horario}</span>
                  </div>
                  <div className="mt-4 flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => setFilterModulo(mod.modulo)}
                      className={`flex-grow py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all ${filterModulo === mod.modulo ? 'bg-emerald-600 text-white shadow-lg' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                        }`}
                    >
                      <Users size={12} /> Ver Alumnos
                    </button>
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => handleCopyTemplate(mod)}
                        className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all flex items-center justify-center"
                        title="Copiar Plantilla"
                      >
                        <ClipboardList size={18} />
                      </button>
                      <button
                        onClick={() => handleCopySurvey(mod)}
                        className="p-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-all flex items-center justify-center"
                        title="Copiar Encuesta"
                      >
                        <Link size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Student List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold text-brand-blue flex items-center gap-2">
                <Users size={20} /> {filterModulo === 'all' ? 'Todos los Estudiantes' : `Estudiantes: ${filterModulo}`}
              </h2>
              {filterModulo !== 'all' && (
                <button
                  onClick={() => setFilterModulo('all')}
                  className="text-[10px] font-black uppercase text-gray-400 hover:text-brand-blue transition-colors px-3 py-1 bg-gray-100 rounded-full"
                >
                  Ver Todos
                </button>
              )}
            </div>
            {/* Student List Grid/Table Area */}
            <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
              <div className="p-5 sm:p-8 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-0 bg-white/80 backdrop-blur-md z-10 text-center sm:text-left">
                <h3 className="text-xl font-black text-gray-900">Estudiantes Registrados</h3>
                <div className="w-full sm:w-auto flex items-center gap-2">
                  <button
                    onClick={exportStudentsCsv}
                    className="px-3 py-2 rounded-xl bg-gray-900 text-white text-[11px] font-black uppercase tracking-wider"
                  >
                    Exportar CSV
                  </button>
                  <div className="relative w-full sm:w-64">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Search size={16} />
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar estudiante..."
                      className="w-full pl-9 pr-4 py-2 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-brand-blue outline-none text-sm font-bold text-gray-900 transition-all shadow-inner"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex-grow overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-max">
                  <thead>
                    <tr className="bg-gray-50 text-[10px] uppercase tracking-widest font-black text-gray-400">
                      <th className="px-6 py-4">Estudiante</th>
                      <th className="px-6 py-4">Módulo</th>
                      <th className="px-6 py-4">Fecha Reg.</th>
                      <th className="px-6 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(() => {
                      const filteredRegistrations = students
                        .filter(st => filterModulo === 'all' || st.modulo === filterModulo)
                        .filter(st =>
                          (st.studentName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                          (st.studentEmail?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                          (st.modulo?.toLowerCase() || '').includes(searchTerm.toLowerCase())
                        );

                      // Group by student email
                      const groupedMap = filteredRegistrations.reduce((acc, reg) => {
                        if (!acc[reg.studentEmail]) {
                          acc[reg.studentEmail] = {
                            ...reg,
                            modulos: [reg.modulo],
                            regIds: [reg.id]
                          };
                        } else {
                          if (!acc[reg.studentEmail].modulos.includes(reg.modulo)) {
                            acc[reg.studentEmail].modulos.push(reg.modulo);
                            acc[reg.studentEmail].regIds.push(reg.id);
                          }
                        }
                        return acc;
                      }, {});

                      const uniqueStudents = Object.values(groupedMap);

                      if (uniqueStudents.length === 0) {
                        return (
                          <tr>
                            <td colSpan="4" className="px-6 py-20 text-center">
                              <div className="flex flex-col items-center gap-4">
                                <AlertCircle size={48} className="text-gray-200" />
                                <p className="text-gray-400 font-bold">No hay estudiantes encontrados</p>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return uniqueStudents.map(st => (
                        <tr key={st.studentEmail} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <UserAvatar user={{ nombre: st.studentName, email: st.studentEmail, role: 'student', registeredAt: st.registeredAt }} size="sm" showBadge={true} rounded="rounded-xl" />
                              <div>
                                <p className="font-bold text-gray-900">{st.studentName}</p>
                                <p className="text-xs text-gray-400">{st.studentEmail}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1.5">
                              {st.modulos.map((m, idx) => (
                                <span key={idx} className="px-3 py-1 bg-brand-blue/5 text-brand-blue text-[9px] font-black rounded-lg uppercase tracking-wider">
                                  {m}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-500">
                            {new Date(st.registeredAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleOpenDelete(st)}
                              className="p-2 text-red-100 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 size={20} />
                            </button>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Baja Estudiante */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Dar de baja estudiante"
      >
        <div className="space-y-6">
          <div className="flex items-center gap-4 bg-red-50 p-4 rounded-2xl">
            <UserCircle2 size={40} className="text-red-500" />
            <div className="flex-grow">
              <p className="font-black text-red-900">{selectedStudent?.studentName}</p>
              <p className="text-[10px] text-red-600 font-bold uppercase tracking-wider">
                {selectedStudent?.modulos?.length > 1 ? 'Selecciona el módulo para dar de baja' : `Retirar de: ${selectedStudent?.modulo}`}
              </p>
            </div>
          </div>

          {selectedStudent?.modulos?.length > 1 && (
            <div className="grid grid-cols-1 gap-2">
              {selectedStudent.modulos.map((mod, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setDeleteTargetId(selectedStudent.regIds[idx])}
                  className={`p-3 rounded-xl border-2 transition-all flex items-center justify-between text-xs font-bold ${
                    deleteTargetId === selectedStudent.regIds[idx]
                      ? 'border-red-600 bg-red-50 text-red-900'
                      : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200'
                  }`}
                >
                  <span>{mod}</span>
                  {deleteTargetId === selectedStudent.regIds[idx] && <UserCheck size={14} className="text-red-600" />}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-2 text-left">
            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <MessageSquare size={16} /> Comentario para el estudiante
            </label>
            <textarea
              value={deleteComment}
              onChange={(e) => setDeleteComment(e.target.value)}
              placeholder="Ej. El estudiante no asistió a las sesiones..."
              className="w-full h-32 p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all outline-none text-gray-900 font-bold"
            />
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <button
              onClick={confirmDelete}
              className="w-full py-4 bg-red-600 text-white font-extrabold rounded-2xl shadow-xl hover:bg-red-700 active:scale-95 transition-all"
            >
              Confirmar Baja
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Editar Módulo */}
      <Modal
        isOpen={isEditModuleOpen}
        onClose={() => setIsEditModuleOpen(false)}
        title="Editar Información de Monitoría"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <InputField
              type="select"
              label="Sede"
              value={editFormData.sede}
              onChange={(e) => setEditFormData({ ...editFormData, sede: e.target.value })}
              options={dbSedes}
            />
            <InputField
              type="select"
              label="Modalidad"
              value={editFormData.modalidad}
              onChange={(e) => setEditFormData({ ...editFormData, modalidad: e.target.value })}
              options={dbModalidades}
            />
          </div>

          <InputField
            type="select"
            label="Cuatrimestre"
            value={editFormData.cuatrimestre}
            onChange={(e) => setEditFormData({ ...editFormData, cuatrimestre: e.target.value })}
            options={dbCuatrimestres}
          />

          <DayPicker
            selected={editFormData.dias}
            onChange={(dias) => setEditFormData({ ...editFormData, dias })}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider ml-1">Hora Inicio</label>
              <input
                type="time"
                value={editFormData.horaInicio}
                onChange={(e) => setEditFormData({ ...editFormData, horaInicio: e.target.value })}
                className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-2xl focus:border-brand-blue outline-none text-slate-900 font-semibold transition-all text-sm shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider ml-1">Hora Fin</label>
              <input
                type="time"
                value={editFormData.horaFin}
                onChange={(e) => setEditFormData({ ...editFormData, horaFin: e.target.value })}
                className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-2xl focus:border-brand-blue outline-none text-slate-900 font-semibold transition-all text-sm shadow-sm"
              />
            </div>
          </div>

          <InputField
            type="textarea"
            label="Descripción del Módulo"
            required={false}
            value={editFormData.descripcion}
            onChange={(e) => setEditFormData({ ...editFormData, descripcion: e.target.value })}
            placeholder="Describe los temas que tratas en esta monitoría..."
          />

          <div className="grid grid-cols-2 gap-4">
            <InputField
              type="url"
              label="Link de WhatsApp"
              icon={<MessageCircle className="text-green-500" />}
              value={editFormData.whatsapp}
              onChange={(e) => setEditFormData({ ...editFormData, whatsapp: e.target.value })}
              placeholder="https://chat.whatsapp.com/..."
            />

            <InputField
              type="url"
              label="Link de Teams"
              icon={<Video className="text-blue-500" />}
              value={editFormData.teams}
              onChange={(e) => setEditFormData({ ...editFormData, teams: e.target.value })}
              placeholder="https://teams.microsoft.com/..."
            />
          </div>

          <button
            onClick={saveModuleInfo}
            className="w-full py-4 bg-brand-blue text-white font-extrabold rounded-2xl shadow-xl hover:bg-brand-dark-blue active:scale-95 transition-all text-sm uppercase tracking-widest"
          >
            Guardar Cambios
          </button>
        </div>
      </Modal>
      {/* Modal Crear Módulo */}
      <Modal
        isOpen={isCreateModuleOpen}
        onClose={() => setIsCreateModuleOpen(false)}
        title="Crear Nueva Monitoría"
      >
        <form onSubmit={handleCreateModule} className="space-y-4 py-2 text-left">
          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="Nombre del Módulo"
              value={createFormData.modulo}
              onChange={(e) => setCreateFormData({ ...createFormData, modulo: e.target.value })}
              placeholder="Ej. Cálculo I"
            />
            <InputField
              type="select"
              label="Sede"
              value={createFormData.sede}
              onChange={(e) => setCreateFormData({ ...createFormData, sede: e.target.value })}
              options={dbSedes}
            />
          </div>

            {(createFormData.modalidad === 'Presencial' || createFormData.modalidad === 'Híbrido') && (
              <InputField
                label="Salón"
                value={createFormData.salon}
                onChange={(e) => setCreateFormData({ ...createFormData, salon: e.target.value })}
                placeholder="Ej. Salón 204 Bloque B"
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <InputField
                type="select"
                label="Modalidad"
                value={createFormData.modalidad}
                onChange={(e) => setCreateFormData({ ...createFormData, modalidad: e.target.value })}
                options={dbModalidades}
              />
              <InputField
                type="select"
                label="Cuatrimestre"
                value={createFormData.cuatrimestre}
                onChange={(e) => setCreateFormData({ ...createFormData, cuatrimestre: e.target.value })}
                options={dbCuatrimestres}
              />
            </div>

          <DayPicker
            selected={createFormData.dias}
            onChange={(dias) => setCreateFormData({ ...createFormData, dias })}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider ml-1">Hora Inicio</label>
              <input
                type="time"
                value={createFormData.horaInicio}
                onChange={(e) => setCreateFormData({ ...createFormData, horaInicio: e.target.value })}
                className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-2xl focus:border-brand-blue outline-none text-slate-900 font-semibold transition-all text-sm shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider ml-1">Hora Fin</label>
              <input
                type="time"
                value={createFormData.horaFin}
                onChange={(e) => setCreateFormData({ ...createFormData, horaFin: e.target.value })}
                className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-2xl focus:border-brand-blue outline-none text-slate-900 font-semibold transition-all text-sm shadow-sm"
              />
            </div>
          </div>

          <InputField
            type="textarea"
            label="Descripción"
            required={false}
            value={createFormData.descripcion}
            onChange={(e) => setCreateFormData({ ...createFormData, descripcion: e.target.value })}
            placeholder="¿Qué temas enseñarás?"
          />

          <button
            type="submit"
            className="w-full py-4 bg-emerald-600 text-white font-extrabold rounded-2xl shadow-xl hover:bg-emerald-700 active:scale-95 transition-all text-sm uppercase tracking-widest"
          >
            Publicar Monitoría
          </button>
        </form>
      </Modal>

      {/* Modal: Confirmar Eliminación de Monitoría */}
      <Modal
        isOpen={isConfirmDeleteModuleOpen}
        onClose={() => setIsConfirmDeleteModuleOpen(false)}
        title="¿Confirmar Eliminación?"
      >
        <div className="space-y-8 text-center py-4">
          <div className="bg-red-50 p-6 rounded-2xl inline-block text-red-600 animate-pulse">
            <AlertCircle size={64} />
          </div>
          <div className="space-y-3 px-4">
            <p className="text-2xl font-black text-gray-900 leading-tight">
              Estás a punto de borrar la monitoría de: <br />
              <span className="text-red-600 italic">"{moduleToDelete?.modulo}"</span>
            </p>
            <p className="text-gray-500 font-medium">Esta acción eliminará todos los registros asociados permanentemente y no se puede deshacer.</p>
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={executeDeleteModule}
              className="w-full py-4 bg-red-600 text-white font-black rounded-2xl shadow-lg hover:bg-red-700 active:scale-95 transition-all text-sm uppercase tracking-widest"
            >
              Sí, eliminar definitivamente
            </button>
            <button
              onClick={() => setIsConfirmDeleteModuleOpen(false)}
              className="w-full py-4 bg-white text-gray-400 font-bold border-2 border-gray-100 rounded-2xl hover:bg-gray-50 transition-all text-xs uppercase"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MonitorDashboard;
