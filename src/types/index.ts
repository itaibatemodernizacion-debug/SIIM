export type UserRole = 'ADMIN_GENERAL' | 'RESPONSABLE_AREA' | 'OPERADOR_AREA';

export interface MunicipalUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  departmentId?: string; // undefined means global access (e.g. Intendente / Modernización)
  position: string; // e.g. "Intendente Municipal", "Director de Deportes", etc.
  avatar?: string;
}

export type DepartmentCategory = 
  | 'SECRETARIA' 
  | 'DIRECCION_GENERAL' 
  | 'DIRECCION' 
  | 'COORDINACION' 
  | 'PUNTO_DIGITAL';

export interface Department {
  id: string;
  name: string;
  shortName: string;
  category: DepartmentCategory;
  parentId?: string; // ID of parent Secretaría or Dirección General
  legalReference?: string; // e.g. "Artículos 7, 14", "Artículos 11, 27 al 32"
  leaderTitle?: string; // e.g. "Secretario/a", "Director/a General", "Coordinador/a"
  leaderName: string; // Titular a cargo
  leaderDni?: string;
  leaderEmail: string;
  phone?: string;
  color: string; // Tailwind color token or hex
  icon: string;
  active: boolean;
  moduleType: 'GENERAL' | 'DEPORTES' | 'ACCION_SOCIAL' | 'OBRAS_PUBLICAS' | 'CULTURA' | 'PUNTO_DIGITAL' | 'TURISMO' | 'SALUD' | 'CONTROL_URBANO' | 'RRHH';
  customFields?: {
    id: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'boolean';
    options?: string[];
  }[];
}

export interface Citizen {
  id: string;
  dni: string;
  fullName: string;
  address: string;
  neighborhood: string;
  phone: string;
  birthDate?: string;
  registrationDate: string;
  departmentRegisteredId: string;
  notes?: string;
}

export type TicketStatus = 
  | 'INICIADO' 
  | 'EN_PROCESO' 
  | 'PENDIENTE_DOCUMENTACION' 
  | 'DERIVADO' 
  | 'SOLUCIONADO' 
  | 'NO_SOLUCIONADO' 
  | 'DESESTIMADO';

export interface TicketTimelineItem {
  id: string;
  date: string;
  authorName: string;
  departmentId: string;
  previousStatus?: TicketStatus;
  newStatus?: TicketStatus;
  comment: string;
  actionType: 'CREACION' | 'CAMBIO_ESTADO' | 'OBSERVACION' | 'DERIVACION' | 'RESOLUCION';
}

export interface Ticket {
  id: string;
  ticketCode: string; // e.g. TR-2026-0001
  citizenId: string;
  citizenName: string;
  citizenDni: string;
  citizenPhone: string;
  citizenNeighborhood: string;
  departmentId: string; // Current owning area
  originalDepartmentId: string; // Originating area
  requestType: string;
  description: string;
  startDate: string;
  resolvedDate?: string;
  responsibleName: string;
  status: TicketStatus;
  isResolved: boolean; // Mandatory flag
  priority: 'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE';
  timeline: TicketTimelineItem[];
  areaSpecificData?: Record<string, any>;
}

export interface SportEvent {
  id: string;
  name: string;
  discipline: string;
  date: string;
  location: string;
  category: string;
  status: 'PROGRAMADO' | 'EN_CURSO' | 'FINALIZADO';
  organizer: string;
}

export interface SportParticipant {
  id: string;
  eventId: string;
  eventName: string;
  fullName: string;
  dni: string;
  address: string;
  neighborhood: string;
  phone: string;
  discipline: string;
  category: string;
  teamOrClub: string;
  participationDate: string;
  location: string;
}

export interface SyncLog {
  id: string;
  date: string;
  source: 'GOOGLE_DRIVE' | 'EXCEL_LOCAL' | 'GOOGLE_SHEETS';
  fileName: string;
  departmentId: string;
  recordsProcessed: number;
  recordsAdded: number;
  recordsUpdated: number;
  duplicatesSkipped: number;
  errorsCount: number;
  status: 'EXITOSO' | 'CON_ERRORES' | 'FALLIDO';
  details: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userName: string;
  userRole: string;
  departmentId?: string;
  action: string;
  entity: string;
  entityId?: string;
  details: string;
}

