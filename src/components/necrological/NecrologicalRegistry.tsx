import React, { useState, useMemo } from 'react';
import { useMunicipalData } from '../../context/MunicipalDataContext';
import { useAuth } from '../../context/AuthContext';
import { NecrologicalRecord, CasketType, NicheStatus } from '../../types';
import { ITA_IBATE_NEIGHBORHOODS } from '../../data/initialData';
import { 
  Building2, 
  HeartHandshake, 
  Plus, 
  FileSpreadsheet, 
  Printer, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Phone, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Edit3, 
  Eye, 
  EyeOff,
  Package,
  Layers,
  FileText,
  X,
  ChevronDown
} from 'lucide-react';
import { exportNecrologicalToExcel } from '../../lib/excelUtils';

const CASKET_TYPES: CasketType[] = [
  'Estándar Adulto (Madera Lustrada)',
  'Extra Grande / Especial',
  'Párvulo / Infantil',
  'Metálico con Visor / Bóveda',
  'Económico Social'
];

const NICHE_STATUSES: { value: NicheStatus; label: string }[] = [
  { value: 'CONCESION_TEMPORAL', label: 'Concesión Temporal (5 Años)' },
  { value: 'A_PERPETUIDAD', label: 'A Perpetuidad' },
  { value: 'ASIGNADO', label: 'Asignado General' },
  { value: 'EN_TRAMITE', label: 'En Trámite de Regularización' },
  { value: 'LIBERADO', label: 'Liberado / Desocupado' }
];

