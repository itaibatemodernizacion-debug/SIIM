import React, { useState } from 'react';
import { useMunicipalData } from '../../context/MunicipalDataContext';
import { useAuth } from '../../context/AuthContext';
import { ITA_IBATE_NEIGHBORHOODS } from '../../data/initialData';
import { 
  BarChart3, 
  Printer, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Building2, 
  Calendar, 
  Filter, 
  CheckCircle2, 
  Clock, 
  Users, 
  Trophy,
  Award,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { 
  exportTicketsToExcel, 
  exportCitizensToExcel, 
  exportSportsToExcel, 
  exportSummaryCSV,
  exportFinancialBalanceToExcel,
  exportExpensesToExcel
} from '../../lib/excelUtils';

export const ReportsCenter: React.FC = () => {
  const { 
    departments, 
    tickets, 
    citizens, 
    sportsParticipants, 
    departmentKPIs, 
    kpis,
    departmentBalances,
    financialKPIs,
    expenses
  } = useMunicipalData();

  const { currentUser, maskSensitiveData } = useAuth();

  const [reportType, setReportType] = useState<
    | 'GENERAL' 
    | 'DEPARTMENT' 
    | 'CITIZENS' 
    | 'RESOLVED' 
    | 'PENDING' 
    | 'SPORTS'
    | 'FUNDS'
  >('GENERAL');

  const [selectedDeptId, setSelectedDeptId] = useState('ALL');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Compute filtered items for report
  const reportTickets = tickets.filter(t => {
    if (selectedDeptId !== 'ALL' && t.departmentId !== selectedDeptId) return false;
    if (reportType === 'RESOLVED' && !t.isResolved) return false;
    if (reportType === 'PENDING' && t.isResolved) return false;
    if (filterStartDate && t.startDate < filterStartDate) return false;
    if (filterEndDate && t.startDate > filterEndDate) return false;
    return true;
  });

  const reportExpenses = expenses.filter(e => {
    if (selectedDeptId !== 'ALL' && e.departmentId !== selectedDeptId) return false;
    if (filterStartDate && e.expenseDate < filterStartDate) return false;
    if (filterEndDate && e.expenseDate > filterEndDate) return false;
    return true;
  });

  const targetDept = departments.find(d => d.id === selectedDeptId);

  // Calculations for current report slice
  const totalInReport = reportTickets.length;
  const resolvedInReport = reportTickets.filter(t => t.isResolved).length;
  const pendingInReport = reportTickets.filter(t => !t.isResolved).length;
  const resolutionRateInReport = totalInReport > 0 ? Math.round((resolvedInReport / totalInReport) * 100) : 0;
  const uniqueCitizensInReport = new Set(reportTickets.map(t => t.citizenDni)).size;

  // Handle Export to Excel
  const handleExportExcel = () => {
    if (reportType === 'CITIZENS') {
      exportCitizensToExcel(citizens);
    } else if (reportType === 'SPORTS') {
      exportSportsToExcel(sportsParticipants);
    } else if (reportType === 'FUNDS') {
      exportFinancialBalanceToExcel(departmentBalances);
      exportExpensesToExcel(reportExpenses, targetDept?.name);
    } else {
      exportTicketsToExcel(reportTickets, targetDept?.shortName);
    }
  };

  // Handle Export to CSV
  const handleExportCSV = () => {
    if (reportType === 'FUNDS') {
      const summaryData = {
        'Municipio': 'Municipalidad de Itá Ibaté - Corrientes',
        'Fecha Emisión': new Date().toLocaleDateString('es-AR'),
        'Tipo Informe': 'Control de Fondos y Rendiciones',
        'Total Fondos Asignados ($)': financialKPIs.totalDelivered,
        'Total Gastos ($)': financialKPIs.totalExpenses,
        'Saldo Disponible ($)': financialKPIs.totalAvailable,
        'Gastos Aprobados ($)': financialKPIs.totalSettlementApproved,
        'Gastos Observados ($)': financialKPIs.totalSettlementObserved,
        'Tasa de Ejecución (%)': `${financialKPIs.globalExecutionRate}%`,
        'Tasa de Rendición (%)': `${financialKPIs.globalSettlementRate}%`,
        'Emitido Por': currentUser?.name || 'Personal Municipal'
      };
      exportSummaryCSV(summaryData, `Informe_Financiero_ItaIbate_${new Date().toISOString().split('T')[0]}`);
      return;
    }

    const summaryData = {
      'Municipio': 'Municipalidad de Itá Ibaté - Corrientes',
      'Fecha Emisión': new Date().toLocaleDateString('es-AR'),
      'Tipo Informe': reportType,
      'Área Seleccionada': targetDept?.name || 'Todas las Áreas',
      'Total Gestiones': totalInReport,
      'Gestiones Resueltas': resolvedInReport,
      'Gestiones Pendientes': pendingInReport,
      'Tasa de Resolución (%)': `${resolutionRateInReport}%`,
      'Ciudadanos Únicos': uniqueCitizensInReport,
      'Emitido Por': currentUser?.name || 'Personal Municipal'
    };
    exportSummaryCSV(summaryData, `Informe_Municipal_ItaIbate_${reportType}_${new Date().toISOString().split('T')[0]}`);
  };

  // Trigger Print dialog
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Title & Introduction */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Centro de Informes y Estadísticas Oficiales
            </h2>
            <span className="px-2 py-0.5 text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-full">
              Exportación Ejecutiva
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Genere reportes ejecutivos consolidados en Excel (.xlsx), CSV y vistas impresas oficiales en PDF para el Intendente y funcionarios.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Descargar Excel (.xlsx)</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-sky-400" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>

          <button
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-md transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Vista Oficial / Imprimir PDF</span>
          </button>
        </div>
      </div>

      {/* Report Configuration & Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
          <Filter className="w-4 h-4 text-sky-400" />
          Parámetros del Informe
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Report Type Selector */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">Tipo de Informe</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
            >
              <option value="GENERAL">Informe General Municipal (Consolidado)</option>
              <option value="FUNDS">Control de Fondos y Rendición de Cuentas</option>
              <option value="DEPARTMENT">Informe Individual por Área</option>
              <option value="RESOLVED">Informe de Solicitudes Resueltas</option>
              <option value="PENDING">Informe de Solicitudes Pendientes</option>
              <option value="CITIZENS">Informe de Ciudadanos Atendidos</option>
              <option value="SPORTS">Informe de Deportes y Participación</option>
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">Dependencia Municipal</label>
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">Todas las Secretarías y Direcciones</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Date from */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">Fecha Desde</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Date to */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">Fecha Hasta</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>
      </div>

      {/* Summary KPI Badges for this report */}
      {reportType === 'FUNDS' ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="text-xs uppercase font-semibold text-slate-400">Fondos Entregados</div>
            <div className="text-2xl font-extrabold text-white mt-1">
              ${financialKPIs.totalDelivered.toLocaleString('es-AR')}
            </div>
            <div className="text-[11px] text-slate-500">asignados a sectores</div>
          </div>

          <div className="bg-slate-900 border border-rose-900/40 rounded-2xl p-4">
            <div className="text-xs uppercase font-semibold text-slate-400">Total Gastos</div>
            <div className="text-2xl font-extrabold text-rose-400 mt-1">
              ${financialKPIs.totalExpenses.toLocaleString('es-AR')}
            </div>
            <div className="text-[11px] text-rose-400/80 font-medium">{financialKPIs.globalExecutionRate}% ejecutado</div>
          </div>

          <div className="bg-slate-900 border border-emerald-900/40 rounded-2xl p-4">
            <div className="text-xs uppercase font-semibold text-slate-400">Saldo Disponible</div>
            <div className="text-2xl font-extrabold text-emerald-400 mt-1">
              ${financialKPIs.totalAvailable.toLocaleString('es-AR')}
            </div>
            <div className="text-[11px] text-emerald-400/80 font-medium">fondos sin gastar</div>
          </div>

          <div className="bg-slate-900 border border-sky-900/40 rounded-2xl p-4">
            <div className="text-xs uppercase font-semibold text-slate-400">Rendición Aprobada</div>
            <div className="text-2xl font-extrabold text-sky-400 mt-1">
              ${financialKPIs.totalSettlementApproved.toLocaleString('es-AR')}
            </div>
            <div className="text-[11px] text-sky-400/80 font-medium">{financialKPIs.globalSettlementRate}% auditado OK</div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="text-xs uppercase font-semibold text-slate-400">Total Solicitudes</div>
            <div className="text-2xl font-extrabold text-white mt-1">{totalInReport}</div>
            <div className="text-[11px] text-slate-500">en el período seleccionado</div>
          </div>

          <div className="bg-slate-900 border border-emerald-900/40 rounded-2xl p-4">
            <div className="text-xs uppercase font-semibold text-slate-400">Solucionadas</div>
            <div className="text-2xl font-extrabold text-emerald-400 mt-1">{resolvedInReport}</div>
            <div className="text-[11px] text-emerald-400/80 font-medium">{resolutionRateInReport}% de resolución</div>
          </div>

          <div className="bg-slate-900 border border-amber-900/40 rounded-2xl p-4">
            <div className="text-xs uppercase font-semibold text-slate-400">Pendientes</div>
            <div className="text-2xl font-extrabold text-amber-400 mt-1">{pendingInReport}</div>
            <div className="text-[11px] text-amber-400/80 font-medium">{100 - resolutionRateInReport}% en curso / espera</div>
          </div>

          <div className="bg-slate-900 border border-sky-900/40 rounded-2xl p-4">
            <div className="text-xs uppercase font-semibold text-slate-400">Ciudadanos Únicos</div>
            <div className="text-2xl font-extrabold text-sky-400 mt-1">{uniqueCitizensInReport}</div>
            <div className="text-[11px] text-slate-500">vecinos atendidos</div>
          </div>
        </div>
      )}

      {/* Summary Table Preview */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h3 className="font-bold text-white text-sm">
            {reportType === 'FUNDS' 
              ? `Detalle de Gastos y Rendiciones de Fondos (${reportExpenses.length})` 
              : `Detalle de Registros Incluidos (${reportTickets.length})`}
          </h3>
          <span className="text-xs text-slate-400">
            Vista previa del informe seleccionado
          </span>
        </div>

        {reportType === 'FUNDS' ? (
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 uppercase text-[11px] font-semibold">
                  <th className="py-2.5 px-3">Código</th>
                  <th className="py-2.5 px-3">Fecha</th>
                  <th className="py-2.5 px-3">Área</th>
                  <th className="py-2.5 px-3">Concepto</th>
                  <th className="py-2.5 px-3">Categoría</th>
                  <th className="py-2.5 px-3">Proveedor</th>
                  <th className="py-2.5 px-3 text-right">Importe</th>
                  <th className="py-2.5 px-3 text-center">Estado Rendición</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {reportExpenses.map(e => {
                  const dept = departments.find(d => d.id === e.departmentId);
                  return (
                    <tr key={e.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-3 font-mono font-bold text-sky-400">
                        {e.expenseCode}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">{e.expenseDate}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-300">
                        {dept?.shortName || e.departmentId}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-200">{e.concept}</td>
                      <td className="py-2.5 px-3 text-slate-400">{e.category}</td>
                      <td className="py-2.5 px-3 text-slate-300">{e.supplierName}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                        ${e.amount.toLocaleString('es-AR')}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                          e.settlementStatus === 'APROBADA'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : e.settlementStatus === 'OBSERVADA'
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-amber-500/10 text-amber-300'
                        }`}>
                          {e.settlementStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 uppercase text-[11px] font-semibold">
                  <th className="py-2.5 px-3">Código</th>
                  <th className="py-2.5 px-3">Ciudadano</th>
                  <th className="py-2.5 px-3">Barrio</th>
                  <th className="py-2.5 px-3">Área</th>
                  <th className="py-2.5 px-3">Trámite</th>
                  <th className="py-2.5 px-3">Fecha Inicio</th>
                  <th className="py-2.5 px-3 text-center">Estado</th>
                  <th className="py-2.5 px-3 text-center">Resuelto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {reportTickets.map(t => {
                  const dept = departments.find(d => d.id === t.departmentId);
                  return (
                    <tr key={t.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-3 font-mono font-bold text-sky-400">
                        {t.ticketCode}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-200">
                        {t.citizenName}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {t.citizenNeighborhood}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {dept?.shortName || t.departmentId}
                      </td>
                      <td className="py-2.5 px-3 text-slate-200">
                        {t.requestType}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {t.startDate}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                          {t.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          t.isResolved ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {t.isResolved ? 'SÍ' : 'NO'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Printable / PDF Official Executive Sheet Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl max-w-4xl w-full p-8 shadow-2xl space-y-6 my-8 print:m-0 print:p-4 print:shadow-none print:w-full">
            {/* Action Bar (hidden in print) */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 print:hidden">
              <span className="font-bold text-slate-700 text-sm">
                Documento Oficial de Gestión Municipal • Listo para Imprimir / Guardar como PDF
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir Documento
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-semibold text-xs cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>

            {/* Official Municipal Letterhead */}
            <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-blue-900 flex items-center justify-center text-white font-bold text-xl shadow">
                  MII
                </div>
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none uppercase">
                    MUNICIPALIDAD DE ITÁ IBATÉ
                  </h1>
                  <p className="text-xs font-semibold text-blue-900 uppercase tracking-widest mt-1">
                    PROVINCIA DE CORRIENTES • REPÚBLICA ARGENTINA
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Sistema Integral de Monitoreo y Gestión Municipal (SIMM)
                  </p>
                </div>
              </div>

              <div className="text-right text-xs text-slate-600 space-y-0.5">
                <div>Fecha de Emisión: <strong>{new Date().toLocaleDateString('es-AR')}</strong></div>
                <div>Expediente: <strong>SIMM-{reportType === 'FUNDS' ? 'FON' : 'REP'}-{new Date().getFullYear()}</strong></div>
                <div>Responsable Emisor: <strong>{currentUser?.name || 'Administración'}</strong></div>
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center py-2">
              <h2 className="text-lg font-extrabold text-slate-900 uppercase tracking-tight">
                {reportType === 'FUNDS'
                  ? 'ESTADO DE EJECUCIÓN PRESUPUESTARIA Y RENDICIÓN DE FONDOS'
                  : 'INFORME EJECUTIVO DE GESTIÓN Y ATENCIÓN CIUDADANA'}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Área: <strong>{targetDept?.name || 'Consolidado General de Todas las Áreas Municipales'}</strong>
                {filterStartDate ? ` • Período: ${filterStartDate} al ${filterEndDate || 'presente'}` : ''}
              </p>
            </div>

            {/* Consolidated Indicators Summary Table */}
            {reportType === 'FUNDS' ? (
              <div className="grid grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                <div>
                  <div className="text-[11px] font-bold text-slate-600 uppercase">Fondos Entregados</div>
                  <div className="text-xl font-black text-slate-900">${financialKPIs.totalDelivered.toLocaleString('es-AR')}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-rose-700 uppercase">Total Gastos</div>
                  <div className="text-xl font-black text-rose-700">${financialKPIs.totalExpenses.toLocaleString('es-AR')}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-emerald-700 uppercase">Saldo Disponible</div>
                  <div className="text-xl font-black text-emerald-700">${financialKPIs.totalAvailable.toLocaleString('es-AR')}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-blue-800 uppercase">% Rendición Aprobada</div>
                  <div className="text-xl font-black text-blue-800">{financialKPIs.globalSettlementRate}%</div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                <div>
                  <div className="text-[11px] font-bold text-slate-600 uppercase">Total Solicitudes</div>
                  <div className="text-2xl font-black text-slate-900">{totalInReport}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-emerald-700 uppercase">Trámites Resueltos</div>
                  <div className="text-2xl font-black text-emerald-700">{resolvedInReport}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-amber-700 uppercase">Trámites Pendientes</div>
                  <div className="text-2xl font-black text-amber-700">{pendingInReport}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-blue-800 uppercase">Tasa de Resolución</div>
                  <div className="text-2xl font-black text-blue-800">{resolutionRateInReport}%</div>
                </div>
              </div>
            )}

            {/* Performance Ranking by Area (if general report) */}
            {selectedDeptId === 'ALL' && reportType !== 'FUNDS' && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
                  Rendimiento por Dependencia Municipal
                </h3>
                <table className="w-full text-left text-xs border border-slate-200">
                  <thead className="bg-slate-100 text-slate-700 uppercase text-[10px]">
                    <tr>
                      <th className="p-2 border-b border-slate-200">Área</th>
                      <th className="p-2 border-b border-slate-200">Titular</th>
                      <th className="p-2 border-b border-slate-200 text-center">Gestiones</th>
                      <th className="p-2 border-b border-slate-200 text-center">Resueltas</th>
                      <th className="p-2 border-b border-slate-200 text-center">% Eficacia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {departmentKPIs.map(d => (
                      <tr key={d.departmentId}>
                        <td className="p-2 font-semibold text-slate-800">{d.departmentName}</td>
                        <td className="p-2 text-slate-600">{d.leaderName}</td>
                        <td className="p-2 text-center font-bold">{d.totalTickets}</td>
                        <td className="p-2 text-center text-emerald-700 font-bold">{d.resolvedTickets}</td>
                        <td className="p-2 text-center font-black text-blue-900">{d.resolutionRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Balance by Area if FUNDS and ALL */}
            {reportType === 'FUNDS' && selectedDeptId === 'ALL' && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
                  Consolidado de Fondos por Área
                </h3>
                <table className="w-full text-left text-xs border border-slate-200">
                  <thead className="bg-slate-100 text-slate-700 uppercase text-[10px]">
                    <tr>
                      <th className="p-2 border-b border-slate-200">Dependencia</th>
                      <th className="p-2 border-b border-slate-200 text-right">Entregado</th>
                      <th className="p-2 border-b border-slate-200 text-right">Gastado</th>
                      <th className="p-2 border-b border-slate-200 text-right">Saldo Disp.</th>
                      <th className="p-2 border-b border-slate-200 text-center">% Ejec.</th>
                      <th className="p-2 border-b border-slate-200 text-center">% Rend.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    {departmentBalances.map(b => (
                      <tr key={b.departmentId}>
                        <td className="p-2 font-sans font-semibold text-slate-800">{b.departmentName}</td>
                        <td className="p-2 text-right">${b.totalDelivered.toLocaleString('es-AR')}</td>
                        <td className="p-2 text-right text-rose-700 font-bold">${b.totalExpenses.toLocaleString('es-AR')}</td>
                        <td className="p-2 text-right text-emerald-700 font-bold">${b.availableBalance.toLocaleString('es-AR')}</td>
                        <td className="p-2 text-center text-slate-700">{b.executionRate}%</td>
                        <td className="p-2 text-center text-blue-900 font-bold">{b.settlementRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Detailed Sample List */}
            {reportType === 'FUNDS' ? (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
                  Detalle de Comprobantes y Rendiciones de Gastos ({reportExpenses.length})
                </h3>
                <table className="w-full text-left text-xs border border-slate-200">
                  <thead className="bg-slate-100 text-slate-700 uppercase text-[10px]">
                    <tr>
                      <th className="p-2 border-b border-slate-200">Comprobante</th>
                      <th className="p-2 border-b border-slate-200">Fecha</th>
                      <th className="p-2 border-b border-slate-200">Concepto</th>
                      <th className="p-2 border-b border-slate-200">Proveedor</th>
                      <th className="p-2 border-b border-slate-200 text-right">Importe</th>
                      <th className="p-2 border-b border-slate-200 text-center">Auditoría</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {reportExpenses.slice(0, 15).map(e => (
                      <tr key={e.id}>
                        <td className="p-2 font-mono font-bold text-blue-900">{e.expenseCode}</td>
                        <td className="p-2 text-slate-600">{e.expenseDate}</td>
                        <td className="p-2 font-semibold text-slate-800">{e.concept}</td>
                        <td className="p-2 text-slate-700">{e.supplierName}</td>
                        <td className="p-2 text-right font-mono font-bold text-slate-900">${e.amount.toLocaleString('es-AR')}</td>
                        <td className="p-2 text-center font-bold">
                          {e.settlementStatus}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {reportExpenses.length > 15 && (
                  <p className="text-[10px] text-slate-500 italic text-center">
                    ...y {reportExpenses.length - 15} comprobantes adicionales registrados en el ejercicio.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
                  Detalle de Actuaciones Registradas ({reportTickets.length})
                </h3>
                <table className="w-full text-left text-xs border border-slate-200">
                  <thead className="bg-slate-100 text-slate-700 uppercase text-[10px]">
                    <tr>
                      <th className="p-2 border-b border-slate-200">Código</th>
                      <th className="p-2 border-b border-slate-200">Ciudadano / Frentista</th>
                      <th className="p-2 border-b border-slate-200">Barrio</th>
                      <th className="p-2 border-b border-slate-200">Tipo de Gestión</th>
                      <th className="p-2 border-b border-slate-200 text-center">Fecha</th>
                      <th className="p-2 border-b border-slate-200 text-center">Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {reportTickets.slice(0, 15).map(t => (
                      <tr key={t.id}>
                        <td className="p-2 font-mono font-bold text-blue-900">{t.ticketCode}</td>
                        <td className="p-2 font-semibold text-slate-800">{t.citizenName}</td>
                        <td className="p-2 text-slate-600">{t.citizenNeighborhood}</td>
                        <td className="p-2 text-slate-700">{t.requestType}</td>
                        <td className="p-2 text-center text-slate-600">{t.startDate}</td>
                        <td className="p-2 text-center font-bold">
                          {t.isResolved ? '✓ SOLUCIONADO' : 'PENDIENTE'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {reportTickets.length > 15 && (
                  <p className="text-[10px] text-slate-500 italic text-center">
                    ...y {reportTickets.length - 15} actuaciones adicionales asentadas en base de datos.
                  </p>
                )}
              </div>
            )}

            {/* Official Signatures Footer */}
            <div className="pt-12 grid grid-cols-2 gap-12 text-center text-xs">
              <div className="border-t border-slate-400 pt-2">
                <p className="font-bold text-slate-900">Firma del Responsable de Área</p>
                <p className="text-[11px] text-slate-500">{targetDept?.leaderName || currentUser?.name}</p>
              </div>

              <div className="border-t border-slate-400 pt-2">
                <p className="font-bold text-slate-900">Visto Bueno Intendencia Municipal</p>
                <p className="text-[11px] text-slate-500">Municipalidad de Itá Ibaté - Corrientes</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
