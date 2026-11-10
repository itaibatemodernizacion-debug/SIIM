import React, { useState, useMemo } from 'react';
import { useMunicipalData } from '../../context/MunicipalDataContext';
import { useAuth } from '../../context/AuthContext';
import { ITA_IBATE_NEIGHBORHOODS } from '../../data/initialData';
import { MunicipalEmployee, EmploymentCondition, EmployeeStatus } from '../../types';
import { 
  Users, 
  UserPlus, 
  Search, 
  Download, 
  IdCard, 
  Briefcase, 
  Building2, 
  DollarSign, 
  Filter, 
  Edit3, 
  Trash2, 
  X, 
  Printer, 
  CheckCircle2, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar,
  AlertCircle,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { exportEmployeesToExcel } from '../../lib/excelUtils';

export const HumanResourcesModule: React.FC = () => {
  const { 
    employees, 
    addEmployee, 
    updateEmployee, 
    deleteEmployee, 
    employeeKPIs,
    departments 
  } = useMunicipalData();

  const { maskSensitiveData } = useAuth();

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCondition, setSelectedCondition] = useState<string>('ALL');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('ALL');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<MunicipalEmployee | null>(null);
  const [viewingCredentialEmployee, setViewingCredentialEmployee] = useState<MunicipalEmployee | null>(null);

  // Form State
  const initialFormState = {
    fileNumber: '',
    fullName: '',
    dni: '',
    cuil: '',
    birthDate: '',
    gender: 'M' as 'M' | 'F' | 'OTRO',
    nationality: 'Argentina',
    phone: '',
    email: '',
    address: '',
    neighborhood: ITA_IBATE_NEIGHBORHOODS[0],
    employmentCondition: 'PLANTA_PERMANENTE' as EmploymentCondition,
    departmentId: departments[0]?.id || 'dir-gen-servicios-publicos',
    position: '',
    categoryOrScale: '',
    entryDate: new Date().toISOString().split('T')[0],
    status: 'ACTIVO' as EmployeeStatus,
    workShift: 'MANANA' as 'MANANA' | 'TARDE' | 'NOCHE' | 'ROTATIVO',
    hoursPerWeek: 35,
    basicSalary: 450000,
    bankAccountNumber: '',
    socialSecurityNumber: 'IOSCOR',
    emergencyContactName: '',
    emergencyContactPhone: '',
    notes: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  // Open modal for create
  const handleOpenCreate = () => {
    setEditingEmployee(null);
    setFormData({
      ...initialFormState,
      departmentId: departments[0]?.id || 'dir-gen-servicios-publicos',
      fileNumber: `LEG-${String(employees.length + 1).padStart(5, '0')}`
    });
    setShowFormModal(true);
  };

  // Open modal for edit
  const handleOpenEdit = (emp: MunicipalEmployee) => {
    setEditingEmployee(emp);
    setFormData({
      fileNumber: emp.fileNumber,
      fullName: emp.fullName,
      dni: emp.dni,
      cuil: emp.cuil,
      birthDate: emp.birthDate || '',
      gender: emp.gender || 'M',
      nationality: emp.nationality,
      phone: emp.phone,
      email: emp.email || '',
      address: emp.address,
      neighborhood: emp.neighborhood,
      employmentCondition: emp.employmentCondition,
      departmentId: emp.departmentId,
      position: emp.position,
      categoryOrScale: emp.categoryOrScale || '',
      entryDate: emp.entryDate,
      status: emp.status,
      workShift: emp.workShift || 'MANANA',
      hoursPerWeek: emp.hoursPerWeek || 35,
      basicSalary: emp.basicSalary || 0,
      bankAccountNumber: emp.bankAccountNumber || '',
      socialSecurityNumber: emp.socialSecurityNumber || 'IOSCOR',
      emergencyContactName: emp.emergencyContactName || '',
      emergencyContactPhone: emp.emergencyContactPhone || '',
      notes: emp.notes || ''
    });
    setShowFormModal(true);
  };

  // Handle Submit Form
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.dni.trim() || !formData.cuil.trim() || !formData.position.trim()) {
      alert('Por favor complete Nombre, DNI, CUIL y Cargo del empleado.');
      return;
    }

    if (editingEmployee) {
      updateEmployee({
        ...editingEmployee,
        ...formData
      });
    } else {
      addEmployee({
        ...formData
      });
    }

    setShowFormModal(false);
    setEditingEmployee(null);
  };

  // Handle Delete
  const handleDelete = (emp: MunicipalEmployee) => {
    if (window.confirm(`¿Confirma dar de baja el legajo de ${emp.fullName} (${emp.fileNumber})?`)) {
      deleteEmployee(emp.id);
    }
  };

  // Filtered list
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      // Condition filter
      if (selectedCondition !== 'ALL' && emp.employmentCondition !== selectedCondition) {
        return false;
      }
      // Department filter
      if (selectedDeptId !== 'ALL' && emp.departmentId !== selectedDeptId) {
        return false;
      }
      // Neighborhood filter
      if (selectedNeighborhood !== 'ALL' && emp.neighborhood !== selectedNeighborhood) {
        return false;
      }
      // Status filter
      if (selectedStatus !== 'ALL' && emp.status !== selectedStatus) {
        return false;
      }
      // Text Search
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const matchName = emp.fullName.toLowerCase().includes(query);
        const matchDni = emp.dni.replace(/[^0-9]/g, '').includes(query.replace(/[^0-9]/g, ''));
        const matchCuil = emp.cuil.replace(/[^0-9]/g, '').includes(query.replace(/[^0-9]/g, ''));
        const matchLeg = emp.fileNumber.toLowerCase().includes(query);
        const matchPos = emp.position.toLowerCase().includes(query);
        return matchName || matchDni || matchCuil || matchLeg || matchPos;
      }
      return true;
    });
  }, [employees, selectedCondition, selectedDeptId, selectedNeighborhood, selectedStatus, searchTerm]);

  // Labels and badges helper
  const conditionBadge = (cond: EmploymentCondition) => {
    switch (cond) {
      case 'PLANTA_PERMANENTE':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            Planta Permanente
          </span>
        );
      case 'CONTRATADO':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            Contratado
          </span>
        );
      case 'PERSONAL_DE_GABINETE':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
            Personal de Gabinete
          </span>
        );
      case 'JORNALIZADO':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            Jornalizado
          </span>
        );
      default:
        return null;
    }
  };

  const getDepartmentName = (id: string) => {
    const dept = departments.find(d => d.id === id);
    return dept ? dept.shortName || dept.name : id;
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-wider">
              <Building2 className="w-4 h-4" />
              <span>Secretaría de Hacienda y Finanzas · Art. 21</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Users className="w-7 h-7 text-blue-500" />
              Coordinación de Recursos Humanos
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl">
              Sistema de registro y administración integral de legajos del personal municipal de Itá Ibaté. Control de condiciones laborales (Planta Permanente, Contratados, Gabinete y Jornalizados) y distribución por barrios.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => exportEmployeesToExcel(filteredEmployees)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 transition cursor-pointer shadow-sm"
              title="Descargar nómina completa en formato Excel"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Exportar Excel</span>
            </button>

            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-lg shadow-blue-600/25"
            >
              <UserPlus className="w-4 h-4" />
              <span>Ingresar Personal</span>
            </button>
          </div>
        </div>

        {/* 6 Metric Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Personal</div>
            <div className="text-2xl font-black text-white mt-1">{employeeKPIs.totalEmployees}</div>
            <div className="text-[10px] text-emerald-400 mt-0.5">{employeeKPIs.activeCount} activos</div>
          </div>

          <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-xl p-3.5">
            <div className="text-[11px] font-semibold text-emerald-300 uppercase tracking-wider">Planta Permanente</div>
            <div className="text-2xl font-black text-emerald-400 mt-1">{employeeKPIs.plantaPermanenteCount}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {employeeKPIs.totalEmployees > 0 ? Math.round((employeeKPIs.plantaPermanenteCount / employeeKPIs.totalEmployees) * 100) : 0}% del plantel
            </div>
          </div>

          <div className="bg-blue-950/20 border border-blue-900/30 rounded-xl p-3.5">
            <div className="text-[11px] font-semibold text-blue-300 uppercase tracking-wider">Contratados</div>
            <div className="text-2xl font-black text-blue-400 mt-1">{employeeKPIs.contratadoCount}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Locación y servicios</div>
          </div>

          <div className="bg-purple-950/20 border border-purple-900/30 rounded-xl p-3.5">
            <div className="text-[11px] font-semibold text-purple-300 uppercase tracking-wider">Gabinete</div>
            <div className="text-2xl font-black text-purple-400 mt-1">{employeeKPIs.gabineteCount}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Funcionarios y coord.</div>
          </div>

          <div className="bg-amber-950/20 border border-amber-900/30 rounded-xl p-3.5">
            <div className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider">Jornalizados</div>
            <div className="text-2xl font-black text-amber-400 mt-1">{employeeKPIs.jornalizadoCount}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Servicios operativos</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Masa Salarial Est.</div>
            <div className="text-lg font-black text-slate-100 mt-1.5 truncate">
              ${employeeKPIs.totalPayrollEstimated.toLocaleString('es-AR')}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Básico mensual</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search text */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por Legajo, Nombre, DNI, CUIL o Cargo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Condition Filter */}
          <div>
            <select
              value={selectedCondition}
              onChange={(e) => setSelectedCondition(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition"
            >
              <option value="ALL">Todas las Condiciones Laborales</option>
              <option value="PLANTA_PERMANENTE">Planta Permanente</option>
              <option value="CONTRATADO">Contratado</option>
              <option value="PERSONAL_DE_GABINETE">Personal de Gabinete</option>
              <option value="JORNALIZADO">Jornalizado</option>
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition"
            >
              <option value="ALL">Todas las Secretarías y Direcciones</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.shortName || d.name}</option>
              ))}
            </select>
          </div>

          {/* Neighborhood Filter */}
          <div>
            <select
              value={selectedNeighborhood}
              onChange={(e) => setSelectedNeighborhood(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition"
            >
              <option value="ALL">Todos los Barrios de Itá Ibaté</option>
              {ITA_IBATE_NEIGHBORHOODS.map(nh => (
                <option key={nh} value={nh}>{nh}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Tabs for Condition */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-800/60 text-xs">
          <span className="text-slate-500 text-[11px] font-semibold mr-1">Filtro rápido:</span>
          {[
            { id: 'ALL', label: 'Todos los Agentes' },
            { id: 'PLANTA_PERMANENTE', label: 'Planta Permanente' },
            { id: 'CONTRATADO', label: 'Contratados' },
            { id: 'PERSONAL_DE_GABINETE', label: 'Gabinete' },
            { id: 'JORNALIZADO', label: 'Jornalizados' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedCondition(tab.id)}
              className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                selectedCondition === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <span className="ml-auto text-[11px] text-slate-400">
            Mostrando <strong>{filteredEmployees.length}</strong> de {employees.length} agentes
          </span>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase text-[11px] font-semibold">
                <th className="py-3 px-3.5">Legajo / DNI</th>
                <th className="py-3 px-3">Agente Municipal</th>
                <th className="py-3 px-3">Condición Laboral</th>
                <th className="py-3 px-3">Dependencia</th>
                <th className="py-3 px-3">Cargo / Función</th>
                <th className="py-3 px-3">Barrio</th>
                <th className="py-3 px-3 text-right">Básico ($)</th>
                <th className="py-3 px-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredEmployees.map(emp => (
                <tr key={emp.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-3.5">
                    <span className="font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                      {emp.fileNumber}
                    </span>
                    <div className="text-[11px] text-slate-400 font-mono mt-1">
                      DNI: {maskSensitiveData ? '••.•••.•••' : emp.dni}
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-100 text-sm">{emp.fullName}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>CUIL: {maskSensitiveData ? '••-••••••••-•' : emp.cuil}</span>
                      {emp.phone && <span>· Tel: {emp.phone}</span>}
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    {conditionBadge(emp.employmentCondition)}
                  </td>

                  <td className="py-3 px-3">
                    <div className="font-medium text-slate-200">{getDepartmentName(emp.departmentId)}</div>
                    {emp.categoryOrScale && (
                      <div className="text-[10px] text-slate-500">{emp.categoryOrScale}</div>
                    )}
                  </td>

                  <td className="py-3 px-3 text-slate-300">
                    <div className="font-medium">{emp.position}</div>
                    <div className="text-[10px] text-slate-500">
                      Turno: {emp.workShift || 'Mañana'} ({emp.hoursPerWeek || 35} hs)
                    </div>
                  </td>

                  <td className="py-3 px-3 text-slate-300">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      <span>{emp.neighborhood}</span>
                    </div>
                    {emp.address && (
                      <div className="text-[10px] text-slate-500 pl-4 truncate max-w-[160px]">{emp.address}</div>
                    )}
                  </td>

                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-200">
                    {emp.basicSalary ? `$${emp.basicSalary.toLocaleString('es-AR')}` : '-'}
                  </td>

                  <td className="py-3 px-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setViewingCredentialEmployee(emp)}
                        className="p-1.5 bg-slate-800 hover:bg-blue-600/30 text-slate-300 hover:text-blue-300 rounded-lg transition cursor-pointer border border-slate-700"
                        title="Ver Ficha / Credencial Municipal"
                      >
                        <IdCard className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleOpenEdit(emp)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition cursor-pointer border border-slate-700"
                        title="Editar Legajo"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDelete(emp)}
                        className="p-1.5 bg-slate-800 hover:bg-rose-600/30 text-slate-400 hover:text-rose-400 rounded-lg transition cursor-pointer border border-slate-700"
                        title="Dar de Baja"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredEmployees.length === 0 && (
          <div className="text-center py-12 text-slate-500 text-xs">
            No se encontraron empleados municipales con los criterios de búsqueda seleccionados.
          </div>
        )}
      </div>

      {/* Modal: Alta / Edición de Legajo Personal */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    {editingEmployee ? 'Editar Legajo de Personal' : 'Nuevo Ingreso de Personal Municipal'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Municipalidad de Itá Ibaté · Registro Oficial de Recursos Humanos
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
              {/* Sección 1: Datos Personales */}
              <div className="space-y-3 p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  1. Datos Personales del Agente
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">N° Legajo (*)</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. LEG-00105"
                      value={formData.fileNumber}
                      onChange={(e) => setFormData({ ...formData, fileNumber: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-300 font-medium mb-1">Nombre Completo (*)</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Juan Carlos Ramírez"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">DNI (*)</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. 34.891.204"
                      value={formData.dni}
                      onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">CUIL (*)</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. 20-34891204-7"
                      value={formData.cuil}
                      onChange={(e) => setFormData({ ...formData, cuil: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Fecha de Nacimiento</label>
                    <input
                      type="date"
                      value={formData.birthDate}
                      onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Teléfono</label>
                    <input
                      type="text"
                      placeholder="Ej. 3781-420188"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Correo Electrónico</label>
                    <input
                      type="email"
                      placeholder="Ej. j.ramirez@itaibate.gob.ar"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Barrio de Itá Ibaté (*)</label>
                    <select
                      required
                      value={formData.neighborhood}
                      onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    >
                      {ITA_IBATE_NEIGHBORHOODS.map(nh => (
                        <option key={nh} value={nh}>{nh}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Domicilio / Dirección</label>
                  <input
                    type="text"
                    placeholder="Ej. Calle San Martín 1420"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Sección 2: Condición Laboral y Cargo Municipal */}
              <div className="space-y-3 p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" />
                  2. Condición Laboral y Destino Municipal (Mandatorio)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Condición Laboral Municipal (*)
                    </label>
                    <select
                      required
                      value={formData.employmentCondition}
                      onChange={(e) => setFormData({ ...formData, employmentCondition: e.target.value as EmploymentCondition })}
                      className="w-full bg-slate-900 border-2 border-amber-500/50 rounded-lg px-3 py-2 text-amber-300 font-bold focus:outline-none focus:border-amber-400"
                    >
                      <option value="PLANTA_PERMANENTE">PLANTA PERMANENTE</option>
                      <option value="CONTRATADO">CONTRATADO</option>
                      <option value="PERSONAL_DE_GABINETE">PERSONAL DE GABINETE</option>
                      <option value="JORNALIZADO">JORNALIZADO</option>
                    </select>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Seleccione la categoría jurídica y presupuestaria oficial.
                    </span>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Secretaría o Dirección Asignada (*)</label>
                    <select
                      required
                      value={formData.departmentId}
                      onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    >
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-slate-300 font-medium mb-1">Cargo o Función Asignada (*)</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Capataz General / Operador de Maquinaria / Administrativo"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Categoría / Escalafón</label>
                    <input
                      type="text"
                      placeholder="Ej. Cat 18 / Grado B"
                      value={formData.categoryOrScale}
                      onChange={(e) => setFormData({ ...formData, categoryOrScale: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Fecha de Ingreso (*)</label>
                    <input
                      type="date"
                      required
                      value={formData.entryDate}
                      onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Turno</label>
                    <select
                      value={formData.workShift}
                      onChange={(e) => setFormData({ ...formData, workShift: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="MANANA">Mañana</option>
                      <option value="TARDE">Tarde</option>
                      <option value="NOCHE">Noche</option>
                      <option value="ROTATIVO">Rotativo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Carga Horaria Semanal</label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={formData.hoursPerWeek}
                      onChange={(e) => setFormData({ ...formData, hoursPerWeek: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Sueldo Básico ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={formData.basicSalary}
                      onChange={(e) => setFormData({ ...formData, basicSalary: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Sección 3: Datos Bancarios, Sociales y Emergencias */}
              <div className="space-y-3 p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  3. Datos Bancarios, Seguridad Social y Contacto de Emergencia
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">CBU / Cuenta Sueldo Banco de Corrientes</label>
                    <input
                      type="text"
                      placeholder="Ej. 0940012301000012345678"
                      value={formData.bankAccountNumber}
                      onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Obra Social / Afiliación</label>
                    <input
                      type="text"
                      placeholder="Ej. IOSCOR 22840119/00 / OSECAC"
                      value={formData.socialSecurityNumber}
                      onChange={(e) => setFormData({ ...formData, socialSecurityNumber: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Contacto de Emergencia</label>
                    <input
                      type="text"
                      placeholder="Ej. Marta Graciela Valenzuela (Esposa)"
                      value={formData.emergencyContactName}
                      onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Teléfono de Emergencia</label>
                    <input
                      type="text"
                      placeholder="Ej. 3781-420199"
                      value={formData.emergencyContactPhone}
                      onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Observaciones / Antecedentes</label>
                  <textarea
                    rows={2}
                    placeholder="Decretos de designación, méritos, capacitaciones, antecedentes médicos..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
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
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-600/30 cursor-pointer transition"
                >
                  {editingEmployee ? 'Guardar Cambios' : 'Registrar Agente Municipal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ficha / Credencial Municipal Imprimible */}
      {viewingCredentialEmployee && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <IdCard className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-white text-base">Credencial Municipal Oficial</h3>
              </div>
              <button 
                onClick={() => setViewingCredentialEmployee(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Credential Card Layout */}
            <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950/40 border-2 border-blue-500/40 rounded-2xl p-5 shadow-inner space-y-4">
              <div className="flex items-start justify-between border-b border-blue-500/30 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-lg shadow-md">
                    II
                  </div>
                  <div>
                    <div className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">
                      Municipalidad de Itá Ibaté
                    </div>
                    <div className="text-xs font-black text-white">
                      Provincia de Corrientes
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-mono text-xs font-bold text-blue-300 bg-blue-900/40 px-2 py-0.5 rounded border border-blue-500/30">
                    {viewingCredentialEmployee.fileNumber}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-20 h-24 rounded-xl bg-slate-800 border-2 border-slate-700 flex flex-col items-center justify-center text-slate-500 text-center p-1">
                  <Users className="w-8 h-8 text-slate-400 mb-1" />
                  <span className="text-[9px] uppercase font-bold text-slate-400">Foto Oficial</span>
                </div>

                <div className="space-y-1">
                  <div className="text-base font-black text-white leading-tight">
                    {viewingCredentialEmployee.fullName}
                  </div>
                  <div className="text-xs text-blue-300 font-semibold">
                    {viewingCredentialEmployee.position}
                  </div>
                  <div className="text-[11px] text-slate-300">
                    {getDepartmentName(viewingCredentialEmployee.departmentId)}
                  </div>
                  <div className="pt-1">
                    {conditionBadge(viewingCredentialEmployee.employmentCondition)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-500 block">DNI:</span>
                  <span className="font-mono font-bold text-slate-200">{viewingCredentialEmployee.dni}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">CUIL:</span>
                  <span className="font-mono font-bold text-slate-200">{viewingCredentialEmployee.cuil}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Barrio:</span>
                  <span className="font-semibold text-slate-200">{viewingCredentialEmployee.neighborhood}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Fecha Ingreso:</span>
                  <span className="font-semibold text-slate-200">{viewingCredentialEmployee.entryDate}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Obra Social:</span>
                  <span className="font-semibold text-slate-200">{viewingCredentialEmployee.socialSecurityNumber || 'IOSCOR'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Emergencias:</span>
                  <span className="font-semibold text-slate-200 truncate">{viewingCredentialEmployee.emergencyContactPhone || '-'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[10px] text-slate-500">
                Documento de uso interno municipal conforme Ordenanza 2026.
              </span>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md"
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
