import React, { useState } from 'react';
import { useMunicipalData } from '../../context/MunicipalDataContext';
import { useAuth } from '../../context/AuthContext';
import { ITA_IBATE_NEIGHBORHOODS } from '../../data/initialData';
import { SportEvent, SportParticipant } from '../../types';
import { 
  Trophy, 
  Calendar, 
  MapPin, 
  Users, 
  PlusCircle, 
  Medal, 
  Download, 
  Filter, 
  Search, 
  CheckCircle2, 
  Activity, 
  X,
  UserCheck
} from 'lucide-react';
import { exportSportsToExcel } from '../../lib/excelUtils';

const SPORT_DISCIPLINES = [
  'Pesca Deportiva',
  'Fútbol',
  'Fútbol 7',
  'Fútbol Femenino',
  'Vóley / Beach Vóley',
  'Básquet',
  'Atletismo / Maratón',
  'Ciclismo',
  'Pádel',
  'Bochas',
  'Boxeo / Artes Marciales',
  'Gimnasia y Newcom (Adultos Mayores)'
];

const SPORT_LOCATIONS = [
  'Polideportivo Municipal de Itá Ibaté',
  'Costanera y Muelle de Itá Ibaté',
  'Playón Deportivo Costanera',
  'Estadio Municipal de Fútbol',
  'Club Náutico Itá Ibaté',
  'Circuito Costero Río Paraná',
  'Centro de Jubilados (Newcom)'
];

