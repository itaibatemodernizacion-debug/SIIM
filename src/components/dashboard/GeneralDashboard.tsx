import React, { useState } from 'react';
import {
  useMunicipalData,
  OFFICIAL_MUNICIPAL_DRIVE_URL
} from '../../context/MunicipalDataContext';
import { ITA_IBATE_NEIGHBORHOODS } from '../../data/initialData';
import { ActiveTab } from '../Sidebar';
import {
  Users,
  CheckCircle2,
  Clock,
  Trophy,
  Building2,
  MapPin,
  Filter,
  RotateCcw,
  AlertTriangle,
  Trash2,
  RefreshCw,
  ExternalLink,
  Cloud,
  X,
  FileText,
  Shield,
  GraduationCap,
  ChefHat,
  IdCard,
  DollarSign,
  FileSpreadsheet,
  BarChart3,
  Settings,
  ChevronRight
} from 'lucide-react';
import { EmptyDatabaseModal } from '../common/EmptyDatabaseModal';

export const GeneralDashboard: React.FC<{
  onNavigateToTickets: () => void;
  onNavigateToSports: () => void;
  onNavigateToAreas: (deptId?: string) => void;
  onNavigateToDrive?: () => void;
  onNavigateTab?: (tab: ActiveTab) => void;
}> = ({
  onNavigateToTickets,
  onNavigateToSports,
  onNavigateToAreas,
  onNavigateToDrive,
  onNavigateTab
}) => {
  const [showEmptyDbModal, setShowEmptyDbModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const {
    kpis,
    departmentKPIs,
    departments,
    filteredTickets,
    dateRange,
    setDateRange,
    selectedDepartmentId,
    setSelectedDepartmentId,
    selectedNeighborhood,
    setSelectedNeighborhood,
    selectedStatus,
    setSelectedStatus,
    isDriveSyncing,
    driveSyncProgress,
    driveSyncError,
    lastDriveSyncInfo,
    syncFromOfficialDrive,
    clearDriveSyncError,
    urbanControlKPIs,
    employeeKPIs,
    culturalKPIs,
    escuelaEmpresaKPIs,
    financialKPIs
  } = useMunicipalData();

  const formattedLastDriveSync = lastDriveSyncInfo?.timestamp
    ? new Date(lastDriveSyncInfo.timestamp).toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    : null;

  const neighborhoodCounts: Record<string, number> = {};
  filteredTickets.forEach(t => {
    const nh = t.citizenNeighborhood || 'Sin Barrio';
    neighborhoodCounts[nh] = (neighborhoodCounts[nh] || 0) + 1;
  });

  const sortedNeighborhoods = Object.entries(neighborhoodCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const activeDepartmentKPIs = [...departmentKPIs]
    .filter(d => d.totalTickets > 0)
    .sort((a, b) => b.totalTickets - a.totalTickets);

  const resetFilters = () => {
    setSelectedDepartmentId('ALL');
    setSelectedNeighborhood('ALL');
    setSelectedStatus('ALL');
    setDateRange({ start: '', end: '' });
  };

  const hasActiveFilters =
    selectedDepartmentId !== 'ALL' ||
    selectedNeighborhood !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    Boolean(dateRange.start) ||
    Boolean(dateRange.end);

  const quickModules: {
    tab: ActiveTab;
    label: string;
    icon: React.ElementType;
    color: string;
    value?: string | number;
  }[] = [
    { tab: 'TICKETS', label: 'Trámites', icon: FileText, color: 'text-amber-400 bg-amber-500/10', value: kpis.totalTickets },
    { tab: 'CITIZENS', label: 'Vecinos', icon: Users, color: 'text-sky-400 bg-sky-500/10', value: kpis.totalCitizens },
    { tab: 'CONTROL_URBANO', label: 'Control Vial', icon: Shield, color: 'text-cyan-400 bg-cyan-500/10', value: urbanControlKPIs.totalLicenses },
    { tab: 'SPORTS', label: 'Deportes', icon: Trophy, color: 'text-orange-400 bg-orange-500/10', value: kpis.totalSportParticipants },
    { tab: 'CULTURE', label: 'Cultura', icon: GraduationCap, color: 'text-pink-400 bg-pink-500/10', value: culturalKPIs.totalStudents },
    { tab: 'ESCUELA_EMPRESA', label: 'Esc. Empresa', icon: ChefHat, color: 'text-amber-300 bg-amber-500/10', value: escuelaEmpresaKPIs.totalStudents },
    { tab: 'RRHH', label: 'RRHH', icon: IdCard, color: 'text-blue-400 bg-blue-500/10', value: employeeKPIs.totalEmployees },
    { tab: 'FUNDS', label: 'Fondos', icon: DollarSign, color: 'text-emerald-400 bg-emerald-500/10', value: financialKPIs.departmentsWithPendingSettlements || 0 },
    { tab: 'AREAS', label: 'Áreas', icon: Building2, color: 'text-indigo-400 bg-indigo-500/10', value: departments.filter(d => d.active).length },
    { tab: 'DRIVE_SYNC', label: 'Drive', icon: FileSpreadsheet, color: 'text-emerald-400 bg-emerald-500/10', value: lastDriveSyncInfo?.filesImported || '' },
    { tab: 'REPORTS', label: 'Informes', icon: BarChart3, color: 'text-violet-400 bg-violet-500/10' },
    { tab: 'ADMIN', label: 'Admin', icon: Settings, color: 'text-slate-300 bg-slate-700/40' }
  ];

  const handleModuleClick = (tab: ActiveTab) => {
    if (onNavigateTab) {
      onNavigateTab(tab);
      return;
    }
    if (tab === 'TICKETS') onNavigateToTickets();
    else if (tab === 'SPORTS') onNavigateToSports();
    else if (tab === 'AREAS') onNavigateToAreas();
    else if (tab === 'DRIVE_SYNC' && onNavigateToDrive) onNavigateToDrive();
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Compact Top Control Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            Resumen Municipal
          </h2>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400 mt-0.5">
            <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
              <Cloud className="w-3.5 h-3.5" />
              {lastDriveSyncInfo?.folderName || 'Sistema de Gestión'}
            </span>
            {lastDriveSyncInfo && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums text-slate-300">
                  {lastDriveSyncInfo.filesImported} Excel · {lastDriveSyncInfo.totalRecords} reg.
                </span>
              </>
            )}
            {formattedLastDriveSync && (
              <>
                <span aria-hidden="true">·</span>
                <span>{formattedLastDriveSync}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => syncFromOfficialDrive({ replaceExisting: true })}
            disabled={isDriveSyncing}
            className="min-h-[42px] px-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60 whitespace-nowrap"
          >
            <RefreshCw className={`w-4 h-4 ${isDriveSyncing ? 'animate-spin' : ''}`} />
            <span>{isDriveSyncing ? 'Actualizando...' : 'Actualizar'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowFilters(prev => !prev)}
            className={`min-h-[42px] min-w-[42px] px-3 rounded-xl border text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              showFilters || hasActiveFilters
                ? 'bg-sky-600/20 border-sky-500 text-sky-300'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
            title="Filtrar datos"
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filtros</span>
          </button>

          <a
            href={OFFICIAL_MUNICIPAL_DRIVE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[42px] min-w-[42px] rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-sky-400 flex items-center justify-center transition"
            title="Abrir carpeta en Google Drive"
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          <button
            type="button"
            onClick={() => setShowEmptyDbModal(true)}
            className="min-h-[42px] min-w-[42px] rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-500/50 hover:text-rose-400 text-slate-400 flex items-center justify-center transition cursor-pointer"
            title="Vaciar datos operativos"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Live Sync Progress / Error inline feedback */}
      {isDriveSyncing && driveSyncProgress && (
        <div className="bg-emerald-950/50 border border-emerald-500/30 rounded-xl px-3.5 py-2.5 text-xs text-emerald-200 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin shrink-0" />
          <span className="truncate">{driveSyncProgress}</span>
        </div>
      )}

      {driveSyncError && (
        <div className="bg-rose-950/60 border border-rose-500/40 rounded-xl px-3.5 py-2.5 text-xs text-rose-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="truncate">{driveSyncError}</span>
          </div>
          <button
            type="button"
            onClick={clearDriveSyncError}
            className="text-rose-300 hover:text-white p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <EmptyDatabaseModal
        isOpen={showEmptyDbModal}
        onClose={() => setShowEmptyDbModal(false)}
        onGoToDrive={onNavigateToDrive}
      />

      {/* Collapsible Filter Drawer */}
      {showFilters && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200">Filtros</span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Limpiar
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
            <select
              value={selectedDepartmentId}
              onChange={(e) => setSelectedDepartmentId(e.target.value)}
              className="w-full min-h-[42px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">Todas las Áreas</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.shortName || d.name}</option>
              ))}
            </select>

            <select
              value={selectedNeighborhood}
              onChange={(e) => setSelectedNeighborhood(e.target.value)}
              className="w-full min-h-[42px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">Todos los Barrios</option>
              {ITA_IBATE_NEIGHBORHOODS.map(nh => (
                <option key={nh} value={nh}>{nh}</option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full min-h-[42px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="SOLUCIONADO">Resueltos ({kpis.resolvedTickets})</option>
              <option value="PENDIENTE">Pendientes ({kpis.pendingTickets})</option>
              <option value="EN_PROCESO">En Proceso ({kpis.inProgressTickets})</option>
            </select>

            <div className="flex gap-1.5">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-1/2 min-h-[42px] bg-slate-950 border border-slate-800 rounded-xl px-2 text-slate-200 text-[11px] focus:outline-none focus:border-sky-500"
              />
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-1/2 min-h-[42px] bg-slate-950 border border-slate-800 rounded-xl px-2 text-slate-200 text-[11px] focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* 4 Primary Icon-Driven KPI Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Vecinos</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tabular-nums">
            {kpis.uniqueCitizensAttended}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono tabular-nums">
            Hoy {kpis.attendedToday} · Mes {kpis.attendedMonth}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Resueltos</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono tabular-nums">
              {kpis.resolvedTickets}
            </span>
            <span className="text-xs font-bold text-emerald-500 font-mono tabular-nums">
              {kpis.resolutionRate}%
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono tabular-nums">
            Prom. {kpis.averageResolutionDays} días
          </div>
        </div>

        <button
          type="button"
          onClick={onNavigateToTickets}
          className="text-left bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-3.5 sm:p-4 transition cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Pendientes</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono tabular-nums">
              {kpis.pendingTickets}
            </span>
            <span className="text-xs font-bold text-amber-500 font-mono tabular-nums">
              {kpis.pendingRate}%
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono tabular-nums">
            &gt;7d: {kpis.delayedTicketsCount}
          </div>
        </button>

        <button
          type="button"
          onClick={onNavigateToSports}
          className="text-left bg-slate-900 border border-slate-800 hover:border-orange-500/50 rounded-2xl p-3.5 sm:p-4 transition cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Deportes</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-orange-400 font-mono tabular-nums">
            {kpis.totalSportParticipants}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono tabular-nums">
            {kpis.totalSportEvents} eventos
          </div>
        </button>
      </div>

      {/* Visual Icon Quick-Launcher Grid (Ideal for Mobile & Fast Access) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-200">Accesos Rápidos</h3>
          <span className="text-[11px] text-slate-400 font-mono tabular-nums">
            {kpis.totalTickets} gestiones
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {quickModules.map(mod => {
            const Icon = mod.icon;
            return (
              <button
                key={mod.tab}
                type="button"
                onClick={() => handleModuleClick(mod.tab)}
                className="min-h-[76px] p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800/80 active:scale-95 border border-slate-800/90 flex flex-col items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${mod.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold text-slate-200 text-center leading-tight">
                  {mod.label}
                </span>
                {mod.value !== undefined && mod.value !== '' && (
                  <span className="text-[10px] font-mono tabular-nums text-slate-400">
                    {mod.value}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Compact Global Progress Strip */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-bold text-white">Estado General</span>
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono tabular-nums">
            <span className="text-emerald-400">Resueltos {kpis.resolutionRate}%</span>
            <span className="text-sky-400">Proceso {kpis.inProgressRate}%</span>
            <span className="text-amber-400">Pendientes {kpis.pendingRate}%</span>
          </div>
        </div>
        <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
          <div style={{ width: `${kpis.resolutionRate}%` }} className="bg-emerald-500 h-full transition-all" />
          <div style={{ width: `${kpis.inProgressRate}%` }} className="bg-sky-500 h-full transition-all" />
          <div style={{ width: `${kpis.pendingRate}%` }} className="bg-amber-500 h-full transition-all" />
        </div>
      </div>

      {/* 2-Column Visual Lists: Areas & Neighborhoods */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Areas */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-sky-400" />
              <span>Áreas con Actividad</span>
            </h3>
            <button
              type="button"
              onClick={() => onNavigateToAreas()}
              className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-0.5 cursor-pointer"
            >
              <span>Ver todas</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {(activeDepartmentKPIs.length > 0 ? activeDepartmentKPIs : departmentKPIs.slice(0, 6)).map(dept => (
              <button
                key={dept.departmentId}
                type="button"
                onClick={() => onNavigateToAreas(dept.departmentId)}
                className="w-full text-left p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/70 transition cursor-pointer space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-200 truncate">{dept.departmentName}</div>
                    <div className="text-[11px] text-slate-400 truncate">{dept.leaderName}</div>
                  </div>
                  <div className="text-right shrink-0 font-mono tabular-nums">
                    <div className="text-xs font-bold text-emerald-400">{dept.resolutionRate}%</div>
                    <div className="text-[10px] text-slate-400">
                      {dept.resolvedTickets}/{dept.totalTickets}
                    </div>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${dept.resolutionRate}%` }}
                    className={`h-full rounded-full ${
                      dept.resolutionRate >= 75
                        ? 'bg-emerald-500'
                        : dept.resolutionRate >= 40
                          ? 'bg-sky-500'
                          : 'bg-amber-500'
                    }`}
                  />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Neighborhoods */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-sky-400" />
              <span>Barrios</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-mono tabular-nums">
              {sortedNeighborhoods.length} activos
            </span>
          </div>

          <div className="space-y-2.5">
            {sortedNeighborhoods.map(([neighborhood, count]) => {
              const maxCount = sortedNeighborhoods[0] ? sortedNeighborhoods[0][1] : 1;
              return (
                <div key={neighborhood} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-200 truncate">{neighborhood}</span>
                    <span className="font-mono tabular-nums text-slate-300 font-semibold shrink-0">
                      {count}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${(count / maxCount) * 100}%` }}
                      className="h-full bg-sky-500 rounded-full"
                    />
                  </div>
                </div>
              );
            })}

            {sortedNeighborhoods.length === 0 && (
              <div className="text-center py-8 text-slate-500 text-xs">
                Sin atenciones registradas con los filtros actuales.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
