import React, { useEffect, useRef, useState } from 'react';
import {
  getStudentsByMonitor, deleteMonitoria, updateMonitoriaInfo, getMonitorias,
  getAllUsers, getMaintenanceConfig, getSedes, deleteModule, createMonitoria,
  getModalidades, getCuatrimestres, getAllRegistrations, getAcademicModuleStats,
  getAcademicSessionHistory, getAcademicSessionDetail, getDiningStats,
  getDiningStudentHistory, scanQrLunch, addAcademicAttendanceExcuse,
  getForumReports, resolveForumReport
} from '../services/api';
import { useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';
import Modal from '../components/Modal';
import { motion, AnimatePresence } from 'framer-motion';
import { ToastContext } from '../App';
import {
  Users, BookOpen, Trash2, Edit3, Link, ClipboardList, UserCircle2,
  MessageSquare, AlertCircle, MessageCircle, Video, PlusCircle,
  Search, UserCheck, Clock3, X, AlertOctagon
} from 'lucide-react';
import UserAvatar from '../components/UserAvatar';
import InputField from '../components/InputField';
import RoleStatsPanel from '../components/RoleStatsPanel';

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
  const [topTab, setTopTab] = useState('');
  const [selectedAnalyticsModuleId, setSelectedAnalyticsModuleId] = useState(null);
  const [academicStats, setAcademicStats] = useState(null);
  const [sessionCards, setSessionCards] = useState([]);
  const [sessionDetail, setSessionDetail] = useState(null);
  const [diningStats, setDiningStats] = useState(null);
  const [diningStudentDetail, setDiningStudentDetail] = useState(null);
  const [manualQrToken, setManualQrToken] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [diningDateFilter, setDiningDateFilter] = useState('');
  const [diningStatusFilter, setDiningStatusFilter] = useState('ALL');
  const [cameraAvailable, setCameraAvailable] = useState(null);
  const [cameraDevices, setCameraDevices] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [cameraStatus, setCameraStatus] = useState('checking');
  const [cameraError, setCameraError] = useState('');
  const [isValidatingScan, setIsValidatingScan] = useState(false);
  const [excuseTarget, setExcuseTarget] = useState(null);
  const [excuseReason, setExcuseReason] = useState('');
  const [excuseDescription, setExcuseDescription] = useState('');
  const videoRef = useRef(null);
  const activeStreamRef = useRef(null);
  const scanTimerRef = useRef(null);
  const lastScannedRef = useRef({ token: '', at: 0 });
  const audioCtxRef = useRef(null);
  const canvasRef = useRef(null);
  const [reports, setReports] = useState([]);
  const [resolvingReportId, setResolvingReportId] = useState(null);

  const session = JSON.parse(localStorage.getItem('monitores_current_role') || '{}');
  const isDiningMonitor = ['monitor_administrativo'].includes(String(session?.role || '').toLowerCase()) || ['monitor_administrativo'].includes(String(session?.baseRole || '').toLowerCase());

  const monitorId = session.id; // Use real session ID now

  useEffect(() => {
    if (isDiningMonitor) setTopTab('stats');
  }, [isDiningMonitor]);

  const stopCamera = () => {
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((track) => track.stop());
      activeStreamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const playScanSound = (type = 'success') => {
    try {
      const audio = new Audio(type === 'success' ? '/sound/sound.mp3' : '/sound/sound-error.mp3');
      audio.volume = 0.8;
      audio.play().catch(err => console.warn("Audio playback failed:", err));
    } catch (e) {
      console.warn("Audio error:", e);
    }
  };

  const captureFrameAndScan = () => {
    try {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return null;

      // Persist canvas for performance
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }
      const canvas = canvasRef.current;

      // OPTIMIZATION: Downscale frames to 400px maximum dimension
      // QR codes don't need high resolution, and this saves massive CPU/Memory
      const scale = Math.min(400 / video.videoWidth, 400 / video.videoHeight, 1);
      const scanWidth = Math.floor(video.videoWidth * scale);
      const scanHeight = Math.floor(video.videoHeight * scale);

      if (canvas.width !== scanWidth || canvas.height !== scanHeight) {
        canvas.width = scanWidth;
        canvas.height = scanHeight;
      }

      const ctx = canvas.getContext('2d', { willReadFrequently: true, alpha: false });
      if (!ctx) return null;

      ctx.drawImage(video, 0, 0, scanWidth, scanHeight);
      const imageData = ctx.getImageData(0, 0, scanWidth, scanHeight);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code) {
        const value = code.data.trim();
        const now = Date.now();
        if (lastScannedRef.current.token === value && now - lastScannedRef.current.at < 3000) return value;
        lastScannedRef.current = { token: value, at: now };
        setManualQrToken(value);
        handleDiningScan(value);
        return value;
      }
    } catch (err) {
      // Catch transient frame-access errors during video load or pause
      return null;
    }
    return null;
  };

  const startCamera = async (deviceId = '') => {
    stopCamera();
    setCameraError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraAvailable(false);
      setCameraStatus('none');
      return;
    }

    setCameraStatus('loading');
    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(
          deviceId
            ? { video: { deviceId: { exact: deviceId } } }
            : { video: { facingMode: { ideal: 'environment' } } }
        );
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      activeStreamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      const activeDeviceId = track?.getSettings?.().deviceId || '';

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videos = devices.filter((d) => d.kind === 'videoinput');
      setCameraDevices(videos);
      if (!selectedCameraId && activeDeviceId) setSelectedCameraId(activeDeviceId);
      if (!selectedCameraId && videos.length && !activeDeviceId) setSelectedCameraId(videos[0].deviceId);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => { });
      }

      setCameraAvailable(true);
      setCameraStatus('ready');

      // Universal scanning loop using jsQR
      scanTimerRef.current = setInterval(() => {
        captureFrameAndScan();
      }, 700);

    } catch (error) {
      setCameraAvailable(false);
      setCameraStatus('error');
      setCameraError(String(error?.message || 'No se detecto camara'));
    }
  };

  useEffect(() => {
    if (!isDiningMonitor || topTab !== 'scanner') {
      stopCamera();
      return;
    }
    startCamera(selectedCameraId);
    return () => stopCamera();
  }, [isDiningMonitor, topTab, selectedCameraId]);

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
    if (myModules?.length && !selectedAnalyticsModuleId) setSelectedAnalyticsModuleId(myModules[0].id);
    setStudents(myRegistrations);

    setAllUsers(users);
    setDbSedes(sedes || []);
    setDbModalidades(mods || []);
    setDbCuatrimestres(cuats || []);
    setLoading(false);
  };

  useEffect(() => {
    const loadAcademic = async () => {
      if (!selectedAnalyticsModuleId || isDiningMonitor) return;
      try {
        const [statsData, sessionRows] = await Promise.all([
          getAcademicModuleStats(selectedAnalyticsModuleId),
          getAcademicSessionHistory(selectedAnalyticsModuleId)
        ]);
        setAcademicStats(statsData || null);
        setSessionCards(sessionRows || []);
      } catch (error) {
        showToast(error.message || 'No se pudieron cargar estadisticas academicas.', 'error');
      }
    };
    loadAcademic();
  }, [selectedAnalyticsModuleId, isDiningMonitor]);

  useEffect(() => {
    const loadDining = async () => {
      if (!isDiningMonitor) return;
      try {
        const data = await getDiningStats();
        setDiningStats(data || null);
      } catch (error) {
        showToast(error.message || 'No se pudieron cargar estadisticas de comedor.', 'error');
      }
    };
    loadDining();
  }, [isDiningMonitor]);

  useEffect(() => {
    if (topTab === 'reports') {
      loadReports();
    }
  }, [topTab]);

  const loadReports = async () => {
    try {
      const data = await getForumReports();
      setReports(data || []);
    } catch (error) {
      showToast(error.message || 'Error al cargar reportes', 'error');
    }
  };

  const handleResolveReport = async (reportId) => {
    setResolvingReportId(reportId);
    try {
      await resolveForumReport(reportId);
      showToast('Reporte marcado como resuelto', 'success');
      loadReports();
    } catch (error) {
      showToast(error.message || 'Error al resolver reporte', 'error');
    } finally {
      setResolvingReportId(null);
    }
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

  const openSessionDetail = async (sessionId) => {
    try {
      const data = await getAcademicSessionDetail(sessionId);
      setSessionDetail(data);
    } catch (error) {
      showToast(error.message || 'No se pudo abrir el detalle de sesion.', 'error');
    }
  };

  const openDiningStudentDetail = async (studentId) => {
    try {
      const rows = await getDiningStudentHistory(studentId);
      setDiningStudentDetail(rows || []);
    } catch (error) {
      showToast(error.message || 'No se pudo abrir el historial del estudiante.', 'error');
    }
  };

  const saveExcuse = async () => {
    if (!excuseTarget?.id) return;
    if (!excuseReason.trim()) return showToast('El motivo es obligatorio.', 'error');
    try {
      await addAcademicAttendanceExcuse(excuseTarget.id, {
        reason: excuseReason.trim(),
        description: excuseDescription.trim()
      });
      if (sessionDetail?.id) {
        const refreshed = await getAcademicSessionDetail(sessionDetail.id);
        setSessionDetail(refreshed);
      }
      setExcuseTarget(null);
      setExcuseReason('');
      setExcuseDescription('');
      showToast('Excusa registrada correctamente.', 'success');
    } catch (error) {
      showToast(error.message || 'No se pudo guardar la excusa.', 'error');
    }
  };

  const handleDiningScan = async (token) => {
    const value = String(token || '').trim();
    if (!value) return showToast('Ingresa o escanea un QR.', 'error');
    if (isValidatingScan) return;
    setIsValidatingScan(true);
    try {
      const result = await scanQrLunch({ token: value });
      setScanResult({ status: 'VALID', message: 'QR valido', payload: result });
      playScanSound('success');
      setManualQrToken('');
      const updated = await getDiningStats();
      setDiningStats(updated || null);
    } catch (error) {
      const msg = String(error?.message || '');
      let status = 'INVALID';
      if (msg.toLowerCase().includes('ya')) status = 'ALREADY_CLAIMED';
      setScanResult({ status, message: msg || 'QR invalido', payload: null });
      playScanSound('error');
    } finally {
      setIsValidatingScan(false);
      // Auto-clear result after 3 seconds
      setTimeout(() => setScanResult(null), 3000);
    }
  };

  const diningRows = (diningStats?.recent_logs || []).filter((row) => {
    const byDate = !diningDateFilter || String(row.date || row.created_at || '').slice(0, 10) === diningDateFilter;
    const normalized = String(row.result || '').toUpperCase();
    const byStatus = diningStatusFilter === 'ALL' || normalized === diningStatusFilter;
    return byDate && byStatus;
  });

  const sessionDayCards = Object.values(
    (sessionCards || []).reduce((acc, item) => {
      const day = String(item.start_time || '').slice(0, 10);
      if (!acc[day]) {
        acc[day] = { day, total_attendees: 0, session_ids: [] };
      }
      acc[day].total_attendees += Number(item.total_attendees || 0);
      acc[day].session_ids.push(item.id);
      return acc;
    }, {})
  ).sort((a, b) => (a.day < b.day ? 1 : -1));

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
            className={`px-3 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all border-2 ${selected.includes(dia)
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

  if (isDiningMonitor) {
    return (
      <div className="min-h-screen bg-brand-gray p-4 sm:p-6 md:p-10">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="bg-teal-600 rounded-[32px] p-6 md:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-black tracking-tight">Panel Administrativo</h1>
              <p className="text-teal-100 text-sm mt-1">Control de comedor, escaneo QR y supervision de consumo.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setTopTab('stats')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${topTab === 'stats' ? 'bg-white text-teal-700 shadow-lg' : 'bg-white/20 text-white hover:bg-white/30'}`}>Estadisticas</button>
              <button onClick={() => setTopTab('scanner')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${topTab === 'scanner' ? 'bg-white text-teal-700 shadow-lg' : 'bg-white/20 text-white hover:bg-white/30'}`}>Escaner QR</button>
              <button onClick={() => setTopTab('students')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${topTab === 'students' ? 'bg-white text-teal-700 shadow-lg' : 'bg-white/20 text-white hover:bg-white/30'}`}>Atendidos</button>
              <button onClick={() => setTopTab('history')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${topTab === 'history' ? 'bg-white text-teal-700 shadow-lg' : 'bg-white/20 text-white hover:bg-white/30'}`}>Historial</button>
            </div>
          </div>

          {topTab === 'scanner' && (
            <section className="bg-white rounded-3xl border border-gray-100 p-5 space-y-6 relative overflow-hidden">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-black text-gray-900">Escaner de Comedor</h2>
                {scanResult && (
                  <button onClick={() => setScanResult(null)} className="text-[10px] font-black uppercase text-gray-400 hover:text-gray-600 transition-colors">
                    Limpiar Resultado
                  </button>
                )}
              </div>

              <div className="rounded-[40px] border border-slate-100 p-6 bg-slate-50 shadow-inner space-y-4 relative">
                {/* Flotante de Resultado QR - Absoluto sobre la cámara */}
                <AnimatePresence>
                  {scanResult && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, y: -20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: 20 }}
                      transition={{ type: 'spring', damping: 25, stiffness: 400 }}
                      className={`absolute top-10 left-1/2 -translate-x-1/2 z-[60] w-[90%] max-w-xs rounded-3xl border-4 p-5 flex flex-col items-center gap-3 text-center shadow-[0_30px_70px_rgba(0,0,0,0.5)] backdrop-blur-3xl ring-4 ${scanResult.status === 'VALID'
                          ? 'border-emerald-400 bg-emerald-50/95 text-emerald-900 ring-emerald-400/20 shadow-emerald-500/30'
                          : 'border-red-400 bg-red-50/95 text-red-900 ring-red-400/20 shadow-red-500/30'
                        }`}
                    >
                      <button
                        onClick={() => setScanResult(null)}
                        className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-black/10 text-gray-400 transition-all active:scale-90"
                      >
                        <X size={18} />
                      </button>

                      <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-xl ${scanResult.status === 'VALID' ? 'bg-emerald-500' : 'bg-red-500'}`}>
                        {scanResult.status === 'VALID' ? <UserCheck size={32} className="text-white" /> : <AlertCircle size={32} className="text-white" />}
                      </div>

                      <div className="space-y-1">
                        <p className="text-xl font-black uppercase tracking-tighter leading-tight">{scanResult.message}</p>
                        {scanResult.payload && (
                          <div className="mt-2 py-2 px-4 bg-white/50 border border-white/20 rounded-2xl shadow-sm">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 mb-1">Registrado</p>
                            <p className="text-sm font-black text-gray-900 truncate max-w-[200px]">
                              {scanResult.payload.student?.nombre || scanResult.payload.student_name || 'Estudiante'}
                            </p>
                          </div>
                        )}
                        {scanResult.status === 'ALREADY_CLAIMED' && (
                          <div className="mt-2 text-[10px] font-black uppercase text-red-600 tracking-widest animate-pulse">
                            DUPLICADO
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {cameraAvailable && (
                  <div className="flex flex-wrap gap-3 items-center justify-center">
                    <select
                      value={selectedCameraId}
                      onChange={(e) => setSelectedCameraId(e.target.value)}
                      className="border-2 border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-700 bg-white focus:ring-4 focus:ring-teal-50 outline-none select-none transition-all"
                    >
                      {(cameraDevices || []).map((cam, idx) => (
                        <option key={cam.deviceId || idx} value={cam.deviceId}>
                          {cam.label || `Lente ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        startCamera(selectedCameraId);
                        setTimeout(() => {
                          const res = captureFrameAndScan();
                          if (!res) showToast('No se detectó QR. Intenta enfocar mejor.', 'info');
                        }, 800);
                      }}
                      className="px-6 py-2.5 rounded-2xl bg-teal-600 text-white text-xs font-black shadow-lg shadow-teal-500/20 hover:bg-teal-700 active:scale-95 transition-all flex items-center gap-2"
                    >
                      <PlusCircle size={14} /> Escanear Ahora
                    </button>
                  </div>
                )}

                <div className="relative w-full max-w-sm mx-auto rounded-[48px] overflow-hidden border-8 border-white bg-black/95 aspect-square shadow-2xl group group-hover:border-teal-400/20 transition-all duration-500">
                  {cameraAvailable ? (
                    <>
                      <video ref={videoRef} className="w-full h-full object-cover grayscale-[20%]" autoPlay playsInline muted />
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        {/* Square Frame */}
                        <div className="w-[75%] h-[75%] border-2 border-emerald-400/40 rounded-[48px] shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] relative overflow-hidden">
                          {/* Scanning Laser */}
                          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_25px_rgba(52,211,153,1)] animate-scanner-laser bg-emerald-400" />

                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 opacity-20">
                            <Search size={48} className="text-emerald-400 animate-pulse" />
                            <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-[0.4em]">Escaner Qr</p>
                          </div>

                          {/* Corner Borders Stylized */}
                          <div className="absolute top-6 left-6 w-10 h-10 border-t-[6px] border-l-[6px] border-emerald-400/60 rounded-tl-2xl" />
                          <div className="absolute top-6 right-6 w-10 h-10 border-t-[6px] border-r-[6px] border-emerald-400/60 rounded-tr-2xl" />
                          <div className="absolute bottom-6 left-6 w-10 h-10 border-b-[6px] border-l-[6px] border-emerald-400/60 rounded-bl-2xl" />
                          <div className="absolute bottom-6 right-6 w-10 h-10 border-b-[6px] border-r-[6px] border-emerald-400/60 rounded-br-2xl" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center px-10 text-center gap-6 bg-slate-900/40">
                      <div className="w-24 h-24 rounded-full bg-teal-900/20 flex items-center justify-center text-teal-400 animate-pulse">
                        <Video size={48} />
                      </div>
                      <div className="space-y-2">
                        <p className="text-lg font-black text-white">Cámara Inactiva</p>
                        <p className="text-[10px] text-teal-400 font-bold max-w-[200px] leading-relaxed uppercase tracking-widest">Inicia el escaneo manual o inserta el token abajo.</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-center pt-2">
                  {cameraStatus === 'loading' && <p className="text-teal-600 font-black animate-pulse text-[10px] uppercase tracking-widest">Iniciando Lente...</p>}
                  {cameraStatus === 'ready' && <p className="text-emerald-600 font-black flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.2em]"><span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" /> Escáner Listo</p>}
                  {cameraStatus === 'error' && <p className="text-red-500 font-black text-[10px] uppercase tracking-widest">Error: {cameraError}</p>}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 max-w-xl mx-auto">
                <input value={manualQrToken} onChange={(e) => setManualQrToken(e.target.value)} className="flex-1 min-w-[220px] border-2 border-slate-100 bg-slate-50 rounded-2xl px-5 py-4 text-sm font-bold focus:border-teal-500 focus:bg-white outline-none transition-all placeholder:text-gray-300" placeholder="O escribe el token aquí..." />
                <button disabled={isValidatingScan} onClick={() => handleDiningScan(manualQrToken)} className="px-8 py-4 rounded-2xl bg-teal-600 text-white text-sm font-black shadow-xl shadow-teal-500/30 hover:bg-teal-700 active:scale-95 transition-all disabled:opacity-50">
                  {isValidatingScan ? '...' : 'Validar'}
                </button>
              </div>
            </section>
          )}

          {topTab === 'students' && (
            <section className="bg-white rounded-3xl border border-gray-100 p-5 space-y-4">
              <h2 className="text-lg font-black text-gray-900">Lista de estudiantes atendidos</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input type="date" value={diningDateFilter} onChange={(e) => setDiningDateFilter(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
                <select value={diningStatusFilter} onChange={(e) => setDiningStatusFilter(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm">
                  <option value="ALL">Todos</option>
                  <option value="ACCEPTED">VALIDO</option>
                  <option value="DUPLICATE">YA RECLAMO</option>
                  <option value="INVALID">INVALIDO</option>
                  <option value="EXPIRED">EXPIRADO</option>
                </select>
                <button onClick={() => { setDiningDateFilter(''); setDiningStatusFilter('ALL'); }} className="px-3 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-black">Limpiar</button>
              </div>
              <div className="max-h-96 overflow-auto rounded-2xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr><th className="px-3 py-2 text-left">Estudiante</th><th className="px-3 py-2 text-left">Hora</th><th className="px-3 py-2 text-left">Estado</th></tr>
                  </thead>
                  <tbody>
                    {diningRows.map((row) => (
                      <tr key={row.id} className="border-t border-gray-100">
                        <td className="px-3 py-2">{row.student_name}</td>
                        <td className="px-3 py-2">{new Date(row.created_at).toLocaleString()}</td>
                        <td className="px-3 py-2">{String(row.result || '').toUpperCase()}</td>
                      </tr>
                    ))}
                    {!diningRows.length && <tr><td colSpan="3" className="px-3 py-6 text-gray-400">Sin registros.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {topTab === 'history' && (
            <section className="bg-white rounded-3xl border border-gray-100 p-5 space-y-4">
              <h2 className="text-lg font-black text-gray-900">Historial de recoleccion</h2>
              <div className="space-y-2 max-h-96 overflow-auto">
                {diningRows.map((row) => (
                  <div key={row.id} className="rounded-xl border border-gray-100 p-3 bg-gray-50">
                    <p className="font-bold text-gray-900">{row.student_name}</p>
                    <p className="text-xs text-gray-500">{new Date(row.created_at).toLocaleString()}</p>
                    <p className="text-xs text-gray-600 mt-1">Resultado: {String(row.result || '').toUpperCase()}</p>
                  </div>
                ))}
                {!diningRows.length && <p className="text-sm text-gray-500">Sin historial.</p>}
              </div>
            </section>
          )}

          {topTab === 'stats' && (
            <section className="bg-white rounded-3xl border border-gray-100 p-5 space-y-4">
              <h2 className="text-lg font-black text-gray-900">Estadisticas de comedor</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-gray-100 p-4 bg-gray-50"><p className="text-xs uppercase font-black text-gray-500">Total atendidos</p><p className="text-2xl font-black text-brand-blue">{diningStats?.totals?.total_students_served || 0}</p></div>
                <div className="rounded-2xl border border-gray-100 p-4 bg-gray-50"><p className="text-xs uppercase font-black text-gray-500">Total consumos</p><p className="text-2xl font-black text-brand-blue">{diningStats?.totals?.total_served || 0}</p></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-gray-100 p-4">
                  <p className="text-xs uppercase font-black text-gray-500 mb-2">Frecuencia por estudiante</p>
                  {(diningStats?.history_by_student || []).slice(0, 10).map((row) => <p key={row.student_id} className="text-sm text-gray-700">{row.student_name}: <span className="font-black">{row.meals_count}</span></p>)}
                </div>
                <div className="rounded-2xl border border-gray-100 p-4">
                  <p className="text-xs uppercase font-black text-gray-500 mb-2">Rechazos</p>
                  {(diningStats?.rejected_attempts || []).map((r) => <p key={r.result} className="text-sm text-gray-700">{r.result}: <span className="font-black">{r.total}</span></p>)}
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-gray p-4 sm:p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-brand-blue font-bold">
          ← Volver
        </button>
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
                Panel Monitor Academico
              </h1>
              <p className="text-emerald-100 text-sm font-medium leading-relaxed max-w-lg">
                Gestiona tus monitorías, comparte enlaces y supervisa tus asistencias.
              </p>
            </div>
          </div>

          <div className="relative z-10 flex gap-2 self-end md:self-start">
            <div className="flex bg-gray-50 p-1.5 rounded-2xl w-fit border border-gray-100 mb-8 overflow-auto max-w-full">
              <button
                onClick={() => setTopTab('')}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 ${!topTab ? 'bg-white text-gray-900 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'
                  }`}
              >
                <Users size={14} /> Alumnos
              </button>
              <button
                onClick={() => setTopTab('stats')}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 ${topTab === 'stats' ? 'bg-white text-gray-900 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'
                  }`}
              >
                <AlertCircle size={14} /> Estadisticas
              </button>
              <button
                onClick={() => setTopTab('reports')}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 ${topTab === 'reports' ? 'bg-white text-gray-900 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'
                  }`}
              >
                <AlertOctagon size={14} className={topTab === 'reports' ? 'text-amber-500' : ''} /> Reportes
              </button>
            </div>
            <button
              onClick={() => setTopTab((prev) => (prev === 'history' ? '' : 'history'))}
              className={`px-4 py-2 rounded-xl text-xs font-black ${topTab === 'history' ? 'bg-white text-emerald-700' : 'bg-white/20 text-white'}`}
            >
              Asistencia
            </button>
          </div>
        </div>

        {!isDiningMonitor && (topTab === 'stats' || topTab === 'history') && (
          <section className="bg-white rounded-3xl border border-gray-100 p-5 space-y-4">
            <div className="flex flex-wrap items-center gap-2 justify-between">
              <h2 className="text-lg font-black text-gray-900">{topTab === 'stats' ? 'Estadisticas por modulo' : 'Historial de sesiones'}</h2>
              <select
                value={selectedAnalyticsModuleId || ''}
                onChange={(e) => setSelectedAnalyticsModuleId(Number(e.target.value))}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm"
              >
                {(monitorModules || []).map((m) => (
                  <option key={m.id} value={m.id}>{m.modulo}</option>
                ))}
              </select>
            </div>

            {topTab === 'stats' ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                  <div className="rounded-xl border border-gray-100 p-3 bg-gray-50"><p className="text-[10px] font-black uppercase text-gray-500">% Promedio</p><p className="text-lg font-black text-brand-blue">{academicStats?.totals?.avg_rating || 0}</p></div>
                  <div className="rounded-xl border border-gray-100 p-3 bg-gray-50"><p className="text-[10px] font-black uppercase text-gray-500">Presentes</p><p className="text-lg font-black text-brand-blue">{academicStats?.totals?.present_count || 0}</p></div>
                  <div className="rounded-xl border border-gray-100 p-3 bg-gray-50"><p className="text-[10px] font-black uppercase text-gray-500">Ausentes</p><p className="text-lg font-black text-brand-blue">{academicStats?.totals?.absent_count || 0}</p></div>
                  <div className="rounded-xl border border-gray-100 p-3 bg-gray-50"><p className="text-[10px] font-black uppercase text-gray-500">Excusas</p><p className="text-lg font-black text-brand-blue">{academicStats?.totals?.excuse_count || 0}</p></div>
                  <div className="rounded-xl border border-gray-100 p-3 bg-gray-50"><p className="text-[10px] font-black uppercase text-gray-500">Horas monitor</p><p className="text-lg font-black text-brand-blue">{academicStats?.totals?.total_monitor_hours || 0}</p></div>
                  <div className="rounded-xl border border-gray-100 p-3 bg-gray-50"><p className="text-[10px] font-black uppercase text-gray-500">Sesiones</p><p className="text-lg font-black text-brand-blue">{academicStats?.totals?.total_sessions || 0}</p></div>
                </div>
                <div className="max-h-64 overflow-auto border border-gray-100 rounded-2xl">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                      <tr><th className="px-3 py-2 text-left">Estudiante</th><th className="px-3 py-2 text-left">% Asistencia</th><th className="px-3 py-2 text-left">Presentes</th><th className="px-3 py-2 text-left">Ausentes</th><th className="px-3 py-2 text-left">Excusas</th></tr>
                    </thead>
                    <tbody>
                      {(academicStats?.students || []).map((st) => (
                        <tr key={st.student_key} className="border-t border-gray-100">
                          <td className="px-3 py-2">{st.student_name}</td>
                          <td className="px-3 py-2">{st.attendance_percent}%</td>
                          <td className="px-3 py-2">{st.present_count}</td>
                          <td className="px-3 py-2">{st.absent_count}</td>
                          <td className="px-3 py-2">{st.excuse_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sessionDayCards.map((card) => (
                  <button key={card.day} onClick={() => openSessionDetail(card.session_ids[0])} className="text-left rounded-2xl border border-gray-100 p-4 bg-gray-50 hover:border-brand-blue">
                    <p className="font-black text-gray-900">Fecha: {new Date(`${card.day}T00:00:00`).toLocaleDateString('es-CO')}</p>
                    <p className="text-xs text-gray-500 mt-1">Total asistentes: {card.total_attendees}</p>
                    <p className="text-xs text-gray-500">Sesiones del dia: {card.session_ids.length}</p>
                  </button>
                ))}
                {!sessionDayCards.length && <p className="text-sm text-gray-500">Sin sesiones registradas.</p>}
              </div>
            )}
          </section>
        )}

        {isDiningMonitor && (
          <section className="bg-white rounded-3xl border border-gray-100 p-5 space-y-4">
            <h2 className="text-lg font-black text-gray-900">{topTab === 'stats' ? 'Estadisticas de comedor' : 'Historial por estudiante'}</h2>
            {topTab === 'stats' ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-gray-100 p-4 bg-gray-50"><p className="text-xs uppercase font-black text-gray-500">Total atendidos</p><p className="text-2xl font-black text-brand-blue">{diningStats?.totals?.total_students_served || 0}</p></div>
                  <div className="rounded-2xl border border-gray-100 p-4 bg-gray-50"><p className="text-xs uppercase font-black text-gray-500">Total consumos</p><p className="text-2xl font-black text-brand-blue">{diningStats?.totals?.total_served || 0}</p></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-gray-100 p-4">
                    <p className="text-xs uppercase font-black text-gray-500 mb-2">Intentos rechazados</p>
                    {(diningStats?.rejected_attempts || []).map((r) => <p key={r.result} className="text-sm text-gray-700">{r.result}: <span className="font-black">{r.total}</span></p>)}
                  </div>
                  <div className="rounded-2xl border border-gray-100 p-4">
                    <p className="text-xs uppercase font-black text-gray-500 mb-2">Estudiantes inactivos</p>
                    <div className="max-h-28 overflow-auto">{(diningStats?.inactive_students || []).map((s) => <p key={s.student_id} className="text-sm text-gray-700">{s.student_name}</p>)}</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(diningStats?.history_by_student || []).map((row) => (
                  <button key={row.student_id} onClick={() => openDiningStudentDetail(row.student_id)} className="text-left rounded-2xl border border-gray-100 p-4 bg-gray-50">
                    <p className="font-black text-gray-900">{row.student_name}</p>
                    <p className="text-xs text-gray-500">Consumos: {row.meals_count}</p>
                    <p className="text-xs text-gray-500">Ultimo: {row.last_meal_at ? new Date(row.last_meal_at).toLocaleString() : '-'}</p>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {!isDiningMonitor && (topTab === 'manage' || !topTab) && (
          <>
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
                            className="text-gray-400 hover:text-brand-blue transition-all p-2 hover:bg-blue-50 rounded-lg active:scale-90"
                            title="Editar Datos"
                          >
                            <Edit3 size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteModule(mod)}
                            className="text-gray-400 hover:text-red-500 transition-all p-2 hover:bg-red-50 rounded-lg active:scale-90"
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
                          className={`flex-grow py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all active:scale-95 ${filterModulo === mod.modulo ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                            }`}
                        >
                          <Users size={12} /> Ver Alumnos
                        </button>
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleCopyTemplate(mod)}
                            className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 hover:shadow-md transition-all flex items-center justify-center active:scale-90"
                            title="Copiar Plantilla"
                          >
                            <ClipboardList size={18} />
                          </button>
                          <button
                            onClick={() => handleCopySurvey(mod)}
                            className="p-2.5 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-100 hover:shadow-md transition-all flex items-center justify-center active:scale-90"
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
                      className="text-[10px] font-black uppercase text-gray-400 hover:text-brand-blue hover:bg-brand-blue/5 transition-all px-3 py-1 bg-gray-100 rounded-full active:scale-95"
                    >
                      Ver Todos
                    </button>
                  )}
                </div>
                {/* Student List Grid/Table Area */}
                <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
                  <div className="p-5 sm:p-8 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-0 bg-white/80 backdrop-blur-md z-10 text-center sm:text-left">
                    <h3 className="text-xl font-black text-gray-900">
                      {topTab === 'reports' ? 'Centro de Moderacion' : 'Estudiantes Registrados'}
                    </h3>
                    {topTab === 'reports' ? (
                      <div className="flex items-center gap-2">
                        <button onClick={loadReports} className="p-2 text-gray-400 hover:text-brand-blue transition-all">
                          <Clock3 size={18} />
                        </button>
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-50 px-3 py-1 rounded-full">
                          {reports.length} reportes pendientes
                        </span>
                      </div>
                    ) : (
                      <div className="w-full sm:w-auto flex items-center gap-2">
                        <button
                          onClick={exportStudentsCsv}
                          className="px-4 py-2 rounded-xl bg-gray-900 text-white text-[11px] font-black uppercase tracking-wider hover:bg-black hover:shadow-lg active:scale-95 transition-all"
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
                    )}
                  </div>

                  <div className="flex-grow overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-max">
                      <thead>
                        <tr className="bg-gray-50 text-[10px] uppercase tracking-widest font-black text-gray-400">
                          {topTab === 'reports' ? (
                            <>
                              <th className="px-6 py-4">Autor</th>
                              <th className="px-6 py-4">Motivo</th>
                              <th className="px-6 py-4">Foro / Mensaje</th>
                              <th className="px-6 py-4 text-right">Acciones</th>
                            </>
                          ) : (
                            <>
                              <th className="px-6 py-4">Estudiante</th>
                              <th className="px-6 py-4">Módulo</th>
                              <th className="px-6 py-4">Fecha Reg.</th>
                              <th className="px-6 py-4 text-right">Acciones</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {topTab === 'reports' ? (
                          reports.length === 0 ? (
                            <tr>
                              <td colSpan="4" className="px-6 py-20 text-center italic text-gray-400 font-bold">Sin reportes pendientes</td>
                            </tr>
                          ) : (
                            reports.map(rep => (
                              <tr key={rep.id} className="hover:bg-gray-50 transition-all group">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    <UserAvatar photo={rep.reported_photo} name={rep.reported_name} userId={rep.reported_id} size="w-8 h-8" />
                                    <div>
                                      <p className="font-bold text-gray-900 text-xs">{rep.reported_name}</p>
                                      <p className="text-[9px] text-gray-400">Reportado por: {rep.reporter_name}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="max-w-xs">
                                    <p className="text-xs font-bold text-gray-700">{rep.reason}</p>
                                    <p className="text-[10px] text-gray-400 mt-1">{new Date(rep.created_at).toLocaleString()}</p>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <button
                                    onClick={() => navigate(`/modules/${rep.modulo_id || 0}/forum?forumId=${rep.target_id}`)}
                                    className="px-3 py-1 bg-amber-50 text-amber-700 text-[10px] font-black rounded-lg uppercase border border-amber-100 hover:bg-amber-100 transition-all"
                                  >
                                    {rep.target_type === 'thread' ? 'Ver Pregunta' : 'Ver Respuesta'}
                                  </button>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <button
                                    disabled={resolvingReportId === rep.id}
                                    onClick={() => handleResolveReport(rep.id)}
                                    className="px-4 py-2 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase rounded-xl border border-emerald-200 hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-50"
                                  >
                                    {resolvingReportId === rep.id ? '...' : 'Resolver'}
                                  </button>
                                </td>
                              </tr>
                            ))
                          )
                        ) : (
                          (() => {
                            const filteredRegistrations = students
                              .filter(st => filterModulo === 'all' || st.modulo === filterModulo)
                              .filter(st =>
                                (st.studentName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                                (st.studentEmail?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                                (st.modulo?.toLowerCase() || '').includes(searchTerm.toLowerCase())
                              );

                            const groupedMap = filteredRegistrations.reduce((acc, reg) => {
                              if (!acc[reg.studentEmail]) {
                                acc[reg.studentEmail] = { ...reg, modulos: [reg.modulo], regIds: [reg.id] };
                              } else if (!acc[reg.studentEmail].modulos.includes(reg.modulo)) {
                                acc[reg.studentEmail].modulos.push(reg.modulo);
                                acc[reg.studentEmail].regIds.push(reg.id);
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
                              <tr key={st.studentEmail} className="hover:bg-gray-50 transition-all group">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <UserAvatar user={{ nombre: st.studentName, email: st.studentEmail, role: 'student', registeredAt: st.registeredAt }} size="sm" showBadge={true} />
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
                                    className="p-2 text-red-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-90"
                                  >
                                    <Trash2 size={20} />
                                  </button>
                                </td>
                              </tr>
                            ));
                          })()
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <RoleStatsPanel />
          </>
        )}
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
                  className={`p-3 rounded-xl border-2 transition-all flex items-center justify-between text-xs font-bold ${deleteTargetId === selectedStudent.regIds[idx]
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

      <Modal isOpen={!!sessionDetail} onClose={() => setSessionDetail(null)} title="Detalle de sesion">
        {sessionDetail ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">{sessionDetail.modulo} · {new Date(sessionDetail.start_time).toLocaleString()} - {new Date(sessionDetail.end_time).toLocaleString()}</p>
            <div className="max-h-80 overflow-auto space-y-2">
              {(sessionDetail.attendance || []).map((a) => (
                <div key={a.id} className="rounded-xl border border-gray-100 p-3 bg-gray-50">
                  <p className="font-bold text-gray-900">{a.student_name || `ID ${a.student_id}`}</p>
                  <p className="text-xs text-gray-500">{a.status}</p>
                  {a.status === 'EXCUSA' && (
                    <p className="text-xs text-gray-600">Excusa: {a.excuse_reason} - {a.excuse_description}</p>
                  )}
                  {a.status !== 'EXCUSA' && (
                    <button onClick={() => setExcuseTarget(a)} className="mt-2 px-2 py-1 rounded-lg bg-amber-100 text-amber-700 text-[11px] font-black">
                      Agregar excusa
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal isOpen={!!excuseTarget} onClose={() => setExcuseTarget(null)} title="Agregar excusa">
        <div className="space-y-3">
          <input
            value={excuseReason}
            onChange={(e) => setExcuseReason(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
            placeholder="Motivo"
          />
          <textarea
            value={excuseDescription}
            onChange={(e) => setExcuseDescription(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm min-h-[90px]"
            placeholder="Descripcion"
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setExcuseTarget(null)} className="px-3 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold">Cancelar</button>
            <button onClick={saveExcuse} className="px-3 py-2 rounded-xl bg-brand-blue text-white text-sm font-bold">Guardar</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!diningStudentDetail} onClose={() => setDiningStudentDetail(null)} title="Historial de comedor">
        <div className="space-y-2 max-h-80 overflow-auto">
          {(diningStudentDetail || []).map((row) => (
            <div key={row.id} className="rounded-xl border border-gray-100 p-3 bg-gray-50">
              <p className="font-bold text-gray-900">{row.student_name}</p>
              <p className="text-xs text-gray-500">{new Date(row.created_at).toLocaleString()}</p>
              <p className="text-xs text-gray-500">Registrado por: {row.scanner_name || '-'}</p>
            </div>
          ))}
          {!diningStudentDetail?.length && <p className="text-sm text-gray-500">Sin historial.</p>}
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