export type ExpenseCategory = 
  | 'Combustible'
  | 'Alimentos y bebidas'
  | 'Materiales de construcción'
  | 'Herramientas'
  | 'Equipamiento'
  | 'Indumentaria'
  | 'Servicios'
  | 'Transporte'
  | 'Eventos y actividades'
  | 'Mantenimiento'
  | 'Insumos de oficina'
  | 'Otros'
  | string;

export type ExpenseSettlementStatus = 
  | 'SIN_RENDIR'
  | 'RENDICION_INICIADA'
  | 'PRESENTADA'
  | 'EN_REVISION'
  | 'OBSERVADA'
  | 'APROBADA'
  | 'RECHAZADA'
  | 'ANULADO';

export interface FundAllocation {
  id: string;
  departmentId: string;
  receiverName: string;
  receiverDni: string;
  deliveryDate: string;
  voucherNumber: string; // Comprobante o Expediente ej. EXP-FON-2026-001
  amountAssigned: number;
  amountDelivered: number; // Fondos efectivamente transferidos/entregados
  concept: string;
  programOrActivity: string;
  fundingSource: string; // ej. Rentas Generales / Coparticipación / Fondo Especial
  authorizedByName: string;
  notes?: string;
  attachmentName?: string;
  status: 'ASIGNADO' | 'ENTREGADO' | 'RENDIDO_TOTAL' | 'RENDIDO_PARCIAL' | 'ANULADO';
  createdAt: string;
}

export interface ExpenseTimelineItem {
  id: string;
  date: string;
  authorName: string;
  status: ExpenseSettlementStatus;
  comment: string;
}

export interface ExpenseRecord {
  id: string;
  expenseCode: string; // ej. GAS-2026-0001
  fundAllocationId?: string;
  departmentId: string;
  expenseDate: string;
  concept: string;
  category: ExpenseCategory;
  description: string;
  supplierName: string;
  supplierCuit?: string;
  invoiceNumber: string; // Factura o comprobante
  amount: number;
  paymentMethod: 'Efectivo' | 'Transferencia Bancaria' | 'Cheque' | 'Tarjeta Corporativa';
  expedientReference?: string;
  attachmentName?: string;
  notes?: string;
  settlementStatus: ExpenseSettlementStatus;
  settlementObservation?: string;
  settlementDate?: string;
  reviewedByName?: string;
  createdByUserName: string;
  createdAt: string;
  timeline: ExpenseTimelineItem[];
}

export interface DepartmentFinancialBalance {
  departmentId: string;
  departmentName: string;
  totalAssigned: number;
  totalDelivered: number;
  totalExpenses: number;
  availableBalance: number;
  committedBalance: number;
  pendingSettlementAmount: number;
  approvedSettlementAmount: number;
  observedSettlementAmount: number;
  executionRate: number; // % Gastos / Entregado
  settlementRate: number; // % Aprobados / Gastos
  isLowBalanceWarning: boolean;
  hasObservedSettlements: boolean;
}

export interface MunicipalFinancialKPIs {
  totalAssigned: number;
  totalDelivered: number;
  totalExpenses: number;
  totalAvailable: number;
  totalSettlementApproved: number;
  totalSettlementPending: number;
  totalSettlementObserved: number;
  globalExecutionRate: number;
  globalSettlementRate: number;
  departmentsWithPendingSettlements: number;
  departmentsWithLowBalance: number;
}

// ==========================================
// REGISTRO NECROLÓGICO MUNICIPAL
// (Secretaría de Desarrollo Social y Humano)
// ==========================================

export type CasketType = 
  | 'Estándar Adulto (Madera Lustrada)'
  | 'Extra Grande / Especial'
  | 'Párvulo / Infantil'
  | 'Metálico con Visor / Bóveda'
  | 'Económico Social';

export type NicheStatus = 
  | 'ASIGNADO' 
  | 'CONCESION_TEMPORAL' 
  | 'A_PERPETUIDAD' 
  | 'EN_TRAMITE' 
  | 'LIBERADO';

