import React, { useState } from 'react';
import { useMunicipalData } from '../../context/MunicipalDataContext';
import { useAuth } from '../../context/AuthContext';
import { ITA_IBATE_NEIGHBORHOODS } from '../../data/initialData';
import { Department, Ticket } from '../../types';
import { 
  Building2, 
  Hammer, 
  HeartHandshake, 
  Monitor, 
  Palette, 
  Compass, 
  Banknote, 
  Landmark, 
  Cpu, 
  CheckCircle2, 
  Clock, 
  UserPlus, 
  Send, 
  Download, 
  Plus, 
  Users,
  ChevronRight,
  Sparkles,
  Edit3,
  UserCheck,
  FileText,
  BookmarkCheck,
  X,
  Layers,
  Shield
} from 'lucide-react';
import { exportTicketsToExcel } from '../../lib/excelUtils';
import { NecrologicalRegistry } from '../necrological/NecrologicalRegistry';
import { UrbanControlModule } from '../urban-control/UrbanControlModule';

const PROVINCES_TOURISM = [
  'Corrientes (Capital e Interior)',
  'Chaco (Resistencia y localidades)',
  'Misiones (Posadas y Oberá)',
  'Santa Fe (Rosario / Santa Fe Capital)',
  'Buenos Aires / CABA',
  'Córdoba',
  'Entre Ríos',
  'Paraguay (Encarnación / Asunción)',
  'Brasil (Río Grande do Sul / Paraná)',
  'Otro Origen'
];

