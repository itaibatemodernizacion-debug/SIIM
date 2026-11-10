import React, { useState } from 'react';
import { useMunicipalData } from '../../context/MunicipalDataContext';
import { useAuth } from '../../context/AuthContext';
import { ITA_IBATE_NEIGHBORHOODS } from '../../data/initialData';
import { Ticket, TicketStatus, Citizen } from '../../types';
import { 
  FileText, 
  Search, 
  PlusCircle, 
  Filter, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Send, 
  MessageSquare, 
  User, 
  Building2, 
  MapPin, 
  Calendar, 
  Download, 
  ChevronRight, 
  X,
  History,
  ArrowRight,
  ShieldAlert,
  AlertCircle
} from 'lucide-react';
import { exportTicketsToExcel } from '../../lib/excelUtils';

export const TicketManagement: React.FC<{ initialCitizenForTicket?: Citizen | null; onClearInitialCitizen?: () => void }> = ({
  initialCitizenForTicket,
  onClearInitialCitizen
}) => {
  const { 
    tickets, 
    departments, 
    citizens, 
    createTicket, 
    updateTicketStatus, 
    deriveTicket, 
    addTicketComment,
    findCitizenByDni 
  } = useMunicipalData();
  
  const { currentUser, maskSensitiveData } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState('ALL');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // Modal states
  const [showNewTicketModal, setShowNewTicketModal] = useState(!!initialCitizenForTicket);
  const [showDeriveModal, setShowDeriveModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');

  // New ticket form
  const [formData, setFormData] = useState({
    citizenDni: initialCitizenForTicket?.dni || '',
    citizenName: initialCitizenForTicket?.fullName || '',
    citizenPhone: initialCitizenForTicket?.phone || '',
    citizenAddress: initialCitizenForTicket?.address || '',
    citizenNeighborhood: initialCitizenForTicket?.neighborhood || ITA_IBATE_NEIGHBORHOODS[0],
    departmentId: currentUser?.departmentId || 'sec-jefatura-gabinete',
    requestType: '',
    description: '',
    priority: 'MEDIA' as 'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE',
    isResolved: false,
    initialStatus: 'INICIADO' as TicketStatus,
    notes: ''
  });

  // Derivation state
  const [targetDeptId, setTargetDeptId] = useState('');
  const [deriveReason, setDeriveReason] = useState('');

  // Status update state
  const [nextStatus, setNextStatus] = useState<TicketStatus>('SOLUCIONADO');
  const [statusComment, setStatusComment] = useState('');

  // Auto-fill citizen info when typing DNI
  const handleDniChange = (dni: string) => {
    setFormData(prev => ({ ...prev, citizenDni: dni }));
    const found = findCitizenByDni(dni);
    if (found) {
      setFormData(prev => ({
        ...prev,
        citizenDni: found.dni,
        citizenName: found.fullName,
        citizenPhone: found.phone,
        citizenAddress: found.address,
        citizenNeighborhood: found.neighborhood
      }));
    }
  };

  // Filter tickets
  const filteredList = tickets.filter(t => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      !q ||
      t.ticketCode.toLowerCase().includes(q) ||
      t.citizenName.toLowerCase().includes(q) ||
      t.citizenDni.replace(/[^0-9]/g, '').includes(q.replace(/[^0-9]/g, '')) ||
      t.requestType.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q);

    const matchesDept = selectedDeptFilter === 'ALL' || t.departmentId === selectedDeptFilter;
    const matchesStatus = selectedStatusFilter === 'ALL' || t.status === selectedStatusFilter;
    const matchesPriority = selectedPriorityFilter === 'ALL' || t.priority === selectedPriorityFilter;

    return matchesSearch && matchesDept && matchesStatus && matchesPriority;
  });

  // Calculate days pending
  const getDaysPending = (ticket: Ticket) => {
    const start = new Date(ticket.startDate).getTime();
    const end = ticket.resolvedDate ? new Date(ticket.resolvedDate).getTime() : new Date().getTime();
    return Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24)));
  };

  const handleCreateTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.citizenDni || !formData.citizenName || !formData.requestType || !formData.description) {
      alert('Por favor complete los campos obligatorios: DNI, Nombre del Ciudadano, Tipo de Solicitud y Descripción.');
      return;
    }

    const created = createTicket({
      ...formData,
      initialStatus: formData.isResolved ? 'SOLUCIONADO' : formData.initialStatus
    });

    setShowNewTicketModal(false);
    setSelectedTicket(created);
    if (onClearInitialCitizen) onClearInitialCitizen();
  };

  const handleExecuteDerivation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !targetDeptId || !deriveReason) {
      alert('Seleccione el área de destino e indique el motivo de derivación.');
      return;
    }

    deriveTicket(selectedTicket.id, targetDeptId, deriveReason);
    setShowDeriveModal(false);
    setDeriveReason('');
    // refresh selected ticket
    const refreshed = tickets.find(t => t.id === selectedTicket.id);
    if (refreshed) setSelectedTicket(refreshed);
  };

  const handleExecuteStatusUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    updateTicketStatus(selectedTicket.id, nextStatus, statusComment);
    setShowStatusModal(false);
    setStatusComment('');
    // refresh selected ticket
    const refreshed = tickets.find(t => t.id === selectedTicket.id);
    if (refreshed) setSelectedTicket(refreshed);
  };

  const handleAddCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newCommentText.trim()) return;

    addTicketComment(selectedTicket.id, newCommentText.trim());
    setNewCommentText('');
    const refreshed = tickets.find(t => t.id === selectedTicket.id);
    if (refreshed) setSelectedTicket(refreshed);
  };

  const maskDni = (dni: string) => {
    if (!maskSensitiveData) return dni;
    const clean = dni.replace(/[^0-9]/g, '');
    if (clean.length < 5) return '***';
    return `${clean.substring(0, 2)}.${'*'.repeat(3)}.${clean.substring(clean.length - 3)}`;
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Seguimiento de Trámites y Reclamos
            </h2>
            <span className="px-2 py-0.5 text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-full">
              {tickets.length} Gestiones
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Gestión de solicitudes vecinales, trazabilidad de derivaciones entre dependencias y control de tiempos de respuesta.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportTicketsToExcel(filteredList)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Exportar Excel</span>
          </button>

          <button
            onClick={() => {
              setFormData({
                citizenDni: '',
                citizenName: '',
                citizenPhone: '',
                citizenAddress: '',
                citizenNeighborhood: ITA_IBATE_NEIGHBORHOODS[0],
                departmentId: currentUser?.departmentId || 'sec-jefatura-gabinete',
                requestType: '',
                description: '',
                priority: 'MEDIA',
                isResolved: false,
                initialStatus: 'INICIADO',
                notes: ''
              });
              setShowNewTicketModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-sky-900/30 transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Iniciar Nuevo Trámite</span>
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por código, vecino, DNI o asunto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div>
          <select
            value={selectedDeptFilter}
            onChange={(e) => setSelectedDeptFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
          >
            <option value="ALL">Todas las Áreas</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
          >
            <option value="ALL">Todos los Estados</option>
            <option value="INICIADO">Iniciado</option>
            <option value="EN_PROCESO">En Proceso</option>
            <option value="PENDIENTE_DOCUMENTACION">Pendiente de Documentación</option>
            <option value="DERIVADO">Derivado a Otra Área</option>
            <option value="SOLUCIONADO">Solucionado</option>
            <option value="NO_SOLUCIONADO">No Solucionado</option>
            <option value="DESESTIMADO">Desestimado</option>
          </select>
        </div>

        <div>
          <select
            value={selectedPriorityFilter}
            onChange={(e) => setSelectedPriorityFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
          >
            <option value="ALL">Todas las Prioridades</option>
            <option value="URGENTE">Urgente</option>
            <option value="ALTA">Alta</option>
            <option value="MEDIA">Media</option>
            <option value="BAJA">Baja</option>
          </select>
        </div>
      </div>

      {/* Main Split: List of Tickets and Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Tickets Table / Cards */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-3.5 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Listado de Trámites ({filteredList.length})</span>
            <span className="text-[11px] text-slate-500">Seleccione para ver trazabilidad completa</span>
          </div>

          <div className="divide-y divide-slate-800/60 max-h-[680px] overflow-y-auto">
            {filteredList.map(ticket => {
              const daysPending = getDaysPending(ticket);
              const isDelayed = !ticket.isResolved && daysPending > 7;
              const isCritical = !ticket.isResolved && daysPending > 15;
              const dept = departments.find(d => d.id === ticket.departmentId);
              const isSelected = selectedTicket?.id === ticket.id;

              return (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className={`p-3.5 transition cursor-pointer ${
                    isSelected 
                      ? 'bg-sky-950/40 border-l-4 border-l-sky-500' 
                      : 'hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800/40">
                        {ticket.ticketCode}
                      </span>
                      <span className="font-semibold text-slate-100 text-xs">
                        {ticket.citizenName}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({maskDni(ticket.citizenDni)})
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isCritical ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                          <AlertTriangle className="w-3 h-3 text-rose-400" />
                          {daysPending}d de demora
                        </span>
                      ) : isDelayed ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          <Clock className="w-3 h-3 text-amber-400" />
                          {daysPending}d
                        </span>
                      ) : null}

                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        ticket.isResolved
                          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                          : ticket.status === 'EN_PROCESO'
                            ? 'bg-sky-500/10 text-sky-300 border border-sky-500/30'
                            : ticket.status === 'DERIVADO'
                              ? 'bg-purple-500/10 text-purple-300 border border-purple-500/30'
                              : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                      }`}>
                        {ticket.status}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs font-medium text-slate-200 line-clamp-1 mb-1">
                    {ticket.requestType}
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2 mb-2">
                    {ticket.description}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-800/60">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-slate-300 font-medium">
                        <Building2 className="w-3 h-3 text-sky-400" />
                        {dept?.shortName || ticket.departmentId}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        {ticket.citizenNeighborhood}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span>Inicio: <strong>{ticket.startDate}</strong></span>
                      {ticket.resolvedDate && (
                        <span className="text-emerald-400 font-medium">
                          ✓ Resuelto ({ticket.resolvedDate})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredList.length === 0 && (
              <div className="text-center py-16 text-slate-500 text-xs">
                No se encontraron trámites con los filtros seleccionados.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Ticket Detail, Journey Trail, and Action Buttons */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          {selectedTicket ? (
            <div className="space-y-4">
              {/* Top summary badge and actions */}
              <div className="pb-3 border-b border-slate-800">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-extrabold text-white font-mono">
                      {selectedTicket.ticketCode}
                    </span>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                      selectedTicket.isResolved
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}>
                      {selectedTicket.status}
                    </span>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                    selectedTicket.priority === 'URGENTE'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : selectedTicket.priority === 'ALTA'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-800 text-slate-400'
                  }`}>
                    Prioridad: {selectedTicket.priority}
                  </span>
                </div>

                <h3 className="font-bold text-white text-sm">
                  {selectedTicket.requestType}
                </h3>
              </div>

              {/* Citizen & Area Details */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">Ciudadano</span>
                  <div className="font-semibold text-slate-200">{selectedTicket.citizenName}</div>
                  <div className="text-[11px] text-slate-400 font-mono">DNI {maskDni(selectedTicket.citizenDni)}</div>
                  <div className="text-[11px] text-sky-400">{selectedTicket.citizenNeighborhood}</div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">Gestión Actual</span>
                  <div className="font-semibold text-slate-200">
                    {departments.find(d => d.id === selectedTicket.departmentId)?.name}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Responsable: <strong>{selectedTicket.responsibleName}</strong>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Ingresado: <strong>{selectedTicket.startDate}</strong>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/80 text-xs">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                  Descripción del problema o necesidad:
                </span>
                <p className="text-slate-200 leading-relaxed">
                  {selectedTicket.description}
                </p>
                {selectedTicket.resolvedDate && (
                  <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-emerald-400 text-[11px] font-semibold">
                    <span>Fecha de Resolución Oficial:</span>
                    <span>{selectedTicket.resolvedDate}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons for ticket */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => {
                    setNextStatus(selectedTicket.isResolved ? 'EN_PROCESO' : 'SOLUCIONADO');
                    setShowStatusModal(true);
                  }}
                  className="px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-semibold shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Cambiar Estado
                </button>

                <button
                  onClick={() => {
                    setTargetDeptId('');
                    setShowDeriveModal(true);
                  }}
                  className="px-3 py-2 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white rounded-xl text-xs font-semibold shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  Derivar a Otra Área
                </button>
              </div>

              {/* Timeline / Recorrido del trámite */}
              <div className="pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-sky-400" />
                    Trazabilidad y Recorrido Municipal
                  </span>
                  <span className="text-[10px] text-slate-500">{selectedTicket.timeline.length} movimientos</span>
                </h4>

                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {selectedTicket.timeline.map((step, idx) => (
                    <div 
                      key={step.id || idx}
                      className="border-l-2 border-slate-700 pl-3 py-1 space-y-0.5 text-xs relative"
                    >
                      <div className="w-2 h-2 rounded-full bg-sky-400 absolute -left-[5px] top-2"></div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-semibold text-slate-300">{step.authorName}</span>
                        <span>{step.date}</span>
                      </div>
                      <div className="text-[11px] text-slate-200">
                        {step.comment}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Observation Form */}
                <form onSubmit={handleAddCommentSubmit} className="mt-3 flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Agregar observación o detalle al expediente..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Guardar
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="text-center py-24 text-slate-500 text-xs flex flex-col items-center justify-center space-y-2">
              <FileText className="w-10 h-10 text-slate-700" />
              <p>Seleccione un trámite del listado para ver su recorrido y actualizar su estado.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Iniciar Nuevo Trámite */}
      {showNewTicketModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-white text-base">Registrar Nuevo Trámite o Solicitud</h3>
              </div>
              <button
                onClick={() => {
                  setShowNewTicketModal(false);
                  if (onClearInitialCitizen) onClearInitialCitizen();
                }}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicketSubmit} className="space-y-3.5 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2.5">
                <span className="font-bold text-[11px] uppercase tracking-wider text-sky-400 block">
                  1. Datos del Ciudadano Frentista
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">DNI (*)</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. 34.892.401"
                      value={formData.citizenDni}
                      onChange={(e) => handleDniChange(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500 font-mono"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Si el DNI ya está registrado, autocompleta los datos.
                    </span>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Nombre y Apellido (*)</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Juan Carlos Gómez"
                      value={formData.citizenName}
                      onChange={(e) => setFormData({ ...formData, citizenName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Barrio de Itá Ibaté (*)</label>
                    <select
                      value={formData.citizenNeighborhood}
                      onChange={(e) => setFormData({ ...formData, citizenNeighborhood: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-sky-500 text-[11px]"
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
                      placeholder="Calle y número"
                      value={formData.citizenAddress}
                      onChange={(e) => setFormData({ ...formData, citizenAddress: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Teléfono</label>
                    <input
                      type="text"
                      placeholder="3781-..."
                      value={formData.citizenPhone}
                      onChange={(e) => setFormData({ ...formData, citizenPhone: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2.5">
                <span className="font-bold text-[11px] uppercase tracking-wider text-sky-400 block">
                  2. Datos de la Gestión / Solicitud
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Secretaría o Dirección Receptora (*)</label>
                    <select
                      value={formData.departmentId}
                      onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                    >
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Prioridad</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                    >
                      <option value="BAJA">Baja</option>
                      <option value="MEDIA">Media</option>
                      <option value="ALTA">Alta</option>
                      <option value="URGENTE">Urgente</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Tipo de Trámite o Solicitud (*)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Solicitud de Alumbrado, Asistencia Alimentaria, Habilitación, etc."
                    value={formData.requestType}
                    onChange={(e) => setFormData({ ...formData, requestType: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Descripción del Problema o Necesidad (*)</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Detalle de la situación informada por el vecino..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Mandatory Resolution Flag */}
                <div className="pt-2 border-t border-slate-800">
                  <label className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isResolved}
                      onChange={(e) => setFormData({ ...formData, isResolved: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-white block">
                        ¿El problema o solicitud fue RESUELTO en este acto? (*)
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        Si se marca como resuelto, se registrará la fecha actual y se computará en la tasa de resolución.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewTicketModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-semibold shadow-md cursor-pointer"
                >
                  Generar Trámite Oficial
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Derivar a Otra Área */}
      {showDeriveModal && selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ArrowRight className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-white text-base">Derivación de Trámite</h3>
              </div>
              <button onClick={() => setShowDeriveModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteDerivation} className="space-y-3.5 text-xs">
              <div>
                <span className="text-slate-400">Expediente:</span>
                <div className="font-mono font-bold text-white text-sm mt-0.5">{selectedTicket.ticketCode} - {selectedTicket.requestType}</div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Área Municipal de Destino (*)</label>
                <select
                  required
                  value={targetDeptId}
                  onChange={(e) => setTargetDeptId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">Seleccione dependencia...</option>
                  {departments
                    .filter(d => d.id !== selectedTicket.departmentId)
                    .map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Motivo / Instrucción de Derivación (*)</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explique por qué se deriva el caso a dicha área y qué informe o intervención se requiere..."
                  value={deriveReason}
                  onChange={(e) => setDeriveReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDeriveModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold shadow-md cursor-pointer"
                >
                  Confirmar Derivación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Cambiar Estado */}
      {showStatusModal && selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Actualizar Estado de Trámite</h3>
              </div>
              <button onClick={() => setShowStatusModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteStatusUpdate} className="space-y-3.5 text-xs">
              <div>
                <span className="text-slate-400">Trámite:</span>
                <div className="font-mono font-bold text-white text-sm mt-0.5">{selectedTicket.ticketCode} - {selectedTicket.requestType}</div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Nuevo Estado (*)</label>
                <select
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value as TicketStatus)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="SOLUCIONADO">Solucionado (Resuelto satisfactoriamente)</option>
                  <option value="EN_PROCESO">En Proceso (Trabajo técnico en curso)</option>
                  <option value="PENDIENTE_DOCUMENTACION">Pendiente de Documentación</option>
                  <option value="NO_SOLUCIONADO">No Solucionado</option>
                  <option value="DESESTIMADO">Desestimado</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Comentario / Fundamento del cambio (*)</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detalle de la acción realizada, trabajo de cuadrilla, entrega o motivo..."
                  value={statusComment}
                  onChange={(e) => setStatusComment(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold shadow-md cursor-pointer"
                >
                  Registrar Cambio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
