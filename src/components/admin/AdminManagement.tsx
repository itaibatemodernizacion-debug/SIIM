import React, { useState } from 'react';
import { useMunicipalData } from '../../context/MunicipalDataContext';
import { useAuth } from '../../context/AuthContext';
import { Department, MunicipalUser, DepartmentCategory } from '../../types';
import { 
  Settings, 
  Users, 
  Building2, 
  ShieldCheck, 
  PlusCircle, 
  Trash2, 
  Edit3, 
  Download, 
  Upload, 
  AlertTriangle, 
  History, 
  Clock, 
  X, 
  Save, 
  RotateCcw,
  Sparkles,
  Layers
} from 'lucide-react';

export const AdminManagement: React.FC = () => {
  const { 
    departments, 
    addDepartment, 
    updateDepartment, 
    deleteDepartment, 
    departmentKPIs,
    auditLogs,
    resetAllData 
  } = useMunicipalData();

  const { users, currentUser, addUser, deleteUser, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<'AREAS' | 'ORGANIGRAMA' | 'USERS' | 'AUDIT' | 'BACKUP'>('ORGANIGRAMA');

  // Quick Leader Edit Modal State
  const [showQuickLeaderModal, setShowQuickLeaderModal] = useState(false);
  const [selectedLeaderDept, setSelectedLeaderDept] = useState<Department | null>(null);
  const [quickLeaderForm, setQuickLeaderForm] = useState({
    leaderName: '',
    leaderTitle: '',
    leaderDni: '',
    leaderEmail: '',
    phone: '',
    legalReference: ''
  });

  // Department Modal State
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptForm, setDeptForm] = useState<{
    name: string;
    shortName: string;
    category: DepartmentCategory;
    parentId?: string;
    legalReference: string;
    leaderName: string;
    leaderTitle: string;
    leaderDni: string;
    leaderEmail: string;
    phone: string;
    color: string;
    icon: string;
    moduleType: 'GENERAL' | 'DEPORTES' | 'ACCION_SOCIAL' | 'OBRAS_PUBLICAS' | 'CULTURA' | 'PUNTO_DIGITAL' | 'TURISMO' | 'SALUD' | 'CONTROL_URBANO';
  }>({
    name: '',
    shortName: '',
    category: 'DIRECCION_GENERAL',
    parentId: '',
    legalReference: '',
    leaderName: '',
    leaderTitle: '',
    leaderDni: '',
    leaderEmail: '',
    phone: '',
    color: 'sky',
    icon: 'Building2',
    moduleType: 'GENERAL'
  });

  // User Modal State
  const [showUserModal, setShowUserModal] = useState(false);
  const [userForm, setUserForm] = useState<{
    name: string;
    email: string;
    role: 'ADMIN_GENERAL' | 'RESPONSABLE_AREA' | 'OPERADOR_AREA';
    departmentId: string;
    position: string;
  }>({
    name: '',
    email: '',
    role: 'RESPONSABLE_AREA',
    departmentId: departments[0]?.id || '',
    position: 'Responsable de Sector'
  });

  const openAddDeptModal = () => {
    setEditingDept(null);
    setDeptForm({
      name: '',
      shortName: '',
      category: 'DIRECCION_GENERAL',
      parentId: departments.find(d => d.category === 'SECRETARIA')?.id || '',
      legalReference: '',
      leaderName: '',
      leaderTitle: '',
      leaderDni: '',
      leaderEmail: '',
      phone: '',
      color: 'sky',
      icon: 'Building2',
      moduleType: 'GENERAL'
    });
    setShowDeptModal(true);
  };

  const openEditDeptModal = (dept: Department) => {
    setEditingDept(dept);
    setDeptForm({
      name: dept.name,
      shortName: dept.shortName,
      category: dept.category,
      parentId: dept.parentId || '',
      legalReference: dept.legalReference || '',
      leaderName: dept.leaderName,
      leaderTitle: dept.leaderTitle || '',
      leaderDni: dept.leaderDni || '',
      leaderEmail: dept.leaderEmail,
      phone: dept.phone || '',
      color: dept.color,
      icon: dept.icon,
      moduleType: dept.moduleType
    });
    setShowDeptModal(true);
  };

  const openQuickLeaderModal = (dept: Department) => {
    setSelectedLeaderDept(dept);
    setQuickLeaderForm({
      leaderName: dept.leaderName || '',
      leaderTitle: dept.leaderTitle || '',
      leaderDni: dept.leaderDni || '',
      leaderEmail: dept.leaderEmail || '',
      phone: dept.phone || '',
      legalReference: dept.legalReference || ''
    });
    setShowQuickLeaderModal(true);
  };

  const handleSaveQuickLeader = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeaderDept) return;
    if (!quickLeaderForm.leaderName) {
      alert('Por favor ingrese el nombre del titular a cargo.');
      return;
    }
    const { updateDepartmentLeader } = useMunicipalData as any;
    // We can update through updateDepartment
    updateDepartment({
      ...selectedLeaderDept,
      leaderName: quickLeaderForm.leaderName,
      leaderTitle: quickLeaderForm.leaderTitle,
      leaderDni: quickLeaderForm.leaderDni,
      leaderEmail: quickLeaderForm.leaderEmail,
      phone: quickLeaderForm.phone,
      legalReference: quickLeaderForm.legalReference
    });
    setShowQuickLeaderModal(false);
    alert(`Titular de "${selectedLeaderDept.name}" actualizado correctamente.`);
  };

  const handleSaveDept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptForm.name || !deptForm.leaderName) {
      alert('Por favor ingrese el nombre del área y el responsable.');
      return;
    }

    if (editingDept) {
      updateDepartment({
        ...editingDept,
        ...deptForm,
        parentId: deptForm.parentId || undefined,
        shortName: deptForm.shortName || deptForm.name.split(' ')[0]
      });
    } else {
      addDepartment({
        ...deptForm,
        parentId: deptForm.parentId || undefined,
        shortName: deptForm.shortName || deptForm.name.split(' ')[0],
        active: true
      });
    }
    setShowDeptModal(false);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name || !userForm.email) {
      alert('Complete nombre y correo institucional.');
      return;
    }

    addUser(userForm);
    setShowUserModal(false);
    setUserForm({
      name: '',
      email: '',
      role: 'RESPONSABLE_AREA',
      departmentId: departments[0]?.id || '',
      position: 'Responsable de Sector'
    });
  };

  // Export full JSON backup
  const handleExportBackup = () => {
    const backupData = {
      timestamp: new Date().toISOString(),
      institution: 'Municipalidad de Itá Ibaté - Corrientes',
      version: '1.0',
      departments,
      users,
      auditLogs
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_SIMM_ItaIbate_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Title & Introduction */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Panel de Administración General
            </h2>
            <span className="px-2 py-0.5 text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full">
              Control Maestro
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Configuración dinámica de áreas municipales, control de accesos, alertas de inactividad y auditoría del sistema.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openAddDeptModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-md transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Crear Nueva Área</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('ORGANIGRAMA')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'ORGANIGRAMA'
              ? 'bg-sky-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Organigrama y Autoridades a Cargo (7 Secretarías)</span>
        </button>

        <button
          onClick={() => setActiveTab('AREAS')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'AREAS'
              ? 'bg-sky-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Gestión de Áreas Municipales ({departments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('USERS')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'USERS'
              ? 'bg-sky-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Usuarios y Permisos ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('AUDIT')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'AUDIT'
              ? 'bg-sky-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Auditoría de Actividad ({auditLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('BACKUP')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'BACKUP'
              ? 'bg-sky-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Copias de Seguridad</span>
        </button>
      </div>

      {/* TAB 0: OFFICIAL ORGANIGRAMA & AUTHORITIES */}
      {activeTab === 'ORGANIGRAMA' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-400" />
                Estructura Orgánica Oficial – Municipalidad de Itá Ibaté
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Organigrama por Decreto Municipal: 7 Secretarías con sus respectivas Direcciones Generales, Coordinaciones y Titulares a cargo.
              </p>
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 font-mono">
                {departments.filter(d => d.category === 'SECRETARIA').length} Secretarías
              </span>
              <span className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 font-mono">
                {departments.filter(d => d.category === 'DIRECCION_GENERAL').length} Dir. Generales
              </span>
              <span className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 font-mono">
                {departments.filter(d => d.category === 'COORDINACION').length} Coordinaciones
              </span>
            </div>
          </div>

          {/* List of 7 Secretarías and nested child Direcciones & Coordinaciones */}
          <div className="space-y-4">
            {departments.filter(d => d.category === 'SECRETARIA').map(sec => {
              const directChildren = departments.filter(d => d.parentId === sec.id);

              return (
                <div key={sec.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 hover:border-slate-700/80 transition">
                  {/* Secretaría Node */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30 flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-bold text-white text-base">
                            {sec.name}
                          </h4>
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                            SECRETARÍA
                          </span>
                          {sec.legalReference && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-purple-500/15 text-purple-300 border border-purple-500/30">
                              {sec.legalReference}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-1">
                          <div className="flex items-center gap-1.5 text-white font-medium">
                            <span className="text-slate-400 font-normal">Titular a cargo:</span>
                            <span className="text-emerald-300 font-bold">{sec.leaderName}</span>
                            {sec.leaderTitle && <span className="text-slate-400 font-mono text-[11px]">({sec.leaderTitle})</span>}
                            {sec.leaderDni && <span className="text-slate-500 text-[11px] font-mono">• DNI: {sec.leaderDni}</span>}
                          </div>
                          {sec.leaderEmail && <span>• Email: <span className="text-slate-400">{sec.leaderEmail}</span></span>}
                          {sec.phone && <span>• Tel: <span className="text-slate-400">{sec.phone}</span></span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                      <button
                        onClick={() => openQuickLeaderModal(sec)}
                        className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar Titular a Cargo</span>
                      </button>
                    </div>
                  </div>

                  {/* Direcciones Generales & Coordinaciones under this Secretaría */}
                  {directChildren.length > 0 ? (
                    <div className="pl-3 md:pl-6 space-y-3 border-l-2 border-slate-800 ml-2">
                      {directChildren.map(child => {
                        const grandChildren = departments.filter(d => d.parentId === child.id);

                        return (
                          <div key={child.id} className="space-y-2">
                            {/* Dirección General Node */}
                            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/90 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-slate-700 transition">
                              <div className="flex items-start gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-slate-800 text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                                  <Layers className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h5 className="font-semibold text-white text-xs">
                                      {child.name}
                                    </h5>
                                    <span className="text-[9px] px-2 py-0.5 rounded font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                      {child.category === 'DIRECCION_GENERAL' ? 'DIRECCIÓN GENERAL' : child.category}
                                    </span>
                                    {child.legalReference && (
                                      <span className="text-[9px] px-2 py-0.5 rounded font-medium bg-purple-950/60 text-purple-300 border border-purple-800/40">
                                        {child.legalReference}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-slate-400 mt-1">
                                    <span>A cargo: <strong className="text-slate-200">{child.leaderName}</strong></span>
                                    {child.leaderTitle && <span className="font-mono text-slate-400">({child.leaderTitle})</span>}
                                    {child.leaderDni && <span>• DNI: <span className="font-mono text-slate-400">{child.leaderDni}</span></span>}
                                    {child.leaderEmail && <span>• Email: {child.leaderEmail}</span>}
                                  </div>
                                </div>
                              </div>

                              <button
                                onClick={() => openQuickLeaderModal(child)}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer self-end md:self-auto shrink-0 border border-slate-700"
                              >
                                <Edit3 className="w-3 h-3 text-sky-400" />
                                <span>Modificar Titular</span>
                              </button>
                            </div>

                            {/* Coordinaciones under this Dirección General */}
                            {grandChildren.length > 0 && (
                              <div className="pl-4 md:pl-8 space-y-2 border-l-2 border-slate-800/80 ml-3">
                                {grandChildren.map(gc => (
                                  <div key={gc.id} className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/70 flex flex-col md:flex-row md:items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded bg-slate-900 text-slate-400 flex items-center justify-center shrink-0 text-xs">
                                        •
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium text-slate-200 text-xs">{gc.name}</span>
                                          <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-slate-800 text-slate-400">
                                            COORDINACIÓN
                                          </span>
                                          {gc.legalReference && (
                                            <span className="text-[9px] text-purple-400 font-mono">
                                              ({gc.legalReference})
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[10px] text-slate-400">
                                          Responsable: <strong className="text-slate-300">{gc.leaderName}</strong>
                                          {gc.leaderDni && <span className="font-mono ml-2">DNI: {gc.leaderDni}</span>}
                                        </div>
                                      </div>
                                    </div>

                                    <button
                                      onClick={() => openQuickLeaderModal(gc)}
                                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-semibold flex items-center gap-1 cursor-pointer self-end md:self-auto shrink-0"
                                    >
                                      <Edit3 className="w-2.5 h-2.5 text-sky-400" />
                                      <span>Cambiar Titular</span>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="pl-4 text-xs text-slate-500 italic py-1">
                      {sec.id === 'sec-cultura' 
                        ? 'La resolución municipal establece las competencias de Cultura y Educación sin crear Direcciones Generales o Coordinaciones bajo su dependencia formal.' 
                        : sec.id === 'sec-turismo'
                        ? 'La resolución municipal establece las competencias de Turismo y Pesca sin crear Direcciones Generales o Coordinaciones bajo su dependencia formal.'
                        : 'Sin dependencias subordinadas directas registradas.'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 1: AREAS CONFIGURATION */}
      {activeTab === 'AREAS' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-3.5 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs font-semibold text-slate-400">
              <span>Dependencias Municipales Configuradas</span>
              <span className="text-[11px] text-slate-500">Configuración dinámica sin tocar código</span>
            </div>

            <div className="divide-y divide-slate-800/60">
              {departments.map(dept => {
                const kpi = departmentKPIs.find(k => k.departmentId === dept.id);
                const isInactive = kpi?.isInactiveWarning;

                return (
                  <div key={dept.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/40 transition">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-sm">
                            {dept.name}
                          </h4>
                          <span className="text-[10px] px-2 py-0.2 rounded font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                            {dept.category}
                          </span>
                          <span className="text-[10px] px-2 py-0.2 rounded font-semibold bg-sky-500/10 text-sky-300">
                            Módulo: {dept.moduleType}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                          <span>Titular: <strong className="text-slate-200">{dept.leaderName}</strong></span>
                          <span>•</span>
                          <span>Email: {dept.leaderEmail}</span>
                          {dept.phone && <span>• Tel: {dept.phone}</span>}
                        </div>

                        {/* Inactivity warning badge */}
                        {isInactive && (
                          <div className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] text-amber-300 bg-amber-950/60 px-2.5 py-0.5 rounded border border-amber-600/40">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                            <span>Alerta: Más de 3 días sin registrar atenciones ({kpi?.daysSinceLastActivity} días inactivo).</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        onClick={() => openEditDeptModal(dept)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar el área "${dept.name}"? Los trámites existentes conservarán su historial.`)) {
                            deleteDepartment(dept.id);
                          }
                        }}
                        className="px-2.5 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 rounded-lg text-xs font-semibold border border-rose-600/30 cursor-pointer"
                        title="Eliminar Área"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USERS MANAGEMENT */}
      {activeTab === 'USERS' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowUserModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-md transition cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>Crear Nuevo Usuario Municipal</span>
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 uppercase text-[11px] font-semibold">
                  <th className="py-3 px-3.5">Funcionario / Empleado</th>
                  <th className="py-3 px-3">Correo Institucional</th>
                  <th className="py-3 px-3">Cargo</th>
                  <th className="py-3 px-3">Rol del Sistema</th>
                  <th className="py-3 px-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3.5 font-bold text-white">
                      {u.name}
                    </td>
                    <td className="py-3 px-3 text-slate-300 font-mono">
                      {u.email}
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {u.position}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.role === 'ADMIN_GENERAL'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                      }`}>
                        {u.role === 'ADMIN_GENERAL' ? 'Administrador General' : 'Responsable de Sector'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {u.id !== currentUser?.id && (
                        <button
                          onClick={() => {
                            if (confirm(`¿Eliminar usuario ${u.name}?`)) deleteUser(u.id);
                          }}
                          className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer"
                          title="Eliminar usuario"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT LOGS */}
      {activeTab === 'AUDIT' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-white text-sm">Registro de Auditoría y Trazabilidad</h3>
            <p className="text-xs text-slate-400">
              Historial de cambios de estado, creaciones y sincronizaciones de datos para garantizar la transparencia pública.
            </p>
          </div>

          <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 uppercase text-[11px] font-semibold">
                  <th className="py-2.5 px-3">Fecha y Hora</th>
                  <th className="py-2.5 px-3">Usuario</th>
                  <th className="py-2.5 px-3">Acción</th>
                  <th className="py-2.5 px-3">Entidad</th>
                  <th className="py-2.5 px-3">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                      {log.timestamp}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-200">
                      {log.userName}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-sky-400 font-mono text-[11px]">
                      {log.entity}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {auditLogs.length === 0 && (
              <div className="text-center py-12 text-slate-500 text-xs">
                No hay registros de auditoría almacenados aún.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: BACKUP & RESTORE */}
      {activeTab === 'BACKUP' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-400" />
              Copia de Seguridad del Sistema (Backup JSON)
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Descargue un archivo consolidado con la configuración de áreas, usuarios, ciudadanos registrados y bitácora de auditoría.
            </p>
            <button
              onClick={handleExportBackup}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Generar y Descargar Backup Oficial</span>
            </button>
          </div>

          <div className="bg-slate-900 border border-amber-900/40 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-amber-300 text-sm flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-amber-400" />
              Restablecer Datos Iniciales de Demostración
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Reinicia los registros a la configuración base de la Municipalidad de Itá Ibaté con los datos de prueba de todas las dependencias.
            </p>
            <button
              onClick={() => {
                if (confirm('¿Está seguro de reiniciar los datos a la demostración inicial de Itá Ibaté?')) {
                  resetAllData();
                  alert('Datos restablecidos correctamente.');
                }
              }}
              className="px-4 py-2.5 bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/40 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Restablecer Datos Base de Itá Ibaté</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal: New / Edit Department */}
      {showDeptModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-white text-base">
                  {editingDept ? 'Modificar Área Municipal' : 'Crear Nueva Área o Dirección'}
                </h3>
              </div>
              <button onClick={() => setShowDeptModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDept} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Nombre Completo del Área (*)</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Dirección de Ambiente y Parques"
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Nombre Corto / Etiqueta</label>
                  <input
                    type="text"
                    placeholder="Ej. Ambiente"
                    value={deptForm.shortName}
                    onChange={(e) => setDeptForm({ ...deptForm, shortName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Jerarquía / Categoría</label>
                  <select
                    value={deptForm.category}
                    onChange={(e) => setDeptForm({ ...deptForm, category: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="SECRETARIA">Secretaría</option>
                    <option value="DIRECCION">Dirección</option>
                    <option value="COORDINACION">Coordinación</option>
                    <option value="PUNTO_DIGITAL">Punto Digital / Área Especial</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Funcionario Responsable (*)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Lic. Claudia Benítez"
                    value={deptForm.leaderName}
                    onChange={(e) => setDeptForm({ ...deptForm, leaderName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Correo Institucional</label>
                  <input
                    type="email"
                    placeholder="area@itaibate.gob.ar"
                    value={deptForm.leaderEmail}
                    onChange={(e) => setDeptForm({ ...deptForm, leaderEmail: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Módulo Específico</label>
                  <select
                    value={deptForm.moduleType}
                    onChange={(e) => setDeptForm({ ...deptForm, moduleType: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="GENERAL">General (Trámites y Atenciones)</option>
                    <option value="ACCION_SOCIAL">Acción Social (Módulos y Asistencia)</option>
                    <option value="OBRAS_PUBLICAS">Obras Públicas (Luminarias y Reclamos)</option>
                    <option value="DEPORTES">Deportes (Torneos y Atletas)</option>
                    <option value="PUNTO_DIGITAL">Punto Digital (Trámites TIC)</option>
                    <option value="TURISMO">Turismo (Visitantes y Pesca)</option>
                    <option value="CULTURA">Cultura (Talleres y Festivales)</option>
                    <option value="SALUD">Salud y SAPS (Atención Sanitaria y Bromatología)</option>
                    <option value="CONTROL_URBANO">Control Urbano (Carnets, Multas, Habilitaciones y Vial)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Teléfono Directo</label>
                  <input
                    type="text"
                    placeholder="3781-420..."
                    value={deptForm.phone}
                    onChange={(e) => setDeptForm({ ...deptForm, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDeptModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-semibold shadow-md cursor-pointer"
                >
                  {editingDept ? 'Guardar Cambios' : 'Crear Dependencia'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New User */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-white text-base">Crear Usuario del Sistema</h3>
              </div>
              <button onClick={() => setShowUserModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Nombre Completo (*)</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Martín Solís"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Correo Institucional (*)</label>
                <input
                  type="email"
                  required
                  placeholder="usuario@itaibate.gob.ar"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Rol y Permisos</label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="RESPONSABLE_AREA">Responsable de Área (Sector Asignado)</option>
                  <option value="ADMIN_GENERAL">Administrador General (Acceso Total)</option>
                  <option value="OPERADOR_AREA">Operador de Mesa de Entrada</option>
                </select>
              </div>

              {userForm.role !== 'ADMIN_GENERAL' && (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Área Asignada</label>
                  <select
                    value={userForm.departmentId}
                    onChange={(e) => setUserForm({ ...userForm, departmentId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-medium mb-1">Cargo / Designación</label>
                <input
                  type="text"
                  placeholder="Ej. Coordinador de Mesa"
                  value={userForm.position}
                  onChange={(e) => setUserForm({ ...userForm, position: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-semibold shadow-md cursor-pointer"
                >
                  Guardar Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Quick Edit Titular a Cargo */}
      {showQuickLeaderModal && selectedLeaderDept && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-sky-400" />
                <div>
                  <h3 className="font-bold text-white text-base">
                    Asignar Titular a Cargo
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedLeaderDept.name} ({selectedLeaderDept.category})
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowQuickLeaderModal(false)} 
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickLeader} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Nombre y Apellido del Funcionario (*):
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Dr. Horacio Rivero"
                  value={quickLeaderForm.leaderName}
                  onChange={(e) => setQuickLeaderForm({ ...quickLeaderForm, leaderName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Cargo / Título Oficial:
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Secretario General / Director"
                    value={quickLeaderForm.leaderTitle}
                    onChange={(e) => setQuickLeaderForm({ ...quickLeaderForm, leaderTitle: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    DNI del Funcionario:
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. 25.334.810"
                    value={quickLeaderForm.leaderDni}
                    onChange={(e) => setQuickLeaderForm({ ...quickLeaderForm, leaderDni: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Correo Institucional:
                  </label>
                  <input
                    type="email"
                    placeholder="funcionario@itaibate.gob.ar"
                    value={quickLeaderForm.leaderEmail}
                    onChange={(e) => setQuickLeaderForm({ ...quickLeaderForm, leaderEmail: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Teléfono Directo:
                  </label>
                  <input
                    type="text"
                    placeholder="3781-420..."
                    value={quickLeaderForm.phone}
                    onChange={(e) => setQuickLeaderForm({ ...quickLeaderForm, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Referencia de Decreto / Resolución:
                </label>
                <input
                  type="text"
                  placeholder="Ej. Artículos 7 y 14 - Decreto Municipal Estructura Orgánica"
                  value={quickLeaderForm.legalReference}
                  onChange={(e) => setQuickLeaderForm({ ...quickLeaderForm, legalReference: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowQuickLeaderModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-semibold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Guardar Titular a Cargo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
