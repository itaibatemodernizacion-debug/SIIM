import React from 'react';
import { useMunicipalData } from '../../context/MunicipalDataContext';
import { ITA_IBATE_NEIGHBORHOODS } from '../../data/initialData';
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  TrendingUp, 
  Trophy, 
  Calendar, 
  Building2, 
  MapPin, 
  ArrowUpRight, 
  Filter, 
  RotateCcw,
  AlertTriangle,
  Award,
  Zap,
  Activity
} from 'lucide-react';

export const GeneralDashboard: React.FC<{ 
  onNavigateToTickets: () => void;
  onNavigateToSports: () => void;
  onNavigateToAreas: (deptId?: string) => void;
}> = ({
  onNavigateToTickets,
  onNavigateToSports,
  onNavigateToAreas
}) => {
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
    setSelectedStatus
  } = useMunicipalData();

  // Calculate neighborhood breakdown
  const neighborhoodCounts: Record<string, number> = {};
  filteredTickets.forEach(t => {
    const nh = t.citizenNeighborhood || 'Sin Barrio';
    neighborhoodCounts[nh] = (neighborhoodCounts[nh] || 0) + 1;
  });

  const sortedNeighborhoods = Object.entries(neighborhoodCounts)
    .sort((a, b) => b[1] - a[1]);

  // Ranking of departments by resolution rate
  const sortedDeptsByResolution = [...departmentKPIs]
    .filter(d => d.totalTickets > 0)
    .sort((a, b) => b.resolutionRate - a.resolutionRate);

  // Ranking of departments by total tickets
  const sortedDeptsByVolume = [...departmentKPIs]
    .filter(d => d.totalTickets > 0)
    .sort((a, b) => b.totalTickets - a.totalTickets);

  const resetFilters = () => {
    setSelectedDepartmentId('ALL');
    setSelectedNeighborhood('ALL');
    setSelectedStatus('ALL');
    setDateRange({ start: '', end: '' });
  };

  const hasActiveFilters = selectedDepartmentId !== 'ALL' || selectedNeighborhood !== 'ALL' || selectedStatus !== 'ALL' || dateRange.start || dateRange.end;

  return (
    <div className="space-y-6">
      {/* Page Title & Intro */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Tablero Central de Gestión Municipal
            </h2>
            <span className="px-2 py-0.5 text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-full">
              Itá Ibaté En Cifras
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Consolidado general de atenciones ciudadanas, resolución de reclamos, actividades deportivas y rendimiento sectorial.
          </p>
        </div>

        {/* Quick Resolution Gauge Banner */}
        <div className="flex items-center gap-3 bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800/80">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center">
            <span className="text-sm font-extrabold text-emerald-400">{kpis.resolutionRate}%</span>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Eficacia de Gestión</div>
            <div className="text-xs font-bold text-slate-200">
              {kpis.resolvedTickets} de {kpis.totalTickets} solicitudes resueltas
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-sky-400" />
            <span>FILTROS DE INFORMACIÓN</span>
            {hasActiveFilters && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-bold">
                Filtros activos
              </span>
            )}
          </div>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px] font-medium cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Limpiar filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Department Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Secretaría / Dirección</label>
            <select
              value={selectedDepartmentId}
              onChange={(e) => setSelectedDepartmentId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">Todas las Áreas Municipales</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Neighborhood Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Barrio de Itá Ibaté</label>
            <select
              value={selectedNeighborhood}
              onChange={(e) => setSelectedNeighborhood(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">Todos los Barrios</option>
              {ITA_IBATE_NEIGHBORHOODS.map(nh => (
                <option key={nh} value={nh}>{nh}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Estado de Solicitud</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="SOLUCIONADO">Solucionados ({kpis.resolvedTickets})</option>
              <option value="PENDIENTE">Pendientes ({kpis.pendingTickets})</option>
              <option value="EN_PROCESO">En Proceso ({kpis.inProgressTickets})</option>
            </select>
          </div>

          {/* Date range filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Período (Desde / Hasta)</label>
            <div className="flex gap-1.5">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-1/2 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-200 text-[11px] focus:outline-none focus:border-sky-500"
              />
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-1/2 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-200 text-[11px] focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {/* Atenciones Hoy / Semana / Mes */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Atención Ciudadana</span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
            {kpis.uniqueCitizensAttended}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Ciudadanos únicos atendidos
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Hoy: <strong className="text-sky-300">{kpis.attendedToday}</strong></span>
            <span>Semana: <strong className="text-sky-300">{kpis.attendedWeek}</strong></span>
            <span>Mes: <strong className="text-sky-300">{kpis.attendedMonth}</strong></span>
          </div>
        </div>

        {/* Trámites Resueltos */}
        <div className="bg-slate-900 border border-emerald-900/40 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Solucionados</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl lg:text-3xl font-extrabold text-emerald-400 tracking-tight">
              {kpis.resolvedTickets}
            </div>
            <div className="text-sm font-bold text-emerald-500">
              ({kpis.resolutionRate}%)
            </div>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Trámites con respuesta efectiva
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Tiempo promedio:</span>
            <span className="font-bold text-emerald-300">{kpis.averageResolutionDays} días</span>
          </div>
        </div>

        {/* Trámites Pendientes y Demorados */}
        <div 
          onClick={onNavigateToTickets}
          className="bg-slate-900 border border-amber-900/40 rounded-2xl p-4 shadow-sm relative overflow-hidden cursor-pointer hover:border-amber-600 transition"
        >
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pendientes</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl lg:text-3xl font-extrabold text-amber-400 tracking-tight">
              {kpis.pendingTickets}
            </div>
            <div className="text-sm font-bold text-amber-500">
              ({kpis.pendingRate}%)
            </div>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            En espera de documentación o turno
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Demora &gt; 7 días:</span>
            <span className={`font-bold ${kpis.delayedTicketsCount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
              {kpis.delayedTicketsCount} trámites
            </span>
          </div>
        </div>

        {/* Deportes y Participación Comunitaria */}
        <div 
          onClick={onNavigateToSports}
          className="bg-slate-900 border border-orange-900/40 rounded-2xl p-4 shadow-sm relative overflow-hidden cursor-pointer hover:border-orange-500 transition"
        >
          <div className="flex items-center justify-between text-orange-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Deportes & Eventos</span>
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl lg:text-3xl font-extrabold text-orange-400 tracking-tight">
              {kpis.totalSportParticipants}
            </div>
            <div className="text-xs text-orange-300 font-medium">
              participaciones
            </div>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {kpis.uniqueSportAthletes} deportistas únicos registrados
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Torneos y eventos:</span>
            <span className="font-bold text-orange-300">{kpis.totalSportEvents} realizados</span>
          </div>
        </div>
      </div>

      {/* Progress Bars: Resolution, Pending, In Progress Overview */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-400" />
              Estado Global de Solicitudes Municipales
            </h3>
            <p className="text-xs text-slate-400">
              Distribución porcentual sobre {kpis.totalTickets} gestiones ingresadas
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              Solucionados ({kpis.resolutionRate}%)
            </span>
            <span className="flex items-center gap-1.5 text-sky-400">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
              En Proceso ({kpis.inProgressRate}%)
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              Pendientes ({kpis.pendingRate}%)
            </span>
          </div>
        </div>

        {/* Multi-segment Progress Bar */}
        <div className="w-full h-4 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
          <div 
            style={{ width: `${kpis.resolutionRate}%` }} 
            className="bg-emerald-500 transition-all duration-500 h-full"
            title={`Solucionados: ${kpis.resolutionRate}%`}
          />
          <div 
            style={{ width: `${kpis.inProgressRate}%` }} 
            className="bg-sky-500 transition-all duration-500 h-full"
            title={`En Proceso: ${kpis.inProgressRate}%`}
          />
          <div 
            style={{ width: `${kpis.pendingRate}%` }} 
            className="bg-amber-500 transition-all duration-500 h-full"
            title={`Pendientes: ${kpis.pendingRate}%`}
          />
        </div>
      </div>

      {/* Grid: Sector Performance Ranking & Neighborhoods */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance by Department / Resolution Rate */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              Eficacia de Resolución por Área
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">
              Solucionados / Total
            </span>
          </div>

          <div className="space-y-3">
            {departmentKPIs.map(dept => (
              <div 
                key={dept.departmentId} 
                onClick={() => onNavigateToAreas(dept.departmentId)}
                className="group p-2.5 rounded-xl hover:bg-slate-800/60 transition cursor-pointer border border-transparent hover:border-slate-700/60"
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-bold text-slate-200 group-hover:text-sky-300 transition truncate">
                      {dept.departmentName}
                    </span>
                    {dept.isInactiveWarning && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-600/40">
                        Sin carga reciente
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-slate-400">
                      {dept.resolvedTickets} / {dept.totalTickets}
                    </span>
                    <span className="font-extrabold text-xs text-emerald-400 w-10 text-right">
                      {dept.resolutionRate}%
                    </span>
                  </div>
                </div>

                {/* Micro Bar */}
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800/80">
                  <div 
                    style={{ width: `${dept.resolutionRate}%` }} 
                    className={`h-full rounded-full transition-all duration-500 ${
                      dept.resolutionRate >= 75 ? 'bg-emerald-500' : dept.resolutionRate >= 40 ? 'bg-sky-500' : 'bg-amber-500'
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Neighborhood Distribution (Barrios de Itá Ibaté) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-sky-400" />
              Atenciones por Barrio de Itá Ibaté
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">
              Concentración de reclamos
            </span>
          </div>

          <div className="space-y-3">
            {sortedNeighborhoods.map(([neighborhood, count]) => {
              const maxCount = sortedNeighborhoods[0] ? sortedNeighborhoods[0][1] : 1;
              const percentage = Math.round((count / (filteredTickets.length || 1)) * 100);

              return (
                <div key={neighborhood} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-300">{neighborhood}</span>
                    <span className="text-slate-400 font-semibold">
                      {count} solicitudes <span className="text-slate-500 font-normal">({percentage}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      style={{ width: `${(count / maxCount) * 100}%` }}
                      className="h-full bg-gradient-to-r from-sky-500 to-blue-600 rounded-full transition-all duration-500"
                    />
                  </div>
                </div>
              );
            })}

            {sortedNeighborhoods.length === 0 && (
              <div className="text-center py-6 text-slate-500 text-xs">
                No se registraron atenciones con los filtros actuales.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Activity Ranking by Volume of Citizen Attention */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-sky-400" />
              Volumen de Carga y Atención por Dependencia
            </h3>
            <p className="text-xs text-slate-400">
              Identificación de áreas con mayor flujo de ciudadanos y estado de actualización
            </p>
          </div>
          <button
            onClick={() => onNavigateToAreas()}
            className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer self-start sm:self-auto"
          >
            Ver detalle por Secretaría
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[11px]">
                <th className="py-2.5 px-3">Área Municipal</th>
                <th className="py-2.5 px-3">Responsable</th>
                <th className="py-2.5 px-3 text-center">Atendidos Hoy</th>
                <th className="py-2.5 px-3 text-center">Mes Actual</th>
                <th className="py-2.5 px-3 text-center">Total Solicitudes</th>
                <th className="py-2.5 px-3 text-center">Tasa Resolución</th>
                <th className="py-2.5 px-3 text-right">Última Carga</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sortedDeptsByVolume.map(d => (
                <tr key={d.departmentId} className="hover:bg-slate-800/40 transition">
                  <td className="py-2.5 px-3 font-semibold text-slate-200">
                    {d.departmentName}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">
                    {d.leaderName}
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold text-sky-300">
                    {d.attendedToday}
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-300 font-medium">
                    {d.attendedMonth}
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold text-slate-200">
                    {d.totalTickets}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded font-bold text-[11px] ${
                      d.resolutionRate >= 70 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                        : d.resolutionRate >= 40 
                          ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    }`}>
                      {d.resolutionRate}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-400">
                    {d.lastActivityDate ? (
                      <span className={d.daysSinceLastActivity > 3 ? 'text-amber-400 font-medium' : 'text-slate-300'}>
                        {d.lastActivityDate} {d.daysSinceLastActivity > 3 ? `(hace ${d.daysSinceLastActivity}d)` : '(al día)'}
                      </span>
                    ) : (
                      <span className="text-slate-500">Sin registros</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