export const NecrologicalRegistry: React.FC = () => {
  const { 
    necrologicalRecords, 
    addNecrologicalRecord, 
    updateNecrologicalRecord, 
    deleteNecrologicalRecord,
    necrologicalKPIs 
  } = useMunicipalData();

  const { currentUser, maskSensitiveData } = useAuth();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterServiceType, setFilterServiceType] = useState<'ALL' | 'WITH_CASKET' | 'WITH_NICHE'>('ALL');
  const [filterNicheStatus, setFilterNicheStatus] = useState<string>('ALL');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Modals state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<NecrologicalRecord | null>(null);
  const [printRecord, setPrintRecord] = useState<NecrologicalRecord | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    serviceDate: string;
    deceasedFullName: string;
    deceasedDni: string;
    deceasedAge: string;
    deathDate: string;
    deathCertificateNumber: string;
    causeOfDeath: string;
    familyContactName: string;
    familyContactDni: string;
    familyRelationship: string;
    familyPhone: string;
    familyAddress: string;
    familyNeighborhood: string;
    usedCasket: boolean;
    casketType: CasketType;
    casketCodeOrModel: string;
    casketCostExempted: boolean;
    assignedNiche: boolean;
    cemeteryName: string;
    nicheSectorOrPavilion: string;
    nicheRowOrLevel: string;
    nicheNumber: string;
    nicheStatus: NicheStatus;
    burialDate: string;
    concessionExpirationDate: string;
    responsibleOfficer: string;
    notes: string;
  }>({
    serviceDate: new Date().toISOString().split('T')[0],
    deceasedFullName: '',
    deceasedDni: '',
    deceasedAge: '',
    deathDate: new Date().toISOString().split('T')[0],
    deathCertificateNumber: '',
    causeOfDeath: '',
    familyContactName: '',
    familyContactDni: '',
    familyRelationship: 'Hijo/a',
    familyPhone: '',
    familyAddress: '',
    familyNeighborhood: ITA_IBATE_NEIGHBORHOODS[0],
    usedCasket: true,
    casketType: 'Estándar Adulto (Madera Lustrada)',
    casketCodeOrModel: '',
    casketCostExempted: true,
    assignedNiche: true,
    cemeteryName: 'Cementerio Municipal San Juan Bautista de Itá Ibaté',
    nicheSectorOrPavilion: 'Pabellón A',
    nicheRowOrLevel: 'Fila 1 - Planta Baja',
    nicheNumber: '',
    nicheStatus: 'CONCESION_TEMPORAL',
    burialDate: new Date().toISOString().split('T')[0],
    concessionExpirationDate: '',
    responsibleOfficer: currentUser?.name || 'Lic. Silvina Fernández (Sec. Desarrollo Social y Humano)',
    notes: ''
  });

  // Filter records
  const filteredRecords = useMemo(() => {
    return necrologicalRecords.filter(r => {
      // Search text
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchName = r.deceasedFullName.toLowerCase().includes(query);
        const matchDni = r.deceasedDni.toLowerCase().includes(query);
        const matchFamily = r.familyContactName.toLowerCase().includes(query);
        const matchAct = r.actNumber.toLowerCase().includes(query);
        const matchNiche = (r.nicheNumber || '').toLowerCase().includes(query);
        if (!matchName && !matchDni && !matchFamily && !matchAct && !matchNiche) return false;
      }

      // Filter by type
      if (filterServiceType === 'WITH_CASKET' && !r.usedCasket) return false;
      if (filterServiceType === 'WITH_NICHE' && !r.assignedNiche) return false;

      // Filter by niche status
      if (filterNicheStatus !== 'ALL' && r.nicheStatus !== filterNicheStatus) return false;

      // Date range
      if (filterStartDate && r.serviceDate < filterStartDate) return false;
      if (filterEndDate && r.serviceDate > filterEndDate) return false;

      return true;
    });
  }, [necrologicalRecords, searchTerm, filterServiceType, filterNicheStatus, filterStartDate, filterEndDate]);

  // Open Add modal
  const handleOpenAdd = () => {
    setEditingRecord(null);
    setFormData({
      serviceDate: new Date().toISOString().split('T')[0],
      deceasedFullName: '',
      deceasedDni: '',
      deceasedAge: '',
      deathDate: new Date().toISOString().split('T')[0],
      deathCertificateNumber: '',
      causeOfDeath: '',
      familyContactName: '',
      familyContactDni: '',
      familyRelationship: 'Hijo/a',
      familyPhone: '',
      familyAddress: '',
      familyNeighborhood: ITA_IBATE_NEIGHBORHOODS[0],
      usedCasket: true,
      casketType: 'Estándar Adulto (Madera Lustrada)',
      casketCodeOrModel: `CJ-${new Date().getFullYear()}-${String(necrologicalRecords.length + 1).padStart(3, '0')}`,
      casketCostExempted: true,
      assignedNiche: true,
      cemeteryName: 'Cementerio Municipal San Juan Bautista de Itá Ibaté',
      nicheSectorOrPavilion: 'Pabellón A',
      nicheRowOrLevel: 'Fila 1 - Planta Baja',
      nicheNumber: `Nicho N° ${necrologicalRecords.length + 10}`,
      nicheStatus: 'CONCESION_TEMPORAL',
      burialDate: new Date().toISOString().split('T')[0],
      concessionExpirationDate: `${new Date().getFullYear() + 5}-${new Date().toISOString().split('T')[0].substring(5)}`,
      responsibleOfficer: currentUser?.name || 'Lic. Silvina Fernández (Sec. Desarrollo Social y Humano)',
      notes: ''
    });
    setShowFormModal(true);
  };

  // Open Edit modal
  const handleOpenEdit = (record: NecrologicalRecord) => {
    setEditingRecord(record);
    setFormData({
      serviceDate: record.serviceDate,
      deceasedFullName: record.deceasedFullName,
      deceasedDni: record.deceasedDni,
      deceasedAge: record.deceasedAge ? String(record.deceasedAge) : '',
      deathDate: record.deathDate,
      deathCertificateNumber: record.deathCertificateNumber || '',
      causeOfDeath: record.causeOfDeath || '',
      familyContactName: record.familyContactName,
      familyContactDni: record.familyContactDni,
      familyRelationship: record.familyRelationship,
      familyPhone: record.familyPhone,
      familyAddress: record.familyAddress,
      familyNeighborhood: record.familyNeighborhood || ITA_IBATE_NEIGHBORHOODS[0],
      usedCasket: record.usedCasket,
      casketType: record.casketType || 'Estándar Adulto (Madera Lustrada)',
      casketCodeOrModel: record.casketCodeOrModel || '',
      casketCostExempted: record.casketCostExempted,
      assignedNiche: record.assignedNiche,
      cemeteryName: record.cemeteryName,
      nicheSectorOrPavilion: record.nicheSectorOrPavilion || 'Pabellón A',
      nicheRowOrLevel: record.nicheRowOrLevel || '',
      nicheNumber: record.nicheNumber || '',
      nicheStatus: record.nicheStatus,
      burialDate: record.burialDate || record.serviceDate,
      concessionExpirationDate: record.concessionExpirationDate || '',
      responsibleOfficer: record.responsibleOfficer,
      notes: record.notes || ''
    });
    setShowFormModal(true);
  };

  // Save Record
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.deceasedFullName || !formData.deceasedDni) {
      alert('Por favor ingrese el Nombre Completo y DNI del fallecido.');
      return;
    }
    if (!formData.familyContactName || !formData.familyContactDni) {
      alert('Por favor ingrese el Nombre y DNI del familiar solicitante.');
      return;
    }

    if (editingRecord) {
      updateNecrologicalRecord({
        ...editingRecord,
        serviceDate: formData.serviceDate,
        deceasedFullName: formData.deceasedFullName.trim(),
        deceasedDni: formData.deceasedDni.trim(),
        deceasedAge: formData.deceasedAge ? parseInt(formData.deceasedAge) : undefined,
        deathDate: formData.deathDate,
        deathCertificateNumber: formData.deathCertificateNumber.trim(),
        causeOfDeath: formData.causeOfDeath.trim(),
        familyContactName: formData.familyContactName.trim(),
        familyContactDni: formData.familyContactDni.trim(),
        familyRelationship: formData.familyRelationship,
        familyPhone: formData.familyPhone.trim(),
        familyAddress: formData.familyAddress.trim(),
        familyNeighborhood: formData.familyNeighborhood,
        usedCasket: formData.usedCasket,
        casketType: formData.usedCasket ? formData.casketType : undefined,
        casketCodeOrModel: formData.usedCasket ? formData.casketCodeOrModel.trim() : undefined,
        casketCostExempted: formData.usedCasket ? formData.casketCostExempted : false,
        assignedNiche: formData.assignedNiche,
        cemeteryName: formData.cemeteryName,
        nicheSectorOrPavilion: formData.nicheSectorOrPavilion.trim(),
        nicheRowOrLevel: formData.nicheRowOrLevel.trim(),
        nicheNumber: formData.nicheNumber.trim(),
        nicheStatus: formData.nicheStatus,
        burialDate: formData.burialDate,
        concessionExpirationDate: formData.concessionExpirationDate,
        responsibleOfficer: formData.responsibleOfficer.trim(),
        notes: formData.notes.trim()
      });
    } else {
      addNecrologicalRecord({
        serviceDate: formData.serviceDate,
        deceasedFullName: formData.deceasedFullName.trim(),
        deceasedDni: formData.deceasedDni.trim(),
        deceasedAge: formData.deceasedAge ? parseInt(formData.deceasedAge) : undefined,
        deathDate: formData.deathDate,
        deathCertificateNumber: formData.deathCertificateNumber.trim(),
        causeOfDeath: formData.causeOfDeath.trim(),
        familyContactName: formData.familyContactName.trim(),
        familyContactDni: formData.familyContactDni.trim(),
        familyRelationship: formData.familyRelationship,
        familyPhone: formData.familyPhone.trim(),
        familyAddress: formData.familyAddress.trim(),
        familyNeighborhood: formData.familyNeighborhood,
        usedCasket: formData.usedCasket,
        casketType: formData.usedCasket ? formData.casketType : undefined,
        casketCodeOrModel: formData.usedCasket ? formData.casketCodeOrModel.trim() : undefined,
        casketCostExempted: formData.usedCasket ? formData.casketCostExempted : false,
        assignedNiche: formData.assignedNiche,
        cemeteryName: formData.cemeteryName,
        nicheSectorOrPavilion: formData.nicheSectorOrPavilion.trim(),
        nicheRowOrLevel: formData.nicheRowOrLevel.trim(),
        nicheNumber: formData.nicheNumber.trim(),
        nicheStatus: formData.nicheStatus,
        burialDate: formData.burialDate,
        concessionExpirationDate: formData.concessionExpirationDate,
        responsibleOfficer: formData.responsibleOfficer.trim(),
        notes: formData.notes.trim()
      });
    }

    setShowFormModal(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`¿Confirma eliminar el registro necrológico correspondiente a "${name}"?`)) {
      deleteNecrologicalRecord(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400">
              <HeartHandshake className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Registro Necrológico Municipal
            </h2>
            <span className="px-2 py-0.5 text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/20 rounded-full">
              Desarrollo Social y Humano
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Control y seguimiento de asistencia social de sepelio, registro de cajones / féretros provistos por el Municipio y nichos asignados en el Cementerio Municipal San Juan Bautista de Itá Ibaté.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-rose-900/30 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Registro Necrológico</span>
          </button>

          <button
            onClick={() => exportNecrologicalToExcel(filteredRecords)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md transition cursor-pointer"
            title="Exportar registros filtrados a planilla Excel oficial"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="text-xs uppercase font-semibold text-slate-400">Total Servicios</div>
          <div className="text-2xl font-black text-white mt-1">
            {necrologicalKPIs.totalServices}
          </div>
          <div className="text-[11px] text-slate-500">asistencias registradas</div>
        </div>

        <div className="bg-slate-900 border border-rose-900/40 rounded-2xl p-4 shadow-sm">
          <div className="text-xs uppercase font-semibold text-slate-400">Cajones Provistos</div>
          <div className="text-2xl font-black text-rose-400 mt-1">
            {necrologicalKPIs.totalCasketsUsed}
          </div>
          <div className="text-[11px] text-rose-400/80 font-medium">
            Stock est.: {necrologicalKPIs.estimatedCasketStock} disp.
          </div>
        </div>

        <div className="bg-slate-900 border border-sky-900/40 rounded-2xl p-4 shadow-sm">
          <div className="text-xs uppercase font-semibold text-slate-400">Nichos Asignados</div>
          <div className="text-2xl font-black text-sky-400 mt-1">
            {necrologicalKPIs.totalNichesAssigned}
          </div>
          <div className="text-[11px] text-slate-500">en Cementerio Municipal</div>
        </div>

        <div className="bg-slate-900 border border-purple-900/40 rounded-2xl p-4 shadow-sm">
          <div className="text-xs uppercase font-semibold text-slate-400">Tipo de Concesión</div>
          <div className="text-xl font-black text-purple-300 mt-1">
            {necrologicalKPIs.totalConcessionNiches} <span className="text-xs font-normal text-slate-400">Temp.</span> / {necrologicalKPIs.totalPerpetuityNiches} <span className="text-xs font-normal text-slate-400">Perp.</span>
          </div>
          <div className="text-[11px] text-purple-400/80 font-medium">concesiones administradas</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por fallecido, DNI, familiar, N° de acta o nicho..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Service Type Filter */}
          <div className="w-full sm:w-auto">
            <select
              value={filterServiceType}
              onChange={(e) => setFilterServiceType(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
            >
              <option value="ALL">Todos los Servicios</option>
              <option value="WITH_CASKET">Con Cajón Provisto por Municipio</option>
              <option value="WITH_NICHE">Con Nicho en Cementerio</option>
            </select>
          </div>

          {/* Niche Status Filter */}
          <div className="w-full sm:w-auto">
            <select
              value={filterNicheStatus}
              onChange={(e) => setFilterNicheStatus(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
            >
              <option value="ALL">Todas las Condiciones de Nicho</option>
              {NICHE_STATUSES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Date from */}
          <div className="w-full sm:w-auto flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 text-[11px]">Desde:</span>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Date to */}
          <div className="w-full sm:w-auto flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 text-[11px]">Hasta:</span>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-white text-xs uppercase tracking-wider">
              Actas y Servicios Asentados ({filteredRecords.length})
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Itá Ibaté • Corrientes
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase text-[11px] font-semibold">
                <th className="py-3 px-3.5">N° Acta</th>
                <th className="py-3 px-3">Fecha</th>
                <th className="py-3 px-3">Fallecido / DNI</th>
                <th className="py-3 px-3">Familiar / Contacto</th>
                <th className="py-3 px-3">Cajón Provisto</th>
                <th className="py-3 px-3">Nicho en Cementerio</th>
                <th className="py-3 px-3">Autorizante</th>
                <th className="py-3 px-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                    No se encontraron registros necrológicos con los criterios de búsqueda seleccionados.
                  </td>
                </tr>
              ) : (
                filteredRecords.map(r => (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3.5 font-mono font-bold text-rose-400 whitespace-nowrap">
                      {r.actNumber}
                    </td>
                    <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                      {r.serviceDate}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-100">{r.deceasedFullName}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span>DNI: {maskSensitiveData ? 'XX.XXX.XXX' : r.deceasedDni}</span>
                        {r.deceasedAge && <span>• {r.deceasedAge} años</span>}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-200">{r.familyContactName}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <span className="text-rose-400/90 font-medium">({r.familyRelationship})</span>
                        <span>• Tel: {maskSensitiveData ? 'XXXX-XXXX' : r.familyPhone}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      {r.usedCasket ? (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-300 border border-rose-500/30">
                            ✓ {r.casketType?.split(' ')[0]}
                          </span>
                          <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                            {r.casketCodeOrModel || 'S/N'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">No requerido</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {r.assignedNiche ? (
                        <div>
                          <div className="font-semibold text-sky-300">{r.nicheNumber}</div>
                          <div className="text-[10px] text-slate-400">
                            {r.nicheSectorOrPavilion} {r.nicheRowOrLevel ? `• ${r.nicheRowOrLevel}` : ''}
                          </div>
                          <span className={`inline-block mt-0.5 text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                            r.nicheStatus === 'A_PERPETUIDAD'
                              ? 'bg-purple-500/10 text-purple-300'
                              : 'bg-sky-500/10 text-sky-300'
                          }`}>
                            {r.nicheStatus === 'A_PERPETUIDAD' ? 'A Perpetuidad' : 'Concesión'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">Sin nicho</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-300 text-[11px]">
                      {r.responsibleOfficer}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setPrintRecord(r)}
                          className="p-1.5 hover:bg-slate-700 text-sky-400 rounded-lg transition cursor-pointer"
                          title="Imprimir Acta Oficial / Guardar en PDF"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(r)}
                          className="p-1.5 hover:bg-slate-700 text-amber-400 rounded-lg transition cursor-pointer"
                          title="Editar Registro"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(r.id, r.deceasedFullName)}
                          className="p-1.5 hover:bg-slate-700 text-rose-400 rounded-lg transition cursor-pointer"
                          title="Eliminar Registro"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal (Nuevo / Editar Servicio) */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <HeartHandshake className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-bold text-base text-white">
                    {editingRecord ? 'Editar Registro Necrológico' : 'Nuevo Registro de Servicio Necrológico'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Municipalidad de Itá Ibaté • Secretaría de Desarrollo Social y Humano
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowFormModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              {/* Sección 1: Datos del Fallecido */}
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-3">
                <h4 className="font-bold text-rose-400 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  1. Datos del Fallecido
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-slate-300 font-medium mb-1">Nombre Completo (*)</label>
                    <input
                      type="text"
                      required
                      value={formData.deceasedFullName}
                      onChange={(e) => setFormData({ ...formData, deceasedFullName: e.target.value })}
                      placeholder="Ej. Juan Carlos Almada"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">DNI del Fallecido (*)</label>
                    <input
                      type="text"
                      required
                      value={formData.deceasedDni}
                      onChange={(e) => setFormData({ ...formData, deceasedDni: e.target.value })}
                      placeholder="Ej. 28.123.456"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Edad al fallecer</label>
                    <input
                      type="number"
                      value={formData.deceasedAge}
                      onChange={(e) => setFormData({ ...formData, deceasedAge: e.target.value })}
                      placeholder="Ej. 72"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Fecha de Defunción</label>
                    <input
                      type="date"
                      required
                      value={formData.deathDate}
                      onChange={(e) => setFormData({ ...formData, deathDate: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">N° Certificado Defunción</label>
                    <input
                      type="text"
                      value={formData.deathCertificateNumber}
                      onChange={(e) => setFormData({ ...formData, deathCertificateNumber: e.target.value })}
                      placeholder="Ej. ACTA-00894"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Causa de Defunción</label>
                  <input
                    type="text"
                    value={formData.causeOfDeath}
                    onChange={(e) => setFormData({ ...formData, causeOfDeath: e.target.value })}
                    placeholder="Ej. Paro cardiorrespiratorio / Causa natural"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Sección 2: Datos del Familiar Solicitante */}
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-3">
                <h4 className="font-bold text-sky-400 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  2. Familiar o Solicitante Responsable
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-slate-300 font-medium mb-1">Nombre Completo del Familiar (*)</label>
                    <input
                      type="text"
                      required
                      value={formData.familyContactName}
                      onChange={(e) => setFormData({ ...formData, familyContactName: e.target.value })}
                      placeholder="Ej. Carlos María Almada"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">DNI del Familiar (*)</label>
                    <input
                      type="text"
                      required
                      value={formData.familyContactDni}
                      onChange={(e) => setFormData({ ...formData, familyContactDni: e.target.value })}
                      placeholder="Ej. 34.567.890"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Parentesco</label>
                    <select
                      value={formData.familyRelationship}
                      onChange={(e) => setFormData({ ...formData, familyRelationship: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-sky-500"
                    >
                      <option value="Hijo/a">Hijo/a</option>
                      <option value="Cónyuge">Cónyuge</option>
                      <option value="Padre/Madre">Padre/Madre</option>
                      <option value="Hermano/a">Hermano/a</option>
                      <option value="Nieto/a">Nieto/a</option>
                      <option value="Familiar a Cargo">Familiar a Cargo</option>
                      <option value="Vecino / Responsable">Vecino / Responsable</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Teléfono de Contacto</label>
                    <input
                      type="text"
                      value={formData.familyPhone}
                      onChange={(e) => setFormData({ ...formData, familyPhone: e.target.value })}
                      placeholder="Ej. 3781-456789"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Barrio de Itá Ibaté</label>
                    <select
                      value={formData.familyNeighborhood}
                      onChange={(e) => setFormData({ ...formData, familyNeighborhood: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-sky-500"
                    >
                      {ITA_IBATE_NEIGHBORHOODS.map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Domicilio del Solicitante</label>
                  <input
                    type="text"
                    value={formData.familyAddress}
                    onChange={(e) => setFormData({ ...formData, familyAddress: e.target.value })}
                    placeholder="Ej. Av. San Martín 450"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Sección 3: Cajón / Féretro Provisto */}
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-amber-400 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5" />
                    3. Registro de Féretro / Cajón Provisto
                  </h4>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.usedCasket}
                      onChange={(e) => setFormData({ ...formData, usedCasket: e.target.checked })}
                      className="rounded border-slate-700 text-rose-600 focus:ring-0"
                    />
                    <span className="text-xs text-slate-300 font-semibold">¿Se proveyó féretro municipal?</span>
                  </label>
                </div>

                {formData.usedCasket && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Tipo de Cajón</label>
                      <select
                        value={formData.casketType}
                        onChange={(e) => setFormData({ ...formData, casketType: e.target.value as any })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-amber-500"
                      >
                        {CASKET_TYPES.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1">N° de Serie / Remito</label>
                      <input
                        type="text"
                        value={formData.casketCodeOrModel}
                        onChange={(e) => setFormData({ ...formData, casketCodeOrModel: e.target.value })}
                        placeholder="Ej. CJ-2026-045"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="flex items-center pt-5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.casketCostExempted}
                          onChange={(e) => setFormData({ ...formData, casketCostExempted: e.target.checked })}
                          className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                        />
                        <span className="text-xs text-emerald-300 font-medium">Exención 100% Social (Gratuito)</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Sección 4: Asignación de Nicho en Cementerio */}
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-purple-400 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    4. Asignación de Nicho en Cementerio Municipal
                  </h4>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.assignedNiche}
                      onChange={(e) => setFormData({ ...formData, assignedNiche: e.target.checked })}
                      className="rounded border-slate-700 text-purple-600 focus:ring-0"
                    />
                    <span className="text-xs text-slate-300 font-semibold">¿Se asigna nicho municipal?</span>
                  </label>
                </div>

                {formData.assignedNiche && (
                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-300 font-medium mb-1">Sector o Pabellón</label>
                        <input
                          type="text"
                          value={formData.nicheSectorOrPavilion}
                          onChange={(e) => setFormData({ ...formData, nicheSectorOrPavilion: e.target.value })}
                          placeholder="Ej. Pabellón A / Sector San Cayetano"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 font-medium mb-1">Nivel o Fila</label>
                        <input
                          type="text"
                          value={formData.nicheRowOrLevel}
                          onChange={(e) => setFormData({ ...formData, nicheRowOrLevel: e.target.value })}
                          placeholder="Ej. Fila 2 - Nivel Medio"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 font-medium mb-1">N° de Nicho o Parcela (*)</label>
                        <input
                          type="text"
                          required
                          value={formData.nicheNumber}
                          onChange={(e) => setFormData({ ...formData, nicheNumber: e.target.value })}
                          placeholder="Ej. Nicho N° 45"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-300 font-medium mb-1">Condición de Nicho</label>
                        <select
                          value={formData.nicheStatus}
                          onChange={(e) => setFormData({ ...formData, nicheStatus: e.target.value as any })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-purple-500"
                        >
                          {NICHE_STATUSES.map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-300 font-medium mb-1">Fecha de Inhumación</label>
                        <input
                          type="date"
                          value={formData.burialDate}
                          onChange={(e) => setFormData({ ...formData, burialDate: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 font-medium mb-1">Vencimiento Concesión</label>
                        <input
                          type="date"
                          value={formData.concessionExpirationDate}
                          onChange={(e) => setFormData({ ...formData, concessionExpirationDate: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Sección 5: Funcionario Autorizante y Notas */}
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Funcionario que Autoriza</label>
                    <input
                      type="text"
                      required
                      value={formData.responsibleOfficer}
                      onChange={(e) => setFormData({ ...formData, responsibleOfficer: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Fecha del Servicio</label>
                    <input
                      type="date"
                      required
                      value={formData.serviceDate}
                      onChange={(e) => setFormData({ ...formData, serviceDate: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Observaciones / Antecedentes</label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Detalles de la asistencia social, informe de trabajadora social o situación de la familia..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Botones de acción */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-semibold shadow-md shadow-rose-900/30 transition cursor-pointer"
                >
                  {editingRecord ? 'Guardar Cambios' : 'Registrar Servicio Necrológico'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Sheet Modal (Acta Oficial Imprimible / PDF) */}
      {printRecord && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl max-w-3xl w-full p-8 shadow-2xl space-y-6 my-8 print:m-0 print:p-4 print:shadow-none print:w-full">
            {/* Action Bar (hidden in print) */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 print:hidden">
              <span className="font-bold text-slate-700 text-sm">
                Acta Oficial de Asistencia Necrológica • Lista para Imprimir / PDF
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir Documento
                </button>
                <button
                  onClick={() => setPrintRecord(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-semibold text-xs cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>

            {/* Official Municipal Letterhead */}
            <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold text-xl shadow">
                  MII
                </div>
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none uppercase">
                    MUNICIPALIDAD DE ITÁ IBATÉ
                  </h1>
                  <p className="text-xs font-bold text-rose-900 uppercase tracking-widest mt-1">
                    SECRETARÍA DE DESARROLLO SOCIAL Y HUMANO
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Dirección General de Asistencia Social Inmediata • Registro Necrológico Municipal
                  </p>
                </div>
              </div>

              <div className="text-right text-xs text-slate-600 space-y-0.5">
                <div>Acta N°: <strong className="font-mono text-slate-900">{printRecord.actNumber}</strong></div>
                <div>Fecha de Emisión: <strong>{new Date().toLocaleDateString('es-AR')}</strong></div>
                <div>Lugar: <strong>Itá Ibaté, Corrientes</strong></div>
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center py-1">
              <h2 className="text-lg font-extrabold text-slate-900 uppercase tracking-tight">
                CONSTANCIA DE ASISTENCIA SOCIAL DE SEPELIO Y ADJUDICACIÓN DE NICHO
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Expediente Municipal de Acción Social • Asistencia Comunitaria
              </p>
            </div>

            {/* Sections of the act */}
            <div className="space-y-4 text-xs text-slate-800">
              {/* Fallecido */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <h3 className="font-bold text-slate-900 uppercase text-[11px] border-b border-slate-200 pb-1">
                  1. Datos del Extinto / Fallecido
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div><strong>Nombre y Apellido:</strong> {printRecord.deceasedFullName}</div>
                  <div><strong>DNI:</strong> {printRecord.deceasedDni}</div>
                  <div><strong>Edad:</strong> {printRecord.deceasedAge ? `${printRecord.deceasedAge} años` : 'No especificada'}</div>
                  <div><strong>Fecha de Defunción:</strong> {printRecord.deathDate}</div>
                  <div><strong>Certificado de Defunción N°:</strong> {printRecord.deathCertificateNumber || 'En trámite'}</div>
                  <div><strong>Causa:</strong> {printRecord.causeOfDeath || 'Causa médica natural'}</div>
                </div>
              </div>

              {/* Familiar */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <h3 className="font-bold text-slate-900 uppercase text-[11px] border-b border-slate-200 pb-1">
                  2. Familiar o Solicitante Responsable
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div><strong>Familiar Responsable:</strong> {printRecord.familyContactName}</div>
                  <div><strong>DNI:</strong> {printRecord.familyContactDni}</div>
                  <div><strong>Parentesco:</strong> {printRecord.familyRelationship}</div>
                  <div><strong>Teléfono:</strong> {printRecord.familyPhone}</div>
                  <div><strong>Domicilio:</strong> {printRecord.familyAddress}</div>
                  <div><strong>Barrio:</strong> {printRecord.familyNeighborhood || 'Itá Ibaté'}</div>
                </div>
              </div>

              {/* Disposición del Servicio */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <h3 className="font-bold text-slate-900 uppercase text-[11px] border-b border-slate-200 pb-1">
                    3. Detalle de Féretro / Cajón
                  </h3>
                  <div><strong>Cajón Otorgado:</strong> {printRecord.usedCasket ? 'SÍ, provisto por el Municipio' : 'NO (provisto por terceros/seguro)'}</div>
                  {printRecord.usedCasket && (
                    <>
                      <div><strong>Modelo/Tipo:</strong> {printRecord.casketType}</div>
                      <div><strong>N° de Serie / Control:</strong> {printRecord.casketCodeOrModel || 'CJ-REG-OFICIAL'}</div>
                      <div><strong>Régimen:</strong> Subsidio Social 100% (Exento de arancel)</div>
                    </>
                  )}
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <h3 className="font-bold text-slate-900 uppercase text-[11px] border-b border-slate-200 pb-1">
                    4. Inhumación en Cementerio Municipal
                  </h3>
                  <div><strong>Nicho Asignado:</strong> {printRecord.assignedNiche ? printRecord.nicheNumber : 'Sin asignación de nicho'}</div>
                  {printRecord.assignedNiche && (
                    <>
                      <div><strong>Ubicación:</strong> {printRecord.nicheSectorOrPavilion} {printRecord.nicheRowOrLevel ? `(${printRecord.nicheRowOrLevel})` : ''}</div>
                      <div><strong>Condición:</strong> {printRecord.nicheStatus === 'A_PERPETUIDAD' ? 'A Perpetuidad' : 'Concesión Temporal'}</div>
                      <div><strong>Fecha de Inhumación:</strong> {printRecord.burialDate || printRecord.serviceDate}</div>
                      {printRecord.concessionExpirationDate && (
                        <div><strong>Vencimiento Concesión:</strong> {printRecord.concessionExpirationDate}</div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {printRecord.notes && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <strong>Observaciones:</strong> {printRecord.notes}
                </div>
              )}
            </div>

            {/* Official Signatures Footer */}
            <div className="pt-12 grid grid-cols-2 gap-12 text-center text-xs">
              <div className="border-t border-slate-400 pt-2">
                <p className="font-bold text-slate-900">Firma y Aclaración del Familiar Solicitante</p>
                <p className="text-[11px] text-slate-500">DNI: {printRecord.familyContactDni}</p>
              </div>

              <div className="border-t border-slate-400 pt-2">
                <p className="font-bold text-slate-900">Firma y Sello de Autoridad Municipal</p>
                <p className="text-[11px] text-slate-500">{printRecord.responsibleOfficer}</p>
                <p className="text-[10px] text-slate-400">Municipalidad de Itá Ibaté - Corrientes</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
