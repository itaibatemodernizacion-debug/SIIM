import React, { useState } from 'react';
import { useMunicipalData } from '../../context/MunicipalDataContext';
import { useAuth } from '../../context/AuthContext';
import { 
  FundAllocation, 
  ExpenseRecord, 
  ExpenseCategory, 
  ExpenseSettlementStatus 
} from '../../types';
import { 
  DollarSign, 
  Wallet, 
  Receipt, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  FileText, 
  TrendingUp, 
  Building2, 
  PlusCircle, 
  Download, 
  Filter, 
  Search, 
  Printer, 
  ArrowUpRight, 
  ShieldCheck, 
  X, 
  Check, 
  AlertCircle, 
  Tag, 
  Layers, 
  History, 
  Eye, 
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { 
  exportFundAllocationsToExcel, 
  exportExpensesToExcel, 
  exportFinancialBalanceToExcel 
} from '../../lib/excelUtils';

export const FundsModule: React.FC = () => {
  const { 
    departments, 
    fundAllocations, 
    expenses, 
    expenseCategories, 
    departmentBalances, 
    financialKPIs, 
    addFundAllocation, 
    addExpense, 
    updateExpenseSettlement, 
    subsanateExpense, 
    cancelExpense, 
    addExpenseCategory 
  } = useMunicipalData();

  const { currentUser, isAdmin, maskSensitiveData } = useAuth();

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'ALLOCATIONS' | 'EXPENSES' | 'SETTLEMENTS' | 'BALANCES'>('DASHBOARD');

  // Filters
  const [selectedDeptId, setSelectedDeptId] = useState<string>(
    currentUser?.role !== 'ADMIN_GENERAL' && currentUser?.departmentId ? currentUser.departmentId : 'ALL'
  );
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [showAllocationModal, setShowAllocationModal] = useState<boolean>(false);
  const [showExpenseModal, setShowExpenseModal] = useState<boolean>(false);
  const [showAuditModal, setShowAuditModal] = useState<boolean>(false);
  const [showSubsanateModal, setShowSubsanateModal] = useState<boolean>(false);
  const [showCategoryModal, setShowCategoryModal] = useState<boolean>(false);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  // Selected item for audit / detail
  const [selectedExpense, setSelectedExpense] = useState<ExpenseRecord | null>(null);

  // New Fund Allocation form state
  const [allocationForm, setAllocationForm] = useState({
    departmentId: departments[0]?.id || '',
    receiverName: '',
    receiverDni: '',
    deliveryDate: new Date().toISOString().split('T')[0],
    voucherNumber: `EXP-FON-${new Date().getFullYear()}-${String(fundAllocations.length + 1).padStart(4, '0')}`,
    amountAssigned: '',
    amountDelivered: '',
    concept: '',
    programOrActivity: '',
    fundingSource: 'Rentas Generales / Coparticipación Provincial',
    authorizedByName: currentUser?.name || 'Intendente Municipal',
    notes: '',
    attachmentName: 'Comprobante_Oficial_Entrega.pdf'
  });

  // New Expense form state
  const [expenseForm, setExpenseForm] = useState({
    departmentId: currentUser?.departmentId || departments[0]?.id || '',
    fundAllocationId: '',
    expenseDate: new Date().toISOString().split('T')[0],
    concept: '',
    category: expenseCategories[0] || 'Combustible',
    description: '',
    supplierName: '',
    supplierCuit: '',
    invoiceNumber: '',
    amount: '',
    paymentMethod: 'Transferencia Bancaria' as 'Efectivo' | 'Transferencia Bancaria' | 'Cheque' | 'Tarjeta Corporativa',
    expedientReference: '',
    attachmentName: 'Factura_Comprobante_Gasto.pdf',
    notes: ''
  });

  // Audit form state
  const [auditStatus, setAuditStatus] = useState<ExpenseSettlementStatus>('APROBADA');
  const [auditObservation, setAuditObservation] = useState<string>('');

  // Subsanate form state
  const [subsanateText, setSubsanateText] = useState<string>('');
  const [subsanateAttachment, setSubsanateAttachment] = useState<string>('');

  // New category form state
  const [newCategoryName, setNewCategoryName] = useState<string>('');

  // Restrict department selection if user is not admin
  const isUserRestricted = currentUser?.role !== 'ADMIN_GENERAL' && !!currentUser?.departmentId;
  const activeDeptId = isUserRestricted ? (currentUser.departmentId as string) : selectedDeptId;

  // Filtered lists
  const filteredAllocations = fundAllocations.filter(f => {
    if (activeDeptId !== 'ALL' && f.departmentId !== activeDeptId) return false;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      f.voucherNumber.toLowerCase().includes(q) ||
      f.concept.toLowerCase().includes(q) ||
      f.receiverName.toLowerCase().includes(q) ||
      f.programOrActivity.toLowerCase().includes(q)
    );
  });

  const filteredExpenses = expenses.filter(e => {
    if (activeDeptId !== 'ALL' && e.departmentId !== activeDeptId) return false;
    if (selectedCategoryFilter !== 'ALL' && e.category !== selectedCategoryFilter) return false;
    if (selectedStatusFilter !== 'ALL' && e.settlementStatus !== selectedStatusFilter) return false;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      e.expenseCode.toLowerCase().includes(q) ||
      e.concept.toLowerCase().includes(q) ||
      e.supplierName.toLowerCase().includes(q) ||
      e.invoiceNumber.toLowerCase().includes(q)
    );
  });

  // Helper for masking DNI / CUIT (Ley 25.326)
  const maskText = (val?: string) => {
    if (!val) return '-';
    if (!maskSensitiveData) return val;
    if (val.length <= 4) return '***';
    return `${val.substring(0, 3)}***${val.substring(val.length - 2)}`;
  };

  // Balance calculation for current selected department
  const currentDeptBalance = departmentBalances.find(b => b.departmentId === expenseForm.departmentId);

  // Submit new Fund Allocation
  const handleCreateAllocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const assigned = parseFloat(allocationForm.amountAssigned) || 0;
    const delivered = parseFloat(allocationForm.amountDelivered) || assigned;

    if (!allocationForm.departmentId || !allocationForm.receiverName || assigned <= 0) {
      alert('Por favor complete el área destinataria, responsable y monto asignado.');
      return;
    }

    addFundAllocation({
      departmentId: allocationForm.departmentId,
      receiverName: allocationForm.receiverName,
      receiverDni: allocationForm.receiverDni || 'S/D',
      deliveryDate: allocationForm.deliveryDate,
      voucherNumber: allocationForm.voucherNumber,
      amountAssigned: assigned,
      amountDelivered: delivered,
      concept: allocationForm.concept || 'Fondo Operativo Municipal',
      programOrActivity: allocationForm.programOrActivity || 'Gastos de Funcionamiento',
      fundingSource: allocationForm.fundingSource,
      authorizedByName: allocationForm.authorizedByName,
      notes: allocationForm.notes,
      attachmentName: allocationForm.attachmentName,
      status: 'ENTREGADO'
    });

    setShowAllocationModal(false);
    setAllocationForm({
      departmentId: departments[0]?.id || '',
      receiverName: '',
      receiverDni: '',
      deliveryDate: new Date().toISOString().split('T')[0],
      voucherNumber: `EXP-FON-${new Date().getFullYear()}-${String(fundAllocations.length + 2).padStart(4, '0')}`,
      amountAssigned: '',
      amountDelivered: '',
      concept: '',
      programOrActivity: '',
      fundingSource: 'Rentas Generales / Coparticipación Provincial',
      authorizedByName: currentUser?.name || 'Intendente Municipal',
      notes: '',
      attachmentName: 'Comprobante_Oficial_Entrega.pdf'
    });
  };

  // Submit new Expense
  const handleCreateExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(expenseForm.amount) || 0;

    if (!expenseForm.concept || !expenseForm.supplierName || amountNum <= 0) {
      alert('Por favor complete concepto, proveedor e importe del gasto.');
      return;
    }

    const { isOverBudget } = addExpense({
      departmentId: expenseForm.departmentId,
      fundAllocationId: expenseForm.fundAllocationId || undefined,
      expenseDate: expenseForm.expenseDate,
      concept: expenseForm.concept,
      category: expenseForm.category,
      description: expenseForm.description || expenseForm.concept,
      supplierName: expenseForm.supplierName,
      supplierCuit: expenseForm.supplierCuit || undefined,
      invoiceNumber: expenseForm.invoiceNumber || 'Ticket s/n',
      amount: amountNum,
      paymentMethod: expenseForm.paymentMethod,
      expedientReference: expenseForm.expedientReference,
      attachmentName: expenseForm.attachmentName,
      notes: expenseForm.notes,
      settlementStatus: 'PRESENTADA', // Ready for audit
      createdByUserName: currentUser?.name || 'Operador de Área'
    });

    setShowExpenseModal(false);
    setExpenseForm({
      departmentId: currentUser?.departmentId || departments[0]?.id || '',
      fundAllocationId: '',
      expenseDate: new Date().toISOString().split('T')[0],
      concept: '',
      category: expenseCategories[0] || 'Combustible',
      description: '',
      supplierName: '',
      supplierCuit: '',
      invoiceNumber: '',
      amount: '',
      paymentMethod: 'Transferencia Bancaria',
      expedientReference: '',
      attachmentName: 'Factura_Comprobante_Gasto.pdf',
      notes: ''
    });

    if (isOverBudget) {
      alert('ADVERTENCIA: El gasto fue registrado, pero supera el saldo disponible actual del área. Queda asentado con alerta presupuestaria.');
    }
  };

  // Audit Settlement Submit
  const handleAuditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpense) return;

    updateExpenseSettlement(selectedExpense.id, auditStatus, auditObservation);
    setShowAuditModal(false);
    setSelectedExpense(null);
    setAuditObservation('');
  };

  // Subsanate Submit
  const handleSubsanateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpense || !subsanateText.trim()) return;

    subsanateExpense(selectedExpense.id, subsanateText.trim(), subsanateAttachment);
    setShowSubsanateModal(false);
    setSelectedExpense(null);
    setSubsanateText('');
    setSubsanateAttachment('');
  };

  // Add Category Submit
  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    addExpenseCategory(newCategoryName.trim());
    setNewCategoryName('');
    setShowCategoryModal(false);
  };

  // Breakdown of expenses by category for charts
  const categoryTotals: Record<string, number> = {};
  filteredExpenses.forEach(e => {
    if (e.settlementStatus !== 'ANULADO') {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    }
  });

  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const maxCategoryAmount = sortedCategories[0] ? sortedCategories[0][1] : 1;

  // Alerts
  const observedExpenses = expenses.filter(e => e.settlementStatus === 'OBSERVADA' && (activeDeptId === 'ALL' || e.departmentId === activeDeptId));
  const lowBalanceAreas = departmentBalances.filter(b => b.isLowBalanceWarning && b.totalDelivered > 0 && (activeDeptId === 'ALL' || b.departmentId === activeDeptId));

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              Control de Fondos y Recursos Municipales
            </h2>
            <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-full">
              Hacienda y Finanzas
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Seguimiento de transferencias de fondos por área, registro de facturas, control de saldos y rendición de cuentas.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => setShowAllocationModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl text-xs font-semibold shadow-md transition cursor-pointer"
            >
              <Wallet className="w-4 h-4" />
              <span>Entregar Fondos</span>
            </button>
          )}

          <button
            onClick={() => setShowExpenseModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Registrar Gasto</span>
          </button>

          <button
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
            title="Generar balance e informe financiero imprimible"
          >
            <Printer className="w-4 h-4 text-sky-400" />
            <span className="hidden sm:inline">Informe Oficial</span>
          </button>
        </div>
      </div>

      {/* Financial Alerts Banner */}
      {(observedExpenses.length > 0 || lowBalanceAreas.length > 0) && (
        <div className="space-y-2">
          {observedExpenses.length > 0 && (
            <div className="bg-amber-950/70 border border-amber-600/40 rounded-xl p-3 text-xs text-amber-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
                <span>
                  Hay <strong>{observedExpenses.length} gasto(s) con rendiciones observadas</strong> por el área contable que requieren corrección de documentación.
                </span>
              </div>
              <button
                onClick={() => setActiveTab('SETTLEMENTS')}
                className="text-xs font-bold text-amber-300 hover:underline cursor-pointer shrink-0"
              >
                Ver Rendiciones Observadas →
              </button>
            </div>
          )}

          {lowBalanceAreas.length > 0 && (
            <div className="bg-rose-950/60 border border-rose-600/40 rounded-xl p-3 text-xs text-rose-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>
                  Alerta Presupuestaria: {lowBalanceAreas.length} área(s) con <strong>saldo disponible menor al 15% o agotado</strong> ({lowBalanceAreas.map(b => b.departmentName.split(' ')[0]).join(', ')}).
                </span>
              </div>
              <button
                onClick={() => setActiveTab('BALANCES')}
                className="text-xs font-bold text-rose-300 hover:underline cursor-pointer shrink-0"
              >
                Ver Saldos por Área →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">
            Secretaría o Dirección
          </label>
          <select
            value={activeDeptId}
            disabled={isUserRestricted}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 disabled:opacity-60"
          >
            {isAdmin && <option value="ALL">Consolidado (Todas las Áreas)</option>}
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">
            Categoría del Gasto
          </label>
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
          >
            <option value="ALL">Todas las Categorías</option>
            {expenseCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">
            Estado de Rendición
          </label>
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
          >
            <option value="ALL">Todos los Estados</option>
            <option value="SIN_RENDIR">Sin Rendir</option>
            <option value="PRESENTADA">Presentada / En Trámite</option>
            <option value="EN_REVISION">En Revisión de Auditoría</option>
            <option value="OBSERVADA">Observada (Requiere Subsanar)</option>
            <option value="APROBADA">Aprobada Oficialmente</option>
            <option value="RECHAZADA">Rechazada</option>
          </select>
        </div>

        <div className="relative">
          <label className="block text-[11px] font-medium text-slate-400 mb-1">
            Búsqueda por Proveedor o Factura
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar concepto, proveedor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>
      </div>

      {/* Main KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {/* Total Fondos Entregados */}
        <div className="bg-slate-900 border border-blue-900/40 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-blue-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Fondos Entregados</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-black text-white tracking-tight">
            ${financialKPIs.totalDelivered.toLocaleString('es-AR')}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Total asignado: <strong>${financialKPIs.totalAssigned.toLocaleString('es-AR')}</strong>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
            <span>Pendiente de giro:</span>
            <span className="text-sky-300 font-semibold">
              ${(financialKPIs.totalAssigned - financialKPIs.totalDelivered).toLocaleString('es-AR')}
            </span>
          </div>
        </div>

        {/* Total Gastos Registrados */}
        <div className="bg-slate-900 border border-amber-900/40 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Gastos Registrados</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-black text-amber-400 tracking-tight">
            ${financialKPIs.totalExpenses.toLocaleString('es-AR')}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {financialKPIs.globalExecutionRate}% de ejecución financiera
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
            <span>Comprobantes cargados:</span>
            <span className="text-slate-300 font-semibold">{expenses.length} facturas</span>
          </div>
        </div>

        {/* Saldo Disponible */}
        <div className="bg-slate-900 border border-emerald-900/40 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Saldo Disponible</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl lg:text-3xl font-black tracking-tight ${financialKPIs.totalAvailable >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            ${financialKPIs.totalAvailable.toLocaleString('es-AR')}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Fórmula: Fondos Entregados - Gastos Registrados
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
            <span>Saldo Comprometido:</span>
            <span className="text-amber-300 font-semibold">
              ${financialKPIs.totalSettlementPending.toLocaleString('es-AR')}
            </span>
          </div>
        </div>

        {/* Rendición de Cuentas */}
        <div className="bg-slate-900 border border-purple-900/40 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-purple-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Rendición Aprobada</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-black text-purple-300 tracking-tight">
            ${financialKPIs.totalSettlementApproved.toLocaleString('es-AR')}
          </div>
          <div className="text-[11px] text-purple-300/80 mt-1">
            {financialKPIs.globalSettlementRate}% de gastos auditados y aprobados
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
            <span>Pendientes de aprobación:</span>
            <span className="text-amber-400 font-semibold">
              ${financialKPIs.totalSettlementPending.toLocaleString('es-AR')}
            </span>
          </div>
        </div>
      </div>

      {/* Sub-Tabs Selector */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('DASHBOARD')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'DASHBOARD'
              ? 'bg-sky-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Tablero Financiero</span>
        </button>

        <button
          onClick={() => setActiveTab('ALLOCATIONS')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'ALLOCATIONS'
              ? 'bg-sky-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>Entregas de Fondos ({fundAllocations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('EXPENSES')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'EXPENSES'
              ? 'bg-sky-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Comprobantes de Gastos ({expenses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('SETTLEMENTS')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'SETTLEMENTS'
              ? 'bg-sky-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Rendición y Auditoría</span>
          {observedExpenses.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('BALANCES')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'BALANCES'
              ? 'bg-sky-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Control de Saldos por Área</span>
        </button>

        {isAdmin && (
          <button
            onClick={() => setShowCategoryModal(true)}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-sky-300 hover:bg-slate-800 transition cursor-pointer flex items-center gap-1 ml-auto shrink-0"
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Configurar Categorías</span>
          </button>
        )}
      </div>

      {/* TAB 1: FINANCIAL DASHBOARD */}
      {activeTab === 'DASHBOARD' && (
        <div className="space-y-6">
          {/* Progress Overview Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Ejecución Presupuestaria Consolidada
                </h3>
                <p className="text-xs text-slate-400">
                  Relación entre fondos efectivamente transferidos (${financialKPIs.totalDelivered.toLocaleString('es-AR')}) y gastos registrados (${financialKPIs.totalExpenses.toLocaleString('es-AR')})
                </p>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-emerald-400">{financialKPIs.globalExecutionRate}%</span>
                <span className="text-xs text-slate-400 block">Ejecutado global</span>
              </div>
            </div>

            <div className="w-full h-3.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                style={{ width: `${Math.min(100, financialKPIs.globalExecutionRate)}%` }}
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 rounded-full transition-all duration-500"
              />
            </div>
          </div>

          {/* Grid: Expenses by Category & Balances Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Distribution */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Tag className="w-4 h-4 text-sky-400" />
                  Distribución de Gastos por Categoría
                </h3>
                <span className="text-[11px] text-slate-400 font-medium">Conceptos de compra</span>
              </div>

              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {sortedCategories.map(([category, amount]) => {
                  const pct = Math.round((amount / (financialKPIs.totalExpenses || 1)) * 100);
                  return (
                    <div key={category} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-200">{category}</span>
                        <span className="text-emerald-400 font-bold">
                          ${amount.toLocaleString('es-AR')} <span className="text-slate-500 font-normal">({pct}%)</span>
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div
                          style={{ width: `${(amount / maxCategoryAmount) * 100}%` }}
                          className="h-full bg-gradient-to-r from-sky-500 to-emerald-500 rounded-full transition-all"
                        />
                      </div>
                    </div>
                  );
                })}

                {sortedCategories.length === 0 && (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    No se registran gastos en el período seleccionado.
                  </div>
                )}
              </div>
            </div>

            {/* Execution Comparison by Department */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  Fondos Entregados vs Gastos por Área
                </h3>
                <span className="text-[11px] text-slate-400 font-medium">Presupuesto y ejecución</span>
              </div>

              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {departmentBalances
                  .filter(b => b.totalDelivered > 0)
                  .map(dept => (
                    <div key={dept.departmentId} className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white truncate max-w-[200px]">{dept.departmentName}</span>
                        <span className="font-mono text-emerald-400 font-bold text-[11px]">
                          Saldo: ${dept.availableBalance.toLocaleString('es-AR')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Entregado: <strong>${dept.totalDelivered.toLocaleString('es-AR')}</strong></span>
                        <span>Gastado: <strong>${dept.totalExpenses.toLocaleString('es-AR')}</strong></span>
                        <span className="font-bold text-sky-400">{dept.executionRate}%</span>
                      </div>

                      <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                        <div
                          style={{ width: `${Math.min(100, dept.executionRate)}%` }}
                          className={`h-full rounded-full transition-all ${
                            dept.executionRate > 85 ? 'bg-rose-500' : dept.executionRate > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FUND ALLOCATIONS LIST */}
      {activeTab === 'ALLOCATIONS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-white text-sm">Registro de Entregas y Asignaciones de Fondos</h3>
              <p className="text-xs text-slate-400">
                Historial de expedientes, montos entregados a cada funcionario y fuentes de financiamiento.
              </p>
            </div>
            <button
              onClick={() => exportFundAllocationsToExcel(filteredAllocations)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold cursor-pointer self-start sm:self-auto"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Exportar Entregas Excel</span>
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 uppercase text-[11px] font-semibold">
                    <th className="py-3 px-3.5">N° Expediente</th>
                    <th className="py-3 px-3">Fecha</th>
                    <th className="py-3 px-3">Área Destinataria</th>
                    <th className="py-3 px-3">Responsable Receptor</th>
                    <th className="py-3 px-3 text-right">Monto Asignado</th>
                    <th className="py-3 px-3 text-right">Monto Entregado</th>
                    <th className="py-3 px-3">Fuente Financiamiento</th>
                    <th className="py-3 px-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredAllocations.map(item => {
                    const dept = departments.find(d => d.id === item.departmentId);
                    return (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-3.5 font-mono font-bold text-sky-400">
                          {item.voucherNumber}
                        </td>
                        <td className="py-3 px-3 text-slate-300 font-mono">
                          {item.deliveryDate}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-200">
                          {dept?.name || item.departmentId}
                        </td>
                        <td className="py-3 px-3 text-slate-300">
                          <div>{item.receiverName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">DNI: {maskText(item.receiverDni)}</div>
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-slate-300">
                          ${item.amountAssigned.toLocaleString('es-AR')}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-emerald-400">
                          ${item.amountDelivered.toLocaleString('es-AR')}
                        </td>
                        <td className="py-3 px-3 text-slate-400 text-[11px]">
                          {item.fundingSource}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-300 border border-blue-500/20">
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredAllocations.length === 0 && (
              <div className="text-center py-12 text-slate-500 text-xs">
                No se encontraron entregas de fondos con los filtros aplicados.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: EXPENSES LIST */}
      {activeTab === 'EXPENSES' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-white text-sm">Registro de Gastos y Facturas de Compra</h3>
              <p className="text-xs text-slate-400">
                Facturas emitidas, proveedores, importes y estado actual de revisión administrativa.
              </p>
            </div>
            <button
              onClick={() => exportExpensesToExcel(filteredExpenses)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold cursor-pointer self-start sm:self-auto"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Exportar Gastos Excel</span>
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 uppercase text-[11px] font-semibold">
                    <th className="py-3 px-3.5">Código Gasto</th>
                    <th className="py-3 px-3">Fecha</th>
                    <th className="py-3 px-3">Área</th>
                    <th className="py-3 px-3">Concepto & Categoría</th>
                    <th className="py-3 px-3">Proveedor / CUIT</th>
                    <th className="py-3 px-3">N° Factura</th>
                    <th className="py-3 px-3 text-right">Importe</th>
                    <th className="py-3 px-3 text-center">Estado Rendición</th>
                    <th className="py-3 px-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredExpenses.map(expense => {
                    const dept = departments.find(d => d.id === expense.departmentId);
                    return (
                      <tr key={expense.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-3.5 font-mono font-bold text-sky-400">
                          {expense.expenseCode}
                        </td>
                        <td className="py-3 px-3 text-slate-300 font-mono">
                          {expense.expenseDate}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-200">
                          {dept?.shortName || expense.departmentId}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-100 max-w-xs truncate">{expense.concept}</div>
                          <span className="text-[10px] text-sky-400 font-medium">{expense.category}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-300">
                          <div className="max-w-[160px] truncate">{expense.supplierName}</div>
                          {expense.supplierCuit && (
                            <div className="text-[10px] text-slate-500 font-mono">CUIT: {maskText(expense.supplierCuit)}</div>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-400">
                          {expense.invoiceNumber}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-white">
                          ${expense.amount.toLocaleString('es-AR')}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            expense.settlementStatus === 'APROBADA'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : expense.settlementStatus === 'OBSERVADA'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                                : expense.settlementStatus === 'RECHAZADA'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : 'bg-sky-500/10 text-sky-300 border border-sky-500/30'
                          }`}>
                            {expense.settlementStatus}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {isAdmin ? (
                            <button
                              onClick={() => {
                                setSelectedExpense(expense);
                                setAuditStatus(expense.settlementStatus === 'OBSERVADA' ? 'APROBADA' : 'APROBADA');
                                setAuditObservation(expense.settlementObservation || '');
                                setShowAuditModal(true);
                              }}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded font-semibold text-[11px] cursor-pointer"
                            >
                              Auditar
                            </button>
                          ) : expense.settlementStatus === 'OBSERVADA' ? (
                            <button
                              onClick={() => {
                                setSelectedExpense(expense);
                                setSubsanateText('');
                                setShowSubsanateModal(true);
                              }}
                              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded font-bold text-[11px] cursor-pointer"
                            >
                              Subsanar
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-500">Cargado</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredExpenses.length === 0 && (
              <div className="text-center py-12 text-slate-500 text-xs">
                No se registraron comprobantes de gasto con los filtros aplicados.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: SETTLEMENTS & AUDITING TRAY */}
      {activeTab === 'SETTLEMENTS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-white text-sm">Bandeja de Rendición y Auditoría Contable</h3>
              <p className="text-xs text-slate-400">
                Control y dictamen de comprobantes. Los gastos aprobados reducen formalmente el saldo sujeto a rendición.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">
                Aprobadas: <strong className="text-emerald-400">${financialKPIs.totalSettlementApproved.toLocaleString('es-AR')}</strong>
              </span>
              <span>•</span>
              <span className="text-xs text-slate-400">
                Pendientes: <strong className="text-amber-400">${financialKPIs.totalSettlementPending.toLocaleString('es-AR')}</strong>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Observadas / Requieren Subsanación */}
            <div className="bg-slate-900 border border-amber-900/40 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                    Rendiciones Observadas ({observedExpenses.length})
                  </h4>
                </div>
                <span className="text-[10px] text-amber-400 font-semibold">Requieren Corrección</span>
              </div>

              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {observedExpenses.map(expense => (
                  <div key={expense.id} className="bg-slate-950 p-3 rounded-xl border border-amber-600/30 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-amber-400">{expense.expenseCode}</span>
                      <span className="font-black text-white">${expense.amount.toLocaleString('es-AR')}</span>
                    </div>

                    <div className="font-semibold text-slate-200">{expense.concept}</div>
                    <div className="text-[11px] text-slate-400">Proveedor: {expense.supplierName} • {expense.invoiceNumber}</div>

                    {expense.settlementObservation && (
                      <div className="p-2 rounded bg-amber-950/40 border border-amber-600/30 text-amber-300 text-[11px] italic">
                        "Obs: {expense.settlementObservation}"
                      </div>
                    )}

                    <div className="pt-1 flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedExpense(expense);
                          setSubsanateText('');
                          setShowSubsanateModal(true);
                        }}
                        className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        Subsanar y Reenviar
                      </button>
                    </div>
                  </div>
                ))}

                {observedExpenses.length === 0 && (
                  <div className="text-center py-10 text-slate-500 text-xs">
                    No hay rendiciones observadas pendientes.
                  </div>
                )}
              </div>
            </div>

            {/* Pendientes de Revisión */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-sky-400" />
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                    Presentadas / En Revisión ({expenses.filter(e => e.settlementStatus === 'PRESENTADA' || e.settlementStatus === 'EN_REVISION').length})
                  </h4>
                </div>
                <span className="text-[10px] text-sky-400 font-semibold">En Mesa Contable</span>
              </div>

              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {expenses
                  .filter(e => (e.settlementStatus === 'PRESENTADA' || e.settlementStatus === 'EN_REVISION') && (activeDeptId === 'ALL' || e.departmentId === activeDeptId))
                  .map(expense => (
                    <div key={expense.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-sky-400">{expense.expenseCode}</span>
                        <span className="font-black text-white">${expense.amount.toLocaleString('es-AR')}</span>
                      </div>

                      <div className="font-semibold text-slate-200">{expense.concept}</div>
                      <div className="text-[11px] text-slate-400">
                        Área: <strong>{departments.find(d => d.id === expense.departmentId)?.name}</strong> • {expense.invoiceNumber}
                      </div>

                      <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-800">
                        <span>Cargado: {expense.createdAt}</span>
                        {isAdmin && (
                          <button
                            onClick={() => {
                              setSelectedExpense(expense);
                              setAuditStatus('APROBADA');
                              setAuditObservation('');
                              setShowAuditModal(true);
                            }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-xs cursor-pointer"
                          >
                            Dictaminar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                {expenses.filter(e => (e.settlementStatus === 'PRESENTADA' || e.settlementStatus === 'EN_REVISION') && (activeDeptId === 'ALL' || e.departmentId === activeDeptId)).length === 0 && (
                  <div className="text-center py-10 text-slate-500 text-xs">
                    No hay gastos pendientes de revisión en esta selección.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: BALANCES TABLE */}
      {activeTab === 'BALANCES' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-white text-sm">Control Automático de Saldos y Rendición por Área</h3>
              <p className="text-xs text-slate-400">
                Diferenciación estricta de fondos asignados, fondos entregados, gastos rendidos y saldo disponible.
              </p>
            </div>
            <button
              onClick={() => exportFinancialBalanceToExcel(departmentBalances)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold cursor-pointer self-start sm:self-auto"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Exportar Balances Excel</span>
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 uppercase text-[11px] font-semibold">
                    <th className="py-3 px-3.5">Secretaría / Dirección</th>
                    <th className="py-3 px-3 text-right">Asignado</th>
                    <th className="py-3 px-3 text-right">Entregado</th>
                    <th className="py-3 px-3 text-right">Gastos</th>
                    <th className="py-3 px-3 text-right">Saldo Disponible</th>
                    <th className="py-3 px-3 text-right">Rendido Aprobado</th>
                    <th className="py-3 px-3 text-right">En Rendición</th>
                    <th className="py-3 px-3 text-center">% Ejecutado</th>
                    <th className="py-3 px-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {departmentBalances.map(balance => (
                    <tr key={balance.departmentId} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-3.5 font-bold text-slate-100">
                        {balance.departmentName}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-400">
                        ${balance.totalAssigned.toLocaleString('es-AR')}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-slate-300">
                        ${balance.totalDelivered.toLocaleString('es-AR')}
                      </td>
                      <td className="py-3 px-3 text-right text-amber-300 font-semibold">
                        ${balance.totalExpenses.toLocaleString('es-AR')}
                      </td>
                      <td className="py-3 px-3 text-right font-black">
                        <span className={balance.availableBalance < 0 ? 'text-rose-400' : 'text-emerald-400'}>
                          ${balance.availableBalance.toLocaleString('es-AR')}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-purple-300">
                        ${balance.approvedSettlementAmount.toLocaleString('es-AR')}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-400">
                        ${balance.pendingSettlementAmount.toLocaleString('es-AR')}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="font-bold text-slate-200">{balance.executionRate}%</span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {balance.isLowBalanceWarning && balance.totalDelivered > 0 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            Saldo Crítico
                          </span>
                        ) : balance.hasObservedSettlements ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Observado
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Normal
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: REGISTRAR ENTREGA DE FONDOS */}
      {showAllocationModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-white text-base">Registrar Entrega de Fondos Municipales</h3>
              </div>
              <button onClick={() => setShowAllocationModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAllocationSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Área Destinataria (*)</label>
                  <select
                    value={allocationForm.departmentId}
                    onChange={(e) => setAllocationForm({ ...allocationForm, departmentId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-sky-500"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">N° Comprobante / Exp. (*)</label>
                  <input
                    type="text"
                    required
                    value={allocationForm.voucherNumber}
                    onChange={(e) => setAllocationForm({ ...allocationForm, voucherNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Funcionario / Responsable Receptor (*)</label>
                  <input
                    type="text"
                    required
                    placeholder="Nombre del funcionario"
                    value={allocationForm.receiverName}
                    onChange={(e) => setAllocationForm({ ...allocationForm, receiverName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">DNI del Receptor</label>
                  <input
                    type="text"
                    placeholder="DNI"
                    value={allocationForm.receiverDni}
                    onChange={(e) => setAllocationForm({ ...allocationForm, receiverDni: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Monto Asignado Presupuestario ($) (*)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="Ej. 2500000"
                    value={allocationForm.amountAssigned}
                    onChange={(e) => setAllocationForm({ ...allocationForm, amountAssigned: e.target.value, amountDelivered: allocationForm.amountDelivered || e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-sky-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Monto Efectivamente Entregado ($) (*)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="Ej. 2500000"
                    value={allocationForm.amountDelivered}
                    onChange={(e) => setAllocationForm({ ...allocationForm, amountDelivered: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-emerald-400 focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Fecha de Entrega</label>
                  <input
                    type="date"
                    value={allocationForm.deliveryDate}
                    onChange={(e) => setAllocationForm({ ...allocationForm, deliveryDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Fuente de Financiamiento</label>
                  <select
                    value={allocationForm.fundingSource}
                    onChange={(e) => setAllocationForm({ ...allocationForm, fundingSource: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="Rentas Generales / Coparticipación Provincial">Rentas Generales / Coparticipación</option>
                    <option value="Fondo Municipal de Promoción Deportiva">Fondo de Promoción Deportiva</option>
                    <option value="Fondo de Emergencia Social">Fondo de Emergencia Social</option>
                    <option value="Convenio Nacional / País Digital">Convenio Nacional / País Digital</option>
                    <option value="Aportes del Tesoro Municipal">Aportes del Tesoro Municipal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Concepto o Destino del Fondo (*)</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Fondo Operativo de Mantenimiento y Bacheo"
                  value={allocationForm.concept}
                  onChange={(e) => setAllocationForm({ ...allocationForm, concept: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Observaciones</label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre resolución, número de decreto o cuenta bancaria..."
                  value={allocationForm.notes}
                  onChange={(e) => setAllocationForm({ ...allocationForm, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAllocationModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold shadow-md cursor-pointer"
                >
                  Registrar Entrega
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REGISTRAR NUEVO GASTO */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Registrar Gasto Municipal</h3>
              </div>
              <button onClick={() => setShowExpenseModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current available balance badge */}
            {currentDeptBalance && (
              <div className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                currentDeptBalance.availableBalance > 0
                  ? 'bg-emerald-950/40 border-emerald-600/30 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-600/30 text-rose-300'
              }`}>
                <span>Saldo disponible para <strong>{currentDeptBalance.departmentName}</strong>:</span>
                <span className="font-black text-sm">${currentDeptBalance.availableBalance.toLocaleString('es-AR')}</span>
              </div>
            )}

            <form onSubmit={handleCreateExpenseSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Área Responsable (*)</label>
                  <select
                    value={expenseForm.departmentId}
                    disabled={isUserRestricted}
                    onChange={(e) => setExpenseForm({ ...expenseForm, departmentId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-emerald-500 disabled:opacity-60"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Categoría del Gasto (*)</label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    {expenseCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Concepto del Gasto (*)</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Adquisición de combustible gasoil para motoniveladora"
                  value={expenseForm.concept}
                  onChange={(e) => setExpenseForm({ ...expenseForm, concept: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Proveedor / Comercio (*)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. YPF Itá Ibaté / Ferretería Central"
                    value={expenseForm.supplierName}
                    onChange={(e) => setExpenseForm({ ...expenseForm, supplierName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">CUIT del Proveedor (Opcional)</label>
                  <input
                    type="text"
                    placeholder="30-..."
                    value={expenseForm.supplierCuit}
                    onChange={(e) => setExpenseForm({ ...expenseForm, supplierCuit: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">N° Factura / Comprobante (*)</label>
                  <input
                    type="text"
                    required
                    placeholder="Factura B 0001-..."
                    value={expenseForm.invoiceNumber}
                    onChange={(e) => setExpenseForm({ ...expenseForm, invoiceNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Importe ($ ARS) (*)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="0.00"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-emerald-400 focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Medio de Pago</label>
                  <select
                    value={expenseForm.paymentMethod}
                    onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Transferencia Bancaria">Transferencia Bancaria</option>
                    <option value="Efectivo">Efectivo / Caja Chica</option>
                    <option value="Cheque">Cheque Oficial</option>
                    <option value="Tarjeta Corporativa">Tarjeta Corporativa</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Descripción detallada</label>
                <textarea
                  rows={2}
                  placeholder="Detalle de los bienes o servicios adquiridos..."
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold shadow-md cursor-pointer"
                >
                  Cargar Gasto y Rendición
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: AUDITAR / DICTAMINAR RENDICION */}
      {showAuditModal && selectedExpense && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-white text-base">Auditoría de Rendición Contable</h3>
              </div>
              <button onClick={() => setShowAuditModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAuditSubmit} className="space-y-3.5 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sky-400 font-bold">{selectedExpense.expenseCode}</span>
                  <span className="font-bold text-emerald-400">${selectedExpense.amount.toLocaleString('es-AR')}</span>
                </div>
                <div className="font-semibold text-white">{selectedExpense.concept}</div>
                <div className="text-[11px] text-slate-400">
                  Proveedor: {selectedExpense.supplierName} • {selectedExpense.invoiceNumber}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Dictamen de Auditoría (*)</label>
                <select
                  value={auditStatus}
                  onChange={(e) => setAuditStatus(e.target.value as ExpenseSettlementStatus)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 font-semibold"
                >
                  <option value="APROBADA">Aprobar Rendición (Comprobante Válido)</option>
                  <option value="OBSERVADA">Observar (Falta documentación o firmas)</option>
                  <option value="EN_REVISION">Poner En Revisión / Trámite</option>
                  <option value="RECHAZADA">Rechazar Gasto</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Observaciones o Motivo {auditStatus === 'OBSERVADA' ? '(* Obligatorio indicar qué falta)' : ''}
                </label>
                <textarea
                  rows={3}
                  required={auditStatus === 'OBSERVADA'}
                  placeholder={auditStatus === 'OBSERVADA' ? "Detalle qué documento, firma, remito o constancia debe adjuntar el área para subsanar..." : "Notas de auditoría..."}
                  value={auditObservation}
                  onChange={(e) => setAuditObservation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAuditModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold shadow-md cursor-pointer"
                >
                  Confirmar Dictamen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: SUBSANAR RENDICION OBSERVADA */}
      {showSubsanateModal && selectedExpense && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">Subsanar Rendición Observada</h3>
              </div>
              <button onClick={() => setShowSubsanateModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubsanateSubmit} className="space-y-3.5 text-xs">
              <div className="p-3 bg-amber-950/40 border border-amber-600/30 rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-amber-400 block">Observación Realizada:</span>
                <p className="text-amber-200 italic">{selectedExpense.settlementObservation || 'Falta documentación respaldatoria.'}</p>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Respuesta y Corrección de Documentación (*)</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detalle la subsanación realizada (ej. Se adjunta remito conformado y firma de recepción)..."
                  value={subsanateText}
                  onChange={(e) => setSubsanateText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Nuevo Comprobante o Archivo Adjunto</label>
                <input
                  type="text"
                  placeholder="ej. Remito_Firmado_Conforme.pdf"
                  value={subsanateAttachment}
                  onChange={(e) => setSubsanateAttachment(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSubsanateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-semibold shadow-md cursor-pointer"
                >
                  Presentar Subsanación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: AGREGAR CATEGORIA */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-white text-base">Nueva Categoría de Gasto</h3>
              </div>
              <button onClick={() => setShowCategoryModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCategorySubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Nombre de la Categoría (*)</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Viáticos y Alojamiento"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-semibold shadow-md cursor-pointer"
                >
                  Guardar Categoría
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: INFORME IMPRIMIBLE / PDF OFICIAL */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl max-w-4xl w-full p-8 shadow-2xl space-y-6 my-8 print:m-0 print:p-4 print:shadow-none print:w-full">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 print:hidden">
              <span className="font-bold text-slate-700 text-sm">
                Documento Contable Oficial • Listo para Imprimir / PDF
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
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

            {/* Header with Coat of Arms */}
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
                    SECRETARÍA DE HACIENDA Y FINANZAS • CORRIENTES
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Control de Fondos y Recursos por Secretaría y Dirección
                  </p>
                </div>
              </div>

              <div className="text-right text-xs text-slate-600 space-y-0.5">
                <div>Fecha de Emisión: <strong>{new Date().toLocaleDateString('es-AR')}</strong></div>
                <div>Expediente: <strong>BAL-FON-{new Date().getFullYear()}</strong></div>
                <div>Responsable: <strong>{currentUser?.name || 'Secretaría de Hacienda'}</strong></div>
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center py-2">
              <h2 className="text-lg font-extrabold text-slate-900 uppercase tracking-tight">
                ESTADO DE FONDOS ASIGNADOS, EJECUCIÓN Y RENDICIÓN DE CUENTAS
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Período Anual {new Date().getFullYear()} • Ejercicio Municipal
              </p>
            </div>

            {/* Consolidated Summary */}
            <div className="grid grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
              <div>
                <div className="text-[11px] font-bold text-slate-600 uppercase">Fondos Entregados</div>
                <div className="text-xl font-black text-slate-900">${financialKPIs.totalDelivered.toLocaleString('es-AR')}</div>
              </div>
              <div>
                <div className="text-[11px] font-bold text-amber-700 uppercase">Gastos Registrados</div>
                <div className="text-xl font-black text-amber-700">${financialKPIs.totalExpenses.toLocaleString('es-AR')}</div>
              </div>
              <div>
                <div className="text-[11px] font-bold text-emerald-700 uppercase">Saldo Disponible</div>
                <div className="text-xl font-black text-emerald-700">${financialKPIs.totalAvailable.toLocaleString('es-AR')}</div>
              </div>
              <div>
                <div className="text-[11px] font-bold text-purple-700 uppercase">Rendido Aprobado</div>
                <div className="text-xl font-black text-purple-700">${financialKPIs.totalSettlementApproved.toLocaleString('es-AR')}</div>
              </div>
            </div>

            {/* Balances by Department Table */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
                Cuadro de Rendición por Dependencia Municipal
              </h3>
              <table className="w-full text-left text-xs border border-slate-200">
                <thead className="bg-slate-100 text-slate-700 uppercase text-[10px]">
                  <tr>
                    <th className="p-2 border-b border-slate-200">Dependencia</th>
                    <th className="p-2 border-b border-slate-200 text-right">Entregado</th>
                    <th className="p-2 border-b border-slate-200 text-right">Gastos</th>
                    <th className="p-2 border-b border-slate-200 text-right">Saldo Disp.</th>
                    <th className="p-2 border-b border-slate-200 text-right">Aprobado</th>
                    <th className="p-2 border-b border-slate-200 text-center">% Rendición</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {departmentBalances.map(b => (
                    <tr key={b.departmentId}>
                      <td className="p-2 font-semibold text-slate-800">{b.departmentName}</td>
                      <td className="p-2 text-right">${b.totalDelivered.toLocaleString('es-AR')}</td>
                      <td className="p-2 text-right font-medium">${b.totalExpenses.toLocaleString('es-AR')}</td>
                      <td className="p-2 text-right font-black text-emerald-700">${b.availableBalance.toLocaleString('es-AR')}</td>
                      <td className="p-2 text-right font-bold text-purple-800">${b.approvedSettlementAmount.toLocaleString('es-AR')}</td>
                      <td className="p-2 text-center font-bold">{b.settlementRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Signatures */}
            <div className="pt-12 grid grid-cols-2 gap-12 text-center text-xs">
              <div className="border-t border-slate-400 pt-2">
                <p className="font-bold text-slate-900">Secretaría de Hacienda y Finanzas</p>
                <p className="text-[11px] text-slate-500">C.P.N. Laura Gómez</p>
              </div>

              <div className="border-t border-slate-400 pt-2">
                <p className="font-bold text-slate-900">Intendencia Municipal</p>
                <p className="text-[11px] text-slate-500">Municipalidad de Itá Ibaté - Corrientes</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