export const SportsModule: React.FC = () => {
  const { 
    sportsEvents, 
    sportsParticipants, 
    addSportEvent, 
    updateSportEvent, 
    addSportParticipant,
    findCitizenByDni 
  } = useMunicipalData();

  const { maskSensitiveData } = useAuth();

  const [activeTab, setActiveTab] = useState<'EVENTS' | 'PARTICIPANTS' | 'STATS'>('EVENTS');
  const [selectedEventId, setSelectedEventId] = useState<string>('ALL');
  const [selectedDisciplineFilter, setSelectedDisciplineFilter] = useState<string>('ALL');
  const [searchParticipant, setSearchParticipant] = useState('');

  // Modals
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [showNewParticipantModal, setShowNewParticipantModal] = useState(false);

  // New Event Form
  const [eventForm, setEventForm] = useState({
    name: '',
    discipline: SPORT_DISCIPLINES[0],
    date: new Date().toISOString().split('T')[0],
    location: SPORT_LOCATIONS[0],
    category: 'Libre Mixto',
    status: 'PROGRAMADO' as 'PROGRAMADO' | 'EN_CURSO' | 'FINALIZADO',
    organizer: 'Dirección de Deportes - Municipalidad de Itá Ibaté'
  });

  // New Participant Form
  const [participantForm, setParticipantForm] = useState({
    eventId: sportsEvents[0]?.id || '',
    fullName: '',
    dni: '',
    address: '',
    neighborhood: ITA_IBATE_NEIGHBORHOODS[0],
    phone: '',
    discipline: SPORT_DISCIPLINES[0],
    category: 'Libre',
    teamOrClub: '',
    participationDate: new Date().toISOString().split('T')[0],
    location: SPORT_LOCATIONS[0]
  });

  // Handle DNI autofill for participant
  const handleParticipantDniChange = (dni: string) => {
    setParticipantForm(prev => ({ ...prev, dni }));
    const cit = findCitizenByDni(dni);
    if (cit) {
      setParticipantForm(prev => ({
        ...prev,
        fullName: cit.fullName,
        dni: cit.dni,
        address: cit.address,
        neighborhood: cit.neighborhood,
        phone: cit.phone
      }));
    }
  };

  // When changing event in participant modal, sync discipline & location
  const handleEventSelectionInModal = (eventId: string) => {
    const evt = sportsEvents.find(e => e.id === eventId);
    setParticipantForm(prev => ({
      ...prev,
      eventId,
      discipline: evt ? evt.discipline : prev.discipline,
      location: evt ? evt.location : prev.location,
      participationDate: evt ? evt.date : prev.participationDate
    }));
  };

  // Submit forms
  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.name) return;

    addSportEvent(eventForm);
    setShowNewEventModal(false);
    setEventForm({
      name: '',
      discipline: SPORT_DISCIPLINES[0],
      date: new Date().toISOString().split('T')[0],
      location: SPORT_LOCATIONS[0],
      category: 'Libre Mixto',
      status: 'PROGRAMADO',
      organizer: 'Dirección de Deportes - Municipalidad de Itá Ibaté'
    });
  };

  const handleCreateParticipant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!participantForm.fullName || !participantForm.dni || !participantForm.eventId) {
      alert('Por favor complete Nombre, DNI y seleccione el Evento o Torneo.');
      return;
    }

    const evt = sportsEvents.find(e => e.id === participantForm.eventId);

    addSportParticipant({
      ...participantForm,
      eventName: evt?.name || 'Evento Deportivo Municipal'
    });

    setShowNewParticipantModal(false);
    setParticipantForm({
      eventId: sportsEvents[0]?.id || '',
      fullName: '',
      dni: '',
      address: '',
      neighborhood: ITA_IBATE_NEIGHBORHOODS[0],
      phone: '',
      discipline: SPORT_DISCIPLINES[0],
      category: 'Libre',
      teamOrClub: '',
      participationDate: new Date().toISOString().split('T')[0],
      location: SPORT_LOCATIONS[0]
    });
  };

  // Calculations
  const uniqueAthletes = new Set(sportsParticipants.map(p => p.dni.replace(/[^0-9]/g, ''))).size;
  const totalAttendances = sportsParticipants.length;

  // Breakdown by discipline
  const disciplineCounts: Record<string, number> = {};
  sportsParticipants.forEach(p => {
    disciplineCounts[p.discipline] = (disciplineCounts[p.discipline] || 0) + 1;
  });

  // Breakdown by neighborhood
  const sportsNeighborhoodCounts: Record<string, number> = {};
  sportsParticipants.forEach(p => {
    sportsNeighborhoodCounts[p.neighborhood] = (sportsNeighborhoodCounts[p.neighborhood] || 0) + 1;
  });

  // Filter participants
  const filteredParticipants = sportsParticipants.filter(p => {
    const q = searchParticipant.toLowerCase().trim();
    const matchesSearch = 
      !q ||
      p.fullName.toLowerCase().includes(q) ||
      p.dni.replace(/[^0-9]/g, '').includes(q.replace(/[^0-9]/g, '')) ||
      p.teamOrClub.toLowerCase().includes(q) ||
      p.eventName.toLowerCase().includes(q);

    const matchesEvent = selectedEventId === 'ALL' || p.eventId === selectedEventId;
    const matchesDiscipline = selectedDisciplineFilter === 'ALL' || p.discipline === selectedDisciplineFilter;

    return matchesSearch && matchesEvent && matchesDiscipline;
  });

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
              Dirección de Deportes y Recreación
            </h2>
            <span className="px-2 py-0.5 text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-full">
              Itá Ibaté Activa
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Gestión de eventos deportivos, campeonatos, maratones, torneos de pesca y registro de atletas vecinales.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportSportsToExcel(sportsParticipants)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Exportar Excel</span>
          </button>

          <button
            onClick={() => setShowNewEventModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-orange-300 border border-orange-500/30 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            <span>Nuevo Torneo / Evento</span>
          </button>

          <button
            onClick={() => {
              if (sportsEvents.length > 0) {
                handleEventSelectionInModal(sportsEvents[0].id);
              }
              setShowNewParticipantModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-orange-900/30 transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Inscribir Deportista</span>
          </button>
        </div>
      </div>

      {/* KPI Cards for Sports */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Deportistas Únicos</span>
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
            {uniqueAthletes}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Ciudadanos individuales identificados por DNI
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] text-slate-500">
            Sin duplicidad en el padrón municipal
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Participaciones Totales</span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-extrabold text-sky-400 tracking-tight">
            {totalAttendances}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Inscripciones acumuladas en torneos
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] text-slate-500">
            Promedio {(totalAttendances / (uniqueAthletes || 1)).toFixed(1)} torneos por deportista
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Eventos y Torneos</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-extrabold text-emerald-400 tracking-tight">
            {sportsEvents.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Competencias y encuentros municipales
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] text-slate-500">
            Pesca, fútbol, vóley y maratón
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Disciplinas Activas</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Medal className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-extrabold text-purple-400 tracking-tight">
            {Object.keys(disciplineCounts).length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Modalidades con atletas inscriptos
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] text-slate-500">
            Actividad deportiva no computable en trámites
          </div>
        </div>
      </div>

      {/* Tabs Switcher: Events vs Participants vs Statistics */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('EVENTS')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeTab === 'EVENTS'
              ? 'bg-orange-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          🏆 Torneos y Encuentros ({sportsEvents.length})
        </button>
        <button
          onClick={() => setActiveTab('PARTICIPANTS')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeTab === 'PARTICIPANTS'
              ? 'bg-orange-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          👥 Padrón de Deportistas ({sportsParticipants.length})
        </button>
        <button
          onClick={() => setActiveTab('STATS')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeTab === 'STATS'
              ? 'bg-orange-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          📊 Métricas y Disciplinas
        </button>
      </div>

      {/* TAB 1: Events Grid */}
      {activeTab === 'EVENTS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sportsEvents.map(evt => {
            const count = sportsParticipants.filter(p => p.eventId === evt.id).length;

            return (
              <div 
                key={evt.id} 
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-500/10 text-orange-300 border border-orange-500/20">
                    {evt.discipline}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    evt.status === 'FINALIZADO'
                      ? 'bg-slate-800 text-slate-400'
                      : evt.status === 'EN_CURSO'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse'
                        : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  }`}>
                    {evt.status}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-white text-sm line-clamp-1">
                    {evt.name}
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    <span className="truncate">{evt.location}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="text-slate-400">
                    Fecha: <strong className="text-slate-200">{evt.date}</strong>
                  </div>
                  <div className="text-orange-400 font-bold">
                    {count} {count === 1 ? 'participante' : 'participantes'}
                  </div>
                </div>

                <div className="pt-1 flex gap-2">
                  <button
                    onClick={() => {
                      handleEventSelectionInModal(evt.id);
                      setShowNewParticipantModal(true);
                    }}
                    className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-orange-300 font-semibold text-xs rounded-lg transition cursor-pointer flex items-center justify-center gap-1"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Inscribir a este evento
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: Participants List */}
      {activeTab === 'PARTICIPANTS' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por DNI, Nombre o Club..."
                value={searchParticipant}
                onChange={(e) => setSearchParticipant(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-orange-500"
              >
                <option value="ALL">Todos los Eventos y Torneos</option>
                {sportsEvents.map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={selectedDisciplineFilter}
                onChange={(e) => setSelectedDisciplineFilter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-orange-500"
              >
                <option value="ALL">Todas las Disciplinas</option>
                {SPORT_DISCIPLINES.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 uppercase text-[11px] font-semibold">
                    <th className="py-3 px-3.5">Deportista</th>
                    <th className="py-3 px-3">DNI</th>
                    <th className="py-3 px-3">Barrio</th>
                    <th className="py-3 px-3">Disciplina</th>
                    <th className="py-3 px-3">Torneo / Evento</th>
                    <th className="py-3 px-3">Equipo / Club</th>
                    <th className="py-3 px-3 text-right">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredParticipants.map(part => (
                    <tr key={part.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-3.5 font-bold text-slate-100">
                        {part.fullName}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-400">
                        {maskDni(part.dni)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {part.neighborhood}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-300 text-[11px] font-medium border border-orange-500/20">
                          {part.discipline}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 font-medium">
                        {part.eventName}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {part.teamOrClub || 'Libre'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-400">
                        {part.participationDate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredParticipants.length === 0 && (
              <div className="text-center py-12 text-slate-500 text-xs">
                No se registraron deportistas con los filtros seleccionados.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Statistics */}
      {activeTab === 'STATS' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Disciplines breakdown */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Medal className="w-4 h-4 text-orange-400" />
              Participación por Disciplina Deportiva
            </h3>

            <div className="space-y-3">
              {Object.entries(disciplineCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([disc, count]) => {
                  const pct = Math.round((count / (sportsParticipants.length || 1)) * 100);
                  return (
                    <div key={disc} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-200">{disc}</span>
                        <span className="text-orange-400 font-bold">{count} atletas ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div 
                          style={{ width: `${pct}%` }} 
                          className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all"
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Neighborhood breakdown in sports */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-sky-400" />
              Deportistas por Barrio de Itá Ibaté
            </h3>

            <div className="space-y-3">
              {Object.entries(sportsNeighborhoodCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([nh, count]) => {
                  const pct = Math.round((count / (sportsParticipants.length || 1)) * 100);
                  return (
                    <div key={nh} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-200">{nh}</span>
                        <span className="text-sky-400 font-bold">{count} participantes ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div 
                          style={{ width: `${pct}%` }} 
                          className="h-full bg-gradient-to-r from-sky-500 to-blue-600 rounded-full transition-all"
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Event */}
      {showNewEventModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-orange-400" />
                <h3 className="font-bold text-white text-base">Crear Torneo o Evento Deportivo</h3>
              </div>
              <button onClick={() => setShowNewEventModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Nombre del Torneo / Evento (*)</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Torneo de Verano de Básquet 3x3"
                  value={eventForm.name}
                  onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Disciplina</label>
                  <select
                    value={eventForm.discipline}
                    onChange={(e) => setEventForm({ ...eventForm, discipline: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-orange-500"
                  >
                    {SPORT_DISCIPLINES.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Fecha</label>
                  <input
                    type="date"
                    value={eventForm.date}
                    onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Lugar de Realización</label>
                <select
                  value={eventForm.location}
                  onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                >
                  {SPORT_LOCATIONS.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Categoría</label>
                  <input
                    type="text"
                    placeholder="Ej. Sub-16, Libre, Senior"
                    value={eventForm.category}
                    onChange={(e) => setEventForm({ ...eventForm, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Estado</label>
                  <select
                    value={eventForm.status}
                    onChange={(e) => setEventForm({ ...eventForm, status: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="PROGRAMADO">Programado</option>
                    <option value="EN_CURSO">En Curso</option>
                    <option value="FINALIZADO">Finalizado</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewEventModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-semibold shadow-md cursor-pointer"
                >
                  Crear Torneo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Inscribir Deportista */}
      {showNewParticipantModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-orange-400" />
                <h3 className="font-bold text-white text-base">Inscribir Deportista a Evento</h3>
              </div>
              <button onClick={() => setShowNewParticipantModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateParticipant} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Evento o Torneo Destino (*)</label>
                <select
                  required
                  value={participantForm.eventId}
                  onChange={(e) => handleEventSelectionInModal(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                >
                  {sportsEvents.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.discipline})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">DNI del Deportista (*)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 41.220.844"
                    value={participantForm.dni}
                    onChange={(e) => handleParticipantDniChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Autocompleta si ya existe en el padrón vecinal.
                  </span>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Nombre y Apellido (*)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Lucas Emmanuel Duarte"
                    value={participantForm.fullName}
                    onChange={(e) => setParticipantForm({ ...participantForm, fullName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Barrio de Itá Ibaté (*)</label>
                  <select
                    value={participantForm.neighborhood}
                    onChange={(e) => setParticipantForm({ ...participantForm, neighborhood: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                  >
                    {ITA_IBATE_NEIGHBORHOODS.map(nh => (
                      <option key={nh} value={nh}>{nh}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Teléfono de Contacto</label>
                  <input
                    type="text"
                    placeholder="Ej. 3781-490334"
                    value={participantForm.phone}
                    onChange={(e) => setParticipantForm({ ...participantForm, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Equipo o Institución Representada</label>
                  <input
                    type="text"
                    placeholder="Ej. Club Pescadores / Deportivo Centro"
                    value={participantForm.teamOrClub}
                    onChange={(e) => setParticipantForm({ ...participantForm, teamOrClub: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Categoría</label>
                  <input
                    type="text"
                    placeholder="Ej. Libre, Juvenil, Veteranos"
                    value={participantForm.category}
                    onChange={(e) => setParticipantForm({ ...participantForm, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewParticipantModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-semibold shadow-md cursor-pointer"
                >
                  Confirmar Inscripción
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
