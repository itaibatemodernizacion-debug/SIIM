import React, { useState, useMemo } from 'react';
import { useMunicipalData } from '../../context/MunicipalDataContext';
import { useAuth } from '../../context/AuthContext';
import { ITA_IBATE_NEIGHBORHOODS } from '../../data/initialData';
import { CulturalStudent, CulturalCourseType } from '../../types';
import { 
  GraduationCap, 
  Music, 
  Sparkles, 
  Footprints, 
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
  Calendar, 
  Phone, 
  CheckCircle2, 
  FileText,
  Clock,
  BookOpen
} from 'lucide-react';
import { exportCulturalStudentsToExcel } from '../../lib/excelUtils';

const COURSE_INFO: Record<CulturalCourseType, {
  name: string;
  subtitle: string;
  icon: any;
  color: string;
  bgColor: string;
  borderColor: string;
  defaultTeacher: string;
  defaultShift: 'MANANA' | 'TARDE' | 'NOCHE';
  description: string;
}> = {
  URBANO: {
    name: 'Urbano',
    subtitle: 'Ritmos Urbanos, Street Dance y Hip Hop',
    icon: Footprints,
    color: 'text-violet-400',
    bgColor: 'bg-violet-950/25',
    borderColor: 'border-violet-500/30',
    defaultTeacher: 'Prof. Lucas Toledo',
    defaultShift: 'TARDE',
    description: 'Taller de danzas urbanas enfocado en niños, jóvenes y adolescentes. Coordinación coreográfica y expresión corporal.'
  },
  BALLET: {
    name: 'Ballet',
    subtitle: 'Danza Clásica y Contemporánea',
    icon: Sparkles,
    color: 'text-pink-400',
    bgColor: 'bg-pink-950/25',
    borderColor: 'border-pink-500/30',
    defaultTeacher: 'Prof. Valeria Gómez',
    defaultShift: 'TARDE',
    description: 'Escuela de danza clásica infantil y juvenil. Desarrollo de postura, técnica académica, elasticidad y disciplina escénica.'
  },
  MÚSICA: {
    name: 'Música',
    subtitle: 'Instrumentos Litoraleños, Canto y Acordeón',
    icon: Music,
    color: 'text-amber-400',
    bgColor: 'bg-amber-950/25',
    borderColor: 'border-amber-500/30',
    defaultTeacher: 'Maestro Chamamecero Pedro Duarte',
    defaultShift: 'MANANA',
    description: 'Enseñanza de acordeón de 2 hileras, guitarra correntina, percusión tradicional y vocalización de música litoraleña.'
  },
  FOLKLORE: {
    name: 'Folklore',
    subtitle: 'Ballet Folklórico Municipal y Chamamé',
    icon: BookOpen,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-950/25',
    borderColor: 'border-emerald-500/30',
    defaultTeacher: 'Prof. Amalia Almirón',
    defaultShift: 'TARDE',
    description: 'Danzas tradicionales correntinas y argentinas. Elenco representativo de Itá Ibaté en fiestas y festivales provinciales.'
  }
};

