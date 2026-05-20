import React, { useEffect, useRef, useState } from 'react';
import {
  getStudentsByMonitor, deleteMonitoria, updateMonitoriaInfo, getMonitorias,
  getAllUsers, getMaintenanceConfig, getSedes, deleteModule, createMonitoria,
  getModalidades, getCuatrimestres, getAllRegistrations, getAcademicModuleStats,
  getAcademicSessionHistory, getAcademicSessionDetail, getDiningStats,
  getDiningStudentHistory, scanQrLunch, addAcademicAttendanceExcuse,
  getForumReports, resolveForumReport, getModuleFeedbackForMonitor
} from '../services/api';
import { useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';
import Modal from '../components/Modal';
import { motion, AnimatePresence } from 'framer-motion';
import { ToastContext } from '../context/ToastContext';
import {
  Users, BookOpen, Trash2, Edit3, ClipboardList, UserCircle2,
  MessageSquare, AlertCircle, MessageCircle, Video, PlusCircle,
  Search, UserCheck, Clock3, X, AlertOctagon, Activity, GraduationCap, ShieldCheck
} from 'lucide-react';
import UserAvatar from '../components/UserAvatar';
import InputField from '../components/InputField';
import RoleStatsPanel from '../components/RoleStatsPanel';
import { splitHighlightedText } from '../utils/forumSearchHelpers';
import { formatTimeAMPM } from '../utils/timeHelpers';

const Time12hPicker = ({ label, value, onChange, role = 'monitor' }) => {
  const parse24h = (val) => {
    if (!val) return { timeStr: '08:00', ampm: 'AM' };
    const [hStr, mStr] = val.split(':');
    const h24 = parseInt(hStr, 10) || 0;
    const minute = mStr || '00';

    let ampm = 'AM';
    let h12 = h24;
    if (h24 >= 12) {
      ampm = 'PM';
      if (h24 > 12) h12 = h24 - 12;
    }
    if (h12 === 0) h12 = 12;

    const hour12 = String(h12).padStart(2, '0');
    return { timeStr: `${hour12}:${minute}`, ampm };
  };

  const { timeStr, ampm } = parse24h(value);
  const [inputValue, setInputValue] = useState(timeStr);

  // Sync state if value prop changes
  useEffect(() => {
    setInputValue(timeStr);
  }, [value]);

  const handleTextChange = (e) => {
    let val = e.target.value;
    // Allow digits and colon only
    val = val.replace(/[^0-9:]/g, '');
    setInputValue(val);
  };

  const handleBlur = () => {
    // Parse the input string to normalize it
    let [hPart, mPart] = inputValue.split(':');
    if (!hPart) hPart = '08';
    if (!mPart) mPart = '00';

    // Normalize hours to 01-12 range
    let h = parseInt(hPart, 10) || 12;
    if (h < 1) h = 12;
    if (h > 12) h = 12;

    // Normalize minutes to 00-59 range
    let m = parseInt(mPart, 10) || 0;
    if (m < 0) m = 0;
    if (m > 59) m = 59;

    const formattedH = String(h).padStart(2, '0');
    const formattedM = String(m).padStart(2, '0');
    const newTimeStr = `${formattedH}:${formattedM}`;

    setInputValue(newTimeStr);

    // Save as 24h
    save24h(formattedH, formattedM, ampm);
  };

  const save24h = (h12Str, mStr, currentAmpm) => {
    let h24 = parseInt(h12Str, 10) || 12;
    if (currentAmpm === 'PM') {
      if (h24 !== 12) h24 += 12;
    } else {
      if (h24 === 12) h24 = 0;
    }
    const h24Str = String(h24).padStart(2, '0');
    onChange(`${h24Str}:${mStr}`);
  };

  const handleAmpmToggle = (newAmpm) => {
    const [h12Str, mStr] = inputValue.split(':');
    save24h(h12Str || '08', mStr || '00', newAmpm);
  };

  const getRoleColors = (r) => {
    switch (r?.toLowerCase()) {
      case 'dev': return { bg: 'bg-purple-600', border: 'focus-within:border-purple-600' };
      case 'admin': return { bg: 'bg-indigo-600', border: 'focus-within:border-indigo-600' };
      default: return { bg: 'bg-emerald-600', border: 'focus-within:border-emerald-600' };
    }
  };
  const activeColor = getRoleColors(role);

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] ml-2 block pointer-events-none">
        {label}
      </label>
      <div className={`flex gap-3 items-center bg-white border border-slate-200 rounded-2xl p-2.5 transition-all ${activeColor.border}`}>
        <div className="flex-1 flex items-center gap-1.5 pl-2">
          <input
            type="text"
            value={inputValue}
            onChange={handleTextChange}
            onBlur={handleBlur}
            placeholder="08:00"
            className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none border-none py-1 tracking-wider"
          />
        </div>
        <div className="flex bg-slate-50 p-0.5 rounded-xl border border-slate-100/50 shrink-0">
          <button
            type="button"
            onClick={() => handleAmpmToggle('AM')}
            className={`px-3 py-1.5 rounded-lg text-[9px] font-extrabold tracking-wider uppercase transition-all ${ampm === 'AM'
              ? `${activeColor.bg} text-white`
              : 'text-slate-400 hover:text-slate-600'
              }`}
          >
            AM
          </button>
          <button
            type="button"
            onClick={() => handleAmpmToggle('PM')}
            className={`px-3 py-1.5 rounded-lg text-[9px] font-extrabold tracking-wider uppercase transition-all ${ampm === 'PM'
              ? `${activeColor.bg} text-white`
              : 'text-slate-400 hover:text-slate-600'
              }`}
          >
            PM
          </button>
        </div>
      </div>
    </div>
  );
};

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
  const [topTab, setTopTab] = useState('stats');
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
  const [cameraPermission, setCameraPermission] = useState('unknown');
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
  const [modulesPage, setModulesPage] = useState(1);
  const [reportsPage, setReportsPage] = useState(1);
  const [studentsPage, setStudentsPage] = useState(1);
  const REPORTS_PER_PAGE = 8;
  const STUDENTS_PER_PAGE = 15;
  const MODULES_PER_PAGE = 8;

  const renderSearchHighlight = (value) => (
    <>
      {splitHighlightedText(String(value || ''), searchTerm).map((part, index) => (
        part.match
          ? <mark key={index} className="rounded bg-yellow-200 px-0.5 text-gray-950">{part.text}</mark>
          : <React.Fragment key={index}>{part.text}</React.Fragment>
      ))}
    </>
  );

  const safeParse = (raw, fallback = {}) => { try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } };
  const session = safeParse(localStorage.getItem('monitores_current_role'), {});
  const isDiningMonitor = ['monitor_administrativo'].includes(String(session?.role || '').toLowerCase()) || ['monitor_administrativo'].includes(String(session?.baseRole || '').toLowerCase());

  const monitorId = session.id; // Use real session ID now

  useEffect(() => {
    if (isDiningMonitor) {
      setTopTab('stats_dining');
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
          .then((stream) => {
            stream.getTracks().forEach((track) => track.stop());
          })
          .catch((err) => {
            console.warn("Camera permission prompt failed or denied:", err);
          });
      }
    } else {
      setTopTab('stats');
    }
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
      setCameraPermission('unsupported');
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
      setCameraPermission('granted');

      // Universal scanning loop using jsQR
      scanTimerRef.current = setInterval(() => {
        captureFrameAndScan();
      }, 700);

    } catch (error) {
      setCameraAvailable(false);
      setCameraStatus('error');
      const errName = String(error?.name || '');
      if (errName === 'NotAllowedError' || errName === 'SecurityError') {
        setCameraPermission('denied');
        setCameraError('Permiso de camara denegado. Debes permitir acceso para escanear.');
      } else if (errName === 'NotFoundError' || errName === 'OverconstrainedError') {
        setCameraPermission('missing');
        setCameraError('No se encontro camara disponible.');
      } else {
        setCameraPermission('error');
        setCameraError(String(error?.message || 'No se detecto camara'));
      }
    }
  };

  const requestCameraPermission = async () => {
    setCameraError('');
    setCameraStatus('loading');
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setCameraPermission('unsupported');
        setCameraStatus('none');
        setCameraAvailable(false);
        setCameraError('Este navegador no soporta acceso a camara.');
        return;
      }

      // Force permission prompt in all supported mobile browsers.
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      stream.getTracks().forEach((track) => track.stop());
      setCameraPermission('granted');
      await startCamera(selectedCameraId);
    } catch (error) {
      const errName = String(error?.name || '');
      setCameraAvailable(false);
      setCameraStatus('error');
      if (errName === 'NotAllowedError' || errName === 'SecurityError') {
        setCameraPermission('denied');
        setCameraError('Permiso de camara denegado. Habilitalo en el navegador.');
      } else {
        setCameraPermission('error');
        setCameraError(String(error?.message || 'No se pudo solicitar permiso de camara.'));
      }
    }
  };

  useEffect(() => {
    if (!isDiningMonitor || topTab !== 'scanner') {
      stopCamera();
      return;
    }
    requestCameraPermission();
    return () => stopCamera();
  }, [isDiningMonitor, topTab, selectedCameraId]);

  useEffect(() => {
    const checkMaintenance = async () => {
      const config = await getMaintenanceConfig();
      const restrictions = typeof session?.restrictions === 'string'
        ? safeParse(session.restrictions, {})
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
    const fetchParams = { monitorId: monitorId };
    const regParams = { monitorUserId: monitorId };

    const [myRegistrations, myModules, users, sedes, mods, cuats] = await Promise.all([
      getAllRegistrations(regParams),
      getMonitorias(fetchParams),
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
      if (isDiningMonitor || !selectedAnalyticsModuleId || !(monitorModules || []).length) {
        setAcademicStats(null);
        setSessionCards([]);
        return;
      }
      try {
        const [statsData, sessionRows] = await Promise.all([
          getAcademicModuleStats(selectedAnalyticsModuleId),
          getAcademicSessionHistory(selectedAnalyticsModuleId)
        ]);
        setAcademicStats(statsData || null);
        setSessionCards(sessionRows || []);
      } catch (error) {
        // Suppress error toasts for Dev/Admin users who might not have assigned modules
        const isStaff = session?.role === 'dev' || session?.role === 'admin' || session?.is_principal;
        if (!isStaff) {
          showToast(error.message || 'No se pudieron cargar estadisticas academicas.', 'error');
        }
      }
    };
    loadAcademic();
  }, [selectedAnalyticsModuleId, isDiningMonitor, monitorModules]);

  useEffect(() => {
    const loadDining = async () => {
      if (!isDiningMonitor) return;
      try {
        const data = await getDiningStats();
        setDiningStats(data || null);
      } catch (error) {
        const isStaff = session?.role === 'dev' || session?.role === 'admin' || session?.is_principal;
        if (!isStaff) {
          showToast(error.message || 'No se pudieron cargar estadisticas de comedor.', 'error');
        }
      }
    };
    loadDining();
  }, [isDiningMonitor]);

  useEffect(() => {
    if (topTab === 'reports') loadReports();
  }, [topTab, monitorModules]);



  const loadReports = async () => {
    try {
      const data = await getForumReports();
      const myModuleIds = (monitorModules || []).map(m => String(m.id));
      const filtered = (data || []).filter(rep => myModuleIds.includes(String(rep.modulo_id)));
      setReports(filtered);
      setReportsPage(1);
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
      teams: mod.teams || '',
      cuatrimestre: mod.cuatrimestre || '1° Cuatrimestre'
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
              ? 'bg-emerald-600 border-emerald-600 text-white'
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
          <header className="bg-gradient-to-br from-teal-600 to-cyan-700 rounded-[1.5rem] p-4 sm:p-6 md:p-8 text-white shadow-xl shadow-teal-900/10 relative overflow-hidden group">
            {/* Subtle decorative background elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-700"></div>

            <div className="relative z-10 w-full flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
                <div className="w-12 h-12 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center bg-white/10 backdrop-blur-sm border border-white/20 group-hover:rotate-3 transition-transform shrink-0">
                  <ShieldCheck className="text-white w-6 h-6 sm:w-10 sm:h-10" />
                </div>
                <div className="space-y-1.5 pt-0.5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/5">
                    <div className="w-1.5 h-1.5 bg-teal-300 rounded-full animate-pulse shadow-[0_0_8px_rgba(45,212,191,0.8)]"></div>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-teal-50">Bienvenido(a), {session?.nombre || 'Administrador'}</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight leading-none">
                    Panel Administrativo
                  </h1>
                  <p className="text-teal-50 text-xs font-medium opacity-90 max-w-lg leading-relaxed">
                    Resumen de actividad diaria, escaneo de tokens y control de asistencia en comedor.
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center md:items-end gap-3 w-full md:w-auto">
                <div className="bg-white/10 backdrop-blur-md p-1 rounded-xl flex items-center gap-0.5 w-full md:w-auto overflow-x-auto justify-between md:justify-start">
                  {[
                    { id: 'stats_dining', label: 'Stats', icon: <Activity size={14} /> },
                    { id: 'scanner', label: 'Escáner', icon: <PlusCircle size={14} /> },
                    { id: 'students', label: 'Atendidos', icon: <Users size={14} /> },
                  ].map(tab => {
                    const isActive = topTab === tab.id || (!topTab && tab.id === 'stats_dining');
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setTopTab(tab.id)}
                        className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 shrink-0 ${isActive
                          ? 'bg-white text-teal-700 shadow-md scale-105'
                          : 'text-white/80 hover:text-white hover:bg-white/5'
                          }`}
                      >
                        <span className="hidden sm:inline-block shrink-0">{tab.icon}</span>
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </header>

          {(topTab === 'stats_dining' || !topTab) && (
            <div className="animate-fade-in space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                  <p className="text-[10px] font-black uppercase text-teal-600 tracking-widest mb-2">Atendidos Hoy</p>
                  <p className="text-4xl font-black text-gray-900">{diningStats?.scans_today || 0}</p>
                </div>
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                  <p className="text-[10px] font-black uppercase text-teal-600 tracking-widest mb-2">Total Histórico</p>
                  <p className="text-4xl font-black text-gray-900">{diningStats?.scans_total || 0}</p>
                </div>
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                  <p className="text-[10px] font-black uppercase text-teal-600 tracking-widest mb-2">Éxito Escaneo</p>
                  <p className="text-4xl font-black text-emerald-600">
                    {diningStats?.scans_total > 0
                      ? Math.round(((diningStats?.scans_total - (diningStats?.scans_invalid || 0)) / diningStats?.scans_total) * 100)
                      : 100}%
                  </p>
                </div>
              </div>

              <section className="bg-white rounded-3xl border border-gray-100 p-6 space-y-4">
                <h2 className="text-lg font-black text-gray-900">Actividad de Usuarios</h2>
                <div className="space-y-3">
                  {(diningStats?.top_scanners || []).length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No hay datos de actividad disponibles.</p>
                  ) : (
                    (diningStats?.top_scanners || []).map((scanner, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center text-teal-600 font-black">
                            {scanner.student_name?.[0] || 'S'}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{scanner.student_name}</p>
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Token Atendido</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-teal-600">{scanner.count} servicios</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          )}

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
                        : 'border-slate-400 bg-slate-50/95 text-slate-900 ring-red-400/20 shadow-red-500/30'
                        }`}
                    >
                      <button
                        onClick={() => setScanResult(null)}
                        className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-black/10 text-gray-400 transition-all active:scale-90"
                      >
                        <X size={18} />
                      </button>

                      <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-xl ${scanResult.status === 'VALID' ? 'bg-emerald-500' : 'bg-slate-500'}`}>
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
                          <div className="mt-2 text-[10px] font-black uppercase text-slate-600 tracking-widest animate-pulse">
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
                      className="border-2 border-slate-200 rounded-2xl px-4 py-2.5 text-base font-bold text-slate-700 bg-white focus:border-slate-400 outline-none select-none transition-all"
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
                      className="px-6 py-2.5 rounded-2xl bg-teal-600 text-white text-xs font-black hover:bg-teal-700 active:scale-95 transition-all flex items-center gap-2"
                    >
                      <PlusCircle size={14} /> Escanear Ahora
                    </button>
                  </div>
                )}
                {!cameraAvailable && (
                  <div className="flex justify-center">
                    <button
                      onClick={requestCameraPermission}
                      className="px-6 py-2.5 rounded-2xl bg-teal-600 text-white text-xs font-black hover:bg-teal-700 active:scale-95 transition-all"
                    >
                      Permitir camara
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
                  {cameraStatus === 'error' && <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest">Error: {cameraError}</p>}
                  {cameraPermission === 'denied' && <p className="text-[10px] text-amber-600 font-black uppercase tracking-widest mt-1">Activa camara en permisos del navegador</p>}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 max-w-xl mx-auto">
                <input value={manualQrToken} onChange={(e) => setManualQrToken(e.target.value)} className="flex-1 min-w-[220px] border-2 border-slate-100 bg-slate-50 rounded-2xl px-5 py-4 text-sm font-bold focus:border-teal-500 focus:bg-white outline-none transition-all placeholder:text-gray-300" placeholder="O escribe el token aquí..." />
                <button disabled={isValidatingScan} onClick={() => handleDiningScan(manualQrToken)} className="px-8 py-4 rounded-2xl bg-teal-600 text-white text-sm font-black hover:bg-teal-700 active:scale-95 transition-all disabled:opacity-50">
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

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-gray p-4 sm:p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Header Monitor Académico */}
        <header className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-[1.5rem] p-4 sm:p-6 md:p-8 text-white shadow-xl shadow-emerald-900/10 relative overflow-hidden group">
          {/* Subtle decorative background elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-700"></div>

          <div className="relative z-10 w-full flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
              <div className="w-12 h-12 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center bg-white/10 backdrop-blur-sm border border-white/20 group-hover:-rotate-3 transition-transform shrink-0">
                <GraduationCap className="text-white w-6 h-6 sm:w-10 sm:h-10" />
              </div>
              <div className="space-y-1.5 pt-0.5">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full border border-white/10">
                  <div className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-50">Bienvenido(a), {session?.nombre || 'Monitor'}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight leading-none">
                  Panel Monitor Académico
                </h1>
                <p className="text-emerald-50 text-xs font-medium opacity-90 max-w-lg leading-relaxed">
                  Gestión integral de monitorías, seguimiento de asistencias y control académico.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center md:items-end gap-3 w-full md:w-auto">
              <div className="bg-white/10 backdrop-blur-md p-1 rounded-xl flex items-center gap-0.5 w-full md:w-auto overflow-x-auto justify-between md:justify-start">
                {[
                  { id: 'stats', label: 'Stats', icon: <Activity size={14} /> },
                  { id: '', label: 'Alumnos', icon: <Users size={14} /> },
                  { id: 'reports', label: 'Reportes', icon: <AlertOctagon size={14} /> },
                  { id: 'history', label: 'Asistencia', icon: <ClipboardList size={14} /> }
                ].map(tab => {
                  const isActive = topTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setTopTab(tab.id)}
                      className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 shrink-0 ${isActive
                        ? 'bg-white text-emerald-700 shadow-md scale-105'
                        : 'text-white/80 hover:text-white hover:bg-white/5'
                        }`}
                    >
                      <span className="hidden sm:inline-block shrink-0">{tab.icon}</span>
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </header>

        {!isDiningMonitor && (topTab === 'manage' || !topTab || topTab === 'reports') && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Managed Modules */}
              <div className="lg:col-span-1 space-y-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                    <BookOpen size={24} className="text-emerald-600" /> Mis Monitorías
                  </h2>
                  <button
                    onClick={() => setIsCreateModuleOpen(true)}
                    className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-[11px] font-semibold uppercase tracking-wide flex items-center gap-2 hover:bg-emerald-500 hover:text-white transition-all border border-emerald-200"
                  >
                    <PlusCircle size={14} /> Nueva Monitoría
                  </button>
                </div>
                <div className="space-y-4">
                  {(() => {
                    if (monitorModules.length === 0) return (
                      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-3">
                        <BookOpen className="mx-auto text-slate-300" size={36} />
                        <p className="text-sm font-semibold text-slate-700">No tienes módulos registrados.</p>
                        <p className="text-xs text-slate-500 font-medium">Crea una monitoría o pide al admin que te asigne una.</p>
                      </div>
                    );

                    const totalModulePages = Math.ceil(monitorModules.length / MODULES_PER_PAGE);
                    const paginatedModules = monitorModules.slice((modulesPage - 1) * MODULES_PER_PAGE, modulesPage * MODULES_PER_PAGE);

                    return (
                      <>
                        {paginatedModules.map(mod => (
                          <div key={mod.id} className="rounded-2xl overflow-hidden border border-gray-100 bg-white transition-all duration-300 group">
                            {/* Card header */}
                            <div className="bg-emerald-600 px-4 py-3 flex items-center justify-between text-white transition-colors duration-300">
                              <div className="flex items-center gap-2.5">
                                <BookOpen size={16} className="text-emerald-200" />
                                <span className="font-black text-[12px] uppercase tracking-tight truncate">{mod.modulo}</span>
                              </div>
                              <span className="text-[8px] font-black uppercase tracking-widest bg-white/15 px-2 py-0.5 rounded-md shrink-0">
                                {mod.modalidad || 'Presencial'}
                              </span>
                            </div>
                            {/* Card body */}
                            <div className="p-4 space-y-3">
                              <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">{mod.descripcion || 'Sin descripción'}</p>
                              <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-600">
                                <div className="flex items-center gap-1.5">
                                  <ShieldCheck size={12} className="text-emerald-500" />
                                  <span className="font-bold truncate">{mod.sede || 'Sin sede'}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Clock3 size={12} className="text-emerald-500" />
                                  <span className="font-bold truncate">{formatTimeAMPM(mod.horario) || 'Sin horario'}</span>
                                </div>
                              </div>
                              {/* Action buttons */}
                              <div className="pt-2 border-t border-gray-100 grid grid-cols-5 gap-1.5">
                                <button onClick={() => setFilterModulo(mod.modulo)} title="Ver alumnos" className={`p-2 rounded-xl transition-all flex items-center justify-center ${filterModulo === mod.modulo ? 'bg-emerald-600 text-white' : 'bg-gray-50 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 border border-gray-100'}`}><Users size={14} /></button>
                                <button onClick={() => navigate(`/modules/${mod.id}/forum`)} title="Foro del Módulo" className="p-2 bg-blue-50 text-blue-500 rounded-xl hover:bg-blue-100 transition-all flex items-center justify-center border border-blue-100"><MessageSquare size={14} /></button>
                                <button onClick={() => handleCopyTemplate(mod)} title="Asistencia" className="p-2 bg-blue-50 text-blue-500 rounded-xl hover:bg-blue-100 transition-all flex items-center justify-center border border-blue-100"><ClipboardList size={14} /></button>
                                <button onClick={() => handleOpenEdit(mod)} title="Editar" className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:bg-gray-100 hover:text-brand-blue transition-all flex items-center justify-center border border-gray-100"><Edit3 size={14} /></button>
                                <button onClick={() => handleDeleteModule(mod)} title="Eliminar" className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 hover:text-slate-600 transition-all flex items-center justify-center border border-slate-100"><Trash2 size={14} /></button>
                              </div>
                            </div>
                          </div>
                        ))}

                        {totalModulePages > 1 && (
                          <div className="flex items-center justify-center gap-1.5 py-4">
                            {Array.from({ length: totalModulePages }, (_, i) => i + 1).map(num => (
                              <button
                                key={num}
                                onClick={() => setModulesPage(num)}
                                className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${modulesPage === num ? 'bg-emerald-600 text-white' : 'bg-white border border-gray-100 text-gray-400 hover:border-emerald-200 hover:text-emerald-600'}`}
                              >
                                {num}
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
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
                      {topTab === 'reports' ? 'Centro de Moderación' : 'Estudiantes Registrados'}
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
                            onChange={(e) => { setSearchTerm(e.target.value); setStudentsPage(1); }}
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
                              <td colSpan="4" className="px-6 py-20 text-center italic text-gray-400 font-bold">No hay reportes disponibles</td>
                            </tr>
                          ) : (
                            (() => {
                              const totalReportsPages = Math.max(1, Math.ceil(reports.length / REPORTS_PER_PAGE));
                              const safeReportsPage = Math.min(reportsPage, totalReportsPages);
                              const pagedReports = reports.slice((safeReportsPage - 1) * REPORTS_PER_PAGE, safeReportsPage * REPORTS_PER_PAGE);

                              return (
                                <>
                                  {pagedReports.map((rep) => (
                                    <tr key={rep.id} className="hover:bg-gray-50 transition-all group">
                                      <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                          <UserAvatar user={{ nombre: rep.reported_name, foto: rep.reported_photo, id: rep.reported_id }} size="sm" />
                                          <div>
                                            <p className="font-black text-gray-900 text-xs tracking-tight">{rep.reported_name}</p>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase">Acusado de: <span className="text-gray-500">{rep.reason}</span></p>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                          <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-black text-[8px] border border-blue-200 shrink-0">
                                              {String(rep.reporter_name || 'U').charAt(0).toUpperCase()}
                                            </div>
                                            <p className="text-[10px] font-bold text-gray-600 truncate max-w-[120px]">{rep.reporter_name}</p>
                                          </div>
                                          <p className="text-[9px] text-gray-400 font-medium">{new Date(rep.created_at).toLocaleString()}</p>
                                        </div>
                                      </td>
                                      <td className="px-6 py-4">
                                        <button
                                          onClick={() => navigate('/modules/' + (rep.modulo_id || 0) + '/forum?forumId=' + (rep.chat_id || rep.target_id) + '&reportType=' + rep.type + '&targetId=' + rep.target_id)}
                                          className="px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-black rounded-lg uppercase border border-blue-100 hover:bg-blue-100 transition-all"
                                        >
                                          {rep.type === 'thread' ? 'Ver Pregunta' : 'Ver Respuesta'}
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
                                  ))}
                                  <tr>
                                    <td colSpan="4" className="px-6 py-4">
                                      <div className="flex items-center justify-between gap-3 flex-wrap">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Pagina {safeReportsPage} de {totalReportsPages}</span>
                                        <div className="flex items-center gap-1">
                                          {Array.from({ length: totalReportsPages }, (_, i) => i + 1).map((n) => (
                                            <button
                                              key={n}
                                              onClick={() => setReportsPage(n)}
                                              className={(safeReportsPage === n ? 'w-8 h-8 rounded-xl text-[11px] font-black bg-gray-900 text-white' : 'w-8 h-8 rounded-xl text-[11px] font-black bg-gray-100 text-gray-600 hover:bg-gray-200')}
                                            >
                                              {n}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                </>
                              );
                            })()
                          )) : (
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

                            const totalStudentsPages = Math.max(1, Math.ceil(uniqueStudents.length / STUDENTS_PER_PAGE));
                            const safeStudentsPage = Math.min(studentsPage, totalStudentsPages);
                            const pagedStudents = uniqueStudents.slice((safeStudentsPage - 1) * STUDENTS_PER_PAGE, safeStudentsPage * STUDENTS_PER_PAGE);

                            if (uniqueStudents.length === 0) {
                              return (
                                <tr>
                                  <td colSpan="4" className="px-6 py-20 text-center">
                                    <div className="flex flex-col items-center gap-4">
                                      <AlertCircle size={48} className="text-gray-200" />
                                      <p className="text-gray-400 font-bold">No hay estudiantes disponibles</p>
                                    </div>
                                  </td>
                                </tr>
                              );
                            }

                            return (<>
                              {pagedStudents.map(st => (
                                <tr key={st.studentEmail} className="hover:bg-gray-50 transition-all group">
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                      <UserAvatar user={{ nombre: st.studentName, email: st.studentEmail, role: 'student', registeredAt: st.registeredAt }} size="sm" showBadge={true} />
                                      <div>
                                        <p className="font-bold text-gray-900">{renderSearchHighlight(st.studentName)}</p>
                                        <p className="text-xs text-gray-400">{renderSearchHighlight(st.studentEmail)}</p>
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
                                      className="p-2 text-slate-200 hover:text-slate-500 hover:bg-slate-50 rounded-xl transition-all active:scale-90"
                                    >
                                      <Trash2 size={20} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                              <tr>
                                <td colSpan="4" className="px-6 py-4">
                                  <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Pagina {safeStudentsPage} de {totalStudentsPages}</span>
                                    <div className="flex items-center gap-1">
                                      {Array.from({ length: totalStudentsPages }, (_, i) => i + 1).slice(0, 9).map((n) => (
                                        <button
                                          key={n}
                                          onClick={() => setStudentsPage(n)}
                                          className={(safeStudentsPage === n ? 'w-8 h-8 rounded-xl text-[11px] font-black bg-gray-900 text-white' : 'w-8 h-8 rounded-xl text-[11px] font-black bg-gray-100 text-gray-600 hover:bg-gray-200')}
                                        >
                                          {n}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            </>);
                          })()
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {!isDiningMonitor && topTab === 'stats' && (
          <div className="animate-fade-in pt-4">
            <RoleStatsPanel />
          </div>
        )}

        {!isDiningMonitor && topTab === 'history' && (
          <div className="animate-fade-in pt-4">
            <section className="bg-white rounded-3xl border border-gray-100 p-6 space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="text-lg font-black text-gray-900">Asistencias</h2>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{sessionCards.length ? 'Hay asistencias registradas' : 'No hay asistencias registradas'}</span>
              </div>
              {sessionDayCards.length === 0 ? (
                <div className="p-10 text-center text-gray-400 italic font-bold">Sin asistencias todavia.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {sessionDayCards.slice(0, 10).map((row) => (
                    <button key={row.day} onClick={() => openSessionDetail(row.session_ids[0])} className="text-left p-4 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-all">
                      <p className="text-xs font-black uppercase tracking-widest text-gray-400">{row.day}</p>
                      <p className="text-lg font-black text-gray-900 mt-1">{row.total_attendees} asistentes</p>
                      <p className="text-[11px] text-gray-500 font-bold uppercase tracking-tight">Ver detalle de jornada</p>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {/* Modal Baja Estudiante */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Dar de baja estudiante"
      >
        <div className="space-y-6">
          <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl">
            <UserCircle2 size={40} className="text-slate-500" />
            <div className="flex-grow">
              <p className="font-black text-slate-900">{selectedStudent?.studentName}</p>
              <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">
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
                    ? 'border-slate-600 bg-slate-50 text-slate-900'
                    : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200'
                    }`}
                >
                  <span>{mod}</span>
                  {deleteTargetId === selectedStudent.regIds[idx] && <UserCheck size={14} className="text-slate-600" />}
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
              className="w-full h-32 p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-blue transition-all outline-none text-gray-900 font-bold text-base"
            />
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <button
              onClick={confirmDelete}
              className="w-full py-4 bg-slate-600 text-white font-extrabold rounded-2xl shadow-xl hover:bg-slate-700 active:scale-95 transition-all"
            >
              Confirmar Baja
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!sessionDetail} onClose={() => setSessionDetail(null)} title="Detalle de Sesión">
        {sessionDetail ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 font-bold">{sessionDetail.modulo} · {new Date(sessionDetail.start_time).toLocaleDateString()} · {new Date(sessionDetail.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).replace(/am/i, 'A.M.').replace(/pm/i, 'P.M.')} - {new Date(sessionDetail.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).replace(/am/i, 'A.M.').replace(/pm/i, 'P.M.')}</p>
            <div className="max-h-80 overflow-auto space-y-2">
              {(!sessionDetail.attendance || sessionDetail.attendance.length === 0) ? (
                <p className="text-sm text-gray-400 text-center py-4 italic">No hay datos disponibles para esta sesión.</p>
              ) : (
                sessionDetail.attendance.map((a) => (
                  <div key={a.id} className="rounded-xl border border-gray-100 p-3 bg-gray-50">
                    <p className="font-bold text-gray-900">{a.student_name || `ID ${a.student_id}`}</p>
                    <p className="text-xs text-gray-500">{a.status}</p>
                    {a.status === 'EXCUSA' && (
                      <p className="text-xs text-gray-600">Excusa: {a.excuse_reason} - {a.excuse_description}</p>
                    )}
                    {a.status !== 'EXCUSA' && (
                      <button onClick={() => setExcuseTarget(a)} className="mt-2 px-2 py-1 rounded-lg bg-blue-100 text-blue-700 text-[11px] font-black">
                        Agregar excusa
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal isOpen={!!excuseTarget} onClose={() => setExcuseTarget(null)} title="Agregar Excusa">
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
            placeholder="Descripción"
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setExcuseTarget(null)} className="px-3 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold">Cancelar</button>
            <button onClick={saveExcuse} className="px-3 py-2 rounded-xl bg-brand-blue text-white text-sm font-bold">Guardar</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!diningStudentDetail} onClose={() => setDiningStudentDetail(null)} title="Historial de Comedor">
        <div className="space-y-2 max-h-80 overflow-auto">
          {(!diningStudentDetail || diningStudentDetail.length === 0) ? (
            <p className="text-sm text-gray-400 text-center py-8 italic">No hay datos disponibles en el historial.</p>
          ) : (
            diningStudentDetail.map((row) => (
              <div key={row.id} className="rounded-xl border border-gray-100 p-3 bg-gray-50">
                <p className="font-bold text-gray-900">{row.student_name}</p>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-tight">{new Date(row.created_at).toLocaleDateString()} · {new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).replace(/am/i, 'A.M.').replace(/pm/i, 'P.M.')}</p>
                <p className="text-xs text-gray-500">Registrado por: {row.scanner_name || '-'}</p>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* Modal Editar Módulo */}
      <Modal
        isOpen={isEditModuleOpen}
        onClose={() => setIsEditModuleOpen(false)}
        title="Editar Información de Monitoría"
        role="monitor"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <InputField
              type="select"
              label="Sede"
              role="monitor"
              value={editFormData.sede}
              onChange={(e) => setEditFormData({ ...editFormData, sede: e.target.value })}
              options={dbSedes}
            />
            <InputField
              type="select"
              label="Modalidad"
              role="monitor"
              value={editFormData.modalidad}
              onChange={(e) => setEditFormData({ ...editFormData, modalidad: e.target.value })}
              options={dbModalidades}
            />
          </div>

          <InputField
            type="select"
            label="Cuatrimestre"
            role="monitor"
            value={editFormData.cuatrimestre}
            onChange={(e) => setEditFormData({ ...editFormData, cuatrimestre: e.target.value })}
            options={dbCuatrimestres}
          />

          <DayPicker
            selected={editFormData.dias}
            onChange={(dias) => setEditFormData({ ...editFormData, dias })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Time12hPicker
              label="Hora Inicio"
              value={editFormData.horaInicio}
              onChange={(val) => setEditFormData({ ...editFormData, horaInicio: val })}
              role="monitor"
            />
            <Time12hPicker
              label="Hora Fin"
              value={editFormData.horaFin}
              onChange={(val) => setEditFormData({ ...editFormData, horaFin: val })}
              role="monitor"
            />
          </div>

          <InputField
            type="textarea"
            label="Descripción del Módulo"
            role="monitor"
            required={false}
            value={editFormData.descripcion}
            onChange={(e) => setEditFormData({ ...editFormData, descripcion: e.target.value })}
            placeholder="Describe los temas que tratas en esta monitoría..."
          />

          <div className="grid grid-cols-2 gap-4">
            <InputField
              type="url"
              label="Link de WhatsApp"
              role="monitor"
              icon={<MessageCircle className="text-green-500" />}
              value={editFormData.whatsapp}
              onChange={(e) => setEditFormData({ ...editFormData, whatsapp: e.target.value })}
              placeholder="https://chat.whatsapp.com/..."
            />

            <InputField
              type="url"
              label="Link de Teams"
              role="monitor"
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
        role="monitor"
      >
        <form onSubmit={handleCreateModule} className="space-y-4 py-2 text-left">
          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="Nombre del Módulo"
              role="monitor"
              value={createFormData.modulo}
              onChange={(e) => setCreateFormData({ ...createFormData, modulo: e.target.value })}
              placeholder="Ej. Cálculo I"
            />
            <InputField
              type="select"
              label="Sede"
              role="monitor"
              value={createFormData.sede}
              onChange={(e) => setCreateFormData({ ...createFormData, sede: e.target.value })}
              options={dbSedes}
            />
          </div>

          {(createFormData.modalidad === 'Presencial' || createFormData.modalidad === 'Híbrido') && (
            <InputField
              label="Salón"
              role="monitor"
              value={createFormData.salon}
              onChange={(e) => setCreateFormData({ ...createFormData, salon: e.target.value })}
              placeholder="Ej. Salón 204 Bloque B"
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <InputField
              type="select"
              label="Modalidad"
              role="monitor"
              value={createFormData.modalidad}
              onChange={(e) => setCreateFormData({ ...createFormData, modalidad: e.target.value })}
              options={dbModalidades}
            />
            <InputField
              type="select"
              label="Cuatrimestre"
              role="monitor"
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
            <Time12hPicker
              label="Hora Inicio"
              value={createFormData.horaInicio}
              onChange={(val) => setCreateFormData({ ...createFormData, horaInicio: val })}
              role="monitor"
            />
            <Time12hPicker
              label="Hora Fin"
              value={createFormData.horaFin}
              onChange={(val) => setCreateFormData({ ...createFormData, horaFin: val })}
              role="monitor"
            />
          </div>

          <InputField
            type="textarea"
            label="Descripción"
            role="monitor"
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
          <div className="bg-slate-50 p-6 rounded-2xl inline-block text-slate-600 animate-pulse">
            <AlertCircle size={64} />
          </div>
          <div className="space-y-3 px-4">
            <p className="text-2xl font-black text-gray-900 leading-tight">
              Estás a punto de borrar la monitoría de: <br />
              <span className="text-slate-600 italic">"{moduleToDelete?.modulo}"</span>
            </p>
            <p className="text-gray-500 font-medium">Esta acción eliminará todos los registros asociados permanentemente y no se puede deshacer.</p>
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={executeDeleteModule}
              className="w-full py-4 bg-slate-600 text-white font-black rounded-2xl shadow-lg hover:bg-slate-700 active:scale-95 transition-all text-sm uppercase tracking-widest"
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

