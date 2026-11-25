import React, { useState, useMemo } from 'react';
import { useMunicipalData } from '../../context/MunicipalDataContext';
import { useAuth } from '../../context/AuthContext';
import { ITA_IBATE_NEIGHBORHOODS } from '../../data/initialData';
import { EscuelaEmpresaStudent, EscuelaEmpresaSpecialty } from '../../types';
import {
  ChefHat,
  Croissant,
  CakeSlice,
  Award,
  UserPlus,
  Search,
  Download,
  Printer,
  X,
  Edit3,
  Trash2,
  Users,
  ShieldCheck,
  MapPin,
  FileText,
  Landmark,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';
import { exportEscuelaEmpresaStudentsToExcel } from '../../lib/excelUtils';
import { downloadDepartmentTemplate } from '../../lib/sectorTemplates';

const SPECIALTY_INFO: Record<
  EscuelaEmpresaSpecialty,
  {
    name: string;
    shortLabel: string;
    subtitle: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
    borderColor: string;
    defaultInstructor: string;
    defaultShift: 'MANANA' | 'TARDE' | 'NOCHE';
  }
> = {
  PANADERIA: {
    name: 'Panadería',
    shortLabel: 'Panadería',
    subtitle: 'Panificados artesanales, masas fermentadas, facturas y horneado',
    icon: Croissant,
    color: 'text-amber-400',
    bgColor: 'bg-amber-950/25',
    borderColor: 'border-amber-500/30',
    defaultInstructor: 'Mtro. Panadero Héctor Gómez',
    defaultShift: 'MANANA'
  },
  PASTELERIA: {
    name: 'Pastelería',
    shortLabel: 'Pastelería',
    subtitle: 'Repostería, tortas, mesas dulces, masas finas y decoración',
    icon: CakeSlice,
    color: 'text-rose-400',
    bgColor: 'bg-rose-950/25',
    borderColor: 'border-rose-500/30',
    defaultInstructor: 'Chef Past. Patricia Ramírez',
    defaultShift: 'TARDE'
  },
  PANADERIA_Y_PASTELERIA: {
    name: 'Panadería y Pastelería',
    shortLabel: 'Integral (Ambas)',
    subtitle: 'Trayecto formativo completo en Panadería + Pastelería y Emprendimiento',
    icon: ChefHat,
    color: 'text-orange-400',
    bgColor: 'bg-orange-950/25',
    borderColor: 'border-orange-500/30',
    defaultInstructor: 'Chef Past. Patricia Ramírez',
    defaultShift: 'TARDE'
  }
};

const SHIFT_LABELS: Record<'MANANA' | 'TARDE' | 'NOCHE', string> = {
  MANANA: 'Mañana',
  TARDE: 'Tarde',
  NOCHE: 'Noche'
};

const LEVEL_LABELS: Record<'INICIAL' | 'INTERMEDIO' | 'AVANZADO', string> = {
  INICIAL: 'Inicial',
  INTERMEDIO: 'Intermedio',
  AVANZADO: 'Avanzado'
};

const STATUS_BADGES: Record<EscuelaEmpresaStudent['status'], string> = {
  ACTIVO: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  REGULAR: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  EGRESADO: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  BAJA: 'bg-rose-500/15 text-rose-300 border-rose-500/30'
};

export const EscuelaEmpresaModule: React.FC = () => {
  const {
    departments,
    escuelaEmpresaStudents,
    addEscuelaEmpresaStudent,
    updateEscuelaEmpresaStudent,
    deleteEscuelaEmpresaStudent,
    escuelaEmpresaKPIs,
    findCitizenByDni
  } = useMunicipalData();

  const { maskSensitiveData } = useAuth();
  const eeDepartment = departments.find(d => d.id === 'escuela-empresa' || d.moduleType === 'ESCUELA_EMPRESA');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('ALL');
  const [selectedShift, setSelectedShift] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('ALL');

  // Modals & Confirmation
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<EscuelaEmpresaStudent | null>(null);
  const [viewingReceiptStudent, setViewingReceiptStudent] = useState<EscuelaEmpresaStudent | null>(null);
  const [pendingDeleteStudent, setPendingDeleteStudent] = useState<EscuelaEmpresaStudent | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const initialFormState = {
    enrollmentNumber: '',
    fullName: '',
    dni: '',
    birthDate: '',
    age: '' as string | number,
    phone: '',
    email: '',
    address: '',
    neighborhood: ITA_IBATE_NEIGHBORHOODS[0],
    specialty: 'PANADERIA_Y_PASTELERIA' as EscuelaEmpresaSpecialty,
    shift: 'TARDE' as 'MANANA' | 'TARDE' | 'NOCHE',
    level: 'INICIAL' as 'INICIAL' | 'INTERMEDIO' | 'AVANZADO',
    instructorName: SPECIALTY_INFO.PANADERIA_Y_PASTELERIA.defaultInstructor,
    hasFoodHandlingCert: false,
    enrollmentDate: new Date().toISOString().split('T')[0],
    status: 'ACTIVO' as 'ACTIVO' | 'REGULAR' | 'EGRESADO' | 'BAJA',
    notes: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  const handleOpenCreate = (preselectedSpecialty?: EscuelaEmpresaSpecialty) => {
    setEditingStudent(null);
    setFormError(null);
    const targetSpec = preselectedSpecialty || 'PANADERIA_Y_PASTELERIA';
    setFormData({
      ...initialFormState,
      specialty: targetSpec,
      instructorName: SPECIALTY_INFO[targetSpec].defaultInstructor,
      shift: SPECIALTY_INFO[targetSpec].defaultShift,
      enrollmentNumber: `EE-2026-${String(escuelaEmpresaStudents.length + 1).padStart(3, '0')}`
    });
    setShowFormModal(true);
  };

  const handleOpenEdit = (student: EscuelaEmpresaStudent) => {
    setEditingStudent(student);
    setFormError(null);
    setFormData({
      enrollmentNumber: student.enrollmentNumber,
      fullName: student.fullName,
      dni: student.dni,
      birthDate: student.birthDate || '',
      age: student.age ?? '',
      phone: student.phone,
      email: student.email || '',
      address: student.address,
      neighborhood: student.neighborhood,
      specialty: student.specialty,
      shift: student.shift,
      level: student.level,
      instructorName: student.instructorName || SPECIALTY_INFO[student.specialty].defaultInstructor,
      hasFoodHandlingCert: student.hasFoodHandlingCert,
      enrollmentDate: student.enrollmentDate,
      status: student.status,
      notes: student.notes || ''
    });
    setShowFormModal(true);
  };

  const handleDniChange = (dniVal: string) => {
    const existingCit = !editingStudent ? findCitizenByDni(dniVal) : undefined;
    if (existingCit) {
      setFormData(prev => ({
        ...prev,
        dni: dniVal,
        fullName: prev.fullName || existingCit.fullName,
        phone: prev.phone || existingCit.phone,
        address: prev.address || existingCit.address,
        neighborhood: existingCit.neighborhood || prev.neighborhood,
        birthDate: prev.birthDate || existingCit.birthDate || ''
      }));
    } else {
      setFormData(prev => ({ ...prev, dni: dniVal }));
    }
  };

  const handleSpecialtyChangeInModal = (spec: EscuelaEmpresaSpecialty) => {
    setFormData(prev => ({
      ...prev,
      specialty: spec,
      instructorName: SPECIALTY_INFO[spec].defaultInstructor,
      shift: SPECIALTY_INFO[spec].defaultShift
    }));
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formData.fullName.trim() || !formData.dni.trim()) {
      setFormError('Por favor ingrese el Nombre y Apellido y el DNI del alumno.');
      return;
    }

    const payload = {
      ...formData,
      age: formData.age !== '' ? Number(formData.age) : undefined,
      email: formData.email.trim() || undefined,
      notes: formData.notes.trim() || undefined
    };

    if (editingStudent) {
      updateEscuelaEmpresaStudent({
        ...editingStudent,
        ...payload
      });
    } else {
      addEscuelaEmpresaStudent(payload);
    }

    setShowFormModal(false);
    setEditingStudent(null);
  };

  const handleConfirmDelete = () => {
    if (!pendingDeleteStudent) return;
    deleteEscuelaEmpresaStudent(pendingDeleteStudent.id);
    setPendingDeleteStudent(null);
  };

  const filteredStudents = useMemo(() => {
    return escuelaEmpresaStudents.filter(s => {
      if (selectedSpecialty !== 'ALL' && s.specialty !== selectedSpecialty) return false;
      if (selectedShift !== 'ALL' && s.shift !== selectedShift) return false;
      if (selectedStatus !== 'ALL' && s.status !== selectedStatus) return false;
      if (selectedNeighborhood !== 'ALL' && s.neighborhood !== selectedNeighborhood) return false;
      if (searchTerm.trim() !== '') {
        const q = searchTerm.toLowerCase();
        const matchName = s.fullName.toLowerCase().includes(q);
        const matchDni = s.dni.replace(/[^0-9]/g, '').includes(q.replace(/[^0-9]/g, ''));
        const matchMat = s.enrollmentNumber.toLowerCase().includes(q);
        const matchPhone = (s.phone || '').toLowerCase().includes(q);
        return matchName || matchDni || matchMat || matchPhone;
      }
      return true;
    });
  }, [escuelaEmpresaStudents, selectedSpecialty, selectedShift, selectedStatus, selectedNeighborhood, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-amber-400 text-xs font-bold uppercase tracking-wider">
                <Landmark className="w-3.5 h-3.5" />
                <span>Municipalidad de Itá Ibaté · Dependiente del D.E.M.</span>
              </span>
              <span className="px-2.5 py-0.5 text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-full uppercase">
                Departamento Ejecutivo Municipal
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <ChefHat className="w-7 h-7 text-amber-400" />
              <span>Escuela Empresa · Panadería y Pastelería</span>
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl">
              Registro oficial de inscriptos y seguimiento formativo en <strong>Panadería</strong> y <strong>Pastelería</strong> dependiente directamente del Departamento Ejecutivo Municipal (D.E.M.), con control de turnos, niveles y carnet de manipulación de alimentos.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {eeDepartment && (
              <button
                type="button"
                onClick={() => downloadDepartmentTemplate(eeDepartment)}
                className="px-3 py-2 bg-emerald-950/70 hover:bg-emerald-800 text-emerald-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-emerald-500/30 transition cursor-pointer"
                title="Descargar planilla modelo para cargar alumnos desde Excel o Google Drive"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Modelo Excel</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => exportEscuelaEmpresaStudentsToExcel(filteredStudents)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 transition cursor-pointer shadow-sm"
              title="Exportar padrón de inscriptos a Excel"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Exportar Padrón</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenCreate()}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-lg shadow-amber-600/25"
            >
              <UserPlus className="w-4 h-4" />
              <span>Inscribir Alumno</span>
            </button>
          </div>
        </div>

        {/* 3 Specialty Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          {(['PANADERIA', 'PASTELERIA', 'PANADERIA_Y_PASTELERIA'] as EscuelaEmpresaSpecialty[]).map(specKey => {
            const info = SPECIALTY_INFO[specKey];
            const SpecIcon = info.icon;
            const count = escuelaEmpresaStudents.filter(s => s.specialty === specKey).length;
            const activeInSpec = escuelaEmpresaStudents.filter(
              s => s.specialty === specKey && (s.status === 'ACTIVO' || s.status === 'REGULAR')
            ).length;

            return (
              <div
                key={specKey}
                onClick={() => setSelectedSpecialty(selectedSpecialty === specKey ? 'ALL' : specKey)}
                className={`p-4 rounded-xl border transition cursor-pointer ${
                  selectedSpecialty === specKey
                    ? 'bg-slate-800/90 border-amber-500 shadow-md ring-2 ring-amber-500/30'
                    : `${info.bgColor} ${info.borderColor} hover:border-slate-600`
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className={`p-2.5 rounded-xl bg-slate-900 border border-slate-800 ${info.color}`}>
                    <SpecIcon className="w-5 h-5" />
                  </div>
                  <span className="text-xl font-black text-white">{count} inscriptos</span>
                </div>

                <div className="mt-3">
                  <h3 className="font-bold text-white text-sm">{info.name}</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{info.subtitle}</p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                  <span className="text-emerald-400 font-semibold">{activeInSpec} cursando</span>
                  <span className="text-slate-400">Turno {SHIFT_LABELS[info.defaultShift]}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* KPIs Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800/60 text-xs">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
            <span className="text-slate-500 text-[11px] block">Total Inscriptos</span>
            <span className="text-xl font-black text-white">{escuelaEmpresaKPIs.totalStudents}</span>
          </div>
          <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-xl p-3">
            <span className="text-emerald-300 text-[11px] block">Alumnos Cursando</span>
            <span className="text-xl font-black text-emerald-400">{escuelaEmpresaKPIs.activeCount}</span>
          </div>
          <div className="bg-purple-950/20 border border-purple-900/30 rounded-xl p-3">
            <span className="text-purple-300 text-[11px] block">Egresados</span>
            <span className="text-xl font-black text-purple-400">{escuelaEmpresaKPIs.egresadosCount}</span>
          </div>
          <div className="bg-amber-950/20 border border-amber-900/30 rounded-xl p-3">
            <span className="text-amber-300 text-[11px] block">Con Carnet Manipulación</span>
            <span className="text-xl font-black text-amber-400">{escuelaEmpresaKPIs.withFoodCertCount}</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por Matrícula, Nombre, DNI o Teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 transition"
            />
          </div>

          <select
            value={selectedSpecialty}
            onChange={(e) => setSelectedSpecialty(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 transition"
          >
            <option value="ALL">Todas las Especialidades</option>
            <option value="PANADERIA">Panadería</option>
            <option value="PASTELERIA">Pastelería</option>
            <option value="PANADERIA_Y_PASTELERIA">Panadería y Pastelería (Integral)</option>
          </select>

          <select
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 transition"
          >
            <option value="ALL">Todos los Turnos</option>
            <option value="MANANA">Turno Mañana</option>
            <option value="TARDE">Turno Tarde</option>
            <option value="NOCHE">Turno Noche</option>
          </select>

          <select
            value={selectedNeighborhood}
            onChange={(e) => setSelectedNeighborhood(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 transition"
          >
            <option value="ALL">Todos los Barrios</option>
            {ITA_IBATE_NEIGHBORHOODS.map(nh => (
              <option key={nh} value={nh}>{nh}</option>
            ))}
          </select>
        </div>

        {/* Status Quick Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-800/60 text-xs">
          <span className="text-slate-500 text-[11px] font-semibold mr-1">Estado:</span>
          {[
            { id: 'ALL', label: 'Todos' },
            { id: 'ACTIVO', label: 'Activos' },
            { id: 'REGULAR', label: 'Regulares' },
            { id: 'EGRESADO', label: 'Egresados' },
            { id: 'BAJA', label: 'Baja' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                selectedStatus === tab.id
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <span className="ml-auto text-[11px] text-slate-400">
            Mostrando <strong>{filteredStudents.length}</strong> de {escuelaEmpresaStudents.length} inscriptos
          </span>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase text-[11px] font-semibold">
                <th className="py-3 px-3.5">Matrícula / Fecha</th>
                <th className="py-3 px-3">Alumno & DNI</th>
                <th className="py-3 px-3">Especialidad</th>
                <th className="py-3 px-3">Turno / Nivel / Instructor</th>
                <th className="py-3 px-3">Manipulación</th>
                <th className="py-3 px-3">Barrio</th>
                <th className="py-3 px-3">Estado</th>
                <th className="py-3 px-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredStudents.map(student => {
                const info = SPECIALTY_INFO[student.specialty];
                return (
                  <tr key={student.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3.5">
                      <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {student.enrollmentNumber}
                      </span>
                      <div className="text-[10px] text-slate-500 mt-1">
                        Alta: {student.enrollmentDate}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-100 text-sm">{student.fullName}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        DNI: {maskSensitiveData ? '••.•••.•••' : student.dni}
                        {student.age !== undefined && <span> · {student.age} años</span>}
                      </div>
                      {student.phone && (
                        <div className="text-[10px] text-slate-500">Tel: {student.phone}</div>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${info.color} bg-slate-950 border ${info.borderColor} inline-block`}
                      >
                        {info.name}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-slate-300">
                      <div className="font-medium text-slate-200">
                        Turno {SHIFT_LABELS[student.shift]} · {LEVEL_LABELS[student.level]}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {student.instructorName || info.defaultInstructor}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      {student.hasFoodHandlingCert ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Vigente
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Pendiente
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-slate-300">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                        <span>{student.neighborhood}</span>
                      </div>
                      {student.address && (
                        <div className="text-[10px] text-slate-500 pl-4 truncate max-w-[150px]">
                          {student.address}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${STATUS_BADGES[student.status]}`}
                      >
                        {student.status}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewingReceiptStudent(student)}
                          className="p-1.5 bg-slate-800 hover:bg-amber-600/30 text-slate-300 hover:text-amber-300 rounded-lg transition cursor-pointer border border-slate-700"
                          title="Ficha Oficial de Inscripción"
                        >
                          <FileText className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEdit(student)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition cursor-pointer border border-slate-700"
                          title="Editar Inscripción"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setPendingDeleteStudent(student)}
                          className="p-1.5 bg-slate-800 hover:bg-rose-600/30 text-slate-400 hover:text-rose-400 rounded-lg transition cursor-pointer border border-slate-700"
                          title="Dar de Baja"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredStudents.length === 0 && (
          <div className="text-center py-12 text-slate-500 text-xs">
            No se encontraron alumnos inscriptos en Escuela Empresa con los filtros seleccionados.
          </div>
        )}
      </div>

      {/* Modal: Create / Edit Enrollment */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                  <ChefHat className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    {editingStudent ? 'Editar Inscripción · Escuela Empresa' : 'Nueva Inscripción · Escuela Empresa'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Panadería y Pastelería · Dependiente del D.E.M. (Departamento Ejecutivo Municipal)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="bg-rose-950/60 border border-rose-500/40 rounded-xl px-3.5 py-2.5 text-xs text-rose-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
              {/* Especialidad */}
              <div className="space-y-2 p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                <label className="block text-slate-300 font-bold mb-1">
                  Especialidad de Formación (*)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(['PANADERIA', 'PASTELERIA', 'PANADERIA_Y_PASTELERIA'] as EscuelaEmpresaSpecialty[]).map(spec => {
                    const info = SPECIALTY_INFO[spec];
                    return (
                      <button
                        type="button"
                        key={spec}
                        onClick={() => handleSpecialtyChangeInModal(spec)}
                        className={`p-2.5 rounded-xl border text-center transition cursor-pointer font-bold ${
                          formData.specialty === spec
                            ? 'bg-amber-600 text-white border-amber-400 shadow-md'
                            : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                        }`}
                      >
                        {info.name}
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 pt-2 border-t border-slate-800">
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Turno</label>
                    <select
                      value={formData.shift}
                      onChange={(e) => setFormData({ ...formData, shift: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-500 text-xs"
                    >
                      <option value="MANANA">Mañana</option>
                      <option value="TARDE">Tarde</option>
                      <option value="NOCHE">Noche</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Nivel</label>
                    <select
                      value={formData.level}
                      onChange={(e) => setFormData({ ...formData, level: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-500 text-xs"
                    >
                      <option value="INICIAL">Inicial</option>
                      <option value="INTERMEDIO">Intermedio</option>
                      <option value="AVANZADO">Avanzado</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Estado</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-500 text-xs"
                    >
                      <option value="ACTIVO">Activo</option>
                      <option value="REGULAR">Regular</option>
                      <option value="EGRESADO">Egresado</option>
                      <option value="BAJA">Baja</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Instructor / Chef a Cargo</label>
                    <input
                      type="text"
                      value={formData.instructorName}
                      onChange={(e) => setFormData({ ...formData, instructorName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-500 text-xs"
                    />
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="inline-flex items-center gap-2 text-slate-200 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formData.hasFoodHandlingCert}
                        onChange={(e) => setFormData({ ...formData, hasFoodHandlingCert: e.target.checked })}
                        className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700 focus:ring-amber-500 cursor-pointer"
                      />
                      <span className="font-semibold">Posee Carnet de Manipulación de Alimentos</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Datos Personales */}
              <div className="space-y-3 p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  Datos Personales del Inscripto
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">DNI (*)</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. 35.421.890"
                      value={formData.dni}
                      onChange={(e) => handleDniChange(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-300 font-medium mb-1">Nombre y Apellido (*)</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Lucía Fernanda Paredes"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Fecha de Nacimiento</label>
                    <input
                      type="date"
                      value={formData.birthDate}
                      onChange={(e) => {
                        const bDate = e.target.value;
                        let ageCalc = formData.age;
                        if (bDate) {
                          const birth = new Date(bDate);
                          const diffYears = Math.floor(
                            (Date.now() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
                          );
                          ageCalc = diffYears >= 0 ? diffYears : '';
                        }
                        setFormData({ ...formData, birthDate: bDate, age: ageCalc });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Edad</label>
                    <input
                      type="number"
                      min="14"
                      max="100"
                      placeholder="Ej. 29"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Teléfono (*)</label>
                    <input
                      type="text"
                      placeholder="Ej. 3781-451120"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Barrio de Itá Ibaté (*)</label>
                    <select
                      required
                      value={formData.neighborhood}
                      onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    >
                      {ITA_IBATE_NEIGHBORHOODS.map(nh => (
                        <option key={nh} value={nh}>{nh}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Domicilio</label>
                    <input
                      type="text"
                      placeholder="Ej. Calle Mitre 320"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Fecha de Inscripción</label>
                    <input
                      type="date"
                      value={formData.enrollmentDate}
                      onChange={(e) => setFormData({ ...formData, enrollmentDate: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Observaciones / Experiencia Previa / Proyecto Emprendedor
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre experiencia en panificación, emprendimiento familiar, horarios..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium cursor-pointer transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold shadow-lg shadow-amber-600/30 cursor-pointer transition"
                >
                  {editingStudent ? 'Guardar Cambios' : 'Confirmar Inscripción'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirm Delete */}
      {pendingDeleteStudent && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-500/15 text-rose-400 rounded-xl border border-rose-500/30">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Confirmar Baja de Matrícula</h3>
                <p className="text-xs text-slate-400 mt-1">
                  ¿Confirma dar de baja la inscripción de{' '}
                  <strong className="text-white">{pendingDeleteStudent.fullName}</strong> (
                  {pendingDeleteStudent.enrollmentNumber}) en Escuela Empresa?
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setPendingDeleteStudent(null)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Dar de Baja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Ficha Oficial de Inscripción Imprimible */}
      {viewingReceiptStudent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">Constancia de Inscripción · Escuela Empresa</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingReceiptStudent(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/35 border-2 border-amber-500/40 rounded-2xl p-5 shadow-inner space-y-4">
              <div className="flex items-start justify-between border-b border-amber-500/30 pb-3">
                <div className="flex items-center gap-2.5">
                  <img
                    src="/logo.png"
                    alt="Escudo Itá Ibaté"
                    className="w-10 h-10 object-contain shrink-0"
                  />
                  <div>
                    <div className="text-[10px] text-amber-400 font-bold uppercase tracking-widest">
                      Municipalidad de Itá Ibaté · D.E.M.
                    </div>
                    <div className="text-xs font-black text-white">
                      Escuela Empresa (Panadería y Pastelería)
                    </div>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-amber-300 bg-amber-900/40 px-2 py-0.5 rounded border border-amber-500/30">
                  {viewingReceiptStudent.enrollmentNumber}
                </span>
              </div>

              <div className="space-y-1">
                <div className="text-lg font-black text-white">{viewingReceiptStudent.fullName}</div>
                <div className="text-sm font-bold text-amber-400">
                  Especialidad: {SPECIALTY_INFO[viewingReceiptStudent.specialty].name}
                </div>
                <div className="text-xs text-slate-300">
                  Turno {SHIFT_LABELS[viewingReceiptStudent.shift]} · Nivel {LEVEL_LABELS[viewingReceiptStudent.level]}
                  {viewingReceiptStudent.instructorName ? ` · ${viewingReceiptStudent.instructorName}` : ''}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-[11px] bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-500 block">DNI:</span>
                  <span className="font-mono font-bold text-slate-200">{viewingReceiptStudent.dni}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Fecha Inscripción:</span>
                  <span className="font-mono font-bold text-slate-200">{viewingReceiptStudent.enrollmentDate}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Barrio:</span>
                  <span className="font-semibold text-slate-200">{viewingReceiptStudent.neighborhood}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Carnet Manipulación:</span>
                  <span className="font-semibold text-emerald-300">
                    {viewingReceiptStudent.hasFoodHandlingCert ? 'Vigente (SÍ)' : 'En trámite / Pendiente'}
                  </span>
                </div>
                <div className="col-span-2 pt-1 border-t border-slate-800/80">
                  <span className="text-slate-500 block">Dependencia Institucional:</span>
                  <span className="font-semibold text-amber-300">
                    Departamento Ejecutivo Municipal (D.E.M.) · Municipalidad de Itá Ibaté
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                <span className="flex items-center gap-1 text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Estado: {viewingReceiptStudent.status}
                </span>
                <span>SIMM · Itá Ibaté, Corrientes</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Constancia</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingReceiptStudent(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