export const CultureEducationModule: React.FC = () => {
  const { 
    culturalStudents, 
    addCulturalStudent, 
    updateCulturalStudent, 
    deleteCulturalStudent, 
    culturalKPIs 
  } = useMunicipalData();

  const { maskSensitiveData } = useAuth();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string>('ALL');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<'ALL' | 'MINORS' | 'ADULTS'>('ALL');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('ALL');

  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<CulturalStudent | null>(null);
  const [viewingReceiptStudent, setViewingReceiptStudent] = useState<CulturalStudent | null>(null);

  // Form State
  const initialFormState = {
    enrollmentNumber: '',
    fullName: '',
    dni: '',
    birthDate: '',
    age: '' as string | number,
    isMinor: true,
    phone: '',
    address: '',
    neighborhood: ITA_IBATE_NEIGHBORHOODS[0],
    course: 'URBANO' as CulturalCourseType,
    shift: 'TARDE' as 'MANANA' | 'TARDE' | 'NOCHE',
    teacherName: 'Prof. Lucas Toledo',
    enrollmentDate: new Date().toISOString().split('T')[0],
    status: 'ACTIVO' as 'ACTIVO' | 'REGULAR' | 'BAJA',
    tutorName: '',
    tutorDni: '',
    tutorPhone: '',
    tutorRelationship: 'Madre',
    notes: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  // Open modal create
  const handleOpenCreate = (preselectedCourse?: CulturalCourseType) => {
    setEditingStudent(null);
    const targetCourse = preselectedCourse || 'URBANO';
    setFormData({
      ...initialFormState,
      course: targetCourse,
      teacherName: COURSE_INFO[targetCourse].defaultTeacher,
      shift: COURSE_INFO[targetCourse].defaultShift,
      enrollmentNumber: `CULT-2026-${String(culturalStudents.length + 1).padStart(3, '0')}`
    });
    setShowFormModal(true);
  };

  // Open modal edit
  const handleOpenEdit = (student: CulturalStudent) => {
    setEditingStudent(student);
    setFormData({
      enrollmentNumber: student.enrollmentNumber,
      fullName: student.fullName,
      dni: student.dni,
      birthDate: student.birthDate || '',
      age: student.age ?? '',
      isMinor: student.isMinor,
      phone: student.phone,
      address: student.address,
      neighborhood: student.neighborhood,
      course: student.course,
      shift: student.shift,
      teacherName: student.teacherName || COURSE_INFO[student.course].defaultTeacher,
      enrollmentDate: student.enrollmentDate,
      status: student.status,
      tutorName: student.tutorName || '',
      tutorDni: student.tutorDni || '',
      tutorPhone: student.tutorPhone || '',
      tutorRelationship: student.tutorRelationship || 'Madre',
      notes: student.notes || ''
    });
    setShowFormModal(true);
  };

  // Course selection inside modal
  const handleCourseChangeInModal = (course: CulturalCourseType) => {
    setFormData(prev => ({
      ...prev,
      course,
      teacherName: COURSE_INFO[course].defaultTeacher,
      shift: COURSE_INFO[course].defaultShift
    }));
  };

  // Handle Submit Form
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.dni.trim()) {
      alert('Por favor ingrese el Nombre y DNI del alumno.');
      return;
    }

    if (formData.isMinor) {
      if (!formData.tutorName.trim() || !formData.tutorDni.trim() || !formData.tutorPhone.trim()) {
        alert('Para alumnos menores de edad, es OBLIGATORIO registrar los datos del Tutor Responsable (Nombre, DNI y Teléfono de contacto).');
        return;
      }
    }

    const payload = {
      ...formData,
      age: formData.age ? Number(formData.age) : undefined
    };

    if (editingStudent) {
      updateCulturalStudent({
        ...editingStudent,
        ...payload
      });
    } else {
      addCulturalStudent(payload);
    }

    setShowFormModal(false);
    setEditingStudent(null);
  };

  // Handle Delete
  const handleDelete = (student: CulturalStudent) => {
    if (window.confirm(`¿Confirma dar de baja la matrícula de ${student.fullName} en ${student.course}?`)) {
      deleteCulturalStudent(student.id);
    }
  };

  // Filtered students
  const filteredStudents = useMemo(() => {
    return culturalStudents.filter(s => {
      if (selectedCourse !== 'ALL' && s.course !== selectedCourse) {
        return false;
      }
      if (selectedNeighborhood !== 'ALL' && s.neighborhood !== selectedNeighborhood) {
        return false;
      }
      if (selectedAgeGroup === 'MINORS' && !s.isMinor) {
        return false;
      }
      if (selectedAgeGroup === 'ADULTS' && s.isMinor) {
        return false;
      }
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const matchName = s.fullName.toLowerCase().includes(query);
        const matchDni = s.dni.replace(/[^0-9]/g, '').includes(query.replace(/[^0-9]/g, ''));
        const matchMat = s.enrollmentNumber.toLowerCase().includes(query);
        const matchTutor = (s.tutorName || '').toLowerCase().includes(query);
        return matchName || matchDni || matchMat || matchTutor;
      }
      return true;
    });
  }, [culturalStudents, selectedCourse, selectedAgeGroup, selectedNeighborhood, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-pink-400 text-xs font-semibold uppercase tracking-wider">
              <GraduationCap className="w-4 h-4" />
              <span>Municipalidad de Itá Ibaté · Secretaría de Cultura y Educación</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Sparkles className="w-7 h-7 text-pink-400" />
              Talleres y Cursos Oficiales de Formación Cultural
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl">
              Gestión de matrículas, alumnos y tutorías para los 4 cursos oficiales en funcionamiento: <strong>Urbano</strong>, <strong>Ballet</strong>, <strong>Música</strong> y <strong>Folklore</strong>. Registro obligatorio de tutores responsables para menores de edad.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => exportCulturalStudentsToExcel(filteredStudents)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 transition cursor-pointer shadow-sm"
              title="Descargar padrón de alumnos en formato Excel"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Exportar Excel</span>
            </button>

            <button
              onClick={() => handleOpenCreate()}
              className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-lg shadow-pink-600/25"
            >
              <UserPlus className="w-4 h-4" />
              <span>Inscribir Alumno</span>
            </button>
          </div>
        </div>

        {/* 4 Active Courses Quick Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          {(['URBANO', 'BALLET', 'MÚSICA', 'FOLKLORE'] as CulturalCourseType[]).map(courseKey => {
            const info = COURSE_INFO[courseKey];
            const CourseIcon = info.icon;
            const count = culturalStudents.filter(s => s.course === courseKey).length;
            const minorsInCourse = culturalStudents.filter(s => s.course === courseKey && s.isMinor).length;

            return (
              <div 
                key={courseKey}
                onClick={() => setSelectedCourse(selectedCourse === courseKey ? 'ALL' : courseKey)}
                className={`p-4 rounded-xl border transition cursor-pointer ${
                  selectedCourse === courseKey
                    ? 'bg-slate-800/90 border-pink-500 shadow-md ring-2 ring-pink-500/30'
                    : `${info.bgColor} ${info.borderColor} hover:border-slate-600`
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className={`p-2.5 rounded-xl bg-slate-900 border border-slate-800 ${info.color}`}>
                    <CourseIcon className="w-5 h-5" />
                  </div>
                  <span className="text-xl font-black text-white">{count} alumnos</span>
                </div>

                <div className="mt-3">
                  <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                    {info.name}
                  </h3>
                  <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                    {info.subtitle}
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                  <span className="text-amber-400 font-semibold">{minorsInCourse} menores con tutor</span>
                  <span className="text-slate-400">{info.defaultShift}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Global KPIs row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800/60 text-xs">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
            <span className="text-slate-500 text-[11px] block">Total Inscriptos</span>
            <span className="text-xl font-black text-white">{culturalKPIs.totalStudents}</span>
          </div>
          <div className="bg-amber-950/20 border border-amber-900/30 rounded-xl p-3">
            <span className="text-amber-300 text-[11px] block">Menores de Edad (con Tutor)</span>
            <span className="text-xl font-black text-amber-400">{culturalKPIs.minorStudentsCount}</span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
            <span className="text-slate-500 text-[11px] block">Alumnos Mayores</span>
            <span className="text-xl font-black text-slate-200">{culturalKPIs.adultStudentsCount}</span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
            <span className="text-slate-500 text-[11px] block">Cursos en Dictado</span>
            <span className="text-xl font-black text-pink-400">4 Oficiales</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por Matrícula, Alumno, DNI o Tutor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-pink-500 transition"
            />
          </div>

          {/* Course filter */}
          <div>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-pink-500 transition"
            >
              <option value="ALL">Todos los Cursos (Urbano, Ballet, Música, Folklore)</option>
              <option value="URBANO">Urbano (Ritmos Urbanos / Hip-Hop)</option>
              <option value="BALLET">Ballet (Danza Clásica)</option>
              <option value="MÚSICA">Música (Chamamé / Instrumentos)</option>
              <option value="FOLKLORE">Folklore (Ballet Folklórico)</option>
            </select>
          </div>

          {/* Age group filter */}
          <div>
            <select
              value={selectedAgeGroup}
              onChange={(e) => setSelectedAgeGroup(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-pink-500 transition"
            >
              <option value="ALL">Todas las Edades</option>
              <option value="MINORS">Solo Menores de Edad (con Tutor)</option>
              <option value="ADULTS">Solo Mayores de 18 Años</option>
            </select>
          </div>

          {/* Neighborhood filter */}
          <div>
            <select
              value={selectedNeighborhood}
              onChange={(e) => setSelectedNeighborhood(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-pink-500 transition"
            >
              <option value="ALL">Todos los Barrios de Itá Ibaté</option>
              {ITA_IBATE_NEIGHBORHOODS.map(nh => (
                <option key={nh} value={nh}>{nh}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-800/60 text-xs">
          <span className="text-slate-500 text-[11px] font-semibold mr-1">Cursos activos:</span>
          {[
            { id: 'ALL', label: 'Todos' },
            { id: 'URBANO', label: 'Urbano' },
            { id: 'BALLET', label: 'Ballet' },
            { id: 'MÚSICA', label: 'Música' },
            { id: 'FOLKLORE', label: 'Folklore' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedCourse(tab.id)}
              className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                selectedCourse === tab.id
                  ? 'bg-pink-600 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <span className="ml-auto text-[11px] text-slate-400">
            Mostrando <strong>{filteredStudents.length}</strong> de {culturalStudents.length} alumnos
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
                <th className="py-3 px-3">Condición de Edad & Tutor</th>
                <th className="py-3 px-3">Curso Oficial</th>
                <th className="py-3 px-3">Turno & Profesor</th>
                <th className="py-3 px-3">Barrio</th>
                <th className="py-3 px-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredStudents.map(student => {
                const info = COURSE_INFO[student.course];
                return (
                  <tr key={student.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3.5">
                      <span className="font-mono font-bold text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded border border-pink-500/20">
                        {student.enrollmentNumber}
                      </span>
                      <div className="text-[10px] text-slate-500 mt-1">
                        Inscripto: {student.enrollmentDate}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-100 text-sm">{student.fullName}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        DNI: {maskSensitiveData ? '••.•••.•••' : student.dni}
                        {student.age !== undefined && <span> · {student.age} años</span>}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      {student.isMinor ? (
                        <div className="space-y-1">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            Menor con Tutor
                          </span>
                          {student.tutorName && (
                            <div className="text-[11px] text-slate-300">
                              <span className="text-slate-500">Tutor:</span> {student.tutorName} ({student.tutorRelationship || 'Tutor'})
                              {student.tutorPhone && (
                                <div className="text-[10px] text-slate-400">Tel: {student.tutorPhone}</div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                          Mayor de edad
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${info.color} bg-slate-950 border ${info.borderColor}`}>
                        {info.name}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-slate-300">
                      <div className="font-medium text-slate-200">
                        Turno {student.shift}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {student.teacherName || info.defaultTeacher}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-slate-300">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        <span>{student.neighborhood}</span>
                      </div>
                      {student.address && (
                        <div className="text-[10px] text-slate-500 pl-4 truncate max-w-[150px]">{student.address}</div>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setViewingReceiptStudent(student)}
                          className="p-1.5 bg-slate-800 hover:bg-pink-600/30 text-slate-300 hover:text-pink-300 rounded-lg transition cursor-pointer border border-slate-700"
                          title="Ficha Oficial de Inscripción"
                        >
                          <FileText className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleOpenEdit(student)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition cursor-pointer border border-slate-700"
                          title="Editar Inscripción"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDelete(student)}
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
            No se encontraron alumnos inscriptos con los filtros seleccionados.
          </div>
        )}
      </div>

      {/* Modal: Inscripción a Taller Cultural */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-pink-500/10 text-pink-400 rounded-xl border border-pink-500/20">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    {editingStudent ? 'Editar Inscripción Cultural' : 'Nueva Matrícula - Talleres Municipales'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Municipalidad de Itá Ibaté · Secretaría de Cultura y Educación
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowFormModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
              {/* Selección del Curso */}
              <div className="space-y-2 p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                <label className="block text-slate-300 font-bold mb-1">Seleccione el Curso Oficial (*)</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['URBANO', 'BALLET', 'MÚSICA', 'FOLKLORE'] as CulturalCourseType[]).map(c => {
                    const info = COURSE_INFO[c];
                    return (
                      <button
                        type="button"
                        key={c}
                        onClick={() => handleCourseChangeInModal(c)}
                        className={`p-2.5 rounded-xl border text-center transition cursor-pointer font-bold ${
                          formData.course === c
                            ? 'bg-pink-600 text-white border-pink-400 shadow-md'
                            : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                        }`}
                      >
                        {info.name}
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-2 border-t border-slate-800">
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Turno de Cursada</label>
                    <select
                      value={formData.shift}
                      onChange={(e) => setFormData({ ...formData, shift: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-pink-500 text-xs"
                    >
                      <option value="MANANA">Mañana</option>
                      <option value="TARDE">Tarde</option>
                      <option value="NOCHE">Noche</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Docente / Profesor a Cargo</label>
                    <input
                      type="text"
                      value={formData.teacherName}
                      onChange={(e) => setFormData({ ...formData, teacherName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-pink-500 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Datos del Alumno */}
              <div className="space-y-3 p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                <h4 className="text-xs font-bold text-pink-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  Datos Personales del Alumno
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-slate-300 font-medium mb-1">Nombre y Apellido (*)</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Milagros Belén Fernández"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">DNI (*)</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. 53.882.109"
                      value={formData.dni}
                      onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-pink-500"
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
                        let isMinorCalc = formData.isMinor;
                        if (bDate) {
                          const birth = new Date(bDate);
                          const now = new Date();
                          const diffYears = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
                          ageCalc = diffYears >= 0 ? diffYears : '';
                          isMinorCalc = diffYears < 18;
                        }
                        setFormData({ ...formData, birthDate: bDate, age: ageCalc, isMinor: isMinorCalc });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Edad</label>
                    <input
                      type="number"
                      min="3"
                      max="100"
                      placeholder="Ej. 13"
                      value={formData.age}
                      onChange={(e) => {
                        const val = e.target.value;
                        const n = parseInt(val, 10);
                        setFormData({
                          ...formData,
                          age: val,
                          isMinor: !isNaN(n) && n < 18 ? true : formData.isMinor
                        });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Teléfono de Contacto</label>
                    <input
                      type="text"
                      placeholder="Ej. 3781-411234"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-pink-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Barrio de Itá Ibaté (*)</label>
                    <select
                      required
                      value={formData.neighborhood}
                      onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-pink-500"
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
                      placeholder="Ej. Calle San Roque 430"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-pink-500"
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN OBLIGATORIA: Menor de Edad y Tutor */}
              <div className="p-3.5 bg-slate-950/80 border-2 border-amber-500/40 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isMinorCultCheck"
                      checked={formData.isMinor}
                      onChange={(e) => setFormData({ ...formData, isMinor: e.target.checked })}
                      className="w-4 h-4 rounded text-pink-600 bg-slate-900 border-slate-700 focus:ring-pink-500 cursor-pointer"
                    />
                    <label htmlFor="isMinorCultCheck" className="text-amber-300 font-bold cursor-pointer">
                      ¿El alumno es menor de 18 años? (Requiere Tutor)
                    </label>
                  </div>

                  <span className="text-[10px] text-slate-400">
                    Conforme normativa de protección integral de menores.
                  </span>
                </div>

                {formData.isMinor ? (
                  <div className="pt-2 border-t border-amber-500/20 space-y-3">
                    <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Datos Obligatorios del Tutor Responsable</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-300 font-medium mb-1">Nombre y Apellido del Tutor (*)</label>
                        <input
                          type="text"
                          required={formData.isMinor}
                          placeholder="Ej. Carolina Vanesa Gómez"
                          value={formData.tutorName}
                          onChange={(e) => setFormData({ ...formData, tutorName: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400 text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-300 font-medium mb-1">DNI del Tutor (*)</label>
                        <input
                          type="text"
                          required={formData.isMinor}
                          placeholder="Ej. 31.455.890"
                          value={formData.tutorDni}
                          onChange={(e) => setFormData({ ...formData, tutorDni: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-400 text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-300 font-medium mb-1">Teléfono de Contacto del Tutor (*)</label>
                        <input
                          type="text"
                          required={formData.isMinor}
                          placeholder="Ej. 3781-411234"
                          value={formData.tutorPhone}
                          onChange={(e) => setFormData({ ...formData, tutorPhone: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400 text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-300 font-medium mb-1">Vínculo / Parentesco (*)</label>
                        <select
                          required={formData.isMinor}
                          value={formData.tutorRelationship}
                          onChange={(e) => setFormData({ ...formData, tutorRelationship: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400 text-xs"
                        >
                          <option value="Madre">Madre</option>
                          <option value="Padre">Padre</option>
                          <option value="Tutor Legal">Tutor Legal</option>
                          <option value="Abuelo/a">Abuelo / Abuela</option>
                          <option value="Tío/a">Tío / Tía</option>
                          <option value="Hermano/a Mayor">Hermano / Hermana Mayor</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500 italic">
                    Alumno mayor de edad: asume su propia responsabilidad civil y médica para las actividades del taller.
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Observaciones / Aptitud Física / Nivel</label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre experiencia previa, aptitud médica, notas..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              {/* Botones de acción */}
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
                  className="px-5 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl font-bold shadow-lg shadow-pink-600/30 cursor-pointer transition"
                >
                  {editingStudent ? 'Guardar Cambios' : 'Confirmar Matrícula'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ficha Oficial de Inscripción Imprimible */}
      {viewingReceiptStudent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-pink-400" />
                <h3 className="font-bold text-white text-base">Ficha Oficial de Inscripción</h3>
              </div>
              <button 
                onClick={() => setViewingReceiptStudent(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Receipt Card */}
            <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-pink-950/40 border-2 border-pink-500/40 rounded-2xl p-5 shadow-inner space-y-4">
              <div className="flex items-start justify-between border-b border-pink-500/30 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-pink-600 flex items-center justify-center text-white font-black text-lg shadow-md">
                    II
                  </div>
                  <div>
                    <div className="text-[10px] text-pink-400 font-bold uppercase tracking-widest">
                      Municipalidad de Itá Ibaté
                    </div>
                    <div className="text-xs font-black text-white">
                      Secretaría de Cultura y Educación
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-mono text-xs font-bold text-pink-300 bg-pink-900/40 px-2 py-0.5 rounded border border-pink-500/30">
                    {viewingReceiptStudent.enrollmentNumber}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-lg font-black text-white">
                  {viewingReceiptStudent.fullName}
                </div>
                <div className="text-sm font-bold text-pink-400">
                  Taller de {viewingReceiptStudent.course}
                </div>
                <div className="text-xs text-slate-300">
                  Turno {viewingReceiptStudent.shift} · {viewingReceiptStudent.teacherName}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-[11px] bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-500 block">DNI Alumno:</span>
                  <span className="font-mono font-bold text-slate-200">{viewingReceiptStudent.dni}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Edad:</span>
                  <span className="font-semibold text-slate-200">{viewingReceiptStudent.age ? `${viewingReceiptStudent.age} años` : '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Barrio:</span>
                  <span className="font-semibold text-slate-200">{viewingReceiptStudent.neighborhood}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Fecha Matrícula:</span>
                  <span className="font-semibold text-slate-200">{viewingReceiptStudent.enrollmentDate}</span>
                </div>

                {viewingReceiptStudent.isMinor && (
                  <div className="col-span-2 pt-2 border-t border-slate-800 space-y-1">
                    <span className="text-amber-400 font-bold block text-[10px] uppercase tracking-wider">
                      Tutor Responsable Autorizante:
                    </span>
                    <div className="text-slate-200 font-semibold">
                      {viewingReceiptStudent.tutorName} ({viewingReceiptStudent.tutorRelationship || 'Tutor'})
                    </div>
                    <div className="text-slate-400 text-[10px] font-mono">
                      DNI: {viewingReceiptStudent.tutorDni} · Tel: {viewingReceiptStudent.tutorPhone}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[10px] text-slate-500">
                Inscripción sin arancel conforme política cultural pública.
              </span>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Ficha</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