export const AreaWorkspaces: React.FC<{ initialDeptId?: string }> = ({ initialDeptId }) => {
  const { departments, tickets, createTicket, updateTicketStatus, findCitizenByDni, updateDepartmentLeader } = useMunicipalData();
  const { currentUser, isAdmin, maskSensitiveData } = useAuth();

  // If user is restricted to a department, lock to that department; otherwise allow selector
  const defaultDeptId = initialDeptId || currentUser?.departmentId || departments[0]?.id;
  const [activeDeptId, setActiveDeptId] = useState<string>(defaultDeptId);

  // Sub-view toggle (TICKETS vs NECROLOGICAL for Social Development vs CONTROL_URBANO for Urban Control)
  const [activeSubView, setActiveSubView] = useState<'TICKETS' | 'NECROLOGICAL' | 'CONTROL_URBANO'>('TICKETS');

  // Edit Leader Modal state
  const [showLeaderModal, setShowLeaderModal] = useState(false);
  const [leaderForm, setLeaderForm] = useState({
    leaderName: '',
    leaderTitle: '',
    leaderDni: '',
    leaderEmail: '',
    phone: '',
    legalReference: ''
  });

  const activeDept = departments.find(d => d.id === activeDeptId) || departments[0];

  const isSocialArea = activeDept?.id === 'sec-social' || 
                       activeDept?.id === 'dir-gen-asistencia-social' || 
                       activeDept?.parentId === 'sec-social';

  const isUrbanControlArea = activeDept?.id === 'dir-gen-seguridad' ||
                             activeDept?.moduleType === 'CONTROL_URBANO' ||
                             activeDept?.name?.toLowerCase().includes('control urbano') ||
                             activeDept?.name?.toLowerCase().includes('seguridad ciudadana');

  const openLeaderEditModal = () => {
    if (!activeDept) return;
    setLeaderForm({
      leaderName: activeDept.leaderName || '',
      leaderTitle: activeDept.leaderTitle || '',
      leaderDni: activeDept.leaderDni || '',
      leaderEmail: activeDept.leaderEmail || '',
      phone: activeDept.phone || '',
      legalReference: activeDept.legalReference || ''
    });
    setShowLeaderModal(true);
  };

  const handleSaveLeader = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaderForm.leaderName) {
      alert('Por favor ingrese el nombre y apellido del funcionario a cargo.');
      return;
    }
    updateDepartmentLeader(activeDept.id, leaderForm);
    setShowLeaderModal(false);
    alert(`Titular de "${activeDept.name}" actualizado exitosamente.`);
  };

  // Specific form states
  const [citizenDni, setCitizenDni] = useState('');
  const [citizenName, setCitizenName] = useState('');
  const [citizenPhone, setCitizenPhone] = useState('');
  const [citizenAddress, setCitizenAddress] = useState('');
  const [citizenNeighborhood, setCitizenNeighborhood] = useState(ITA_IBATE_NEIGHBORHOODS[0]);
  const [requestType, setRequestType] = useState('');
  const [description, setDescription] = useState('');
  const [isResolvedImmediate, setIsResolvedImmediate] = useState(false);

  // Sector Specific extra fields
  const [socialFamilyMembers, setSocialFamilyMembers] = useState('4');
  const [socialAidType, setSocialAidType] = useState('Módulo de Alimentos Secos');
  
  const [worksReclaimType, setWorksReclaimType] = useState('Luminaria / Alumbrado');
  const [worksStreetName, setWorksStreetName] = useState('');
  
  const [puntoDigitalType, setPuntoDigitalType] = useState('Trámite Mi ANSES / AUH');
  const [tourismOrigin, setTourismOrigin] = useState(PROVINCES_TOURISM[0]);
  const [cultureWorkshop, setCultureWorkshop] = useState('Taller de Danza Chamamecera');

  // Autofill when entering citizen DNI
  const handleDniLookup = (dni: string) => {
    setCitizenDni(dni);
    const cit = findCitizenByDni(dni);
    if (cit) {
      setCitizenName(cit.fullName);
      setCitizenPhone(cit.phone);
      setCitizenAddress(cit.address);
      setCitizenNeighborhood(cit.neighborhood);
    }
  };

  const deptTickets = tickets.filter(t => t.departmentId === activeDept?.id);
  const resolvedCount = deptTickets.filter(t => t.isResolved).length;
  const pendingCount = deptTickets.filter(t => !t.isResolved).length;
  const resolutionRate = deptTickets.length > 0 ? Math.round((resolvedCount / deptTickets.length) * 100) : 0;

  // Handle Sector fast ticket submission
  const handleFastSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!citizenDni || !citizenName) {
      alert('Por favor ingrese el DNI y el Nombre del ciudadano.');
      return;
    }

    let finalRequestType = requestType;
    let finalDescription = description;
    let areaSpecificData: Record<string, any> = {};

    if (activeDept?.moduleType === 'ACCION_SOCIAL') {
      finalRequestType = finalRequestType || `Acción Social: ${socialAidType}`;
      finalDescription = finalDescription || `Solicitud de asistencia para grupo familiar de ${socialFamilyMembers} integrantes. Tipo: ${socialAidType}.`;
      areaSpecificData = { familyMembers: socialFamilyMembers, aidType: socialAidType };
    } else if (activeDept?.moduleType === 'OBRAS_PUBLICAS') {
      finalRequestType = finalRequestType || `Obras Públicas: ${worksReclaimType}`;
      finalDescription = finalDescription || `Reclamo vecinal de ${worksReclaimType} en calle ${worksStreetName || citizenAddress || citizenNeighborhood}.`;
      areaSpecificData = { reclaimType: worksReclaimType, street: worksStreetName };
    } else if (activeDept?.moduleType === 'PUNTO_DIGITAL') {
      finalRequestType = finalRequestType || `Punto Digital: ${puntoDigitalType}`;
      finalDescription = finalDescription || `Atención informática y gestión digital: ${puntoDigitalType}.`;
      areaSpecificData = { serviceType: puntoDigitalType };
    } else if (activeDept?.moduleType === 'TURISMO') {
      finalRequestType = finalRequestType || `Consulta Turística - Origen: ${tourismOrigin}`;
      finalDescription = finalDescription || `Atención de visitante procedente de ${tourismOrigin}. Asesoramiento turístico y pesca deportiva.`;
      areaSpecificData = { origin: tourismOrigin };
    } else if (activeDept?.moduleType === 'CULTURA') {
      finalRequestType = finalRequestType || `Cultura: ${cultureWorkshop}`;
      finalDescription = finalDescription || `Inscripción o gestión cultural en ${cultureWorkshop}.`;
      areaSpecificData = { workshop: cultureWorkshop };
    } else {
      finalRequestType = finalRequestType || 'Gestión Administrativa';
      finalDescription = finalDescription || 'Atención ciudadana en mesa del área.';
    }

    createTicket({
      citizenDni,
      citizenName,
      citizenPhone,
      citizenAddress,
      citizenNeighborhood,
      departmentId: activeDept.id,
      requestType: finalRequestType,
      description: finalDescription,
      isResolved: isResolvedImmediate,
      initialStatus: isResolvedImmediate ? 'SOLUCIONADO' : 'INICIADO',
      areaSpecificData
    });

    // Reset fast form
    setCitizenDni('');
    setCitizenName('');
    setCitizenPhone('');
    setCitizenAddress('');
    setRequestType('');
    setDescription('');
    setWorksStreetName('');
    setIsResolvedImmediate(false);
    alert('Atención registrada con éxito en el sistema.');
  };

  const maskDni = (dni: string) => {
    if (!maskSensitiveData) return dni;
    const clean = dni.replace(/[^0-9]/g, '');
    if (clean.length < 5) return '***';
    return `${clean.substring(0, 2)}.${'*'.repeat(3)}.${clean.substring(clean.length - 3)}`;
  };

  return (
    <div className="space-y-6">
      {/* Sector Navigation Selector with Category Hierarchical Badges */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800 scrollbar-thin">
        {departments.map(d => {
          const isSelected = d.id === activeDeptId;
          const isUserDept = currentUser?.departmentId === d.id;
          const isSecretaria = d.category === 'SECRETARIA';

          return (
            <button
              key={d.id}
              onClick={() => {
                setActiveDeptId(d.id);
                if (d.id === 'dir-gen-seguridad' || d.moduleType === 'CONTROL_URBANO') {
                  setActiveSubView('CONTROL_URBANO');
                } else if (d.id === 'sec-social' || d.id === 'dir-gen-asistencia-social' || d.parentId === 'sec-social') {
                  setActiveSubView('TICKETS');
                } else {
                  setActiveSubView('TICKETS');
                }
              }}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-2 shrink-0 ${
                isSelected
                  ? 'bg-sky-600 text-white shadow-md ring-2 ring-sky-400/40'
                  : isSecretaria 
                    ? 'bg-slate-900 text-slate-200 hover:bg-slate-800 border border-sky-500/30'
                    : 'bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800/80'
              }`}
            >
              <Building2 className={`w-3.5 h-3.5 ${isSecretaria ? 'text-sky-400' : 'text-slate-400'}`} />
              <div className="flex flex-col text-left">
                <span className="leading-tight">{d.shortName}</span>
                <span className="text-[9px] opacity-70 font-mono">
                  {d.category === 'SECRETARIA' ? 'SECRETARÍA' : d.category === 'DIRECCION_GENERAL' ? 'DIR. GRAL' : d.category === 'COORDINACION' ? 'COORD.' : 'ÁREA'}
                </span>
              </div>
              {isUserDept && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Su área asignada"></span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sector Header Information with Edit Leader Button */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">
              {activeDept?.name}
            </h2>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-full uppercase">
              {activeDept?.category.replace('_', ' ')}
            </span>
            {activeDept?.legalReference && (
              <span className="px-2 py-0.5 text-[10px] font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded-full">
                {activeDept?.legalReference}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-1.5 text-slate-200">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>A cargo: <strong className="text-white font-semibold">{activeDept?.leaderName}</strong></span>
              {activeDept?.leaderTitle && (
                <span className="text-slate-400 font-mono text-[11px]">({activeDept.leaderTitle})</span>
              )}
            </div>
            <span>•</span>
            <span>Contacto: <strong className="text-slate-200">{activeDept?.leaderEmail}</strong></span>
            {activeDept?.phone && (
              <>
                <span>•</span>
                <span>Tel: <strong className="text-slate-200">{activeDept?.phone}</strong></span>
              </>
            )}
            {/* Quick button to edit leader on this department */}
            <button
              onClick={openLeaderEditModal}
              className="ml-1 inline-flex items-center gap-1 px-2.5 py-1 bg-sky-950/70 hover:bg-sky-900 text-sky-300 hover:text-white border border-sky-600/40 rounded-lg text-[11px] font-semibold transition cursor-pointer"
            >
              <Edit3 className="w-3 h-3" />
              <span>Editar Responsable a Cargo</span>
            </button>
          </div>
        </div>

        {/* Micro KPI badges */}
        <div className="flex items-center gap-3 self-start lg:self-auto shrink-0">
          <div className="bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 text-center">
            <div className="text-lg font-bold text-white">{deptTickets.length}</div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Gestiones</div>
          </div>
          <div className="bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 text-center">
            <div className="text-lg font-bold text-emerald-400">{resolvedCount}</div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Resueltas</div>
          </div>
          <div className="bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 text-center">
            <div className="text-lg font-bold text-amber-400">{pendingCount}</div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Pendientes</div>
          </div>
          <div className="bg-slate-950 px-3.5 py-2 rounded-xl border border-emerald-500/30 text-center">
            <div className="text-lg font-bold text-emerald-400">{resolutionRate}%</div>
            <div className="text-[10px] text-emerald-300 uppercase font-semibold">Eficacia</div>
          </div>
        </div>
      </div>

      {/* Social Development Sub-View Navigation (Trámites vs Registro Necrológico) */}
      {isSocialArea && (
        <div className="bg-slate-900 border border-slate-800 p-2 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSubView('TICKETS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeSubView === 'TICKETS'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Atención Ciudadana y Asistencia Social</span>
            </button>

            <button
              onClick={() => setActiveSubView('NECROLOGICAL')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeSubView === 'NECROLOGICAL'
                  ? 'bg-rose-700 text-white shadow-md'
                  : 'text-rose-400 hover:text-white hover:bg-rose-950/40 border border-rose-500/20'
              }`}
            >
              <BookmarkCheck className="w-3.5 h-3.5" />
              <span>Registro Necrológico (Cajones & Nichos)</span>
            </button>
          </div>

          <span className="text-[11px] text-slate-400 pr-2">
            Módulo Oficial de Asistencia Inmediata y Cementerio San Juan Bautista
          </span>
        </div>
      )}

      {/* Control Urbano Sub-View Navigation (Trámites de Carnet, Multas, Habilitaciones, Operativos) */}
      {isUrbanControlArea && (
        <div className="bg-slate-900 border border-slate-800 p-2 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSubView('CONTROL_URBANO')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeSubView === 'CONTROL_URBANO'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Gestión de Control Urbano (Carnets, Multas, Habilitaciones, Operativos)</span>
            </button>

            <button
              onClick={() => setActiveSubView('TICKETS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeSubView === 'TICKETS'
                  ? 'bg-slate-800 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Mesa de Trámites y Reclamos Vecinales</span>
            </button>
          </div>

          <span className="text-[11px] text-sky-400 font-semibold pr-2">
            Seguridad Ciudadana y Control Urbano – Art. 16
          </span>
        </div>
      )}

      {/* RENDER VIEW 1: If Social Area and NECROLOGICAL subview is active */}
      {isSocialArea && activeSubView === 'NECROLOGICAL' ? (
        <NecrologicalRegistry />
      ) : isUrbanControlArea && activeSubView === 'CONTROL_URBANO' ? (
        /* RENDER VIEW 2: If Urban Control Area and CONTROL_URBANO subview is active */
        <UrbanControlModule />
      ) : (
        /* Regular tickets workspace */
        null
      )}

      {/* Grid: Fast Daily Registry Form tailored to the Sector + Recent Sector Records */}
      {(!isSocialArea || activeSubView === 'TICKETS') && (!isUrbanControlArea || activeSubView === 'TICKETS') && (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Fast Sector Form */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-400" />
              <h3 className="font-bold text-white text-sm">
                Registro Rápido de Atención ({activeDept?.shortName})
              </h3>
            </div>
            <span className="text-[10px] text-slate-400">Carga Diaria</span>
          </div>

          <form onSubmit={handleFastSubmit} className="space-y-3.5 text-xs">
            {/* Citizen info */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-slate-300 font-medium mb-1">DNI del Ciudadano (*)</label>
                <input
                  type="text"
                  required
                  placeholder="34..."
                  value={citizenDni}
                  onChange={(e) => handleDniLookup(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Nombre y Apellido (*)</label>
                <input
                  type="text"
                  required
                  placeholder="Nombre del vecino"
                  value={citizenName}
                  onChange={(e) => setCitizenName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Barrio de Itá Ibaté (*)</label>
                <select
                  value={citizenNeighborhood}
                  onChange={(e) => setCitizenNeighborhood(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-sky-500 text-[11px]"
                >
                  {ITA_IBATE_NEIGHBORHOODS.map(nh => (
                    <option key={nh} value={nh}>{nh}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Teléfono</label>
                <input
                  type="text"
                  placeholder="3781-..."
                  value={citizenPhone}
                  onChange={(e) => setCitizenPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* SECTOR SPECIFIC FIELDS */}
            {activeDept?.moduleType === 'ACCION_SOCIAL' && (
              <div className="p-3 bg-rose-950/20 border border-rose-500/30 rounded-xl space-y-2.5">
                <span className="font-bold text-[11px] text-rose-300 block uppercase">
                  Datos de Acción Social & Asistencia
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-300 text-[11px] mb-0.5">Tipo de Asistencia</label>
                    <select
                      value={socialAidType}
                      onChange={(e) => setSocialAidType(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white text-[11px]"
                    >
                      <option value="Módulo de Alimentos Secos">Módulo de Alimentos Secos</option>
                      <option value="Ropero Comunitario / Calzado">Ropero Comunitario / Calzado</option>
                      <option value="Subsidio Pasaje por Salud">Subsidio Pasaje por Salud</option>
                      <option value="Chapas / Materiales Emergencia">Chapas / Emergencia Climática</option>
                      <option value="Asistencia a Adultos Mayores">Asistencia a Adultos Mayores</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 text-[11px] mb-0.5">Miembros del Hogar</label>
                    <input
                      type="number"
                      min="1"
                      value={socialFamilyMembers}
                      onChange={(e) => setSocialFamilyMembers(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white text-[11px]"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeDept?.moduleType === 'OBRAS_PUBLICAS' && (
              <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl space-y-2.5">
                <span className="font-bold text-[11px] text-amber-300 block uppercase">
                  Datos de Servicios Públicos y Cuadrilla
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-300 text-[11px] mb-0.5">Tipo de Reclamo</label>
                    <select
                      value={worksReclaimType}
                      onChange={(e) => setWorksReclaimType(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white text-[11px]"
                    >
                      <option value="Reparación de Luminaria LED">Luminaria LED / Alumbrado</option>
                      <option value="Recolección de Ramas y Residuos">Recolección de Ramas / Residuos</option>
                      <option value="Arreglo de Calles / Bacheo">Arreglo de Calles / Caminos</option>
                      <option value="Limpieza de Desagües y Cunetas">Desagües y Cunetas</option>
                      <option value="Mantenimiento de Plazas">Espacios Verdes / Plazas</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 text-[11px] mb-0.5">Calle / Ubicación</label>
                    <input
                      type="text"
                      placeholder="Calle y altura"
                      value={worksStreetName}
                      onChange={(e) => setWorksStreetName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white text-[11px]"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeDept?.moduleType === 'PUNTO_DIGITAL' && (
              <div className="p-3 bg-indigo-950/20 border border-indigo-500/30 rounded-xl space-y-2.5">
                <span className="font-bold text-[11px] text-indigo-300 block uppercase">
                  Datos de Atención Digital & Formación
                </span>
                <div>
                  <label className="block text-slate-300 text-[11px] mb-0.5">Tipo de Servicio Digital</label>
                  <select
                    value={puntoDigitalType}
                    onChange={(e) => setPuntoDigitalType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white text-[11px]"
                  >
                    <option value="Trámite Mi ANSES / AUH / Libreta">Trámite Mi ANSES / AUH / Libreta</option>
                    <option value="Constancia de Cuil / Renaper / DNI">Constancia de Cuil / Renaper / DNI</option>
                    <option value="Inscripción a Cursos y Talleres TIC">Inscripción a Cursos y Talleres TIC</option>
                    <option value="Uso Libre de Computadoras e Internet">Uso Libre de Computadoras e Internet</option>
                    <option value="Asistencia en Boleto Estudiantil / SUBE">Asistencia en Trámites Educativos</option>
                  </select>
                </div>
              </div>
            )}

            {activeDept?.moduleType === 'TURISMO' && (
              <div className="p-3 bg-teal-950/20 border border-teal-500/30 rounded-xl space-y-2.5">
                <span className="font-bold text-[11px] text-teal-300 block uppercase">
                  Datos de Consultas & Turismo
                </span>
                <div>
                  <label className="block text-slate-300 text-[11px] mb-0.5">Procedencia del Visitante</label>
                  <select
                    value={tourismOrigin}
                    onChange={(e) => setTourismOrigin(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white text-[11px]"
                  >
                    {PROVINCES_TOURISM.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {activeDept?.moduleType === 'CULTURA' && (
              <div className="p-3 bg-purple-950/20 border border-purple-500/30 rounded-xl space-y-2.5">
                <span className="font-bold text-[11px] text-purple-300 block uppercase">
                  Gestión de Talleres y Eventos Culturales
                </span>
                <div>
                  <label className="block text-slate-300 text-[11px] mb-0.5">Taller / Actividad</label>
                  <select
                    value={cultureWorkshop}
                    onChange={(e) => setCultureWorkshop(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white text-[11px]"
                  >
                    <option value="Taller de Danza Chamamecera">Taller de Danza Chamamecera</option>
                    <option value="Taller de Artesanías y Telar Criollo">Taller de Artesanías y Telar Criollo</option>
                    <option value="Coro y Canto Tradicional">Coro y Canto Tradicional</option>
                    <option value="Solicitud de Escenario / Sonido Municipal">Préstamo de Escenario / Sonido</option>
                    <option value="Inscripción a Festival Barrial">Inscripción a Festival Barrial</option>
                  </select>
                </div>
              </div>
            )}

            {/* General Description */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">Detalle o Notas del Trámite</label>
              <textarea
                rows={2}
                placeholder="Observaciones adicionales de la atención..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Immediate Resolution Toggle */}
            <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={isResolvedImmediate}
                onChange={(e) => setIsResolvedImmediate(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600"
              />
              <span className="font-semibold text-slate-200">
                ¿Trámite resuelto de manera inmediata en la mesa?
              </span>
            </label>

            <button
              type="submit"
              className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-semibold shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Guardar Atención en {activeDept?.shortName}
            </button>
          </form>
        </div>

        {/* Recent Sector Records Table */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-white text-sm">
                Registros y Solicitudes en {activeDept?.name}
              </h3>
              <p className="text-xs text-slate-400">
                {deptTickets.length} atenciones registradas
              </p>
            </div>
            <button
              onClick={() => exportTicketsToExcel(deptTickets, activeDept?.shortName)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer border border-slate-700"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Exportar Área</span>
            </button>
          </div>

          <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
            {deptTickets.map(ticket => (
              <div 
                key={ticket.id}
                className="bg-slate-950 p-3 rounded-xl border border-slate-800/90 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sky-400 text-[11px]">
                      {ticket.ticketCode}
                    </span>
                    <span className="font-semibold text-slate-200">
                      {ticket.citizenName}
                    </span>
                    <span className="text-slate-400 font-mono text-[10px]">
                      ({maskDni(ticket.citizenDni)})
                    </span>
                  </div>

                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    ticket.isResolved
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  }`}>
                    {ticket.status}
                  </span>
                </div>

                <div className="font-medium text-slate-300">
                  {ticket.requestType}
                </div>

                <p className="text-[11px] text-slate-400">
                  {ticket.description}
                </p>

                <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10px] text-slate-500">
                  <span>Barrio: <strong className="text-slate-400">{ticket.citizenNeighborhood}</strong></span>
                  <span>Fecha: <strong>{ticket.startDate}</strong></span>
                </div>
              </div>
            ))}

            {deptTickets.length === 0 && (
              <div className="text-center py-16 text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                No hay atenciones registradas en esta área todavía. Utilice el formulario de la izquierda para cargar la primera gestión.
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Modal: Editar Responsable o Titular a Cargo */}
      {showLeaderModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-sky-400" />
                <div>
                  <h3 className="font-bold text-white text-base">
                    Asignar / Editar Titular a Cargo
                  </h3>
                  <p className="text-xs text-slate-400">
                    {activeDept?.name} ({activeDept?.category})
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowLeaderModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLeader} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Nombre y Apellido del Funcionario (*):
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Ing. Martín Solís"
                  value={leaderForm.leaderName}
                  onChange={(e) => setLeaderForm({ ...leaderForm, leaderName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Cargo / Designación Oficial:
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Secretario / Director General"
                    value={leaderForm.leaderTitle}
                    onChange={(e) => setLeaderForm({ ...leaderForm, leaderTitle: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    DNI del Funcionario:
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. 28.450.920"
                    value={leaderForm.leaderDni}
                    onChange={(e) => setLeaderForm({ ...leaderForm, leaderDni: e.target.value })}
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
                    placeholder="area@itaibate.gob.ar"
                    value={leaderForm.leaderEmail}
                    onChange={(e) => setLeaderForm({ ...leaderForm, leaderEmail: e.target.value })}
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
                    value={leaderForm.phone}
                    onChange={(e) => setLeaderForm({ ...leaderForm, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Referencia Normativa / Decreto:
                </label>
                <input
                  type="text"
                  placeholder="Ej. Artículos 14 y 15 - Decreto Estructura Orgánica"
                  value={leaderForm.legalReference}
                  onChange={(e) => setLeaderForm({ ...leaderForm, legalReference: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowLeaderModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-semibold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <UserCheck className="w-4 h-4" />
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
