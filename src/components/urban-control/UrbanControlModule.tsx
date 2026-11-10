import React, { useState } from 'react';
import { useMunicipalData } from '../../context/MunicipalDataContext';
import { useAuth } from '../../context/AuthContext';
import { ITA_IBATE_NEIGHBORHOODS } from '../../data/initialData';
import { 
  DriversLicenseRecord, 
  TrafficFineRecord, 
  CommercialLicenseRecord, 
  TrafficCheckpointRecord,
  LicenseCategory,
  LicenseProcedureType,
  LicenseStatus,
  InfractionGravity,
  InfractionStatus,
  BusinessCategory,
  CommercialLicenseStatus,
  CheckpointType,
  CheckpointShift
} from '../../types';
import { 
  Shield, 
  Car, 
  FileWarning, 
  Store, 
  Radio, 
  Search, 
  Plus, 
  Download, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  X, 
  Eye, 
  DollarSign, 
  Calendar, 
  MapPin, 
  User, 
  FileText,
  BadgeAlert,
  ArrowRight
} from 'lucide-react';
import { 
  exportDriversLicensesToExcel, 
  exportTrafficFinesToExcel, 
  exportCommercialLicensesToExcel, 
  exportTrafficCheckpointsToExcel 
} from '../../lib/excelUtils';