export interface NecrologicalRecord {
  id: string;
  actNumber: string; // ej. NEC-2026-0001
  serviceDate: string;
  // Datos del Fallecido
  deceasedFullName: string;
  deceasedDni: string;
  deceasedAge?: number;
  deathDate: string;
  deathCertificateNumber?: string;
  causeOfDeath?: string;
  // Solicitante / Familiar Responsable
  familyContactName: string;
  familyContactDni: string;
  familyRelationship: string; // e.g. Hijo/a, Cónyuge, Hermano/a, Padre/Madre
  familyPhone: string;
  familyAddress: string;
  familyNeighborhood?: string;
  // Detalle de Féretro / Cajón
  usedCasket: boolean;
  casketType?: CasketType;
  casketCodeOrModel?: string; // N° de serie o remito del cajón
  casketCostExempted: boolean; // Gratuito por asistencia de acción social
  // Detalle de Nicho en Cementerio Municipal
  assignedNiche: boolean;
  cemeteryName: string; // "Cementerio Municipal San Juan Bautista de Itá Ibaté"
  nicheSectorOrPavilion: string; // ej. "Pabellón A", "Sector San Cayetano", "Manzana 3"
  nicheRowOrLevel?: string; // ej. "Fila 2 - Altura"
  nicheNumber: string; // ej. "Nicho N° 45"
  nicheStatus: NicheStatus;
  burialDate?: string; // Fecha de sepelio / inhumación
  concessionExpirationDate?: string; // Vencimiento de concesión (si aplica)
  // Autorización y Notas
  responsibleOfficer: string; // Funcionario de Desarrollo Social a cargo
  notes?: string;
  createdAt: string;
}

// ==========================================
// MÓDULO DE CONTROL URBANO Y SEGURIDAD VIAL
// (Dirección General de Seguridad Ciudadana y Control Urbano)
// ==========================================

export type LicenseCategory = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'D1' | 'E1' | 'F' | 'G';
export type LicenseProcedureType = 'ORIGINAL' | 'RENOVACION' | 'DUPLICADO' | 'AMPLIACION';
export type LicenseStatus = 'EN_TRAMITE' | 'APROBADO' | 'EMITIDO' | 'ENTREGADO' | 'RECHAZADO' | 'VENCIDO';

export interface DriversLicenseRecord {
  id: string;
  recordNumber: string; // ej. CARNET-2026-001
  licenseNumber: string; // Número de carnet nacional / municipal
  citizenName: string;
  citizenDni: string;
  citizenPhone: string;
  citizenAddress: string;
  citizenNeighborhood: string;
  procedureType: LicenseProcedureType;
  category: LicenseCategory;
  vehicleType: string; // ej. Motovehículo hasta 150cc, Automóvil particular, Camión
  issueDate: string;
  expirationDate: string;
  medicalExamPassed: boolean;
  theoreticalExamScore?: number; // 0-100
  practicalExamScore?: number; // 0-100
  status: LicenseStatus;
  feeAmount: number; // Costo del trámite
  isFeePaid: boolean;
  officerInCharge: string;
  notes?: string;
  createdAt: string;
}

export type InfractionGravity = 'LEVE' | 'GRAVE' | 'MUY_GRAVE';
export type InfractionStatus = 'ACTIVA' | 'NOTIFICADA' | 'EN_DESCARGO' | 'PAGADA' | 'CONDONADA' | 'DERIVADA_JUZGADO';

export interface TrafficFineRecord {
  id: string;
  fineNumber: string; // ej. MULTA-2026-001
  actNumber: string; // N° de Acta de Infracción
  date: string;
  time: string;
  location: string; // ej. Av. San Martín y 25 de Mayo
  neighborhood: string;
  infractorName: string;
  infractorDni: string;
  infractorPhone?: string;
  vehiclePlate: string; // Patente
  vehicleBrandModel: string;
  infractionType: string; // ej. Falta de Casco, Alcoholemia Positiva, Sin VTV, Conducir sin Licencia, Estacionamiento Indebido
  gravity: InfractionGravity;
  amount: number; // Monto en pesos
  discountEarlyPaymentAmount?: number; // Pago voluntario
  status: InfractionStatus;
  vehicleImpounded: boolean; // ¿Vehículo retenido / remitido al corralón?
  impoundLotNumber?: string;
  officerBadge: string; // Inspector actuante
  notes?: string;
  paidDate?: string;
  receiptNumber?: string;
  createdAt: string;
}

