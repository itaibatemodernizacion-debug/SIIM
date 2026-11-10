import React, { useState } from 'react';
import { useMunicipalData } from '../../context/MunicipalDataContext';
import { useAuth } from '../../context/AuthContext';
import { ITA_IBATE_NEIGHBORHOODS } from '../../data/initialData';
import { Citizen, Ticket } from '../../types';
import { 
  Users, 
  Search, 
  UserPlus, 
  Phone, 
  MapPin, 
  Calendar, 
  FileText, 
  Clock, 
  CheckCircle2, 
  ExternalLink,
  Download,
  AlertTriangle,
  ChevronRight,
  X,
  FileSpreadsheet
} from 'lucide-react';
import { exportCitizensToExcel } from '../../lib/excelUtils';

export const CitizensRegistry: React.FC<{
  onOpenNewTicketForCitizen?: (citizen: Citizen) => void;
}> = ({ onOpenNewTicketForCitizen }) => {
  const { citizens, addCitizen, updateCitizen, tickets, departments } = useMunicipalData();
  const { maskSensitiveData, currentUser } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNeighborhoodFilter, setSelectedNeighborhoodFilter] = useState('ALL');
  const [selectedCitizen, setSelectedCitizen] = useState<Citizen | null>(null);
  const [showNewCitizenModal, setShowNewCitizenModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    dni: '',
    phone: '',
    address: '',
    neighborhood: ITA_IBATE_NEIGHBORHOODS[0],
    birthDate: '',
    notes: ''
  });

  // Filter citizens
  const filteredCitizens = citizens.filter(c => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      !q ||
      c.fullName.toLowerCase().includes(q) ||
      c.dni.replace(/[^0-9]/g, '').includes(q.replace(/[^0-9]/g, '')) ||
      c.address.toLowerCase().includes(q);

    const matchesNeighborhood = selectedNeighborhoodFilter === 'ALL' || c.neighborhood === selectedNeighborhoodFilter;

    return matchesSearch && matchesNeighborhood;
  });

  const handleSaveNewCitizen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.dni) {
      alert('Por favor ingrese al menos Nombre y Apellido y DNI.');
      return;
    }

    const created = addCitizen({
      fullName: formData.fullName,
      dni: formData.dni,
      phone: formData.phone,
      address: formData.address,
      neighborhood: formData.neighborhood,
      birthDate: formData.birthDate || undefined,
      notes: formData.notes,
      departmentRegisteredId: currentUser?.departmentId || 'sec-jefatura-gabinete'
    });

    setFormData({
      fullName: '',
      dni: '',
      phone: '',
      address: '',
      neighborhood: ITA_IBATE_NEIGHBORHOODS[0],
      birthDate: '',
      notes: ''
    });

    setShowNewCitizenModal(false);
    setSelectedCitizen(created);
  };

  // Helper to mask sensitive citizen data according to Argentine Law 25.326
  const maskDni = (dni: string) => {
    if (!maskSensitiveData) return dni;
    const clean = dni.replace(/[^0-9]/g, '');
    if (clean.length < 5) return '***';
    return `${clean.substring(0, 2)}.${'*'.repeat(3)}.${clean.substring(clean.length - 3)}`;
  };

  const maskPhone = (phone: string) => {
    if (!maskSensitiveData || !phone) return phone || '-';
    return phone.replace(/(\d{4})-(\d{2})(\d+)/, '$1-**-**');
  };

  // Tickets for selected citizen
  const citizenTickets = selectedCitizen 
    ? tickets.filter(t => t.citizenId === selectedCitizen.id || t.citizenDni === selectedCitizen.dni)
    : [];

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Padrón y Registro de Ciudadanos
            </h2>
            <span className="px-2 py-0.5 text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-full">
              {citizens.length} Registrados
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Gestión de ciudadanos de Itá Ibaté, historial de trámites, solicitudes y atenciones vecinales.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportCitizensToExcel(citizens)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
            title="Exportar padrón a planilla Excel (.xlsx)"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Exportar Excel</span>
          </button>

          <button
            onClick={() => setShowNewCitizenModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-sky-900/30 transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Registrar Ciudadano</span>
          </button>
        </div>
      </div>

      {/* Search and Filter Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Buscar por DNI, Nombre, Apellido o Dirección..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 shadow-sm"
          />
        </div>

        <div>
          <select
            value={selectedNeighborhoodFilter}
            onChange={(e) => setSelectedNeighborhoodFilter(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 shadow-sm"
          >
            <option value="ALL">Todos los Barrios de Itá Ibaté</option>
            {ITA_IBATE_NEIGHBORHOODS.map(nh => (
              <option key={nh} value={nh}>{nh}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content: Split list and detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Citizens List */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-3.5 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Listado de Vecinos ({filteredCitizens.length})</span>
            <span className="text-[11px] text-slate-500">Haga clic para ver expediente completo</span>
          </div>

          <div className="divide-y divide-slate-800/60 max-h-[620px] overflow-y-auto">
            {filteredCitizens.map(citizen => {
              const countTickets = tickets.filter(t => t.citizenId === citizen.id || t.citizenDni === citizen.dni).length;
              const isSelected = selectedCitizen?.id === citizen.id;

              return (
                <div
                  key={citizen.id}
                  onClick={() => setSelectedCitizen(citizen)}
                  className={`p-3.5 flex items-center justify-between gap-3 transition cursor-pointer ${
                    isSelected 
                      ? 'bg-sky-950/40 border-l-4 border-l-sky-500 text-white' 
                      : 'hover:bg-slate-800/40 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-slate-800 to-slate-700 border border-slate-700 flex items-center justify-center font-bold text-sky-400 text-xs shrink-0">
                      {citizen.fullName.charAt(0)}
                    </div>
                    <div className="truncate">
                      <div className="font-semibold text-slate-100 flex items-center gap-2">
                        <span className="truncate">{citizen.fullName}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                          DNI {maskDni(citizen.dni)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 text-sky-400 shrink-0" />
                          <span className="truncate">{citizen.neighborhood}</span>
                        </span>
                        <span>•</span>
                        <span className="truncate">{citizen.address || 'Sin calle especificada'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                      countTickets > 0 ? 'bg-sky-500/10 text-sky-300 border border-sky-500/20' : 'bg-slate-800 text-slate-500'
                    }`}>
                      {countTickets} {countTickets === 1 ? 'gestión' : 'gestiones'}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                </div>
              );
            })}

            {filteredCitizens.length === 0 && (
              <div className="text-center py-12 text-slate-500 text-xs">
                No se encontraron ciudadanos con el criterio de búsqueda.
              </div>
            )}
          </div>
        </div>

        {/* Right: Citizen History & Profile Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          {selectedCitizen ? (
            <div className="space-y-4">
              {/* Header profile info */}
              <div className="pb-3 border-b border-slate-800 flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-white text-base">
                    {selectedCitizen.fullName}
                  </h3>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">
                    DNI: <strong className="text-sky-300">{maskDni(selectedCitizen.dni)}</strong>
                  </div>
                </div>
                {onOpenNewTicketForCitizen && (
                  <button
                    onClick={() => onOpenNewTicketForCitizen(selectedCitizen)}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 shadow-sm"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Iniciar Trámite
                  </button>
                )}
              </div>

              {/* Personal Details */}
              <div className="space-y-2 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Domicilio:</span>
                  <span className="font-medium text-slate-200">{selectedCitizen.address || '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Barrio:</span>
                  <span className="font-semibold text-sky-400">{selectedCitizen.neighborhood}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Teléfono:</span>
                  <span className="font-mono text-slate-200">{maskPhone(selectedCitizen.phone)}</span>
                </div>
                {selectedCitizen.birthDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Fecha Nacimiento:</span>
                    <span>{selectedCitizen.birthDate}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Fecha de Registro:</span>
                  <span>{selectedCitizen.registrationDate}</span>
                </div>
                {selectedCitizen.notes && (
                  <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 italic">
                    "{selectedCitizen.notes}"
                  </div>
                )}
              </div>

              {/* Citizen Ticket History */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                  <span>Historial de Trámites y Atenciones</span>
                  <span className="text-[10px] text-slate-500">{citizenTickets.length} registros</span>
                </h4>

                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {citizenTickets.map(ticket => {
                    const dept = departments.find(d => d.id === ticket.departmentId);
                    return (
                      <div 
                        key={ticket.id}
                        className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-sky-400 text-[11px]">
                            {ticket.ticketCode}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            ticket.isResolved
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : ticket.status === 'EN_PROCESO'
                                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          }`}>
                            {ticket.status}
                          </span>
                        </div>

                        <div className="font-semibold text-slate-200">
                          {ticket.requestType}
                        </div>

                        <p className="text-[11px] text-slate-400 line-clamp-2">
                          {ticket.description}
                        </p>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10px] text-slate-500">
                          <span>Área: <strong className="text-slate-300">{dept?.shortName || ticket.departmentId}</strong></span>
                          <span>Inicio: {ticket.startDate}</span>
                        </div>
                      </div>
                    );
                  })}

                  {citizenTickets.length === 0 && (
                    <div className="text-center py-6 text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                      El ciudadano no registra solicitudes de trámites todavía.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-slate-500 text-xs flex flex-col items-center justify-center space-y-2">
              <Users className="w-8 h-8 text-slate-700" />
              <p>Seleccione un ciudadano para ver su expediente y antecedentes.</p>
            </div>
          )}
        </div>
      </div>

      {/* New Citizen Modal */}
      {showNewCitizenModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-white text-base">Registrar Nuevo Ciudadano</h3>
              </div>
              <button
                onClick={() => setShowNewCitizenModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewCitizen} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Nombre y Apellido (*)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Ramón Antonio Díaz"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">DNI (*)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 34.567.890"
                    value={formData.dni}
                    onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Barrio de Itá Ibaté (*)</label>
                  <select
                    value={formData.neighborhood}
                    onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  >
                    {ITA_IBATE_NEIGHBORHOODS.map(nh => (
                      <option key={nh} value={nh}>{nh}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Teléfono o Celular</label>
                  <input
                    type="text"
                    placeholder="Ej. 3781-450123"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Domicilio / Calle</label>
                  <input
                    type="text"
                    placeholder="Ej. Av. San Martín 820"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Fecha de Nacimiento (Opcional)</label>
                  <input
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Observaciones / Notas Vecinales</label>
                <textarea
                  rows={2}
                  placeholder="Información adicional sobre la situación o requerimientos del vecino..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewCitizenModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-semibold shadow-md cursor-pointer"
                >
                  Guardar Ciudadano
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