export const UrbanControlModule: React.FC = () => {
  const { 
    driversLicenses, 
    addDriversLicense, 
    updateDriversLicense,
    trafficFines, 
    addTrafficFine, 
    updateTrafficFine,
    commercialLicenses, 
    addCommercialLicense, 
    updateCommercialLicense,
    trafficCheckpoints, 
    addTrafficCheckpoint,
    urbanControlKPIs,
    findCitizenByDni 
  } = useMunicipalData();

  const { maskSensitiveData } = useAuth();

  // Active sub-section
  const [activeTab, setActiveTab] = useState<'LICENSES' | 'FINES' | 'COMMERCIAL' | 'CHECKPOINTS'>('LICENSES');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterNeighborhood, setFilterNeighborhood] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Modals
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [showFineModal, setShowFineModal] = useState(false);
  const [showCommercialModal, setShowCommercialModal] = useState(false);
  const [showCheckpointModal, setShowCheckpointModal] = useState(false);

  // Printable Document Modals
  const [printLicense, setPrintLicense] = useState<DriversLicenseRecord | null>(null);
  const [printFine, setPrintFine] = useState<TrafficFineRecord | null>(null);
  const [printCommercial, setPrintCommercial] = useState<CommercialLicenseRecord | null>(null);

  // 1. Carnets Form State
  const [licenseForm, setLicenseForm] = useState<{
    licenseNumber: string;
    citizenName: string;
    citizenDni: string;
    citizenPhone: string;
    citizenAddress: string;
    citizenNeighborhood: string;
    procedureType: LicenseProcedureType;
    category: LicenseCategory;
    vehicleType: string;
    issueDate: string;
    expirationDate: string;
    medicalExamPassed: boolean;
    theoreticalExamScore: number;
    practicalExamScore: number;
    status: LicenseStatus;
    feeAmount: number;
    isFeePaid: boolean;
    officerInCharge: string;
    notes: string;
  }>({
    licenseNumber: '',
    citizenName: '',
    citizenDni: '',
    citizenPhone: '',
    citizenAddress: '',
    citizenNeighborhood: ITA_IBATE_NEIGHBORHOODS[0],
    procedureType: 'RENOVACION',
    category: 'B1',
    vehicleType: 'Automóvil particular',
    issueDate: new Date().toISOString().split('T')[0],
    expirationDate: new Date(new Date().setFullYear(new Date().getFullYear() + 5)).toISOString().split('T')[0],
    medicalExamPassed: true,
    theoreticalExamScore: 90,
    practicalExamScore: 90,
    status: 'ENTREGADO',
    feeAmount: 8500,
    isFeePaid: true,
    officerInCharge: 'Comisario (R) Hugo Ojeda',
    notes: ''
  });

  // 2. Multas Form State
  const [fineForm, setFineForm] = useState<{
    actNumber: string;
    date: string;
    time: string;
    location: string;
    neighborhood: string;
    infractorName: string;
    infractorDni: string;
    infractorPhone: string;
    vehiclePlate: string;
    vehicleBrandModel: string;
    infractionType: string;
    gravity: InfractionGravity;
    amount: number;
    discountEarlyPaymentAmount: number;
    status: InfractionStatus;
    vehicleImpounded: boolean;
    impoundLotNumber: string;
    officerBadge: string;
    notes: string;
  }>({
    actNumber: `ACTA-${Math.floor(1000 + Math.random() * 9000)}`,
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().substring(0, 5),
    location: 'Av. San Martín y Belgrano',
    neighborhood: ITA_IBATE_NEIGHBORHOODS[0],
    infractorName: '',
    infractorDni: '',
    infractorPhone: '',
    vehiclePlate: '',
    vehicleBrandModel: '',
    infractionType: 'Falta de casco protector reglamentario',
    gravity: 'GRAVE',
    amount: 35000,
    discountEarlyPaymentAmount: 17500,
    status: 'ACTIVA',
    vehicleImpounded: false,
    impoundLotNumber: '',
    officerBadge: 'Insp. Leg. 104 - Hugo Ojeda',
    notes: ''
  });

  // 3. Habilitaciones Form State
  const [commercialForm, setCommercialForm] = useState<{
    expedientNumber: string;
    businessName: string;
    ownerName: string;
    ownerDniOrCuit: string;
    phone: string;
    email: string;
    commercialAddress: string;
    neighborhood: string;
    category: BusinessCategory;
    rubroDescription: string;
    surfaceSquareMeters: number;
    fireSafetyInspectionPassed: boolean;
    sanitaryBromathologyInspectionPassed: boolean;
    authorizationDate: string;
    expirationDate: string;
    annualFee: number;
    status: CommercialLicenseStatus;
    inspectorsNotes: string;
  }>({
    expedientNumber: `EXP-COM-2026-${Math.floor(100 + Math.random() * 900)}`,
    businessName: '',
    ownerName: '',
    ownerDniOrCuit: '',
    phone: '',
    email: '',
    commercialAddress: '',
    neighborhood: ITA_IBATE_NEIGHBORHOODS[0],
    category: 'COMERCIAL',
    rubroDescription: '',
    surfaceSquareMeters: 80,
    fireSafetyInspectionPassed: true,
    sanitaryBromathologyInspectionPassed: true,
    authorizationDate: new Date().toISOString().split('T')[0],
    expirationDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    annualFee: 45000,
    status: 'HABILITADO',
    inspectorsNotes: ''
  });

  // 4. Operativos Form State
  const [checkpointForm, setCheckpointForm] = useState<{
    date: string;
    location: string;
    neighborhood: string;
    type: CheckpointType;
    shift: CheckpointShift;
    leadOfficer: string;
    inspectorsCount: number;
    policeSupport: boolean;
    vehiclesChecked: number;
    motorcyclesChecked: number;
    carsTrucksChecked: number;
    breathalyzerTestsCount: number;
    positiveBreathalyzerCount: number;
    finesIssuedCount: number;
    impoundedVehiclesCount: number;
    summaryObservations: string;
  }>({
    date: new Date().toISOString().split('T')[0],
    location: 'Acceso a Itá Ibaté - Ruta Nacional 118',
    neighborhood: ITA_IBATE_NEIGHBORHOODS[11],
    type: 'CONTROL_GENERAL_VEHICULAR',
    shift: 'TARDE',
    leadOfficer: 'Comisario (R) Hugo Ojeda',
    inspectorsCount: 4,
    policeSupport: true,
    vehiclesChecked: 120,
    motorcyclesChecked: 50,
    carsTrucksChecked: 70,
    breathalyzerTestsCount: 15,
    positiveBreathalyzerCount: 0,
    finesIssuedCount: 4,
    impoundedVehiclesCount: 1,
    summaryObservations: ''
  });

  const maskDni = (dni: string) => {
    if (!maskSensitiveData) return dni;
    const clean = dni.replace(/[^0-9]/g, '');
    if (clean.length < 5) return '***';
    return `${clean.substring(0, 2)}.${'*'.repeat(3)}.${clean.substring(clean.length - 3)}`;
  };

  // Helper autofill from citizens registry
  const handleCitizenDniLookup = (dni: string, targetForm: 'LICENSE' | 'FINE') => {
    const cit = findCitizenByDni(dni);
    if (targetForm === 'LICENSE') {
      setLicenseForm(prev => ({
        ...prev,
        citizenDni: dni,
        citizenName: cit ? cit.fullName : prev.citizenName,
        citizenPhone: cit ? cit.phone : prev.citizenPhone,
        citizenAddress: cit ? cit.address : prev.citizenAddress,
        citizenNeighborhood: cit ? cit.neighborhood : prev.citizenNeighborhood
      }));
    } else {
      setFineForm(prev => ({
        ...prev,
        infractorDni: dni,
        infractorName: cit ? cit.fullName : prev.infractorName,
        infractorPhone: cit ? cit.phone : prev.infractorPhone,
        neighborhood: cit ? cit.neighborhood : prev.neighborhood
      }));
    }
  };

  // Form submit handlers
  const handleSaveLicense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseForm.citizenName || !licenseForm.citizenDni) {
      alert('Complete los datos obligatorios del ciudadano.');
      return;
    }
    const generatedLicNum = licenseForm.licenseNumber.trim() || `W-${licenseForm.citizenDni.replace(/[^0-9]/g, '')}`;
    addDriversLicense({
      ...licenseForm,
      licenseNumber: generatedLicNum
    });
    setShowLicenseModal(false);
    alert(`Carnet registrado con éxito: ${generatedLicNum}`);
  };

  const handleSaveFine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fineForm.infractorName || !fineForm.vehiclePlate) {
      alert('Ingrese el nombre del infractor y la patente del vehículo.');
      return;
    }
    addTrafficFine(fineForm);
    setShowFineModal(false);
    alert(`Acta de infracción registrada con éxito: ${fineForm.actNumber}`);
  };

  const handleSaveCommercial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commercialForm.businessName || !commercialForm.ownerName) {
      alert('Ingrese la denominación comercial y el titular.');
      return;
    }
    addCommercialLicense({
      ...commercialForm,
      certificatePrinted: true
    });
    setShowCommercialModal(false);
    alert(`Habilitación comercial registrada con éxito: ${commercialForm.businessName}`);
  };

  const handleSaveCheckpoint = (e: React.FormEvent) => {
    e.preventDefault();
    addTrafficCheckpoint(checkpointForm);
    setShowCheckpointModal(false);
    alert(`Operativo de control vial registrado con éxito.`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Introduction */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-sky-400">
              <Shield className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Control Urbano y Seguridad Vial
            </h2>
            <span className="px-2.5 py-0.5 text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-full uppercase">
              Dirección General de Seguridad Ciudadana (Art. 16)
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Gestión de carnets de conducir con número oficial, actas de multas, habilitaciones comerciales y operativos de control vehicular en Itá Ibaté.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'LICENSES' && (
            <button
              onClick={() => setShowLicenseModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-md transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Trámite de Carnet</span>
            </button>
          )}

          {activeTab === 'FINES' && (
            <button
              onClick={() => setShowFineModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-md transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Labrar Acta de Multa</span>
            </button>
          )}

          {activeTab === 'COMMERCIAL' && (
            <button
              onClick={() => setShowCommercialModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Habilitación Comercial</span>
            </button>
          )}

          {activeTab === 'CHECKPOINTS' && (
            <button
              onClick={() => setShowCheckpointModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold shadow-md transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Operativo Vial</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 KPI Indicator Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Carnets */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">Carnets de Conducir</span>
            <Car className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {urbanControlKPIs.totalLicenses}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
            <span>Entregados: <strong className="text-emerald-400">{urbanControlKPIs.deliveredLicenses}</strong></span>
            <span>En Trámite: <strong className="text-sky-400">{urbanControlKPIs.inProgressLicenses}</strong></span>
          </div>
        </div>

        {/* KPI 2: Multas */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">Actas de Infracción</span>
            <FileWarning className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400 tracking-tight">
            {urbanControlKPIs.totalFines}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
            <span>Activas: <strong className="text-amber-400">{urbanControlKPIs.activeFines}</strong></span>
            <span>Retenciones: <strong className="text-rose-400">{urbanControlKPIs.impoundedVehiclesTotal}</strong></span>
          </div>
        </div>

        {/* KPI 3: Habilitaciones */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">Comercios Habilitados</span>
            <Store className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 tracking-tight">
            {urbanControlKPIs.totalBusinessesHabilitated}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
            <span>Vigentes en regla</span>
            <span>En trámite: <strong className="text-slate-200">{urbanControlKPIs.totalBusinessesInProgress}</strong></span>
          </div>
        </div>

        {/* KPI 4: Operativos Viales */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">Operativos Viales</span>
            <Radio className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 tracking-tight">
            {urbanControlKPIs.totalCheckpoints}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
            <span>Vehículos: <strong className="text-slate-200">{urbanControlKPIs.totalVehiclesControlled}</strong></span>
            <span>Alcoholemias: <strong className="text-rose-400">{urbanControlKPIs.totalBreathalyzerPositive}</strong></span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 overflow-x-auto gap-2">
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => { setActiveTab('LICENSES'); setFilterStatus('ALL'); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'LICENSES'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            <span>Carnets de Conducir ({driversLicenses.length})</span>
          </button>

          <button
            onClick={() => { setActiveTab('FINES'); setFilterStatus('ALL'); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'FINES'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileWarning className="w-3.5 h-3.5" />
            <span>Infracciones y Multas ({trafficFines.length})</span>
          </button>

          <button
            onClick={() => { setActiveTab('COMMERCIAL'); setFilterStatus('ALL'); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'COMMERCIAL'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Habilitación Municipal ({commercialLicenses.length})</span>
          </button>

          <button
            onClick={() => { setActiveTab('CHECKPOINTS'); setFilterStatus('ALL'); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'CHECKPOINTS'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Operativos de Control Vial ({trafficCheckpoints.length})</span>
          </button>
        </div>

        {/* Export Excel Button for Current Active Tab */}
        <div className="shrink-0">
          <button
            onClick={() => {
              if (activeTab === 'LICENSES') exportDriversLicensesToExcel(driversLicenses);
              if (activeTab === 'FINES') exportTrafficFinesToExcel(trafficFines);
              if (activeTab === 'COMMERCIAL') exportCommercialLicensesToExcel(commercialLicenses);
              if (activeTab === 'CHECKPOINTS') exportTrafficCheckpointsToExcel(trafficCheckpoints);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold cursor-pointer border border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Exportar Excel</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-wrap items-center gap-3 text-xs">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder={
              activeTab === 'LICENSES' ? "Buscar por N° Carnet, DNI o Nombre de vecino..." :
              activeTab === 'FINES' ? "Buscar por N° Acta, Patente, Infractor o DNI..." :
              activeTab === 'COMMERCIAL' ? "Buscar por Comercio, Expediente o Titular..." :
              "Buscar por Puesto, Ubicación o Turno..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterNeighborhood}
            onChange={(e) => setFilterNeighborhood(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-sky-500"
          >
            <option value="ALL">Todos los Barrios</option>
            {ITA_IBATE_NEIGHBORHOODS.map(nh => (
              <option key={nh} value={nh}>{nh}</option>
            ))}
          </select>
        </div>
      </div>

      {/* SUB-VIEW 1: CARNETS DE CONDUCIR */}
      {activeTab === 'LICENSES' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-3.5 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Registro Oficial de Carnets de Conducir Emitidos</span>
            <span className="text-[11px] text-slate-500">Número de Carnet Oficial con Validación</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/20 text-slate-400 uppercase text-[10px] font-semibold">
                  <th className="py-3 px-3.5">N° Carnet</th>
                  <th className="py-3 px-3">Titular / Conductor</th>
                  <th className="py-3 px-3">Categoría / Clase</th>
                  <th className="py-3 px-3">Trámite</th>
                  <th className="py-3 px-3">Vigencia</th>
                  <th className="py-3 px-3">Exámenes</th>
                  <th className="py-3 px-3">Estado</th>
                  <th className="py-3 px-3 text-right">Comprobante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {driversLicenses
                  .filter(l => {
                    if (filterNeighborhood !== 'ALL' && l.citizenNeighborhood !== filterNeighborhood) return false;
                    if (!searchQuery) return true;
                    const q = searchQuery.toLowerCase();
                    return l.licenseNumber.toLowerCase().includes(q) ||
                           l.citizenName.toLowerCase().includes(q) ||
                           l.citizenDni.includes(q) ||
                           l.recordNumber.toLowerCase().includes(q);
                  })
                  .map(lic => (
                    <tr key={lic.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-3.5">
                        <div className="font-mono font-bold text-sky-400">
                          {lic.licenseNumber}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {lic.recordNumber}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-bold text-white">
                          {lic.citizenName}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          DNI: <span className="font-mono text-slate-300">{maskDni(lic.citizenDni)}</span> • {lic.citizenNeighborhood}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-sky-300 font-bold font-mono">
                          Clase {lic.category}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[150px]">
                          {lic.vehicleType}
                        </div>
                      </td>

                      <td className="py-3 px-3 font-semibold text-slate-300">
                        {lic.procedureType}
                      </td>

                      <td className="py-3 px-3 text-[11px]">
                        <div>Desde: <span className="text-slate-300">{lic.issueDate}</span></div>
                        <div>Vence: <strong className="text-amber-300">{lic.expirationDate}</strong></div>
                      </td>

                      <td className="py-3 px-3 text-[11px]">
                        <div className="flex items-center gap-1 text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Psicofísico</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Teórico: {lic.theoreticalExamScore ?? '-'}% | Práctico: {lic.practicalExamScore ?? '-'}%
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          lic.status === 'ENTREGADO' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                          lic.status === 'EMITIDO' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' :
                          lic.status === 'EN_TRAMITE' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                          'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}>
                          {lic.status}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => setPrintLicense(lic)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer border border-slate-700"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Ver Carnet</span>
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: INFRACCIONES Y MULTAS */}
      {activeTab === 'FINES' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-3.5 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Actas de Infracción y Multas de Tránsito</span>
            <span className="text-[11px] text-slate-500">Control de Patentes, Alcoholemias y Corralón Municipal</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/20 text-slate-400 uppercase text-[10px] font-semibold">
                  <th className="py-3 px-3.5">N° Acta / Multa</th>
                  <th className="py-3 px-3">Fecha y Lugar</th>
                  <th className="py-3 px-3">Infractor / DNI</th>
                  <th className="py-3 px-3">Vehículo / Patente</th>
                  <th className="py-3 px-3">Infracción / Causa</th>
                  <th className="py-3 px-3">Importe</th>
                  <th className="py-3 px-3">Estado</th>
                  <th className="py-3 px-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {trafficFines
                  .filter(f => {
                    if (filterNeighborhood !== 'ALL' && f.neighborhood !== filterNeighborhood) return false;
                    if (!searchQuery) return true;
                    const q = searchQuery.toLowerCase();
                    return f.actNumber.toLowerCase().includes(q) ||
                           f.vehiclePlate.toLowerCase().includes(q) ||
                           f.infractorName.toLowerCase().includes(q) ||
                           f.infractorDni.includes(q);
                  })
                  .map(fine => (
                    <tr key={fine.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-3.5">
                        <div className="font-mono font-bold text-rose-400">
                          {fine.actNumber}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {fine.fineNumber}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-[11px]">
                        <div className="font-semibold text-slate-200">{fine.date} - {fine.time} hs</div>
                        <div className="text-slate-400">{fine.location}</div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-bold text-white">{fine.infractorName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">DNI: {maskDni(fine.infractorDni)}</div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-white px-2 py-0.5 bg-slate-950 border border-slate-700 rounded inline-block">
                          {fine.vehiclePlate}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{fine.vehicleBrandModel}</div>
                        {fine.vehicleImpounded && (
                          <span className="inline-block mt-1 text-[9px] px-1.5 py-0.2 rounded bg-rose-950/80 text-rose-300 border border-rose-600/40 font-bold">
                            Corralón: {fine.impoundLotNumber || 'Retenido'}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 max-w-[200px]">
                        <div className="font-medium text-slate-200">{fine.infractionType}</div>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                          fine.gravity === 'MUY_GRAVE' ? 'bg-rose-900/40 text-rose-300 border border-rose-500/30' :
                          fine.gravity === 'GRAVE' ? 'bg-amber-900/40 text-amber-300 border border-amber-500/30' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {fine.gravity}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-white">
                          ${fine.amount.toLocaleString('es-AR')}
                        </div>
                        {fine.discountEarlyPaymentAmount && fine.status !== 'PAGADA' && (
                          <div className="text-[10px] text-emerald-400 font-mono">
                            Pago Vol: ${fine.discountEarlyPaymentAmount.toLocaleString('es-AR')}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          fine.status === 'PAGADA' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                          fine.status === 'ACTIVA' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                          fine.status === 'NOTIFICADA' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                          'bg-slate-800 text-slate-300'
                        }`}>
                          {fine.status}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => setPrintFine(fine)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-rose-400 hover:text-rose-300 rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer border border-slate-700"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Acta Oficial</span>
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: HABILITACIONES MUNICIPALES */}
      {activeTab === 'COMMERCIAL' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-3.5 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Habilitaciones Municipales y Comercios</span>
            <span className="text-[11px] text-slate-500">Inspección de Bomberos, Bromatología y Seguridad Edilicia</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/20 text-slate-400 uppercase text-[10px] font-semibold">
                  <th className="py-3 px-3.5">N° Expediente</th>
                  <th className="py-3 px-3">Comercio / Denominación</th>
                  <th className="py-3 px-3">Titular / CUIT</th>
                  <th className="py-3 px-3">Rubro / Categoría</th>
                  <th className="py-3 px-3">Inspecciones</th>
                  <th className="py-3 px-3">Vigencia Anual</th>
                  <th className="py-3 px-3">Estado</th>
                  <th className="py-3 px-3 text-right">Certificado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {commercialLicenses
                  .filter(c => {
                    if (filterNeighborhood !== 'ALL' && c.neighborhood !== filterNeighborhood) return false;
                    if (!searchQuery) return true;
                    const q = searchQuery.toLowerCase();
                    return c.businessName.toLowerCase().includes(q) ||
                           c.ownerName.toLowerCase().includes(q) ||
                           c.expedientNumber.toLowerCase().includes(q) ||
                           c.rubroDescription.toLowerCase().includes(q);
                  })
                  .map(com => (
                    <tr key={com.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-3.5">
                        <div className="font-mono font-bold text-emerald-400">{com.expedientNumber}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{com.recordNumber}</div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-bold text-white">{com.businessName}</div>
                        <div className="text-[11px] text-slate-400">{com.commercialAddress} • {com.neighborhood}</div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-200">{com.ownerName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{com.ownerDniOrCuit}</div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 border border-slate-700 text-slate-300">
                          {com.category}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[170px]">{com.rubroDescription}</div>
                      </td>

                      <td className="py-3 px-3 text-[11px] space-y-0.5">
                        <div className={`flex items-center gap-1 ${com.fireSafetyInspectionPassed ? 'text-emerald-400' : 'text-amber-400'}`}>
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Bomberos: {com.fireSafetyInspectionPassed ? 'Aprobado' : 'Pendiente'}</span>
                        </div>
                        <div className={`flex items-center gap-1 ${com.sanitaryBromathologyInspectionPassed ? 'text-emerald-400' : 'text-amber-400'}`}>
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Bromatología: {com.sanitaryBromathologyInspectionPassed ? 'Aprobado' : 'Pendiente'}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-[11px]">
                        <div>Desde: {com.authorizationDate}</div>
                        <div>Vence: <strong className="text-amber-300">{com.expirationDate}</strong></div>
                      </td>

                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          com.status === 'HABILITADO' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                          com.status === 'EN_TRAMITE' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                          'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}>
                          {com.status}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => setPrintCommercial(com)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer border border-slate-700"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Certificado</span>
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-VIEW 4: OPERATIVOS DE CONTROL VIAL */}
      {activeTab === 'CHECKPOINTS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-3.5 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Operativos de Control Vial y Puestos Móviles</span>
            <span className="text-[11px] text-slate-500">Motos, Vehículos, Test de Alcoholemia y Retenciones</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/20 text-slate-400 uppercase text-[10px] font-semibold">
                  <th className="py-3 px-3.5">Código Operativo</th>
                  <th className="py-3 px-3">Fecha y Puesto</th>
                  <th className="py-3 px-3">Tipo / Turno</th>
                  <th className="py-3 px-3">Oficial a Cargo</th>
                  <th className="py-3 px-3">Vehículos Inspeccionados</th>
                  <th className="py-3 px-3">Alcoholemias</th>
                  <th className="py-3 px-3">Resultados</th>
                  <th className="py-3 px-3">Observaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {trafficCheckpoints
                  .filter(c => {
                    if (filterNeighborhood !== 'ALL' && c.neighborhood !== filterNeighborhood) return false;
                    if (!searchQuery) return true;
                    const q = searchQuery.toLowerCase();
                    return c.checkpointCode.toLowerCase().includes(q) ||
                           c.location.toLowerCase().includes(q) ||
                           c.leadOfficer.toLowerCase().includes(q);
                  })
                  .map(chk => (
                    <tr key={chk.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-3.5 font-mono font-bold text-amber-400">
                        {chk.checkpointCode}
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-semibold text-white">{chk.date}</div>
                        <div className="text-[11px] text-slate-400">{chk.location}</div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 border border-slate-700 text-slate-200">
                          {chk.type.replace(/_/g, ' ')}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">Turno: {chk.shift}</div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-200">{chk.leadOfficer}</div>
                        <div className="text-[10px] text-slate-400">
                          {chk.inspectorsCount} inspectores {chk.policeSupport ? '• Apoyo Policial' : ''}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-bold text-white text-sm">
                          {chk.vehiclesChecked} vehículos
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {chk.motorcyclesChecked} motos • {chk.carsTrucksChecked} automotores
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-200">
                          {chk.breathalyzerTestsCount} pruebas
                        </div>
                        {chk.positiveBreathalyzerCount > 0 ? (
                          <span className="text-[10px] text-rose-400 font-bold">
                            ⚠️ {chk.positiveBreathalyzerCount} positivas
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-400">
                            0 positivas
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-[11px]">
                        <div>Actas: <strong className="text-amber-300">{chk.finesIssuedCount}</strong></div>
                        <div>Retenciones: <strong className="text-rose-400">{chk.impoundedVehiclesCount}</strong></div>
                      </td>

                      <td className="py-3 px-3 text-slate-400 max-w-[200px] text-[11px]">
                        {chk.summaryObservations || '-'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: NUEVO CARNET DE CONDUCIR (CON NÚMERO DE CARNET)                 */}
      {/* ========================================================================= */}
      {showLicenseModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-sky-400" />
                <div>
                  <h3 className="font-bold text-white text-base">
                    Trámite y Emisión de Carnet de Conducir
                  </h3>
                  <p className="text-xs text-slate-400">
                    Dirección General de Seguridad Ciudadana y Control Urbano – Itá Ibaté
                  </p>
                </div>
              </div>
              <button onClick={() => setShowLicenseModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLicense} className="space-y-4 text-xs">
              {/* Row 1: Citizen and DNI lookup */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <span className="font-bold text-slate-200 text-xs block">1. Datos del Titular</span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">DNI del Titular (*)</label>
                    <input
                      type="text"
                      required
                      placeholder="34..."
                      value={licenseForm.citizenDni}
                      onChange={(e) => handleCitizenDniLookup(e.target.value, 'LICENSE')}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono focus:border-sky-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-slate-300 font-medium mb-1">Nombre y Apellido Completo (*)</label>
                    <input
                      type="text"
                      required
                      placeholder="Nombre del vecino"
                      value={licenseForm.citizenName}
                      onChange={(e) => setLicenseForm({ ...licenseForm, citizenName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Teléfono de Contacto</label>
                    <input
                      type="text"
                      placeholder="3781-..."
                      value={licenseForm.citizenPhone}
                      onChange={(e) => setLicenseForm({ ...licenseForm, citizenPhone: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Domicilio</label>
                    <input
                      type="text"
                      placeholder="Calle y N°"
                      value={licenseForm.citizenAddress}
                      onChange={(e) => setLicenseForm({ ...licenseForm, citizenAddress: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Barrio de Itá Ibaté</label>
                    <select
                      value={licenseForm.citizenNeighborhood}
                      onChange={(e) => setLicenseForm({ ...licenseForm, citizenNeighborhood: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white"
                    >
                      {ITA_IBATE_NEIGHBORHOODS.map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Row 2: Carnet Identification & Categories */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <span className="font-bold text-slate-200 text-xs block">2. Número de Carnet y Categoría Habilitada</span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sky-400 font-bold mb-1">
                      Número de Carnet (*)
                    </label>
                    <input
                      type="text"
                      placeholder="W-34891204 (o dejar vacío p/ generar)"
                      value={licenseForm.licenseNumber}
                      onChange={(e) => setLicenseForm({ ...licenseForm, licenseNumber: e.target.value })}
                      className="w-full bg-slate-900 border border-sky-500/50 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold focus:border-sky-400"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">N° oficial registrado en base municipal</span>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Tipo de Trámite</label>
                    <select
                      value={licenseForm.procedureType}
                      onChange={(e) => setLicenseForm({ ...licenseForm, procedureType: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white"
                    >
                      <option value="RENOVACION">Renovación</option>
                      <option value="ORIGINAL">Original (Primera vez)</option>
                      <option value="DUPLICADO">Duplicado (Extravío/Deterioro)</option>
                      <option value="AMPLIACION">Ampliación de Categoría</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Clase / Categoría</label>
                    <select
                      value={licenseForm.category}
                      onChange={(e) => setLicenseForm({ ...licenseForm, category: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-mono font-bold"
                    >
                      <option value="A1">Clase A1 - Motos hasta 50cc</option>
                      <option value="A2">Clase A2 - Motos hasta 150cc</option>
                      <option value="B1">Clase B1 - Automóvil / Utilitario hasta 3500kg</option>
                      <option value="B2">Clase B2 - Automóvil con acoplado / lancha</option>
                      <option value="C1">Clase C1 - Camiones sin acoplado</option>
                      <option value="D1">Clase D1 - Transporte de Pasajeros</option>
                      <option value="E1">Clase E1 - Vehículos articulados / maquinaria</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Fecha de Emisión</label>
                    <input
                      type="date"
                      value={licenseForm.issueDate}
                      onChange={(e) => setLicenseForm({ ...licenseForm, issueDate: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Fecha de Vencimiento (5 años estándar)</label>
                    <input
                      type="date"
                      value={licenseForm.expirationDate}
                      onChange={(e) => setLicenseForm({ ...licenseForm, expirationDate: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: Evaluation & Status */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <span className="font-bold text-slate-200 text-xs block">3. Exámenes y Estado</span>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Examen Médico</label>
                    <select
                      value={licenseForm.medicalExamPassed ? 'SI' : 'NO'}
                      onChange={(e) => setLicenseForm({ ...licenseForm, medicalExamPassed: e.target.value === 'SI' })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white"
                    >
                      <option value="SI">Aprobado</option>
                      <option value="NO">No Aprobado / Pendiente</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Nota Teórico (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={licenseForm.theoreticalExamScore}
                      onChange={(e) => setLicenseForm({ ...licenseForm, theoreticalExamScore: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Nota Práctico (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={licenseForm.practicalExamScore}
                      onChange={(e) => setLicenseForm({ ...licenseForm, practicalExamScore: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Estado del Trámite</label>
                    <select
                      value={licenseForm.status}
                      onChange={(e) => setLicenseForm({ ...licenseForm, status: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-bold"
                    >
                      <option value="ENTREGADO">Entregado al Titular</option>
                      <option value="EMITIDO">Emitido (Para retirar)</option>
                      <option value="EN_TRAMITE">En Trámite</option>
                      <option value="RECHAZADO">Rechazado</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Tasa Municipal ($)</label>
                    <input
                      type="number"
                      value={licenseForm.feeAmount}
                      onChange={(e) => setLicenseForm({ ...licenseForm, feeAmount: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Oficial / Inspector Responsable</label>
                    <input
                      type="text"
                      value={licenseForm.officerInCharge}
                      onChange={(e) => setLicenseForm({ ...licenseForm, officerInCharge: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowLicenseModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-semibold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Car className="w-4 h-4" />
                  <span>Emitir y Registrar Carnet</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: LABRAR ACTA DE MULTA DE TRÁNSITO                                */}
      {/* ========================================================================= */}
      {showFineModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileWarning className="w-5 h-5 text-rose-400" />
                <div>
                  <h3 className="font-bold text-white text-base">
                    Labrar Acta de Infracción y Multa de Tránsito
                  </h3>
                  <p className="text-xs text-slate-400">
                    Sistema de Juzgado de Faltas y Seguridad Vial – Itá Ibaté
                  </p>
                </div>
              </div>
              <button onClick={() => setShowFineModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFine} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <span className="font-bold text-slate-200 text-xs block">1. Datos del Acta y Lugar</span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">N° de Acta (*)</label>
                    <input
                      type="text"
                      required
                      value={fineForm.actNumber}
                      onChange={(e) => setFineForm({ ...fineForm, actNumber: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Fecha</label>
                    <input
                      type="date"
                      value={fineForm.date}
                      onChange={(e) => setFineForm({ ...fineForm, date: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Hora</label>
                    <input
                      type="time"
                      value={fineForm.time}
                      onChange={(e) => setFineForm({ ...fineForm, time: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Lugar de la Infracción (*)</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Av. San Martín y Belgrano"
                      value={fineForm.location}
                      onChange={(e) => setFineForm({ ...fineForm, location: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Barrio</label>
                    <select
                      value={fineForm.neighborhood}
                      onChange={(e) => setFineForm({ ...fineForm, neighborhood: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white"
                    >
                      {ITA_IBATE_NEIGHBORHOODS.map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <span className="font-bold text-slate-200 text-xs block">2. Infractor y Vehículo</span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">DNI del Infractor</label>
                    <input
                      type="text"
                      placeholder="34..."
                      value={fineForm.infractorDni}
                      onChange={(e) => handleCitizenDniLookup(e.target.value, 'FINE')}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-slate-300 font-medium mb-1">Nombre Completo del Infractor (*)</label>
                    <input
                      type="text"
                      required
                      placeholder="Nombre y Apellido"
                      value={fineForm.infractorName}
                      onChange={(e) => setFineForm({ ...fineForm, infractorName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-rose-400 font-bold mb-1">Chapa Patente (*)</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. AF-312-GH o ABC-123"
                      value={fineForm.vehiclePlate}
                      onChange={(e) => setFineForm({ ...fineForm, vehiclePlate: e.target.value.toUpperCase() })}
                      className="w-full bg-slate-900 border border-rose-500/50 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Marca / Modelo de Vehículo</label>
                    <input
                      type="text"
                      placeholder="Ej. Honda Wave 110 Negra"
                      value={fineForm.vehicleBrandModel}
                      onChange={(e) => setFineForm({ ...fineForm, vehicleBrandModel: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <span className="font-bold text-slate-200 text-xs block">3. Infracción, Gravedad y Corralón</span>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Tipo de Infracción Cometida (*)</label>
                  <select
                    value={fineForm.infractionType}
                    onChange={(e) => setFineForm({ ...fineForm, infractionType: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-medium"
                  >
                    <option value="Falta de casco protector reglamentario en motovehículo">Falta de casco protector reglamentario en motovehículo</option>
                    <option value="Alcoholemia positiva en conductor">Alcoholemia positiva en conductor</option>
                    <option value="Circular sin licencia de conducir habilitante">Circular sin licencia de conducir habilitante</option>
                    <option value="Falta de seguro obligatorio vigente">Falta de seguro obligatorio vigente</option>
                    <option value="Circular sin chapa patente reglamentaria colocada">Circular sin chapa patente reglamentaria colocada</option>
                    <option value="Estacionar obstruyendo rampas de accesibilidad o sendas peatonales">Estacionar obstruyendo rampas o sendas peatonales</option>
                    <option value="Exceso de velocidad en zona urbana">Exceso de velocidad en zona urbana</option>
                    <option value="Escape libre o ruidos molestos en motovehículo">Escape libre o ruidos molestos en motovehículo</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Gravedad</label>
                    <select
                      value={fineForm.gravity}
                      onChange={(e) => setFineForm({ ...fineForm, gravity: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-bold"
                    >
                      <option value="LEVE">Leve</option>
                      <option value="GRAVE">Grave</option>
                      <option value="MUY_GRAVE">Muy Grave</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Monto de Multa ($)</label>
                    <input
                      type="number"
                      value={fineForm.amount}
                      onChange={(e) => setFineForm({ 
                        ...fineForm, 
                        amount: Number(e.target.value),
                        discountEarlyPaymentAmount: Math.round(Number(e.target.value) / 2)
                      })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Pago Voluntario 50% ($)</label>
                    <input
                      type="number"
                      value={fineForm.discountEarlyPaymentAmount}
                      onChange={(e) => setFineForm({ ...fineForm, discountEarlyPaymentAmount: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-emerald-400 font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                    <input
                      type="checkbox"
                      checked={fineForm.vehicleImpounded}
                      onChange={(e) => setFineForm({ ...fineForm, vehicleImpounded: e.target.checked })}
                      className="w-4 h-4 rounded text-rose-600"
                    />
                    <span className="font-semibold text-rose-300">
                      ¿Vehículo retenido y remitido al Corralón Municipal?
                    </span>
                  </label>

                  {fineForm.vehicleImpounded && (
                    <div className="w-1/2">
                      <input
                        type="text"
                        placeholder="N° de Box o Galpón Corralón"
                        value={fineForm.impoundLotNumber}
                        onChange={(e) => setFineForm({ ...fineForm, impoundLotNumber: e.target.value })}
                        className="w-full bg-slate-900 border border-rose-500/50 rounded-lg px-2.5 py-1 text-white text-xs"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowFineModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-semibold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <FileWarning className="w-4 h-4" />
                  <span>Labrar y Guardar Acta</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: NUEVA HABILITACIÓN COMERCIAL MUNICIPAL                          */}
      {/* ========================================================================= */}
      {showCommercialModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-white text-base">
                    Trámite de Habilitación Municipal de Comercio
                  </h3>
                  <p className="text-xs text-slate-400">
                    Inspección y Certificación de Establecimientos Comerciales e Industriales
                  </p>
                </div>
              </div>
              <button onClick={() => setShowCommercialModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCommercial} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <span className="font-bold text-slate-200 text-xs block">1. Datos del Establecimiento</span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">N° de Expediente (*)</label>
                    <input
                      type="text"
                      required
                      value={commercialForm.expedientNumber}
                      onChange={(e) => setCommercialForm({ ...commercialForm, expedientNumber: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-emerald-400 font-bold mb-1">Nombre de Fantasía o Razón Social (*)</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Autoservicio San Cayetano"
                      value={commercialForm.businessName}
                      onChange={(e) => setCommercialForm({ ...commercialForm, businessName: e.target.value })}
                      className="w-full bg-slate-900 border border-emerald-500/50 rounded-lg px-2.5 py-1.5 text-white font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Domicilio del Local</label>
                    <input
                      type="text"
                      required
                      placeholder="Calle y altura"
                      value={commercialForm.commercialAddress}
                      onChange={(e) => setCommercialForm({ ...commercialForm, commercialAddress: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Barrio</label>
                    <select
                      value={commercialForm.neighborhood}
                      onChange={(e) => setCommercialForm({ ...commercialForm, neighborhood: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white"
                    >
                      {ITA_IBATE_NEIGHBORHOODS.map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <span className="font-bold text-slate-200 text-xs block">2. Titular y Actividad Comercial</span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Titular Responsable (*)</label>
                    <input
                      type="text"
                      required
                      placeholder="Nombre del propietario"
                      value={commercialForm.ownerName}
                      onChange={(e) => setCommercialForm({ ...commercialForm, ownerName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">DNI o CUIT (*)</label>
                    <input
                      type="text"
                      required
                      placeholder="20-XXXXXXXX-X"
                      value={commercialForm.ownerDniOrCuit}
                      onChange={(e) => setCommercialForm({ ...commercialForm, ownerDniOrCuit: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Teléfono</label>
                    <input
                      type="text"
                      placeholder="3781-..."
                      value={commercialForm.phone}
                      onChange={(e) => setCommercialForm({ ...commercialForm, phone: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Rubro Principal</label>
                    <select
                      value={commercialForm.category}
                      onChange={(e) => setCommercialForm({ ...commercialForm, category: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-bold"
                    >
                      <option value="COMERCIAL">Comercial / Almacén / Mercado</option>
                      <option value="GASTRONOMICO">Gastronómico / Restaurante</option>
                      <option value="HOTELERO_TURISTICO">Hotelero / Cabañas / Pesca</option>
                      <option value="SERVICIOS">Servicios / Taller / Lavadero</option>
                      <option value="INDUSTRIAL">Industrial / Acopio</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-slate-300 font-medium mb-1">Descripción de la Actividad</label>
                    <input
                      type="text"
                      placeholder="Ej. Venta de comestibles, bebidas y productos cárnicos"
                      value={commercialForm.rubroDescription}
                      onChange={(e) => setCommercialForm({ ...commercialForm, rubroDescription: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <span className="font-bold text-slate-200 text-xs block">3. Inspecciones y Tasas</span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Inspección Bomberos</label>
                    <select
                      value={commercialForm.fireSafetyInspectionPassed ? 'SI' : 'NO'}
                      onChange={(e) => setCommercialForm({ ...commercialForm, fireSafetyInspectionPassed: e.target.value === 'SI' })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white"
                    >
                      <option value="SI">Aprobado (Matafuegos y Salidas)</option>
                      <option value="NO">Pendiente / Intimado</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Bromatología / Salud</label>
                    <select
                      value={commercialForm.sanitaryBromathologyInspectionPassed ? 'SI' : 'NO'}
                      onChange={(e) => setCommercialForm({ ...commercialForm, sanitaryBromathologyInspectionPassed: e.target.value === 'SI' })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white"
                    >
                      <option value="SI">Aprobado (Higiene y Libretas)</option>
                      <option value="NO">Pendiente</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Estado</label>
                    <select
                      value={commercialForm.status}
                      onChange={(e) => setCommercialForm({ ...commercialForm, status: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-bold"
                    >
                      <option value="HABILITADO">Habilitado Pleno</option>
                      <option value="EN_TRAMITE">Habilitación Provisoria</option>
                      <option value="CLAUSURADO_PREVENTIVO">Clausurado Preventivo</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCommercialModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Store className="w-4 h-4" />
                  <span>Emitir Habilitación</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: REGISTRAR OPERATIVO DE CONTROL VIAL                              */}
      {/* ========================================================================= */}
      {showCheckpointModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-white text-base">
                    Carga de Operativo de Control Vial
                  </h3>
                  <p className="text-xs text-slate-400">
                    Puestos de verificación vehicular, alcoholemia y nocturnidad
                  </p>
                </div>
              </div>
              <button onClick={() => setShowCheckpointModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCheckpoint} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Fecha</label>
                  <input
                    type="date"
                    value={checkpointForm.date}
                    onChange={(e) => setCheckpointForm({ ...checkpointForm, date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Turno</label>
                  <select
                    value={checkpointForm.shift}
                    onChange={(e) => setCheckpointForm({ ...checkpointForm, shift: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-bold"
                  >
                    <option value="MANANA">Mañana (07:00 a 13:00)</option>
                    <option value="TARDE">Tarde (13:00 a 19:00)</option>
                    <option value="NOCHE">Noche (19:00 a 01:00)</option>
                    <option value="MADRUGADA">Madrugada (01:00 a 07:00)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Lugar / Puesto de Verificación</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Acceso Ruta Nacional 118 y Rotonda"
                  value={checkpointForm.location}
                  onChange={(e) => setCheckpointForm({ ...checkpointForm, location: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Tipo de Control</label>
                  <select
                    value={checkpointForm.type}
                    onChange={(e) => setCheckpointForm({ ...checkpointForm, type: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white"
                  >
                    <option value="CONTROL_GENERAL_VEHICULAR">Control General Vehicular</option>
                    <option value="CONTROL_DE_CASCO">Control de Casco y Caño de Escape</option>
                    <option value="ALCOHOLEMIA">Alcoholemia Preventiva</option>
                    <option value="OPERATIVO_TURISMO_PESCA">Control de Embarcaciones y Pescadores</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Oficial a Cargo</label>
                  <input
                    type="text"
                    required
                    value={checkpointForm.leadOfficer}
                    onChange={(e) => setCheckpointForm({ ...checkpointForm, leadOfficer: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5">
                <span className="font-bold text-slate-200 text-xs block">Métricas del Operativo</span>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-0.5">Motos</label>
                    <input
                      type="number"
                      min="0"
                      value={checkpointForm.motorcyclesChecked}
                      onChange={(e) => {
                        const m = Number(e.target.value);
                        setCheckpointForm({
                          ...checkpointForm,
                          motorcyclesChecked: m,
                          vehiclesChecked: m + checkpointForm.carsTrucksChecked
                        });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white text-center font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[10px] mb-0.5">Autos / Camionetas</label>
                    <input
                      type="number"
                      min="0"
                      value={checkpointForm.carsTrucksChecked}
                      onChange={(e) => {
                        const a = Number(e.target.value);
                        setCheckpointForm({
                          ...checkpointForm,
                          carsTrucksChecked: a,
                          vehiclesChecked: a + checkpointForm.motorcyclesChecked
                        });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white text-center font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[10px] mb-0.5">Total Vehículos</label>
                    <input
                      type="number"
                      disabled
                      value={checkpointForm.vehiclesChecked}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-sky-400 text-center font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-2">
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-0.5">Alcoholemias Hechas</label>
                    <input
                      type="number"
                      min="0"
                      value={checkpointForm.breathalyzerTestsCount}
                      onChange={(e) => setCheckpointForm({ ...checkpointForm, breathalyzerTestsCount: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-rose-400 text-[10px] mb-0.5 font-bold">Positivas (+)</label>
                    <input
                      type="number"
                      min="0"
                      value={checkpointForm.positiveBreathalyzerCount}
                      onChange={(e) => setCheckpointForm({ ...checkpointForm, positiveBreathalyzerCount: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-rose-500/50 rounded-lg px-2 py-1 text-rose-400 text-center font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-amber-400 text-[10px] mb-0.5 font-bold">Actas Labradas</label>
                    <input
                      type="number"
                      min="0"
                      value={checkpointForm.finesIssuedCount}
                      onChange={(e) => setCheckpointForm({ ...checkpointForm, finesIssuedCount: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-amber-500/50 rounded-lg px-2 py-1 text-amber-400 text-center font-bold"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Observaciones del Operativo</label>
                <textarea
                  rows={2}
                  value={checkpointForm.summaryObservations}
                  onChange={(e) => setCheckpointForm({ ...checkpointForm, summaryObservations: e.target.value })}
                  placeholder="Incidencias o balance del control vial..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCheckpointModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-semibold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Radio className="w-4 h-4" />
                  <span>Guardar Operativo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL PRINTABLE 1: COMPROBANTE OFICIAL DE CARNET DE CONDUCIR              */}
      {/* ========================================================================= */}
      {printLicense && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-sky-400">
                <Printer className="w-5 h-5" />
                <h3 className="font-bold text-white text-base">Comprobante de Licencia de Conducir</h3>
              </div>
              <button onClick={() => setPrintLicense(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Card */}
            <div className="p-5 bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 border-2 border-sky-500/40 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-sky-500/30 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center font-bold text-white text-lg">
                    II
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">MUNICIPALIDAD DE ITÁ IBATÉ</h4>
                    <p className="text-[10px] text-sky-300 font-semibold uppercase tracking-wider">
                      Licencia Nacional de Conducir • Corrientes
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Número de Carnet</div>
                  <div className="text-base font-bold text-sky-400 font-mono tracking-tight">
                    {printLicense.licenseNumber}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="col-span-2 space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase">Titular Habilitado</div>
                  <div className="font-bold text-white text-sm">{printLicense.citizenName}</div>
                  <div className="font-mono text-slate-300">DNI: {printLicense.citizenDni}</div>
                  <div className="text-slate-400 text-[11px]">{printLicense.citizenAddress} • {printLicense.citizenNeighborhood}</div>
                </div>

                <div className="text-right space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase">Clase / Categoría</div>
                  <div className="inline-block px-3 py-1 bg-sky-500/20 text-sky-300 border border-sky-500/40 rounded-lg text-lg font-black font-mono">
                    {printLicense.category}
                  </div>
                  <div className="text-[10px] text-slate-400">{printLicense.vehicleType}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">FECHA DE EMISIÓN</span>
                  <span className="font-semibold text-slate-200">{printLicense.issueDate}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">FECHA DE VENCIMIENTO</span>
                  <span className="font-bold text-amber-300">{printLicense.expirationDate}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                <span>Trámite: {printLicense.procedureType} • Tasa: ${printLicense.feeAmount}</span>
                <span>Oficial: {printLicense.officerInCharge}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setPrintLicense(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cerrar
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Credencial</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL PRINTABLE 2: ACTA OFICIAL DE INFRACCIÓN / MULTA                      */}
      {/* ========================================================================= */}
      {printFine && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-rose-400">
                <Printer className="w-5 h-5" />
                <h3 className="font-bold text-white text-base">Acta Oficial de Infracción de Tránsito</h3>
              </div>
              <button onClick={() => setPrintFine(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-3.5 text-xs">
              <div className="text-center border-b border-slate-800 pb-2">
                <div className="font-bold text-white text-sm">MUNICIPALIDAD DE ITÁ IBATÉ</div>
                <div className="text-[11px] text-slate-400">Dirección General de Seguridad Ciudadana y Control Urbano</div>
                <div className="text-xs font-mono font-bold text-rose-400 mt-1">ACTA N° {printFine.actNumber}</div>
              </div>

              <div className="space-y-1">
                <div>Fecha y Hora: <strong className="text-white">{printFine.date} - {printFine.time} hs</strong></div>
                <div>Lugar: <strong className="text-white">{printFine.location} ({printFine.neighborhood})</strong></div>
                <div>Infractor: <strong className="text-white">{printFine.infractorName}</strong> (DNI: {printFine.infractorDni})</div>
                <div>Vehículo / Patente: <strong className="text-white">{printFine.vehiclePlate}</strong> ({printFine.vehicleBrandModel})</div>
              </div>

              <div className="p-3 bg-rose-950/20 border border-rose-500/30 rounded-xl space-y-1">
                <span className="font-bold text-rose-300 text-xs block uppercase">Infracción Imputada</span>
                <p className="text-slate-200">{printFine.infractionType}</p>
                <div className="text-[11px] text-slate-400">Gravedad: <strong className="text-rose-400">{printFine.gravity}</strong></div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Importe Total</div>
                  <div className="text-base font-bold font-mono text-white">${printFine.amount.toLocaleString('es-AR')}</div>
                </div>
                {printFine.discountEarlyPaymentAmount && (
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 uppercase">Pago Voluntario (50%)</div>
                    <div className="text-base font-bold font-mono text-emerald-400">${printFine.discountEarlyPaymentAmount.toLocaleString('es-AR')}</div>
                  </div>
                )}
              </div>

              {printFine.vehicleImpounded && (
                <div className="p-2 bg-slate-900 border border-slate-700 rounded-lg text-rose-300 text-[11px]">
                  ⚠️ Vehículo remitido a Corralón Municipal: <strong>{printFine.impoundLotNumber || 'Box Corralón'}</strong>
                </div>
              )}

              <div className="pt-6 grid grid-cols-2 gap-8 text-center text-[10px] text-slate-400">
                <div className="border-t border-slate-700 pt-1">
                  Firma y Sello Inspector Actuante
                  <div className="text-slate-300 font-mono mt-0.5">{printFine.officerBadge}</div>
                </div>
                <div className="border-t border-slate-700 pt-1">
                  Firma / Notificación Infractor
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setPrintFine(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cerrar
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Acta</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL PRINTABLE 3: CERTIFICADO DE HABILITACIÓN COMERCIAL                  */}
      {/* ========================================================================= */}
      {printCommercial && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <Printer className="w-5 h-5" />
                <h3 className="font-bold text-white text-base">Certificado de Habilitación Municipal</h3>
              </div>
              <button onClick={() => setPrintCommercial(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 bg-slate-950 border-2 border-emerald-500/40 rounded-2xl space-y-4 text-center">
              <div className="space-y-1">
                <h4 className="font-extrabold text-white text-base tracking-wide">MUNICIPALIDAD DE ITÁ IBATÉ</h4>
                <p className="text-[11px] text-emerald-300 uppercase tracking-widest font-semibold">
                  CERTIFICADO OFICIAL DE HABILITACIÓN COMERCIAL
                </p>
                <div className="text-xs font-mono text-slate-400">Expediente N° {printCommercial.expedientNumber}</div>
              </div>

              <div className="py-3 px-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1 text-left">
                <div className="text-[10px] text-slate-400 uppercase">Establecimiento / Razón Social</div>
                <div className="text-base font-bold text-white">{printCommercial.businessName}</div>
                <div className="text-xs text-slate-300">Titular: <strong>{printCommercial.ownerName}</strong> (CUIT: {printCommercial.ownerDniOrCuit})</div>
                <div className="text-xs text-slate-400">Domicilio: {printCommercial.commercialAddress} • {printCommercial.neighborhood}</div>
                <div className="text-xs text-emerald-400 pt-1">Rubro: {printCommercial.rubroDescription}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs text-left">
                <div>
                  <span className="text-[10px] text-slate-400 block">FECHA DE HABILITACIÓN</span>
                  <span className="font-semibold text-slate-200">{printCommercial.authorizationDate}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">VÁLIDO HASTA</span>
                  <span className="font-bold text-amber-300">{printCommercial.expirationDate}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span>Inspección Bomberos: APROBADA</span>
                <span>Bromatología: APROBADA</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setPrintCommercial(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cerrar
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Certificado</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