export type BusinessCategory = 'COMERCIAL' | 'GASTRONOMICO' | 'HOTELERO_TURISTICO' | 'INDUSTRIAL' | 'SERVICIOS' | 'PROFESIONAL';
export type CommercialLicenseStatus = 'EN_TRAMITE' | 'HABILITADO' | 'VENCIDO' | 'CLAUSURADO_PREVENTIVO' | 'BAJA_DEFINITIVA';

export interface CommercialLicenseRecord {
  id: string;
  recordNumber: string; // ej. HAB-2026-001
  expedientNumber: string; // N° de Expediente
  businessName: string; // Nombre de fantasía o razón social
  ownerName: string; // Titular
  ownerDniOrCuit: string;
  phone: string;
  email?: string;
  commercialAddress: string;
  neighborhood: string;
  category: BusinessCategory;
  rubroDescription: string; // Actividad principal
  surfaceSquareMeters: number;
  fireSafetyInspectionPassed: boolean; // Inspección de Bomberos / Matafuegos
  sanitaryBromathologyInspectionPassed: boolean; // Bromatología / Sanidad
  authorizationDate: string;
  expirationDate: string;
  annualFee: number;
  status: CommercialLicenseStatus;
  inspectorsNotes?: string;
  certificatePrinted: boolean;
  createdAt: string;
}

export type CheckpointType = 'CONTROL_GENERAL_VEHICULAR' | 'ALCOHOLEMIA' | 'CONTROL_DE_CASCO' | 'NOCTURNIDAD_RUIDOS' | 'OPERATIVO_TURISMO_PESCA';
export type CheckpointShift = 'MANANA' | 'TARDE' | 'NOCHE' | 'MADRUGADA';

export interface TrafficCheckpointRecord {
  id: string;
  checkpointCode: string; // ej. OP-2026-001
  date: string;
  location: string; // ej. Acceso Ruta Nacional 118, Costanera y Puerto
  neighborhood: string;
  type: CheckpointType;
  shift: CheckpointShift;
  leadOfficer: string;
  inspectorsCount: number;
  policeSupport: boolean; // ¿Con apoyo de Policía de Corrientes o Prefectura?
  vehiclesChecked: number; // Total vehículos controlados
  motorcyclesChecked: number;
  carsTrucksChecked: number;
  breathalyzerTestsCount: number; // Test de alcoholemia realizados
  positiveBreathalyzerCount: number; // Alcoholemias positivas
  finesIssuedCount: number; // Actas labradas
  impoundedVehiclesCount: number; // Retenciones
  summaryObservations?: string;
  createdAt: string;
}

// ==========================================
// MÓDULO DE RECURSOS HUMANOS (RRHH)
// (Coordinación de Recursos Humanos - Art. 21)
// ==========================================

export type EmploymentCondition = 
  | 'PLANTA_PERMANENTE' 
  | 'CONTRATADO' 
  | 'PERSONAL_DE_GABINETE' 
  | 'JORNALIZADO';

export type EmployeeStatus = 'ACTIVO' | 'LICENCIA' | 'SUSPENDIDO' | 'BAJA_JUBILACION';

export interface MunicipalEmployee {
  id: string;
  fileNumber: string; // N° de Legajo Personal ej. LEG-00145
  fullName: string;
  dni: string;
  cuil: string; // ej. 20-34891204-8
  birthDate?: string;
  gender?: 'M' | 'F' | 'OTRO';
  nationality: string;
  phone: string;
  email?: string;
  address: string;
  neighborhood: string; // Barrio oficial de Itá Ibaté
  // Datos Laborales Municipales
  employmentCondition: EmploymentCondition;
  departmentId: string; // Secretaría / Dirección asignada
  position: string; // Cargo o función (ej. Operador de Maquinaria, Administrativo, Médico SAPS, Cuadrilla de Limpieza)
  categoryOrScale?: string; // Categoría escalafón (ej. Cat 12, Cat 18, Funcionario)
  entryDate: string; // Fecha de ingreso municipal
  status: EmployeeStatus;
  workShift?: 'MANANA' | 'TARDE' | 'NOCHE' | 'ROTATIVO'; // Turno
  hoursPerWeek?: number; // Carga horaria semanal
  basicSalary?: number; // Sueldo básico o jornal asignado
  bankAccountNumber?: string; // CBU / Cuenta Sueldo Banco de Corrientes
  socialSecurityNumber?: string; // Obra Social (ej. IOSCOR, OSECAC)
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notes?: string;
  createdAt: string;
}



