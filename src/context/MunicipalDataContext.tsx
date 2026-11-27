import React, { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Department, 
  Citizen, 
  Ticket, 
  SportEvent, 
  SportParticipant, 
  SyncLog, 
  AuditLog, 
  TicketStatus,
  FundAllocation,
  ExpenseRecord,
  ExpenseCategory,
  ExpenseSettlementStatus,
  DepartmentFinancialBalance,
  MunicipalFinancialKPIs,
  NecrologicalRecord,
  DriversLicenseRecord,
  TrafficFineRecord,
  CommercialLicenseRecord,
  TrafficCheckpointRecord,
  MunicipalEmployee,
  CulturalStudent,
  CulturalCourseType,
  EscuelaEmpresaStudent
} from '../types';
import { 
  INITIAL_DEPARTMENTS, 
  INITIAL_CITIZENS, 
  INITIAL_TICKETS, 
  INITIAL_SPORTS_EVENTS, 
  INITIAL_SPORTS_PARTICIPANTS, 
  INITIAL_SYNC_LOGS,
  INITIAL_FUND_ALLOCATIONS,
  INITIAL_EXPENSES,
  DEFAULT_EXPENSE_CATEGORIES,
  INITIAL_NECROLOGICAL_RECORDS,
  INITIAL_DRIVERS_LICENSES,
  INITIAL_TRAFFIC_FINES,
  INITIAL_COMMERCIAL_LICENSES,
  INITIAL_TRAFFIC_CHECKPOINTS,
  INITIAL_MUNICIPAL_EMPLOYEES,
  INITIAL_CULTURAL_STUDENTS,
  INITIAL_ESCUELA_EMPRESA_STUDENTS
} from '../data/initialData';
import { useAuth } from './AuthContext';
import { ParsedMunicipalRow, ParsedWorkbookResult, parseSectorWorkbook } from '../lib/excelUtils';
import { inferDepartmentForDriveFile } from '../lib/sectorTemplates';
import {
  DriveAuthCredentials,
  listAllSpreadsheetsInFolderRecursive,
  getDriveFileMetadata,
  downloadDriveSpreadsheetBuffer,
  isGoogleSheet
} from '../lib/googleDriveService';
import { syncStateToFirestore, loadStateFromFirestore } from '../lib/firestoreSync';

export const OFFICIAL_MUNICIPAL_DRIVE_FOLDER_ID = '1vEK1_NJyTDky42GIW_T0u6SCBXTaPNJv';
export const OFFICIAL_MUNICIPAL_DRIVE_URL =
  'https://drive.google.com/drive/folders/1vEK1_NJyTDky42GIW_T0u6SCBXTaPNJv?usp=sharing';

export interface DriveLiveSyncInfo {
  timestamp: string;
  folderId: string;
  folderName: string;
  filesFound: number;
  filesImported: number;
  totalRecords: number;
  breakdown: Record<string, number>;
  failedFiles: string[];
}

export interface SectorImportSummary {
  added: number;
  updated: number;
  duplicates: number;
  breakdown: Record<string, number>;
}

export interface SectorWorkbookBatchItem {
  parsed: ParsedWorkbookResult;
  targetDepartmentId: string;
  sourceName: string;
  sourceType: 'GOOGLE_DRIVE' | 'EXCEL_LOCAL' | 'GOOGLE_SHEETS';
}

export interface BatchSectorImportSummary extends SectorImportSummary {
  perFile: {
    sourceName: string;
    departmentId: string;
    added: number;
    updated: number;
    duplicates: number;
    warningsCount: number;
  }[];
}

interface DepartmentKPI {
  departmentId: string;
  departmentName: string;
  category: string;
  color: string;
  leaderName: string;
  totalTickets: number;
  resolvedTickets: number;
  pendingTickets: number;
  inProgressTickets: number;
  resolutionRate: number; // percentage 0-100
  pendingRate: number; // percentage 0-100
  inProgressRate: number; // percentage 0-100
  attendedToday: number;
  attendedWeek: number;
  attendedMonth: number;
  uniqueCitizens: number;
  lastActivityDate: string | null;
  daysSinceLastActivity: number;
  isInactiveWarning: boolean; // more than 3 days without activity
}

interface MunicipalKPIs {
  totalCitizens: number;
  uniqueCitizensAttended: number;
  attendedToday: number;
  attendedWeek: number;
  attendedMonth: number;
  totalTickets: number;
  resolvedTickets: number;
  pendingTickets: number;
  inProgressTickets: number;
  resolutionRate: number;
  pendingRate: number;
  inProgressRate: number;
  averageResolutionDays: number;
  delayedTicketsCount: number; // > 7 days pending
  criticalDelayedTicketsCount: number; // > 15 days pending
  totalSportEvents: number;
  totalSportParticipants: number;
  uniqueSportAthletes: number;
}

interface MunicipalDataContextType {
  departments: Department[];
  citizens: Citizen[];
  tickets: Ticket[];
  sportsEvents: SportEvent[];
  sportsParticipants: SportParticipant[];
  syncLogs: SyncLog[];
  auditLogs: AuditLog[];

  // CRUD Departments (persisted locally + synced to Firestore)
  departmentsLastSavedAt: string | null;
  addDepartment: (dept: Omit<Department, 'id'>) => void;
  updateDepartment: (dept: Department) => void;
  deleteDepartment: (id: string) => void;
  updateDepartmentLeader: (
    departmentId: string, 
    leaderData: { 
      leaderName: string; 
      leaderTitle?: string; 
      leaderDni?: string; 
      leaderEmail?: string; 
      phone?: string; 
      legalReference?: string;
    }
  ) => void;

  // Registro Necrológico Municipal
  necrologicalRecords: NecrologicalRecord[];
  addNecrologicalRecord: (record: Omit<NecrologicalRecord, 'id' | 'actNumber' | 'createdAt'>) => NecrologicalRecord;
  updateNecrologicalRecord: (record: NecrologicalRecord) => void;
  deleteNecrologicalRecord: (id: string) => void;
  necrologicalKPIs: {
    totalServices: number;
    totalCasketsUsed: number;
    totalNichesAssigned: number;
    totalPerpetuityNiches: number;
    totalConcessionNiches: number;
    estimatedCasketStock: number;
  };

  // MÓDULO DE CONTROL URBANO (Seguridad Vial, Carnets, Multas, Habilitaciones, Operativos)
  driversLicenses: DriversLicenseRecord[];
  addDriversLicense: (license: Omit<DriversLicenseRecord, 'id' | 'recordNumber' | 'createdAt'>) => DriversLicenseRecord;
  updateDriversLicense: (license: DriversLicenseRecord) => void;
  deleteDriversLicense: (id: string) => void;

  trafficFines: TrafficFineRecord[];
  addTrafficFine: (fine: Omit<TrafficFineRecord, 'id' | 'fineNumber' | 'createdAt'>) => TrafficFineRecord;
  updateTrafficFine: (fine: TrafficFineRecord) => void;
  deleteTrafficFine: (id: string) => void;

  commercialLicenses: CommercialLicenseRecord[];
  addCommercialLicense: (license: Omit<CommercialLicenseRecord, 'id' | 'recordNumber' | 'createdAt'>) => CommercialLicenseRecord;
  updateCommercialLicense: (license: CommercialLicenseRecord) => void;
  deleteCommercialLicense: (id: string) => void;

  trafficCheckpoints: TrafficCheckpointRecord[];
  addTrafficCheckpoint: (checkpoint: Omit<TrafficCheckpointRecord, 'id' | 'checkpointCode' | 'createdAt'>) => TrafficCheckpointRecord;
  updateTrafficCheckpoint: (checkpoint: TrafficCheckpointRecord) => void;
  deleteTrafficCheckpoint: (id: string) => void;

  urbanControlKPIs: {
    totalLicenses: number;
    deliveredLicenses: number;
    inProgressLicenses: number;
    totalFines: number;
    paidFines: number;
    activeFines: number;
    totalFinesAmount: number;
    impoundedVehiclesTotal: number;
    totalBusinessesHabilitated: number;
    totalBusinessesInProgress: number;
    totalCheckpoints: number;
    totalVehiclesControlled: number;
    totalBreathalyzerPositive: number;
  };

  // MÓDULO DE RECURSOS HUMANOS (Art. 21 - Personal Municipal)
  employees: MunicipalEmployee[];
  addEmployee: (employee: Omit<MunicipalEmployee, 'id' | 'createdAt' | 'fileNumber'> & { fileNumber?: string }) => MunicipalEmployee;
  updateEmployee: (employee: MunicipalEmployee) => void;
  deleteEmployee: (id: string) => void;
  employeeKPIs: {
    totalEmployees: number;
    plantaPermanenteCount: number;
    contratadoCount: number;
    gabineteCount: number;
    jornalizadoCount: number;
    activeCount: number;
    totalPayrollEstimated: number;
  };

  // MÓDULO DE CULTURA Y EDUCACIÓN (Cursos Oficiales: Urbano, Ballet, Música, Folklore)
  culturalStudents: CulturalStudent[];
  addCulturalStudent: (student: Omit<CulturalStudent, 'id' | 'createdAt' | 'enrollmentNumber'> & { enrollmentNumber?: string }) => CulturalStudent;
  updateCulturalStudent: (student: CulturalStudent) => void;
  deleteCulturalStudent: (id: string) => void;
  culturalKPIs: {
    totalStudents: number;
    minorStudentsCount: number;
    adultStudentsCount: number;
    urbanoCount: number;
    balletCount: number;
    musicaCount: number;
    folkloreCount: number;
  };

  // MÓDULO ESCUELA EMPRESA (Panadería y Pastelería - Dependiente del D.E.M.)
  escuelaEmpresaStudents: EscuelaEmpresaStudent[];
  addEscuelaEmpresaStudent: (student: Omit<EscuelaEmpresaStudent, 'id' | 'createdAt' | 'enrollmentNumber'> & { enrollmentNumber?: string }) => EscuelaEmpresaStudent;
  updateEscuelaEmpresaStudent: (student: EscuelaEmpresaStudent) => void;
  deleteEscuelaEmpresaStudent: (id: string) => void;
  escuelaEmpresaKPIs: {
    totalStudents: number;
    panaderiaCount: number;
    pasteleriaCount: number;
    ambasCount: number;
    activeCount: number;
    egresadosCount: number;
    withFoodCertCount: number;
  };

  // CRUD Citizens
  addCitizen: (citizen: Omit<Citizen, 'id' | 'registrationDate'>) => Citizen;
  updateCitizen: (citizen: Citizen) => void;
  findCitizenByDni: (dni: string) => Citizen | undefined;

  // CRUD Tickets
  createTicket: (ticketData: {
    citizenDni: string;
    citizenName: string;
    citizenPhone?: string;
    citizenAddress?: string;
    citizenNeighborhood?: string;
    departmentId: string;
    requestType: string;
    description: string;
    priority?: 'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE';
    isResolved?: boolean;
    initialStatus?: TicketStatus;
    notes?: string;
    areaSpecificData?: Record<string, any>;
  }) => Ticket;
  updateTicketStatus: (ticketId: string, newStatus: TicketStatus, comment: string) => void;
  deriveTicket: (ticketId: string, targetDepartmentId: string, reason: string) => void;
  addTicketComment: (ticketId: string, comment: string) => void;

  // Sports
  addSportEvent: (event: Omit<SportEvent, 'id'>) => SportEvent;
  updateSportEvent: (event: SportEvent) => void;
  addSportParticipant: (participant: Omit<SportParticipant, 'id'>) => SportParticipant;

  // Import / Sync (including Live Google Drive Folder Sync)
  importRowsFromSpreadsheet: (rows: ParsedMunicipalRow[], targetDepartmentId: string, sourceName: string, sourceType: 'GOOGLE_DRIVE' | 'EXCEL_LOCAL' | 'GOOGLE_SHEETS') => { added: number; updated: number; duplicates: number };
  importSectorWorkbook: (parsed: ParsedWorkbookResult, targetDepartmentId: string, sourceName: string, sourceType: 'GOOGLE_DRIVE' | 'EXCEL_LOCAL' | 'GOOGLE_SHEETS') => SectorImportSummary;
  importMultipleSectorWorkbooks: (items: SectorWorkbookBatchItem[], options?: { replaceExisting?: boolean }) => BatchSectorImportSummary;
  addSyncLog: (log: Omit<SyncLog, 'id'>) => void;
  isDriveSyncing: boolean;
  driveSyncProgress: string | null;
  driveSyncError: string | null;
  lastDriveSyncInfo: DriveLiveSyncInfo | null;
  syncFromOfficialDrive: (options?: { replaceExisting?: boolean; silent?: boolean }) => Promise<{
    success: boolean;
    totalRecords?: number;
    filesCount?: number;
    error?: string;
  }>;
  clearDriveSyncError: () => void;

  // Funds & Expenses
  fundAllocations: FundAllocation[];
  expenses: ExpenseRecord[];
  expenseCategories: string[];
  financialKPIs: MunicipalFinancialKPIs;
  departmentBalances: DepartmentFinancialBalance[];
  addFundAllocation: (allocation: Omit<FundAllocation, 'id' | 'createdAt'>) => FundAllocation;
  updateFundAllocation: (allocation: FundAllocation) => void;
  cancelFundAllocation: (id: string, reason: string) => void;
  addExpense: (expense: Omit<ExpenseRecord, 'id' | 'expenseCode' | 'createdAt' | 'timeline'>) => { expense: ExpenseRecord; isOverBudget: boolean };
  updateExpenseSettlement: (expenseId: string, status: ExpenseSettlementStatus, observation?: string) => void;
  subsanateExpense: (expenseId: string, correctionNotes: string, attachmentName?: string) => void;
  cancelExpense: (expenseId: string, reason: string) => void;
  addExpenseCategory: (category: string) => void;

  // Filter & KPIs
  dateRange: { start: string; end: string };
  setDateRange: (range: { start: string; end: string }) => void;
  selectedDepartmentId: string;
  setSelectedDepartmentId: (deptId: string) => void;
  selectedNeighborhood: string;
  setSelectedNeighborhood: (neighborhood: string) => void;
  selectedStatus: string;
  setSelectedStatus: (status: string) => void;
  
  // Computed
  kpis: MunicipalKPIs;
  departmentKPIs: DepartmentKPI[];
  filteredTickets: Ticket[];
  filteredCitizens: Citizen[];
  resetAllData: () => void;
  clearDemoData: () => void;
}

const STORAGE_KEYS = {
  DEPTS: 'ita_ibate_simm_depts',
  CITIZENS: 'ita_ibate_simm_citizens',
  TICKETS: 'ita_ibate_simm_tickets',
  SPORTS_EVENTS: 'ita_ibate_simm_sports_events',
  SPORTS_PARTICIPANTS: 'ita_ibate_simm_sports_participants',
  SYNC_LOGS: 'ita_ibate_simm_sync_logs',
  AUDIT_LOGS: 'ita_ibate_simm_audit_logs',
  FUNDS: 'ita_ibate_simm_funds',
  EXPENSES: 'ita_ibate_simm_expenses',
  EXP_CATEGORIES: 'ita_ibate_simm_exp_categories',
  NECROLOGICAL: 'ita_ibate_simm_necrological',
  DRIVERS_LICENSES: 'ita_ibate_simm_drivers_licenses',
  TRAFFIC_FINES: 'ita_ibate_simm_traffic_fines',
  COMMERCIAL_LICENSES: 'ita_ibate_simm_commercial_licenses',
  TRAFFIC_CHECKPOINTS: 'ita_ibate_simm_traffic_checkpoints',
  EMPLOYEES: 'ita_ibate_simm_employees',
  CULTURAL_STUDENTS: 'ita_ibate_simm_cultural_students',
  ESCUELA_EMPRESA_STUDENTS: 'ita_ibate_simm_escuela_empresa_students',
  DEPTS_UPDATED_AT: 'ita_ibate_simm_departments_updated_at'
};

// Non-destructive department upgrade: ALWAYS preserves user-edited Coordinators, Directors & Secretaries
const mergeSystemDepartmentsNonDestructive = (savedList: Department[]): Department[] => {
  if (!Array.isArray(savedList) || savedList.length === 0) {
    return INITIAL_DEPARTMENTS;
  }

  const savedById = new Map<string, Department>(savedList.map(d => [d.id, d]));
  const hasOrganigramaV2 = savedById.has('sec-jefatura-gabinete');

  if (!hasOrganigramaV2) {
    // Preserve any edited leader details from older schema by matching id
    return INITIAL_DEPARTMENTS.map(initDept => {
      const prev = savedById.get(initDept.id);
      if (!prev) return initDept;
      return {
        ...initDept,
        leaderName: prev.leaderName || initDept.leaderName,
        leaderTitle: prev.leaderTitle || initDept.leaderTitle,
        leaderDni: prev.leaderDni || initDept.leaderDni,
        leaderEmail: prev.leaderEmail || initDept.leaderEmail,
        phone: prev.phone || initDept.phone,
        legalReference: prev.legalReference || initDept.legalReference
      };
    });
  }

  // Keep every saved department and all its customized authority fields intact
  const result = savedList.map(d => {
    if (d.id === 'dir-gen-seguridad' && d.moduleType !== 'CONTROL_URBANO') {
      return { ...d, moduleType: 'CONTROL_URBANO' as const };
    }
    return d;
  });

  // Non-destructively append newly introduced system departments (e.g., escuela-empresa) if missing
  for (const initDept of INITIAL_DEPARTMENTS) {
    if (initDept.id === 'escuela-empresa' && !savedById.has(initDept.id)) {
      result.push(initDept);
    }
  }

  return result;
};

const MunicipalDataContext = createContext<MunicipalDataContextType | undefined>(undefined);

const LAST_DRIVE_SYNC_INFO_KEY = 'ita_ibate_last_drive_sync_info';
const LINKED_FOLDER_STORAGE_KEY = 'ita_ibate_linked_drive_folder';
const APPS_SCRIPT_URL_STORAGE_KEY = 'ita_ibate_drive_apps_script_url';

export const MunicipalDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, googleToken } = useAuth();

  const [isDriveSyncing, setIsDriveSyncing] = useState(false);
  const [driveSyncProgress, setDriveSyncProgress] = useState<string | null>(null);
  const [driveSyncError, setDriveSyncError] = useState<string | null>(null);
  const [lastDriveSyncInfo, setLastDriveSyncInfo] = useState<DriveLiveSyncInfo | null>(() => {
    try {
      const raw = localStorage.getItem(LAST_DRIVE_SYNC_INFO_KEY);
      return raw ? (JSON.parse(raw) as DriveLiveSyncInfo) : null;
    } catch {
      return null;
    }
  });
  const isDriveSyncingRef = useRef(false);
  const hasAutoSyncedOnMountRef = useRef(false);

  const [departmentsLastSavedAt, setDepartmentsLastSavedAt] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEYS.DEPTS_UPDATED_AT);
  });

  const [departments, setDepartments] = useState<Department[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DEPTS);
    if (!saved) return INITIAL_DEPARTMENTS;
    try {
      const parsed: Department[] = JSON.parse(saved);
      const merged = mergeSystemDepartmentsNonDestructive(parsed);
      localStorage.setItem(STORAGE_KEYS.DEPTS, JSON.stringify(merged));
      return merged;
    } catch {
      return INITIAL_DEPARTMENTS;
    }
  });

  const [driversLicenses, setDriversLicenses] = useState<DriversLicenseRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DRIVERS_LICENSES);
    return saved ? JSON.parse(saved) : INITIAL_DRIVERS_LICENSES;
  });

  const [trafficFines, setTrafficFines] = useState<TrafficFineRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TRAFFIC_FINES);
    return saved ? JSON.parse(saved) : INITIAL_TRAFFIC_FINES;
  });

  const [commercialLicenses, setCommercialLicenses] = useState<CommercialLicenseRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.COMMERCIAL_LICENSES);
    return saved ? JSON.parse(saved) : INITIAL_COMMERCIAL_LICENSES;
  });

  const [trafficCheckpoints, setTrafficCheckpoints] = useState<TrafficCheckpointRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TRAFFIC_CHECKPOINTS);
    return saved ? JSON.parse(saved) : INITIAL_TRAFFIC_CHECKPOINTS;
  });

  const [necrologicalRecords, setNecrologicalRecords] = useState<NecrologicalRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.NECROLOGICAL);
    return saved ? JSON.parse(saved) : INITIAL_NECROLOGICAL_RECORDS;
  });

  const [citizens, setCitizens] = useState<Citizen[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CITIZENS);
    return saved ? JSON.parse(saved) : INITIAL_CITIZENS;
  });

  const [tickets, setTickets] = useState<Ticket[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TICKETS);
    return saved ? JSON.parse(saved) : INITIAL_TICKETS;
  });

  const [sportsEvents, setSportsEvents] = useState<SportEvent[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SPORTS_EVENTS);
    return saved ? JSON.parse(saved) : INITIAL_SPORTS_EVENTS;
  });

  const [sportsParticipants, setSportsParticipants] = useState<SportParticipant[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SPORTS_PARTICIPANTS);
    return saved ? JSON.parse(saved) : INITIAL_SPORTS_PARTICIPANTS;
  });

  const [syncLogs, setSyncLogs] = useState<SyncLog[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SYNC_LOGS);
    return saved ? JSON.parse(saved) : INITIAL_SYNC_LOGS;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    return saved ? JSON.parse(saved) : [];
  });

  const [fundAllocations, setFundAllocations] = useState<FundAllocation[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.FUNDS);
    return saved ? JSON.parse(saved) : INITIAL_FUND_ALLOCATIONS;
  });

  const [expenses, setExpenses] = useState<ExpenseRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    return saved ? JSON.parse(saved) : INITIAL_EXPENSES;
  });

  const [expenseCategories, setExpenseCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EXP_CATEGORIES);
    return saved ? JSON.parse(saved) : DEFAULT_EXPENSE_CATEGORIES;
  });

  const [employees, setEmployees] = useState<MunicipalEmployee[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
    return saved ? JSON.parse(saved) : INITIAL_MUNICIPAL_EMPLOYEES;
  });

  const [culturalStudents, setCulturalStudents] = useState<CulturalStudent[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CULTURAL_STUDENTS);
    return saved ? JSON.parse(saved) : INITIAL_CULTURAL_STUDENTS;
  });

  const [escuelaEmpresaStudents, setEscuelaEmpresaStudents] = useState<EscuelaEmpresaStudent[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ESCUELA_EMPRESA_STUDENTS);
    return saved ? JSON.parse(saved) : INITIAL_ESCUELA_EMPRESA_STUDENTS;
  });

  // Global filters
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  });
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('ALL');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Persistence effects
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.DEPTS, JSON.stringify(departments)); }, [departments]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.CITIZENS, JSON.stringify(citizens)); }, [citizens]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(tickets)); }, [tickets]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.SPORTS_EVENTS, JSON.stringify(sportsEvents)); }, [sportsEvents]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.SPORTS_PARTICIPANTS, JSON.stringify(sportsParticipants)); }, [sportsParticipants]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.SYNC_LOGS, JSON.stringify(syncLogs)); }, [syncLogs]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(auditLogs)); }, [auditLogs]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.FUNDS, JSON.stringify(fundAllocations)); }, [fundAllocations]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses)); }, [expenses]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.EXP_CATEGORIES, JSON.stringify(expenseCategories)); }, [expenseCategories]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.NECROLOGICAL, JSON.stringify(necrologicalRecords)); }, [necrologicalRecords]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.DRIVERS_LICENSES, JSON.stringify(driversLicenses)); }, [driversLicenses]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.TRAFFIC_FINES, JSON.stringify(trafficFines)); }, [trafficFines]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.COMMERCIAL_LICENSES, JSON.stringify(commercialLicenses)); }, [commercialLicenses]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.TRAFFIC_CHECKPOINTS, JSON.stringify(trafficCheckpoints)); }, [trafficCheckpoints]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees)); }, [employees]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.CULTURAL_STUDENTS, JSON.stringify(culturalStudents)); }, [culturalStudents]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.ESCUELA_EMPRESA_STUDENTS, JSON.stringify(escuelaEmpresaStudents)); }, [escuelaEmpresaStudents]);

  // Audit helper
  const logAudit = (action: string, entity: string, details: string, entityId?: string) => {
    const newLog: AuditLog = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      userName: currentUser?.name || 'Sistema',
      userRole: currentUser?.role || 'SISTEMA',
      departmentId: currentUser?.departmentId,
      action,
      entity,
      entityId,
      details
    };
    setAuditLogs(prev => [newLog, ...prev.slice(0, 199)]);
  };

  // Hydrate custom Secretaries, Directors & Coordinators from Firestore on mount (and push newer local edits)
  useEffect(() => {
    let active = true;
    loadStateFromFirestore()
      .then(cloud => {
        if (!active) return;
        const localUpdatedAt = localStorage.getItem(STORAGE_KEYS.DEPTS_UPDATED_AT) || '';
        const remoteDepartments = Array.isArray(cloud?.departments) ? (cloud.departments as Department[]) : null;
        const remoteUpdatedAt = typeof cloud?.departmentsUpdatedAt === 'string' ? cloud.departmentsUpdatedAt : '';

        if (remoteDepartments && remoteDepartments.length > 0) {
          const shouldAdoptRemote =
            !localUpdatedAt || (remoteUpdatedAt && remoteUpdatedAt > localUpdatedAt);

          if (shouldAdoptRemote) {
            const merged = mergeSystemDepartmentsNonDestructive(remoteDepartments);
            setDepartments(merged);
            try {
              localStorage.setItem(STORAGE_KEYS.DEPTS, JSON.stringify(merged));
              if (remoteUpdatedAt) {
                localStorage.setItem(STORAGE_KEYS.DEPTS_UPDATED_AT, remoteUpdatedAt);
                setDepartmentsLastSavedAt(remoteUpdatedAt);
              }
            } catch {
              // ignore storage quota errors
            }
            return;
          }
        }

        // If local has customized edits newer than cloud, push them to Firestore automatically
        if (localUpdatedAt && (!remoteUpdatedAt || localUpdatedAt > remoteUpdatedAt)) {
          const currentSaved = localStorage.getItem(STORAGE_KEYS.DEPTS);
          if (currentSaved) {
            try {
              const parsedLocal = JSON.parse(currentSaved);
              syncStateToFirestore({
                departments: parsedLocal,
                departmentsUpdatedAt: localUpdatedAt
              }).catch(() => {});
            } catch {
              // ignore
            }
          }
        }
      })
      .catch(() => {
        // local persistence remains 100% active
      });

    return () => {
      active = false;
    };
  }, []);

  // Helper to immediately persist department & authority edits both locally and in Firestore
  const persistDepartmentsChange = (updater: (prev: Department[]) => Department[]) => {
    setDepartments(prev => {
      const next = updater(prev);
      const nowIso = new Date().toISOString();
      try {
        localStorage.setItem(STORAGE_KEYS.DEPTS, JSON.stringify(next));
        localStorage.setItem(STORAGE_KEYS.DEPTS_UPDATED_AT, nowIso);
      } catch {
        // ignore storage quota errors
      }
      setDepartmentsLastSavedAt(nowIso);
      syncStateToFirestore({
        departments: next,
        departmentsUpdatedAt: nowIso
      }).catch(() => {
        // non-blocking cloud backup
      });
      return next;
    });
  };

  // Department Operations (all changes saved permanently locally + cloud)
  const addDepartment = (deptData: Omit<Department, 'id'>) => {
    const id = `dept-${Date.now()}`;
    const newDept: Department = { ...deptData, id };
    persistDepartmentsChange(prev => [...prev, newDept]);
    logAudit('CREACION', 'AREA_MUNICIPAL', `Se creó el área: ${newDept.name}`, id);
  };

  const updateDepartment = (dept: Department) => {
    persistDepartmentsChange(prev => prev.map(d => d.id === dept.id ? dept : d));
    logAudit('MODIFICACION', 'AREA_MUNICIPAL', `Se actualizó el área y sus autoridades: ${dept.name}`, dept.id);
  };

  const deleteDepartment = (id: string) => {
    const dept = departments.find(d => d.id === id);
    persistDepartmentsChange(prev => prev.filter(d => d.id !== id));
    logAudit('ELIMINACION', 'AREA_MUNICIPAL', `Se eliminó el área: ${dept?.name || id}`, id);
  };

  // Permite colocar/editar en cada secretaría, dirección y coordinación quién está a cargo (guardado permanente)
  const updateDepartmentLeader = (
    departmentId: string, 
    leaderData: { 
      leaderName: string; 
      leaderTitle?: string; 
      leaderDni?: string; 
      leaderEmail?: string; 
      phone?: string; 
      legalReference?: string;
    }
  ) => {
    persistDepartmentsChange(prev => prev.map(d => {
      if (d.id === departmentId) {
        return {
          ...d,
          leaderName: leaderData.leaderName.trim(),
          leaderTitle: leaderData.leaderTitle !== undefined ? leaderData.leaderTitle.trim() : d.leaderTitle,
          leaderDni: leaderData.leaderDni !== undefined ? leaderData.leaderDni.trim() : d.leaderDni,
          leaderEmail: leaderData.leaderEmail !== undefined ? leaderData.leaderEmail.trim() : d.leaderEmail,
          phone: leaderData.phone !== undefined ? leaderData.phone.trim() : d.phone,
          legalReference: leaderData.legalReference !== undefined ? leaderData.legalReference.trim() : d.legalReference,
        };
      }
      return d;
    }));
    logAudit('ACTUALIZACION_AUTORIDAD', 'ORGANIGRAMA', `Se asignó a ${leaderData.leaderName} a cargo del área: ${departmentId}`, departmentId);
  };

  // Registro Necrológico Municipal (Desarrollo Social)
  const addNecrologicalRecord = (data: Omit<NecrologicalRecord, 'id' | 'actNumber' | 'createdAt'>): NecrologicalRecord => {
    const id = `nec-${Date.now()}`;
    const nextNum = necrologicalRecords.length + 1;
    const actNumber = `ACT-NEC-2026-${String(nextNum).padStart(4, '0')}`;
    const newRecord: NecrologicalRecord = {
      ...data,
      id,
      actNumber,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    setNecrologicalRecords(prev => [newRecord, ...prev]);
    logAudit('REGISTRO_NECROLOGICO', 'ACCION_SOCIAL', `Servicio necrológico asentado: ${newRecord.deceasedFullName} (Cajón: ${newRecord.usedCasket ? 'SÍ' : 'NO'}, Nicho: ${newRecord.assignedNiche ? newRecord.nicheNumber : 'NO'})`, id);
    return newRecord;
  };

  const updateNecrologicalRecord = (record: NecrologicalRecord) => {
    setNecrologicalRecords(prev => prev.map(r => r.id === record.id ? record : r));
    logAudit('ACTUALIZACION_NECROLOGICO', 'ACCION_SOCIAL', `Acta necrológica actualizada: ${record.actNumber} - ${record.deceasedFullName}`, record.id);
  };

  const deleteNecrologicalRecord = (id: string) => {
    const target = necrologicalRecords.find(r => r.id === id);
    setNecrologicalRecords(prev => prev.filter(r => r.id !== id));
    logAudit('ELIMINACION_NECROLOGICO', 'ACCION_SOCIAL', `Acta necrológica eliminada: ${target?.actNumber || id}`, id);
  };

  const necrologicalKPIs = useMemo(() => {
    const totalServices = necrologicalRecords.length;
    const totalCasketsUsed = necrologicalRecords.filter(r => r.usedCasket).length;
    const totalNichesAssigned = necrologicalRecords.filter(r => r.assignedNiche).length;
    const totalPerpetuityNiches = necrologicalRecords.filter(r => r.nicheStatus === 'A_PERPETUIDAD').length;
    const totalConcessionNiches = necrologicalRecords.filter(r => r.nicheStatus === 'CONCESION_TEMPORAL').length;
    const estimatedCasketStock = Math.max(0, 15 - totalCasketsUsed);

    return {
      totalServices,
      totalCasketsUsed,
      totalNichesAssigned,
      totalPerpetuityNiches,
      totalConcessionNiches,
      estimatedCasketStock
    };
  }, [necrologicalRecords]);

  // Urban Control Persistence
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.DRIVERS_LICENSES, JSON.stringify(driversLicenses)); }, [driversLicenses]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.TRAFFIC_FINES, JSON.stringify(trafficFines)); }, [trafficFines]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.COMMERCIAL_LICENSES, JSON.stringify(commercialLicenses)); }, [commercialLicenses]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.TRAFFIC_CHECKPOINTS, JSON.stringify(trafficCheckpoints)); }, [trafficCheckpoints]);

  // 1. Carnets de Conducir
  const addDriversLicense = (data: Omit<DriversLicenseRecord, 'id' | 'recordNumber' | 'createdAt'>): DriversLicenseRecord => {
    const id = `lic-${Date.now()}`;
    const nextNum = driversLicenses.length + 1;
    const recordNumber = `CARNET-2026-${String(nextNum).padStart(4, '0')}`;
    const newRecord: DriversLicenseRecord = {
      ...data,
      id,
      recordNumber,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    setDriversLicenses(prev => [newRecord, ...prev]);
    logAudit('CREACION_CARNET', 'CONTROL_URBANO', `Trámite de Carnet ${newRecord.licenseNumber || recordNumber} registrado para ${newRecord.citizenName} (${newRecord.category})`, id);
    return newRecord;
  };

  const updateDriversLicense = (license: DriversLicenseRecord) => {
    setDriversLicenses(prev => prev.map(l => l.id === license.id ? license : l));
    logAudit('ACTUALIZACION_CARNET', 'CONTROL_URBANO', `Carnet actualizado: ${license.licenseNumber} - ${license.citizenName} (Estado: ${license.status})`, license.id);
  };

  const deleteDriversLicense = (id: string) => {
    const target = driversLicenses.find(l => l.id === id);
    setDriversLicenses(prev => prev.filter(l => l.id !== id));
    logAudit('ELIMINACION_CARNET', 'CONTROL_URBANO', `Carnet eliminado: ${target?.licenseNumber || id}`, id);
  };

  // 2. Multas e Infracciones de Tránsito
  const addTrafficFine = (data: Omit<TrafficFineRecord, 'id' | 'fineNumber' | 'createdAt'>): TrafficFineRecord => {
    const id = `fine-${Date.now()}`;
    const nextNum = trafficFines.length + 1;
    const fineNumber = `MULTA-2026-${String(nextNum).padStart(4, '0')}`;
    const newRecord: TrafficFineRecord = {
      ...data,
      id,
      fineNumber,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    setTrafficFines(prev => [newRecord, ...prev]);
    logAudit('LABRADO_MULTA', 'CONTROL_URBANO', `Acta de Infracción labrada: ${newRecord.actNumber} - Patente: ${newRecord.vehiclePlate} (${newRecord.infractorName})`, id);
    return newRecord;
  };

  const updateTrafficFine = (fine: TrafficFineRecord) => {
    setTrafficFines(prev => prev.map(f => f.id === fine.id ? fine : f));
    logAudit('ACTUALIZACION_MULTA', 'CONTROL_URBANO', `Multa actualizada: ${fine.actNumber} - Estado: ${fine.status}`, fine.id);
  };

  const deleteTrafficFine = (id: string) => {
    const target = trafficFines.find(f => f.id === id);
    setTrafficFines(prev => prev.filter(f => f.id !== id));
    logAudit('ELIMINACION_MULTA', 'CONTROL_URBANO', `Multa eliminada: ${target?.actNumber || id}`, id);
  };

  // 3. Habilitaciones Comerciales Municipales
  const addCommercialLicense = (data: Omit<CommercialLicenseRecord, 'id' | 'recordNumber' | 'createdAt'>): CommercialLicenseRecord => {
    const id = `hab-${Date.now()}`;
    const nextNum = commercialLicenses.length + 1;
    const recordNumber = `HAB-2026-${String(nextNum).padStart(4, '0')}`;
    const newRecord: CommercialLicenseRecord = {
      ...data,
      id,
      recordNumber,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    setCommercialLicenses(prev => [newRecord, ...prev]);
    logAudit('HABILITACION_COMERCIAL', 'CONTROL_URBANO', `Habilitación tramitada para comercio: ${newRecord.businessName} (Titular: ${newRecord.ownerName})`, id);
    return newRecord;
  };

  const updateCommercialLicense = (license: CommercialLicenseRecord) => {
    setCommercialLicenses(prev => prev.map(c => c.id === license.id ? license : c));
    logAudit('ACTUALIZACION_HABILITACION', 'CONTROL_URBANO', `Comercio actualizado: ${license.businessName} (Estado: ${license.status})`, license.id);
  };

  const deleteCommercialLicense = (id: string) => {
    const target = commercialLicenses.find(c => c.id === id);
    setCommercialLicenses(prev => prev.filter(c => c.id !== id));
    logAudit('ELIMINACION_HABILITACION', 'CONTROL_URBANO', `Habilitación eliminada: ${target?.businessName || id}`, id);
  };

  // 4. Operativos de Control Vial
  const addTrafficCheckpoint = (data: Omit<TrafficCheckpointRecord, 'id' | 'checkpointCode' | 'createdAt'>): TrafficCheckpointRecord => {
    const id = `chk-${Date.now()}`;
    const nextNum = trafficCheckpoints.length + 1;
    const checkpointCode = `OP-2026-${String(nextNum).padStart(4, '0')}`;
    const newRecord: TrafficCheckpointRecord = {
      ...data,
      id,
      checkpointCode,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    setTrafficCheckpoints(prev => [newRecord, ...prev]);
    logAudit('OPERATIVO_VIAL', 'CONTROL_URBANO', `Operativo vial registrado: ${checkpointCode} en ${newRecord.location} (${newRecord.vehiclesChecked} vehículos)`, id);
    return newRecord;
  };

  const updateTrafficCheckpoint = (checkpoint: TrafficCheckpointRecord) => {
    setTrafficCheckpoints(prev => prev.map(c => c.id === checkpoint.id ? checkpoint : c));
    logAudit('ACTUALIZACION_OPERATIVO', 'CONTROL_URBANO', `Operativo vial actualizado: ${checkpoint.checkpointCode}`, checkpoint.id);
  };

  const deleteTrafficCheckpoint = (id: string) => {
    const target = trafficCheckpoints.find(c => c.id === id);
    setTrafficCheckpoints(prev => prev.filter(c => c.id !== id));
    logAudit('ELIMINACION_OPERATIVO', 'CONTROL_URBANO', `Operativo eliminado: ${target?.checkpointCode || id}`, id);
  };

  // Urban Control KPIs
  const urbanControlKPIs = useMemo(() => {
    const totalLicenses = driversLicenses.length;
    const deliveredLicenses = driversLicenses.filter(l => l.status === 'ENTREGADO').length;
    const inProgressLicenses = driversLicenses.filter(l => l.status === 'EN_TRAMITE').length;

    const totalFines = trafficFines.length;
    const paidFines = trafficFines.filter(f => f.status === 'PAGADA').length;
    const activeFines = trafficFines.filter(f => f.status === 'ACTIVA' || f.status === 'NOTIFICADA' || f.status === 'EN_DESCARGO').length;
    const totalFinesAmount = trafficFines.reduce((sum, f) => sum + f.amount, 0);
    const impoundedVehiclesTotal = trafficFines.filter(f => f.vehicleImpounded).length;

    const totalBusinessesHabilitated = commercialLicenses.filter(b => b.status === 'HABILITADO').length;
    const totalBusinessesInProgress = commercialLicenses.filter(b => b.status === 'EN_TRAMITE').length;

    const totalCheckpoints = trafficCheckpoints.length;
    const totalVehiclesControlled = trafficCheckpoints.reduce((sum, c) => sum + (c.vehiclesChecked || 0), 0);
    const totalBreathalyzerPositive = trafficCheckpoints.reduce((sum, c) => sum + (c.positiveBreathalyzerCount || 0), 0);

    return {
      totalLicenses,
      deliveredLicenses,
      inProgressLicenses,
      totalFines,
      paidFines,
      activeFines,
      totalFinesAmount,
      impoundedVehiclesTotal,
      totalBusinessesHabilitated,
      totalBusinessesInProgress,
      totalCheckpoints,
      totalVehiclesControlled,
      totalBreathalyzerPositive
    };
  }, [driversLicenses, trafficFines, commercialLicenses, trafficCheckpoints]);

  // ==========================================
  // OPERACIONES DE RECURSOS HUMANOS (RRHH)
  // ==========================================
  const addEmployee = (data: Omit<MunicipalEmployee, 'id' | 'createdAt' | 'fileNumber'> & { fileNumber?: string }): MunicipalEmployee => {
    const id = `emp-${Date.now()}`;
    const nextNum = employees.length + 1;
    const fileNumber = data.fileNumber && data.fileNumber.trim() !== '' 
      ? data.fileNumber.trim() 
      : `LEG-${String(nextNum).padStart(5, '0')}`;
    const newEmployee: MunicipalEmployee = {
      ...data,
      id,
      fileNumber,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    setEmployees(prev => [newEmployee, ...prev]);
    logAudit('ALTA_PERSONAL', 'RECURSOS_HUMANOS', `Ingreso de personal: ${newEmployee.fullName} (Legajo ${fileNumber}, Condición ${newEmployee.employmentCondition})`, id);
    return newEmployee;
  };

  const updateEmployee = (employee: MunicipalEmployee) => {
    setEmployees(prev => prev.map(e => e.id === employee.id ? employee : e));
    logAudit('ACTUALIZACION_PERSONAL', 'RECURSOS_HUMANOS', `Modificación legajo personal: ${employee.fullName} (${employee.fileNumber})`, employee.id);
  };

  const deleteEmployee = (id: string) => {
    const target = employees.find(e => e.id === id);
    setEmployees(prev => prev.filter(e => e.id !== id));
    logAudit('BAJA_PERSONAL', 'RECURSOS_HUMANOS', `Baja de legajo: ${target?.fullName || id} (${target?.fileNumber || ''})`, id);
  };

  const employeeKPIs = useMemo(() => {
    const totalEmployees = employees.length;
    const plantaPermanenteCount = employees.filter(e => e.employmentCondition === 'PLANTA_PERMANENTE').length;
    const contratadoCount = employees.filter(e => e.employmentCondition === 'CONTRATADO').length;
    const gabineteCount = employees.filter(e => e.employmentCondition === 'PERSONAL_DE_GABINETE').length;
    const jornalizadoCount = employees.filter(e => e.employmentCondition === 'JORNALIZADO').length;
    const activeCount = employees.filter(e => e.status === 'ACTIVO').length;
    const totalPayrollEstimated = employees.reduce((sum, e) => sum + (e.basicSalary || 0), 0);

    return {
      totalEmployees,
      plantaPermanenteCount,
      contratadoCount,
      gabineteCount,
      jornalizadoCount,
      activeCount,
      totalPayrollEstimated
    };
  }, [employees]);

  // ==========================================
  // OPERACIONES DE CULTURA Y EDUCACIÓN
  // ==========================================
  const addCulturalStudent = (data: Omit<CulturalStudent, 'id' | 'createdAt' | 'enrollmentNumber'> & { enrollmentNumber?: string }): CulturalStudent => {
    const id = `cult-${Date.now()}`;
    const nextNum = culturalStudents.length + 1;
    const enrollmentNumber = data.enrollmentNumber && data.enrollmentNumber.trim() !== ''
      ? data.enrollmentNumber.trim()
      : `CULT-2026-${String(nextNum).padStart(3, '0')}`;
    const isMinor = data.isMinor ?? (data.age !== undefined ? data.age < 18 : false);
    const newStudent: CulturalStudent = {
      ...data,
      id,
      enrollmentNumber,
      isMinor,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    setCulturalStudents(prev => [newStudent, ...prev]);
    logAudit('INSCRIPCION_CULTURA', 'CULTURA_EDUCACION', `Inscripción a taller: ${newStudent.fullName} en curso ${newStudent.course} (${enrollmentNumber})${isMinor ? ' [Menor de Edad con Tutor]' : ''}`, id);
    return newStudent;
  };

  const updateCulturalStudent = (student: CulturalStudent) => {
    const isMinor = student.isMinor ?? (student.age !== undefined ? student.age < 18 : false);
    const updated = { ...student, isMinor };
    setCulturalStudents(prev => prev.map(s => s.id === student.id ? updated : s));
    logAudit('ACTUALIZACION_ALUMNO', 'CULTURA_EDUCACION', `Actualización de alumno: ${student.fullName} en ${student.course}`, student.id);
  };

  const deleteCulturalStudent = (id: string) => {
    const target = culturalStudents.find(s => s.id === id);
    setCulturalStudents(prev => prev.filter(s => s.id !== id));
    logAudit('BAJA_ALUMNO', 'CULTURA_EDUCACION', `Baja de inscripción cultural: ${target?.fullName || id}`, id);
  };

  const culturalKPIs = useMemo(() => {
    const totalStudents = culturalStudents.length;
    const minorStudentsCount = culturalStudents.filter(s => s.isMinor || (s.age && s.age < 18)).length;
    const adultStudentsCount = totalStudents - minorStudentsCount;
    const urbanoCount = culturalStudents.filter(s => s.course === 'URBANO').length;
    const balletCount = culturalStudents.filter(s => s.course === 'BALLET').length;
    const musicaCount = culturalStudents.filter(s => s.course === 'MÚSICA').length;
    const folkloreCount = culturalStudents.filter(s => s.course === 'FOLKLORE').length;

    return {
      totalStudents,
      minorStudentsCount,
      adultStudentsCount,
      urbanoCount,
      balletCount,
      musicaCount,
      folkloreCount
    };
  }, [culturalStudents]);

  // ==========================================
  // OPERACIONES DE ESCUELA EMPRESA (Dependiente del D.E.M.)
  // Panadería y Pastelería
  // ==========================================
  const addEscuelaEmpresaStudent = (
    data: Omit<EscuelaEmpresaStudent, 'id' | 'createdAt' | 'enrollmentNumber'> & { enrollmentNumber?: string }
  ): EscuelaEmpresaStudent => {
    const id = `ee-${Date.now()}`;
    const nextNum = escuelaEmpresaStudents.length + 1;
    const enrollmentNumber =
      data.enrollmentNumber && data.enrollmentNumber.trim() !== ''
        ? data.enrollmentNumber.trim()
        : `EE-2026-${String(nextNum).padStart(3, '0')}`;
    const newStudent: EscuelaEmpresaStudent = {
      ...data,
      id,
      enrollmentNumber,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    setEscuelaEmpresaStudents(prev => [newStudent, ...prev]);

    // Ensure citizen record exists in municipal registry
    const cleanDni = data.dni.replace(/[^0-9]/g, '');
    const existsCit = cleanDni
      ? citizens.some(c => c.dni.replace(/[^0-9]/g, '') === cleanDni)
      : false;
    if (!existsCit && data.dni.trim()) {
      const newCit: Citizen = {
        id: `cit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        dni: data.dni,
        fullName: data.fullName,
        address: data.address || 'Itá Ibaté',
        neighborhood: data.neighborhood || 'Medalla Milagrosa',
        phone: data.phone || '',
        birthDate: data.birthDate,
        registrationDate: data.enrollmentDate || new Date().toISOString().split('T')[0],
        departmentRegisteredId: 'escuela-empresa',
        notes: `Alumno Escuela Empresa (${data.specialty})`
      };
      setCitizens(prev => [newCit, ...prev]);
    }

    logAudit(
      'INSCRIPCION_ESCUELA_EMPRESA',
      'ESCUELA_EMPRESA',
      `Nueva inscripción en Escuela Empresa (DEM): ${newStudent.fullName} · ${newStudent.specialty} (${enrollmentNumber})`,
      id
    );
    return newStudent;
  };

  const updateEscuelaEmpresaStudent = (student: EscuelaEmpresaStudent) => {
    setEscuelaEmpresaStudents(prev => prev.map(s => (s.id === student.id ? student : s)));
    logAudit(
      'ACTUALIZACION_ESCUELA_EMPRESA',
      'ESCUELA_EMPRESA',
      `Actualización de matrícula Escuela Empresa: ${student.fullName} (${student.enrollmentNumber})`,
      student.id
    );
  };

  const deleteEscuelaEmpresaStudent = (id: string) => {
    const target = escuelaEmpresaStudents.find(s => s.id === id);
    setEscuelaEmpresaStudents(prev => prev.filter(s => s.id !== id));
    logAudit(
      'BAJA_ESCUELA_EMPRESA',
      'ESCUELA_EMPRESA',
      `Baja de alumno de Escuela Empresa: ${target?.fullName || id}`,
      id
    );
  };

  const escuelaEmpresaKPIs = useMemo(() => {
    const totalStudents = escuelaEmpresaStudents.length;
    const panaderiaCount = escuelaEmpresaStudents.filter(s => s.specialty === 'PANADERIA').length;
    const pasteleriaCount = escuelaEmpresaStudents.filter(s => s.specialty === 'PASTELERIA').length;
    const ambasCount = escuelaEmpresaStudents.filter(s => s.specialty === 'PANADERIA_Y_PASTELERIA').length;
    const activeCount = escuelaEmpresaStudents.filter(s => s.status === 'ACTIVO' || s.status === 'REGULAR').length;
    const egresadosCount = escuelaEmpresaStudents.filter(s => s.status === 'EGRESADO').length;
    const withFoodCertCount = escuelaEmpresaStudents.filter(s => s.hasFoodHandlingCert).length;

    return {
      totalStudents,
      panaderiaCount,
      pasteleriaCount,
      ambasCount,
      activeCount,
      egresadosCount,
      withFoodCertCount
    };
  }, [escuelaEmpresaStudents]);

  // Citizen Operations
  const findCitizenByDni = (dni: string) => {
    const cleanDni = dni.replace(/[^0-9]/g, '');
    return citizens.find(c => c.dni.replace(/[^0-9]/g, '') === cleanDni);
  };

  const addCitizen = (citizenData: Omit<Citizen, 'id' | 'registrationDate'>): Citizen => {
    const existing = findCitizenByDni(citizenData.dni);
    if (existing) {
      const updated: Citizen = { ...existing, ...citizenData };
      setCitizens(prev => prev.map(c => c.id === existing.id ? updated : c));
      return updated;
    }
    const newCitizen: Citizen = {
      ...citizenData,
      id: `cit-${Date.now()}`,
      registrationDate: new Date().toISOString().split('T')[0]
    };
    setCitizens(prev => [newCitizen, ...prev]);
    logAudit('REGISTRO', 'CIUDADANO', `Registro de ciudadano: ${newCitizen.fullName} (DNI ${newCitizen.dni})`, newCitizen.id);
    return newCitizen;
  };

  const updateCitizen = (citizen: Citizen) => {
    setCitizens(prev => prev.map(c => c.id === citizen.id ? citizen : c));
    logAudit('ACTUALIZACION', 'CIUDADANO', `Modificación de datos: ${citizen.fullName}`, citizen.id);
  };

  // Ticket Operations
  const createTicket = (ticketData: {
    citizenDni: string;
    citizenName: string;
    citizenPhone?: string;
    citizenAddress?: string;
    citizenNeighborhood?: string;
    departmentId: string;
    requestType: string;
    description: string;
    priority?: 'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE';
    isResolved?: boolean;
    initialStatus?: TicketStatus;
    notes?: string;
    areaSpecificData?: Record<string, any>;
  }): Ticket => {
    // Ensure citizen exists
    let citizen = findCitizenByDni(ticketData.citizenDni);
    if (!citizen) {
      citizen = addCitizen({
        dni: ticketData.citizenDni,
        fullName: ticketData.citizenName,
        phone: ticketData.citizenPhone || '',
        address: ticketData.citizenAddress || '',
        neighborhood: ticketData.citizenNeighborhood || 'Barrio Centro',
        departmentRegisteredId: ticketData.departmentId,
        notes: ticketData.notes
      });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const timeNowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const countNext = tickets.length + 1;
    const ticketCode = `TR-${new Date().getFullYear()}-${String(countNext).padStart(4, '0')}`;
    
    const isResolved = !!ticketData.isResolved || ticketData.initialStatus === 'SOLUCIONADO';
    const status: TicketStatus = ticketData.initialStatus || (isResolved ? 'SOLUCIONADO' : 'INICIADO');
    const author = currentUser?.name || 'Mesa de Entrada';

    const newTicket: Ticket = {
      id: `tk-${Date.now()}`,
      ticketCode,
      citizenId: citizen.id,
      citizenName: citizen.fullName,
      citizenDni: citizen.dni,
      citizenPhone: citizen.phone,
      citizenNeighborhood: citizen.neighborhood,
      departmentId: ticketData.departmentId,
      originalDepartmentId: ticketData.departmentId,
      requestType: ticketData.requestType,
      description: ticketData.description,
      startDate: todayStr,
      resolvedDate: isResolved ? todayStr : undefined,
      responsibleName: currentUser?.name || 'Personal Municipal',
      status,
      isResolved,
      priority: ticketData.priority || 'MEDIA',
      areaSpecificData: ticketData.areaSpecificData || {},
      timeline: [
        {
          id: `tl-${Date.now()}-1`,
          date: timeNowStr,
          authorName: author,
          departmentId: ticketData.departmentId,
          newStatus: status,
          comment: isResolved 
            ? 'Trámite iniciado y resuelto satisfactoriamente en mesa de atención.' 
            : 'Atención ingresada en el sistema municipal.',
          actionType: isResolved ? 'RESOLUCION' : 'CREACION'
        }
      ]
    };

    setTickets(prev => [newTicket, ...prev]);
    logAudit('CREACION', 'TRAMITE', `Nuevo trámite ${newTicket.ticketCode} para ${citizen.fullName}`, newTicket.id);
    return newTicket;
  };

  const updateTicketStatus = (ticketId: string, newStatus: TicketStatus, comment: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const timeNowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const author = currentUser?.name || 'Operador de Área';
    const isResolvedNow = newStatus === 'SOLUCIONADO';

    setTickets(prev => prev.map(t => {
      if (t.id !== ticketId) return t;

      const updatedTimeline = [
        ...t.timeline,
        {
          id: `tl-${Date.now()}`,
          date: timeNowStr,
          authorName: author,
          departmentId: t.departmentId,
          previousStatus: t.status,
          newStatus,
          comment: comment || `Cambio de estado a: ${newStatus}`,
          actionType: (isResolvedNow ? 'RESOLUCION' : 'CAMBIO_ESTADO') as any
        }
      ];

      return {
        ...t,
        status: newStatus,
        isResolved: isResolvedNow ? true : (newStatus === 'INICIADO' || newStatus === 'EN_PROCESO' ? false : t.isResolved),
        resolvedDate: isResolvedNow ? (t.resolvedDate || todayStr) : (newStatus === 'INICIADO' || newStatus === 'EN_PROCESO' ? undefined : t.resolvedDate),
        timeline: updatedTimeline
      };
    }));

    logAudit('ESTADO', 'TRAMITE', `Trámite ${ticketId} actualizado a estado: ${newStatus}`, ticketId);
  };

  const deriveTicket = (ticketId: string, targetDepartmentId: string, reason: string) => {
    const targetDept = departments.find(d => d.id === targetDepartmentId);
    const timeNowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const author = currentUser?.name || 'Mesa de Entrada';

    setTickets(prev => prev.map(t => {
      if (t.id !== ticketId) return t;

      const updatedTimeline = [
        ...t.timeline,
        {
          id: `tl-${Date.now()}`,
          date: timeNowStr,
          authorName: author,
          departmentId: t.departmentId,
          previousStatus: t.status,
          newStatus: 'DERIVADO' as TicketStatus,
          comment: `Derivado a ${targetDept?.name || targetDepartmentId}. Motivo: ${reason}`,
          actionType: 'DERIVACION' as any
        }
      ];

      return {
        ...t,
        departmentId: targetDepartmentId,
        status: 'DERIVADO' as TicketStatus,
        responsibleName: targetDept?.leaderName || t.responsibleName,
        timeline: updatedTimeline
      };
    }));

    logAudit('DERIVACION', 'TRAMITE', `Trámite derivado hacia ${targetDept?.name}`, ticketId);
  };

  const addTicketComment = (ticketId: string, comment: string) => {
    const timeNowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const author = currentUser?.name || 'Personal Municipal';

    setTickets(prev => prev.map(t => {
      if (t.id !== ticketId) return t;
      return {
        ...t,
        timeline: [
          ...t.timeline,
          {
            id: `tl-${Date.now()}`,
            date: timeNowStr,
            authorName: author,
            departmentId: t.departmentId,
            comment,
            actionType: 'OBSERVACION'
          }
        ]
      };
    }));
  };

  // Sports Operations
  const addSportEvent = (eventData: Omit<SportEvent, 'id'>) => {
    const newEvent: SportEvent = {
      ...eventData,
      id: `evt-${Date.now()}`
    };
    setSportsEvents(prev => [...prev, newEvent]);
    logAudit('CREACION', 'EVENTO_DEPORTIVO', `Evento creado: ${newEvent.name}`, newEvent.id);
    return newEvent;
  };

  const updateSportEvent = (event: SportEvent) => {
    setSportsEvents(prev => prev.map(e => e.id === event.id ? event : e));
    logAudit('MODIFICACION', 'EVENTO_DEPORTIVO', `Evento actualizado: ${event.name}`, event.id);
  };

  const addSportParticipant = (participantData: Omit<SportParticipant, 'id'>) => {
    const newPart: SportParticipant = {
      ...participantData,
      id: `sp-${Date.now()}`
    };
    setSportsParticipants(prev => [newPart, ...prev]);

    // Also register citizen if not present
    let cit = findCitizenByDni(participantData.dni);
    if (!cit) {
      addCitizen({
        dni: participantData.dni,
        fullName: participantData.fullName,
        phone: participantData.phone,
        address: participantData.address,
        neighborhood: participantData.neighborhood,
        departmentRegisteredId: 'dir-deportes',
        notes: `Participante deportivo en ${participantData.eventName}`
      });
    }

    logAudit('INSCRIPCION', 'DEPORTES', `Inscripción deportiva: ${newPart.fullName} en ${newPart.eventName}`, newPart.id);
    return newPart;
  };

  // Import Spreadsheet rows
  const importRowsFromSpreadsheet = (
    rows: ParsedMunicipalRow[],
    targetDepartmentId: string,
    sourceName: string,
    sourceType: 'GOOGLE_DRIVE' | 'EXCEL_LOCAL' | 'GOOGLE_SHEETS'
  ) => {
    let added = 0;
    let updated = 0;
    let duplicates = 0;

    const newTicketsToAdd: Ticket[] = [];
    const nowTimeStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    let runningTicketCount = tickets.length;

    rows.forEach(r => {
      // Find or register citizen
      let cit = findCitizenByDni(r.dni);
      if (!cit) {
        cit = {
          id: `cit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          dni: r.dni,
          fullName: r.fullName,
          address: r.address || '',
          neighborhood: r.neighborhood || 'Barrio Centro',
          phone: r.phone || '',
          registrationDate: r.startDate || new Date().toISOString().split('T')[0],
          departmentRegisteredId: targetDepartmentId,
          notes: r.notes
        };
        setCitizens(prev => [cit!, ...prev]);
      }

      // Check for duplicate ticket: same citizen DNI, same request type, same start date
      const existingTicket = tickets.find(t => 
        t.citizenDni.replace(/[^0-9]/g, '') === r.dni.replace(/[^0-9]/g, '') &&
        t.requestType.toLowerCase() === r.requestType.toLowerCase() &&
        t.startDate === r.startDate
      );

      if (existingTicket) {
        duplicates++;
        // If row has new resolution status, update it
        if (r.isResolved && !existingTicket.isResolved) {
          updateTicketStatus(existingTicket.id, 'SOLUCIONADO', 'Actualizado desde sincronización de planilla');
          updated++;
        }
      } else {
        runningTicketCount++;
        const ticketCode = `TR-${new Date().getFullYear()}-${String(runningTicketCount).padStart(4, '0')}`;
        const isResolved = !!r.isResolved;
        const statusVal: TicketStatus = (r.status?.toUpperCase() as TicketStatus) || (isResolved ? 'SOLUCIONADO' : 'INICIADO');

        const newTk: Ticket = {
          id: `tk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          ticketCode,
          citizenId: cit.id,
          citizenName: cit.fullName,
          citizenDni: cit.dni,
          citizenPhone: cit.phone,
          citizenNeighborhood: cit.neighborhood,
          departmentId: targetDepartmentId,
          originalDepartmentId: targetDepartmentId,
          requestType: r.requestType,
          description: r.description,
          startDate: r.startDate || new Date().toISOString().split('T')[0],
          resolvedDate: isResolved ? (r.resolvedDate || r.startDate || new Date().toISOString().split('T')[0]) : undefined,
          responsibleName: r.responsibleName || 'Operador de Planilla',
          status: statusVal,
          isResolved,
          priority: 'MEDIA',
          timeline: [
            {
              id: `tl-imp-${Date.now()}`,
              date: nowTimeStr,
              authorName: `Sincronización (${sourceName})`,
              departmentId: targetDepartmentId,
              newStatus: statusVal,
              comment: r.notes ? `Importado: ${r.notes}` : 'Registro importado desde planilla municipal.',
              actionType: isResolved ? 'RESOLUCION' : 'CREACION'
            }
          ]
        };
        newTicketsToAdd.push(newTk);
        added++;
      }
    });

    if (newTicketsToAdd.length > 0) {
      setTickets(prev => [...newTicketsToAdd, ...prev]);
    }

    // Add sync log
    const syncLog: SyncLog = {
      id: `sync-${Date.now()}`,
      date: nowTimeStr,
      source: sourceType,
      fileName: sourceName,
      departmentId: targetDepartmentId,
      recordsProcessed: rows.length,
      recordsAdded: added,
      recordsUpdated: updated,
      duplicatesSkipped: duplicates,
      errorsCount: 0,
      status: 'EXITOSO',
      details: `Procesadas ${rows.length} filas: ${added} agregadas, ${updated} actualizadas, ${duplicates} ya existentes.`
    };
    setSyncLogs(prev => [syncLog, ...prev]);
    logAudit('IMPORTACION', 'PLANILLA', `Sincronizados ${rows.length} registros para área ${targetDepartmentId}`, syncLog.id);

    return { added, updated, duplicates };
  };

  const importMultipleSectorWorkbooks = (
    items: SectorWorkbookBatchItem[],
    options?: { replaceExisting?: boolean }
  ): BatchSectorImportSummary => {
    const replaceMode = options?.replaceExisting === true;
    const baseCitizens = replaceMode ? [] : citizens;
    const baseSportsEvents = replaceMode ? [] : sportsEvents;
    const baseSportsParticipants = replaceMode ? [] : sportsParticipants;
    const baseCulturalStudents = replaceMode ? [] : culturalStudents;
    const baseEmployees = replaceMode ? [] : employees;
    const baseDriversLicenses = replaceMode ? [] : driversLicenses;
    const baseTrafficFines = replaceMode ? [] : trafficFines;
    const baseCommercialLicenses = replaceMode ? [] : commercialLicenses;
    const baseTrafficCheckpoints = replaceMode ? [] : trafficCheckpoints;
    const baseNecrologicalRecords = replaceMode ? [] : necrologicalRecords;
    const baseEscuelaEmpresaStudents = replaceMode ? [] : escuelaEmpresaStudents;
    const baseTickets = replaceMode ? [] : tickets;

    let totalAdded = 0;
    let totalUpdated = 0;
    let totalDuplicates = 0;
    const totalBreakdown: Record<string, number> = {};
    const perFile: BatchSectorImportSummary['perFile'] = [];
    const syncLogsToAdd: SyncLog[] = [];

    const nowTimeStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const todayStr = new Date().toISOString().split('T')[0];
    const cleanNum = (s?: string) => (s || '').replace(/[^0-9]/g, '');

    const citizensToAdd: Citizen[] = [];
    const eventsToAdd: SportEvent[] = [];
    const participantsToAdd: SportParticipant[] = [];
    const participantsTutorUpdates = new Map<string, Partial<SportParticipant>>();
    const cultureToAdd: CulturalStudent[] = [];
    const cultureTutorUpdates = new Map<string, Partial<CulturalStudent>>();
    const employeesToAdd: MunicipalEmployee[] = [];
    const licensesToAdd: DriversLicenseRecord[] = [];
    const finesToAdd: TrafficFineRecord[] = [];
    const commercialToAdd: CommercialLicenseRecord[] = [];
    const checkpointsToAdd: TrafficCheckpointRecord[] = [];
    const necroToAdd: NecrologicalRecord[] = [];
    const escuelaEmpresaToAdd: EscuelaEmpresaStudent[] = [];
    const ticketsToAdd: Ticket[] = [];
    const ticketStatusUpdates: { id: string; sourceName: string }[] = [];

    let runningCultCount = baseCulturalStudents.length;
    let runningEmpCount = baseEmployees.length;
    let runningLicCount = baseDriversLicenses.length;
    let runningFineCount = baseTrafficFines.length;
    let runningCommCount = baseCommercialLicenses.length;
    let runningChkCount = baseTrafficCheckpoints.length;
    let runningNecroCount = baseNecrologicalRecords.length;
    let runningEECount = baseEscuelaEmpresaStudents.length;
    let runningTicketCount = baseTickets.length;

    items.forEach(({ parsed, targetDepartmentId, sourceName, sourceType }) => {
      let added = 0;
      let updated = 0;
      let duplicates = 0;
      const breakdown: Record<string, number> = {};
      const incBreakdown = (label: string) => {
        breakdown[label] = (breakdown[label] || 0) + 1;
        totalBreakdown[label] = (totalBreakdown[label] || 0) + 1;
      };

      const ensureCitizen = (
        dni: string,
        fullName: string,
        opts?: { phone?: string; address?: string; neighborhood?: string; deptId?: string; date?: string; notes?: string }
      ): Citizen => {
        const targetClean = cleanNum(dni);
        const existing =
          (targetClean
            ? [...baseCitizens, ...citizensToAdd].find(c => cleanNum(c.dni) === targetClean)
            : undefined) ||
          [...baseCitizens, ...citizensToAdd].find(c => c.fullName.toLowerCase() === fullName.toLowerCase() && c.dni === dni);

        if (existing) return existing;

        const newCit: Citizen = {
          id: `cit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          dni: dni || 'S/D',
          fullName: fullName || 'Ciudadano',
          address: opts?.address || '',
          neighborhood: opts?.neighborhood || 'Medalla Milagrosa',
          phone: opts?.phone || '',
          registrationDate: opts?.date || todayStr,
          departmentRegisteredId: opts?.deptId || targetDepartmentId,
          notes: opts?.notes
        };
        citizensToAdd.push(newCit);
        return newCit;
      };

      // 1. SPORTS
      parsed.sportRows.forEach(r => {
        const existingEvt = [...baseSportsEvents, ...eventsToAdd].find(
          e => e.name.toLowerCase() === r.eventName.toLowerCase()
        );
        let eventId = existingEvt?.id;
        if (!eventId) {
          const newEvt: SportEvent = {
            id: `evt-imp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: r.eventName,
            discipline: r.discipline,
            date: r.participationDate || todayStr,
            location: r.location || 'Polideportivo Municipal de Itá Ibaté',
            category: r.category || 'Libre',
            status: 'EN_CURSO',
            organizer: 'Dirección de Deportes - Municipalidad de Itá Ibaté'
          };
          eventsToAdd.push(newEvt);
          eventId = newEvt.id;
        }

        ensureCitizen(r.dni, r.fullName, {
          phone: r.phone || r.tutorPhone,
          address: r.address,
          neighborhood: r.neighborhood,
          deptId: 'dir-deportes',
          date: r.participationDate,
          notes: `Deportista (${r.discipline})`
        });

        const rDniClean = cleanNum(r.dni);
        const dup = [...baseSportsParticipants, ...participantsToAdd].find(p => {
          const sameDni = rDniClean ? cleanNum(p.dni) === rDniClean : p.fullName.toLowerCase() === r.fullName.toLowerCase();
          return (
            sameDni &&
            p.eventName.toLowerCase() === r.eventName.toLowerCase() &&
            p.participationDate === r.participationDate
          );
        });

        if (dup) {
          if (r.isMinor && r.tutorName && !dup.tutorName && !participantsToAdd.includes(dup)) {
            participantsTutorUpdates.set(dup.id, {
              isMinor: true,
              age: r.age ?? dup.age,
              tutorName: r.tutorName,
              tutorDni: r.tutorDni,
              tutorPhone: r.tutorPhone,
              tutorRelationship: r.tutorRelationship
            });
            updated++;
          } else {
            duplicates++;
          }
          return;
        }

        participantsToAdd.push({
          id: `sp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          eventId,
          eventName: r.eventName,
          fullName: r.fullName,
          dni: r.dni,
          address: r.address,
          neighborhood: r.neighborhood,
          phone: r.phone,
          discipline: r.discipline,
          category: r.category,
          teamOrClub: r.teamOrClub,
          participationDate: r.participationDate,
          location: r.location,
          isMinor: r.isMinor,
          age: r.age,
          tutorName: r.tutorName,
          tutorDni: r.tutorDni,
          tutorPhone: r.tutorPhone,
          tutorRelationship: r.tutorRelationship
        });
        added++;
        incBreakdown('Deportes');
      });

      // 2. CULTURE
      parsed.cultureRows.forEach(r => {
        const rDniClean = cleanNum(r.dni);
        const dup = [...baseCulturalStudents, ...cultureToAdd].find(s => {
          const sameDni = rDniClean ? cleanNum(s.dni) === rDniClean : s.fullName.toLowerCase() === r.fullName.toLowerCase();
          return sameDni && s.course === r.course;
        });

        if (dup) {
          if (r.isMinor && r.tutorName && !dup.tutorName && !cultureToAdd.includes(dup)) {
            cultureTutorUpdates.set(dup.id, {
              isMinor: true,
              age: r.age ?? dup.age,
              tutorName: r.tutorName,
              tutorDni: r.tutorDni,
              tutorPhone: r.tutorPhone,
              tutorRelationship: r.tutorRelationship
            });
            updated++;
          } else {
            duplicates++;
          }
          return;
        }

        runningCultCount++;
        cultureToAdd.push({
          id: `cult-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          enrollmentNumber: `CULT-2026-${String(runningCultCount).padStart(3, '0')}`,
          fullName: r.fullName,
          dni: r.dni,
          age: r.age,
          isMinor: r.isMinor,
          phone: r.phone,
          address: r.address,
          neighborhood: r.neighborhood,
          course: r.course,
          shift: r.shift,
          teacherName: r.teacherName,
          enrollmentDate: r.enrollmentDate,
          status: 'ACTIVO',
          tutorName: r.tutorName,
          tutorDni: r.tutorDni,
          tutorPhone: r.tutorPhone,
          tutorRelationship: r.tutorRelationship,
          notes: r.notes,
          createdAt: nowTimeStr
        });
        added++;
        incBreakdown('Cultura');
      });

      // 3. RRHH
      parsed.employeeRows.forEach(r => {
        const rDniClean = cleanNum(r.dni);
        const dup = [...baseEmployees, ...employeesToAdd].find(e => {
          if (r.fileNumber && e.fileNumber.toLowerCase() === r.fileNumber.toLowerCase()) return true;
          if (rDniClean && cleanNum(e.dni) === rDniClean) return true;
          return false;
        });
        if (dup) {
          duplicates++;
          return;
        }

        const deptQuery = (r.departmentNameOrId || '').toLowerCase();
        const matchedDept =
          departments.find(
            d =>
              d.id.toLowerCase() === deptQuery ||
              d.name.toLowerCase() === deptQuery ||
              (deptQuery && (d.name.toLowerCase().includes(deptQuery) || d.shortName.toLowerCase().includes(deptQuery)))
          ) ||
          departments.find(d => d.id === targetDepartmentId) ||
          departments[0];

        runningEmpCount++;
        employeesToAdd.push({
          id: `emp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          fileNumber: r.fileNumber || `LEG-${String(runningEmpCount).padStart(5, '0')}`,
          fullName: r.fullName,
          dni: r.dni,
          cuil: r.cuil,
          nationality: 'Argentina',
          employmentCondition: r.employmentCondition,
          departmentId: matchedDept?.id || targetDepartmentId,
          position: r.position,
          categoryOrScale: r.categoryOrScale,
          entryDate: r.entryDate,
          phone: r.phone,
          address: r.address,
          neighborhood: r.neighborhood,
          workShift: r.workShift || 'MANANA',
          hoursPerWeek: r.hoursPerWeek || 30,
          status: 'ACTIVO',
          socialSecurityNumber: r.socialSecurityNumber,
          emergencyContactName: r.emergencyContactName,
          emergencyContactPhone: r.emergencyContactPhone,
          notes: r.notes,
          createdAt: nowTimeStr
        });
        added++;
        incBreakdown('RRHH');
      });

      // 4. CONTROL URBANO - CARNETS
      parsed.licenseRows.forEach(r => {
        const rDniClean = cleanNum(r.citizenDni);
        const dup = [...baseDriversLicenses, ...licensesToAdd].find(l => {
          if (r.licenseNumber && l.licenseNumber.toLowerCase() === r.licenseNumber.toLowerCase()) return true;
          return rDniClean && cleanNum(l.citizenDni) === rDniClean && l.issueDate === r.issueDate;
        });
        if (dup) {
          duplicates++;
          return;
        }
        runningLicCount++;
        licensesToAdd.push({
          ...r,
          id: `lic-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          recordNumber: `CARNET-2026-${String(runningLicCount).padStart(4, '0')}`,
          createdAt: nowTimeStr
        });
        added++;
        incBreakdown('Carnets de Conducir');
      });

      // 5. CONTROL URBANO - MULTAS
      parsed.fineRows.forEach(r => {
        const dup = [...baseTrafficFines, ...finesToAdd].find(
          f => f.actNumber.toLowerCase() === r.actNumber.toLowerCase()
        );
        if (dup) {
          duplicates++;
          return;
        }
        runningFineCount++;
        finesToAdd.push({
          ...r,
          id: `fine-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          fineNumber: `MULTA-2026-${String(runningFineCount).padStart(4, '0')}`,
          createdAt: nowTimeStr
        });
        added++;
        incBreakdown('Multas de Tránsito');
      });

      // 6. CONTROL URBANO - HABILITACIONES
      parsed.commercialRows.forEach(r => {
        const dup = [...baseCommercialLicenses, ...commercialToAdd].find(
          c =>
            c.expedientNumber.toLowerCase() === r.expedientNumber.toLowerCase() &&
            c.businessName.toLowerCase() === r.businessName.toLowerCase()
        );
        if (dup) {
          duplicates++;
          return;
        }
        runningCommCount++;
        commercialToAdd.push({
          ...r,
          id: `hab-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          recordNumber: `HAB-2026-${String(runningCommCount).padStart(4, '0')}`,
          createdAt: nowTimeStr
        });
        added++;
        incBreakdown('Habilitaciones');
      });

      // 7. CONTROL URBANO - OPERATIVOS
      parsed.checkpointRows.forEach(r => {
        const dup = [...baseTrafficCheckpoints, ...checkpointsToAdd].find(
          c =>
            c.date === r.date &&
            c.location.toLowerCase() === r.location.toLowerCase() &&
            c.shift === r.shift
        );
        if (dup) {
          duplicates++;
          return;
        }
        runningChkCount++;
        checkpointsToAdd.push({
          ...r,
          id: `chk-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          checkpointCode: `OP-2026-${String(runningChkCount).padStart(4, '0')}`,
          createdAt: nowTimeStr
        });
        added++;
        incBreakdown('Operativos Viales');
      });

      // 8. NECROLOGICAL
      parsed.necrologicalRows.forEach(r => {
        const rDniClean = cleanNum(r.deceasedDni);
        const dup = [...baseNecrologicalRecords, ...necroToAdd].find(n => {
          const sameDni = rDniClean ? cleanNum(n.deceasedDni) === rDniClean : n.deceasedFullName.toLowerCase() === r.deceasedFullName.toLowerCase();
          return sameDni && n.deathDate === r.deathDate;
        });
        if (dup) {
          duplicates++;
          return;
        }
        runningNecroCount++;
        necroToAdd.push({
          ...r,
          id: `nec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          actNumber: `ACT-NEC-2026-${String(runningNecroCount).padStart(4, '0')}`,
          createdAt: nowTimeStr
        });
        added++;
        incBreakdown('Registro Necrológico');
      });

      // 8b. ESCUELA EMPRESA (Panadería y Pastelería - D.E.M.)
      (parsed.escuelaEmpresaRows || []).forEach(r => {
        ensureCitizen(r.dni, r.fullName, {
          phone: r.phone,
          address: r.address,
          neighborhood: r.neighborhood,
          deptId: 'escuela-empresa',
          date: r.enrollmentDate,
          notes: `Alumno Escuela Empresa (${r.specialty})`
        });

        const rDniClean = cleanNum(r.dni);
        const dup = [...baseEscuelaEmpresaStudents, ...escuelaEmpresaToAdd].find(s => {
          const sameDni = rDniClean ? cleanNum(s.dni) === rDniClean : s.fullName.toLowerCase() === r.fullName.toLowerCase();
          return sameDni && s.specialty === r.specialty;
        });

        if (dup) {
          duplicates++;
          return;
        }

        runningEECount++;
        escuelaEmpresaToAdd.push({
          id: `ee-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          enrollmentNumber: `EE-2026-${String(runningEECount).padStart(3, '0')}`,
          fullName: r.fullName,
          dni: r.dni,
          age: r.age,
          phone: r.phone,
          email: r.email,
          address: r.address,
          neighborhood: r.neighborhood,
          specialty: r.specialty,
          shift: r.shift,
          level: r.level,
          instructorName: r.instructorName,
          hasFoodHandlingCert: r.hasFoodHandlingCert,
          enrollmentDate: r.enrollmentDate,
          status: r.status,
          notes: r.notes,
          createdAt: nowTimeStr
        });
        added++;
        incBreakdown('Escuela Empresa');
      });

      // 9. TICKETS
      parsed.ticketRows.forEach(r => {
        const cit = ensureCitizen(r.dni, r.fullName, {
          phone: r.phone,
          address: r.address,
          neighborhood: r.neighborhood,
          deptId: targetDepartmentId,
          date: r.startDate,
          notes: r.notes
        });

        const rDniClean = cleanNum(r.dni);
        const existingTicket = [...baseTickets, ...ticketsToAdd].find(t => {
          const sameDni = rDniClean ? cleanNum(t.citizenDni) === rDniClean : t.citizenName.toLowerCase() === r.fullName.toLowerCase();
          return (
            sameDni &&
            t.requestType.toLowerCase() === r.requestType.toLowerCase() &&
            t.startDate === (r.startDate || todayStr)
          );
        });

        if (existingTicket) {
          if (r.isResolved && !existingTicket.isResolved && !ticketsToAdd.includes(existingTicket)) {
            ticketStatusUpdates.push({ id: existingTicket.id, sourceName });
            updated++;
          } else {
            duplicates++;
          }
          return;
        }

        runningTicketCount++;
        const ticketCode = `TR-${new Date().getFullYear()}-${String(runningTicketCount).padStart(4, '0')}`;
        const isResolved = !!r.isResolved;
        const statusVal: TicketStatus = (r.status?.toUpperCase() as TicketStatus) || (isResolved ? 'SOLUCIONADO' : 'INICIADO');

        ticketsToAdd.push({
          id: `tk-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          ticketCode,
          citizenId: cit.id,
          citizenName: cit.fullName,
          citizenDni: cit.dni,
          citizenPhone: cit.phone,
          citizenNeighborhood: cit.neighborhood,
          departmentId: targetDepartmentId,
          originalDepartmentId: targetDepartmentId,
          requestType: r.requestType,
          description: r.description,
          startDate: r.startDate || todayStr,
          resolvedDate: isResolved ? (r.resolvedDate || r.startDate || todayStr) : undefined,
          responsibleName: r.responsibleName || 'Operador de Planilla',
          status: statusVal,
          isResolved,
          priority: 'MEDIA',
          areaSpecificData: r.areaSpecificData || {},
          timeline: [
            {
              id: `tl-imp-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
              date: nowTimeStr,
              authorName: `Sincronización (${sourceName})`,
              departmentId: targetDepartmentId,
              newStatus: statusVal,
              comment: r.notes ? `Importado: ${r.notes}` : 'Registro importado desde planilla municipal.',
              actionType: isResolved ? 'RESOLUCION' : 'CREACION'
            }
          ]
        });
        added++;
        incBreakdown('Trámites / Atenciones');
      });

      totalAdded += added;
      totalUpdated += updated;
      totalDuplicates += duplicates;

      const totalProcessed = parsed.totalDetected;
      syncLogsToAdd.push({
        id: `sync-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        date: nowTimeStr,
        source: sourceType,
        fileName: sourceName,
        departmentId: targetDepartmentId,
        recordsProcessed: totalProcessed,
        recordsAdded: added,
        recordsUpdated: updated,
        duplicatesSkipped: duplicates,
        errorsCount: parsed.warnings.length,
        status: 'EXITOSO',
        details: `Procesados ${totalProcessed} registros (${Object.entries(breakdown).map(([k, v]) => `${k}: +${v}`).join(', ') || 'sin novedades'}).`
      });

      perFile.push({
        sourceName,
        departmentId: targetDepartmentId,
        added,
        updated,
        duplicates,
        warningsCount: parsed.warnings.length
      });
    });

    // Apply all batched state updates once cleanly
    if (replaceMode) {
      // Base operational collections 100% on the live Google Drive Excel files (preserving departments/authorities & credentials)
      setCitizens(citizensToAdd);
      setSportsEvents(eventsToAdd);
      setSportsParticipants(participantsToAdd);
      setCulturalStudents(cultureToAdd);
      setEmployees(employeesToAdd);
      setDriversLicenses(licensesToAdd);
      setTrafficFines(finesToAdd);
      setCommercialLicenses(commercialToAdd);
      setTrafficCheckpoints(checkpointsToAdd);
      setNecrologicalRecords(necroToAdd);
      setEscuelaEmpresaStudents(escuelaEmpresaToAdd);
      setTickets(ticketsToAdd);
    } else {
      if (citizensToAdd.length > 0) setCitizens(prev => [...citizensToAdd, ...prev]);
      if (eventsToAdd.length > 0) setSportsEvents(prev => [...eventsToAdd, ...prev]);
      if (participantsToAdd.length > 0 || participantsTutorUpdates.size > 0) {
        setSportsParticipants(prev => [
          ...participantsToAdd,
          ...prev.map(p => (participantsTutorUpdates.has(p.id) ? { ...p, ...participantsTutorUpdates.get(p.id)! } : p))
        ]);
      }
      if (cultureToAdd.length > 0 || cultureTutorUpdates.size > 0) {
        setCulturalStudents(prev => [
          ...cultureToAdd,
          ...prev.map(s => (cultureTutorUpdates.has(s.id) ? { ...s, ...cultureTutorUpdates.get(s.id)! } : s))
        ]);
      }
      if (employeesToAdd.length > 0) setEmployees(prev => [...employeesToAdd, ...prev]);
      if (licensesToAdd.length > 0) setDriversLicenses(prev => [...licensesToAdd, ...prev]);
      if (finesToAdd.length > 0) setTrafficFines(prev => [...finesToAdd, ...prev]);
      if (commercialToAdd.length > 0) setCommercialLicenses(prev => [...commercialToAdd, ...prev]);
      if (checkpointsToAdd.length > 0) setTrafficCheckpoints(prev => [...checkpointsToAdd, ...prev]);
      if (necroToAdd.length > 0) setNecrologicalRecords(prev => [...necroToAdd, ...prev]);
      if (escuelaEmpresaToAdd.length > 0) setEscuelaEmpresaStudents(prev => [...escuelaEmpresaToAdd, ...prev]);
      if (ticketsToAdd.length > 0) setTickets(prev => [...ticketsToAdd, ...prev]);
      ticketStatusUpdates.forEach(item => {
        updateTicketStatus(item.id, 'SOLUCIONADO', `Actualizado desde sincronización (${item.sourceName})`);
      });
    }
    if (syncLogsToAdd.length > 0) setSyncLogs(prev => [...syncLogsToAdd, ...prev.slice(0, 100)]);

    logAudit(
      replaceMode ? 'ACTUALIZACION_DESDE_DRIVE' : 'IMPORTACION_MASIVA',
      'PLANILLA_SECTORIAL',
      `${replaceMode ? 'Base actualizada desde Drive con' : 'Sincronizados'} ${items.length} archivo(s) (+${totalAdded} registros, ${totalUpdated} actualizados, ${totalDuplicates} duplicados)`
    );

    return {
      added: totalAdded,
      updated: totalUpdated,
      duplicates: totalDuplicates,
      breakdown: totalBreakdown,
      perFile
    };
  };

  // Global 1-click Live Sync directly from the official Municipal Google Drive folder
  const syncFromOfficialDrive = useCallback(
    async (options?: { replaceExisting?: boolean; silent?: boolean }) => {
      if (isDriveSyncingRef.current) {
        return { success: false, error: 'Ya hay una actualización de Google Drive en curso.' };
      }

      isDriveSyncingRef.current = true;
      setIsDriveSyncing(true);
      if (!options?.silent) {
        setDriveSyncError(null);
      }
      setDriveSyncProgress('Conectando con carpeta oficial de Google Drive...');

      try {
        let folderId = OFFICIAL_MUNICIPAL_DRIVE_FOLDER_ID;
        let folderName = 'Sistema de Gestión';
        let storedFolderObj: any = null;
        try {
          const rawFolder = localStorage.getItem(LINKED_FOLDER_STORAGE_KEY);
          if (rawFolder) {
            storedFolderObj = JSON.parse(rawFolder);
            if (storedFolderObj?.folderId) {
              folderId = storedFolderObj.folderId;
              folderName = storedFolderObj.folderName || folderName;
            }
          }
        } catch {
          // fallback to official municipal folder ID
        }

        let auth: DriveAuthCredentials = { publicProxy: true };
        if (googleToken) {
          auth = { accessToken: googleToken };
        } else {
          try {
            const scriptUrl = localStorage.getItem(APPS_SCRIPT_URL_STORAGE_KEY)?.trim();
            if (scriptUrl) auth = { appsScriptUrl: scriptUrl };
          } catch {
            // default publicProxy
          }
        }

        try {
          const meta = await getDriveFileMetadata(auth, folderId);
          if (meta?.name) folderName = meta.name;
        } catch {
          // keep fallback folderName
        }

        setDriveSyncProgress(`Escaneando "${folderName}" y las subcarpetas de cada Secretaría...`);
        const allFound = await listAllSpreadsheetsInFolderRecursive(auth, folderId, folderName, 2);

        if (allFound.length === 0) {
          throw new Error(
            `La carpeta "${folderName}" en Google Drive no contiene archivos Excel (.xlsx, .xls, .csv) o no está compartida como lector.`
          );
        }

        const batchItems: SectorWorkbookBatchItem[] = [];
        const failedFiles: string[] = [];
        const syncedFilesMap: Record<string, string> = {};

        for (let i = 0; i < allFound.length; i++) {
          const entry = allFound[i];
          setDriveSyncProgress(`Leyendo planilla ${i + 1} de ${allFound.length}: ${entry.file.name}`);
          try {
            const buffer = await downloadDriveSpreadsheetBuffer(auth, entry.file);
            const parsed = parseSectorWorkbook(buffer, entry.file.name);
            if (parsed.totalDetected === 0) {
              failedFiles.push(`${entry.file.name} (sin filas válidas)`);
              continue;
            }
            const inferredDeptId = inferDepartmentForDriveFile(
              entry.file.name,
              entry.folderPath,
              parsed.inferredDepartmentId,
              departments,
              departments[0]?.id || 'coord-atencion-ciudadana'
            );
            batchItems.push({
              parsed,
              targetDepartmentId: inferredDeptId,
              sourceName: entry.file.name,
              sourceType: isGoogleSheet(entry.file.mimeType) ? 'GOOGLE_SHEETS' : 'GOOGLE_DRIVE'
            });
            syncedFilesMap[entry.file.id] = entry.file.modifiedTime || 'static';
          } catch (fileErr: any) {
            failedFiles.push(`${entry.file.name} (${fileErr?.message ? fileErr.message.slice(0, 60) : 'error'})`);
          }
        }

        if (batchItems.length === 0) {
          throw new Error(
            'Se encontraron archivos en Google Drive pero ninguno pudo importarse con las columnas del modelo oficial.'
          );
        }

        setDriveSyncProgress(`Actualizando el sistema con ${batchItems.length} planillas reales...`);
        const summary = importMultipleSectorWorkbooks(batchItems, {
          replaceExisting: options?.replaceExisting ?? true
        });

        const nowIso = new Date().toISOString();
        const syncInfo: DriveLiveSyncInfo = {
          timestamp: nowIso,
          folderId,
          folderName,
          filesFound: allFound.length,
          filesImported: batchItems.length,
          totalRecords: summary.added,
          breakdown: summary.breakdown,
          failedFiles
        };

        setLastDriveSyncInfo(syncInfo);
        setDriveSyncError(null);

        try {
          localStorage.setItem(LAST_DRIVE_SYNC_INFO_KEY, JSON.stringify(syncInfo));
          const updatedLinked = {
            ...(storedFolderObj || {}),
            folderId,
            folderName,
            folderUrl: storedFolderObj?.folderUrl || OFFICIAL_MUNICIPAL_DRIVE_URL,
            autoSyncOnConnect: true,
            lastSyncedAt: nowIso,
            syncedFilesMap
          };
          localStorage.setItem(LINKED_FOLDER_STORAGE_KEY, JSON.stringify(updatedLinked));
          syncStateToFirestore({ lastDriveSyncInfo: syncInfo, linkedDriveFolder: updatedLinked }).catch(() => {});
        } catch {
          // ignore storage quota
        }

        return {
          success: true,
          totalRecords: summary.added,
          filesCount: batchItems.length
        };
      } catch (err: any) {
        const msg = err?.message || 'No se pudo actualizar desde Google Drive.';
        if (!options?.silent) {
          setDriveSyncError(msg);
        }
        return { success: false, error: msg };
      } finally {
        isDriveSyncingRef.current = false;
        setIsDriveSyncing(false);
        setDriveSyncProgress(null);
      }
    },
    [googleToken, departments, importMultipleSectorWorkbooks]
  );

  const clearDriveSyncError = useCallback(() => setDriveSyncError(null), []);

  // Automatic background refresh from official Google Drive folder once when Admin opens the system
  useEffect(() => {
    if (hasAutoSyncedOnMountRef.current) return;
    hasAutoSyncedOnMountRef.current = true;
    const timer = window.setTimeout(() => {
      syncFromOfficialDrive({ replaceExisting: true, silent: true }).catch(() => {});
    }, 450);
    return () => window.clearTimeout(timer);
  }, [syncFromOfficialDrive]);

  const importSectorWorkbook = (
    parsed: ParsedWorkbookResult,
    targetDepartmentId: string,
    sourceName: string,
    sourceType: 'GOOGLE_DRIVE' | 'EXCEL_LOCAL' | 'GOOGLE_SHEETS'
  ): SectorImportSummary => {
    const res = importMultipleSectorWorkbooks([
      { parsed, targetDepartmentId, sourceName, sourceType }
    ]);
    return {
      added: res.added,
      updated: res.updated,
      duplicates: res.duplicates,
      breakdown: res.breakdown
    };
  };

  const addSyncLog = (logData: Omit<SyncLog, 'id'>) => {
    const newLog: SyncLog = {
      ...logData,
      id: `sync-${Date.now()}`
    };
    setSyncLogs(prev => [newLog, ...prev]);
  };

  // Funds Operations
  const addFundAllocation = (allocationData: Omit<FundAllocation, 'id' | 'createdAt'>): FundAllocation => {
    const newAllocation: FundAllocation = {
      ...allocationData,
      id: `fund-${Date.now()}`,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    setFundAllocations(prev => [newAllocation, ...prev]);
    const dept = departments.find(d => d.id === allocationData.departmentId);
    logAudit(
      'ENTREGA_FONDOS',
      'FONDOS_MUNICIPALES',
      `Asignación de $${allocationData.amountDelivered.toLocaleString('es-AR')} a ${dept?.name || allocationData.departmentId}. Concepto: ${allocationData.concept}`,
      newAllocation.id
    );
    return newAllocation;
  };

  const updateFundAllocation = (allocation: FundAllocation) => {
    setFundAllocations(prev => prev.map(f => f.id === allocation.id ? allocation : f));
    logAudit('MODIFICACION_FONDOS', 'FONDOS_MUNICIPALES', `Actualización de asignación ${allocation.voucherNumber}`, allocation.id);
  };

  const cancelFundAllocation = (id: string, reason: string) => {
    setFundAllocations(prev => prev.map(f => {
      if (f.id !== id) return f;
      return {
        ...f,
        status: 'ANULADO',
        notes: `${f.notes || ''} [ANULADO: ${reason}]`
      };
    }));
    logAudit('ANULACION_FONDOS', 'FONDOS_MUNICIPALES', `Anulación de entrega de fondos ID ${id}: ${reason}`, id);
  };

  // Expenses Operations
  const addExpense = (expenseData: Omit<ExpenseRecord, 'id' | 'expenseCode' | 'createdAt' | 'timeline'>): { expense: ExpenseRecord; isOverBudget: boolean } => {
    const count = expenses.length + 1;
    const expenseCode = `GAS-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

    // Calculate current available balance for this department
    const deptAllocations = fundAllocations.filter(f => f.departmentId === expenseData.departmentId && f.status !== 'ANULADO');
    const totalDelivered = deptAllocations.reduce((sum, f) => sum + f.amountDelivered, 0);
    const deptExpenses = expenses.filter(e => e.departmentId === expenseData.departmentId && e.settlementStatus !== 'ANULADO');
    const totalSpent = deptExpenses.reduce((sum, e) => sum + e.amount, 0);
    const currentAvailable = totalDelivered - totalSpent;
    const isOverBudget = expenseData.amount > currentAvailable;

    const newExpense: ExpenseRecord = {
      ...expenseData,
      id: `exp-${Date.now()}`,
      expenseCode,
      createdAt: nowStr,
      timeline: [
        {
          id: `tl-exp-${Date.now()}`,
          date: nowStr,
          authorName: currentUser?.name || expenseData.createdByUserName || 'Personal Municipal',
          status: expenseData.settlementStatus,
          comment: isOverBudget 
            ? `Registro de gasto por $${expenseData.amount.toLocaleString('es-AR')}. AVISO: Supera el saldo disponible inmediato.`
            : `Registro de gasto por $${expenseData.amount.toLocaleString('es-AR')}. Proveedor: ${expenseData.supplierName}.`
        }
      ]
    };

    setExpenses(prev => [newExpense, ...prev]);
    logAudit(
      'REGISTRO_GASTO',
      'GASTOS_MUNICIPALES',
      `Nuevo gasto ${newExpense.expenseCode} por $${newExpense.amount.toLocaleString('es-AR')} (${newExpense.category}) para ${expenseData.departmentId}`,
      newExpense.id
    );

    return { expense: newExpense, isOverBudget };
  };

  const updateExpenseSettlement = (expenseId: string, status: ExpenseSettlementStatus, observation?: string) => {
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const reviewer = currentUser?.name || 'Secretaría de Hacienda / Auditoría';

    setExpenses(prev => prev.map(e => {
      if (e.id !== expenseId) return e;

      const newTimelineItem = {
        id: `tl-exp-${Date.now()}`,
        date: nowStr,
        authorName: reviewer,
        status,
        comment: observation || `Cambio de estado de rendición a: ${status}`
      };

      return {
        ...e,
        settlementStatus: status,
        settlementObservation: observation || e.settlementObservation,
        settlementDate: (status === 'APROBADA' || status === 'RECHAZADA') ? nowStr.split(' ')[0] : e.settlementDate,
        reviewedByName: reviewer,
        timeline: [...e.timeline, newTimelineItem]
      };
    }));

    logAudit('RENDICION_GASTO', 'GASTOS_MUNICIPALES', `Rendición de ${expenseId} actualizada a: ${status}`, expenseId);
  };

  const subsanateExpense = (expenseId: string, correctionNotes: string, attachmentName?: string) => {
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const author = currentUser?.name || 'Responsable de Área';

    setExpenses(prev => prev.map(e => {
      if (e.id !== expenseId) return e;

      const newTimelineItem = {
        id: `tl-exp-${Date.now()}`,
        date: nowStr,
        authorName: author,
        status: 'PRESENTADA' as ExpenseSettlementStatus,
        comment: `Subsanación presentada: ${correctionNotes}`
      };

      return {
        ...e,
        settlementStatus: 'PRESENTADA' as ExpenseSettlementStatus,
        notes: `${e.notes || ''} [Subsanación: ${correctionNotes}]`,
        attachmentName: attachmentName || e.attachmentName,
        timeline: [...e.timeline, newTimelineItem]
      };
    }));

    logAudit('SUBSANACION_RENDICION', 'GASTOS_MUNICIPALES', `Subsanación de rendición para ${expenseId}: ${correctionNotes}`, expenseId);
  };

  const cancelExpense = (expenseId: string, reason: string) => {
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const author = currentUser?.name || 'Administración';

    setExpenses(prev => prev.map(e => {
      if (e.id !== expenseId) return e;

      return {
        ...e,
        settlementStatus: 'ANULADO' as ExpenseSettlementStatus,
        notes: `${e.notes || ''} [ANULADO: ${reason}]`,
        timeline: [
          ...e.timeline,
          {
            id: `tl-exp-${Date.now()}`,
            date: nowStr,
            authorName: author,
            status: 'ANULADO',
            comment: `Gasto anulado formalmente. Motivo: ${reason}`
          }
        ]
      };
    }));

    logAudit('ANULACION_GASTO', 'GASTOS_MUNICIPALES', `Anulación de gasto ${expenseId}: ${reason}`, expenseId);
  };

  const addExpenseCategory = (category: string) => {
    if (!category.trim() || expenseCategories.includes(category.trim())) return;
    setExpenseCategories(prev => [...prev, category.trim()]);
    logAudit('CREACION_CATEGORIA', 'FINANZAS', `Nueva categoría de gasto agregada: ${category.trim()}`);
  };

  const resetAllData = () => {
    // Preserves ALL customized Secretaries, Directors & Coordinators in `departments`
    setNecrologicalRecords(INITIAL_NECROLOGICAL_RECORDS);
    setDriversLicenses(INITIAL_DRIVERS_LICENSES);
    setTrafficFines(INITIAL_TRAFFIC_FINES);
    setCommercialLicenses(INITIAL_COMMERCIAL_LICENSES);
    setTrafficCheckpoints(INITIAL_TRAFFIC_CHECKPOINTS);
    setCitizens(INITIAL_CITIZENS);
    setTickets(INITIAL_TICKETS);
    setSportsEvents(INITIAL_SPORTS_EVENTS);
    setSportsParticipants(INITIAL_SPORTS_PARTICIPANTS);
    setSyncLogs(INITIAL_SYNC_LOGS);
    setFundAllocations(INITIAL_FUND_ALLOCATIONS);
    setExpenses(INITIAL_EXPENSES);
    setExpenseCategories(DEFAULT_EXPENSE_CATEGORIES);
    setEmployees(INITIAL_MUNICIPAL_EMPLOYEES);
    setCulturalStudents(INITIAL_CULTURAL_STUDENTS);
    setEscuelaEmpresaStudents(INITIAL_ESCUELA_EMPRESA_STUDENTS);
    setAuditLogs([]);
    localStorage.removeItem(STORAGE_KEYS.NECROLOGICAL);
    localStorage.removeItem(STORAGE_KEYS.DRIVERS_LICENSES);
    localStorage.removeItem(STORAGE_KEYS.TRAFFIC_FINES);
    localStorage.removeItem(STORAGE_KEYS.COMMERCIAL_LICENSES);
    localStorage.removeItem(STORAGE_KEYS.TRAFFIC_CHECKPOINTS);
    localStorage.removeItem(STORAGE_KEYS.EMPLOYEES);
    localStorage.removeItem(STORAGE_KEYS.CULTURAL_STUDENTS);
    localStorage.removeItem(STORAGE_KEYS.ESCUELA_EMPRESA_STUDENTS);
    localStorage.removeItem(STORAGE_KEYS.CITIZENS);
    localStorage.removeItem(STORAGE_KEYS.TICKETS);
    localStorage.removeItem(STORAGE_KEYS.SPORTS_EVENTS);
    localStorage.removeItem(STORAGE_KEYS.SPORTS_PARTICIPANTS);
    localStorage.removeItem(STORAGE_KEYS.SYNC_LOGS);
    localStorage.removeItem(STORAGE_KEYS.FUNDS);
    localStorage.removeItem(STORAGE_KEYS.EXPENSES);
    localStorage.removeItem(STORAGE_KEYS.EXP_CATEGORIES);
    localStorage.removeItem(STORAGE_KEYS.AUDIT_LOGS);
  };

  const clearDemoData = () => {
    // Purges all operational/demo data leaving a clean, production-ready database
    // Preserves customized Secretaries, Directors & Coordinators (departments), expenseCategories, and Admin credentials
    setCitizens([]);
    setTickets([]);
    setSportsEvents([]);
    setSportsParticipants([]);
    setFundAllocations([]);
    setExpenses([]);
    setNecrologicalRecords([]);
    setDriversLicenses([]);
    setTrafficFines([]);
    setCommercialLicenses([]);
    setTrafficCheckpoints([]);
    setEmployees([]);
    setCulturalStudents([]);
    setEscuelaEmpresaStudents([]);
    setSyncLogs([]);

    const nowTs = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const cleanAudit: AuditLog[] = [
      {
        id: `aud-${Date.now()}`,
        timestamp: nowTs,
        userName: currentUser?.name || 'Administrador General',
        userRole: currentUser?.role || 'ADMIN_GENERAL',
        action: 'VACIADO_BASE_DATOS',
        entity: 'SISTEMA',
        details: 'Base de datos vaciada para iniciar en producción con Google Drive. Se conservaron autoridades y organigrama.'
      }
    ];
    setAuditLogs(cleanAudit);

    localStorage.setItem(STORAGE_KEYS.CITIZENS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.SPORTS_EVENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.SPORTS_PARTICIPANTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.FUNDS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.NECROLOGICAL, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.DRIVERS_LICENSES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.TRAFFIC_FINES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.COMMERCIAL_LICENSES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.TRAFFIC_CHECKPOINTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.CULTURAL_STUDENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.ESCUELA_EMPRESA_STUDENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.SYNC_LOGS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(cleanAudit));

    // Reset tracked syncedFilesMap on linked Google Drive folder (keeping folder link intact)
    // so the next Google Drive sync imports all real spreadsheets fresh into the empty DB
    try {
      const linkedRaw = localStorage.getItem('ita_ibate_linked_drive_folder');
      if (linkedRaw) {
        const parsedFolder = JSON.parse(linkedRaw);
        if (parsedFolder && parsedFolder.folderId) {
          const resetFolder = {
            ...parsedFolder,
            syncedFilesMap: {},
            lastSyncedAt: undefined
          };
          localStorage.setItem('ita_ibate_linked_drive_folder', JSON.stringify(resetFolder));
          syncStateToFirestore({ linkedDriveFolder: resetFolder }).catch(() => {});
        }
      }
    } catch {
      // ignore storage errors
    }
  };

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      // Dept filter
      if (selectedDepartmentId !== 'ALL' && t.departmentId !== selectedDepartmentId) {
        return false;
      }
      // Neighborhood filter
      if (selectedNeighborhood !== 'ALL' && t.citizenNeighborhood !== selectedNeighborhood) {
        return false;
      }
      // Status filter
      if (selectedStatus !== 'ALL') {
        if (selectedStatus === 'SOLUCIONADO' && !t.isResolved) return false;
        if (selectedStatus === 'PENDIENTE' && (t.isResolved || t.status === 'SOLUCIONADO')) return false;
        if (selectedStatus === 'EN_PROCESO' && t.status !== 'EN_PROCESO') return false;
      }
      // Date filter
      if (dateRange.start && t.startDate < dateRange.start) {
        return false;
      }
      if (dateRange.end && t.startDate > dateRange.end) {
        return false;
      }
      return true;
    });
  }, [tickets, selectedDepartmentId, selectedNeighborhood, selectedStatus, dateRange]);

  // Filtered citizens
  const filteredCitizens = useMemo(() => {
    return citizens.filter(c => {
      if (selectedDepartmentId !== 'ALL' && c.departmentRegisteredId !== selectedDepartmentId) {
        // Also check if citizen has a ticket in that area
        const hasTicketInArea = tickets.some(t => t.citizenId === c.id && t.departmentId === selectedDepartmentId);
        if (!hasTicketInArea) return false;
      }
      if (selectedNeighborhood !== 'ALL' && c.neighborhood !== selectedNeighborhood) {
        return false;
      }
      return true;
    });
  }, [citizens, selectedDepartmentId, selectedNeighborhood, tickets]);

  // KPIs
  const departmentKPIs: DepartmentKPI[] = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().getTime();
    const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const firstDayMonth = today.substring(0, 7) + '-01';

    return departments.map(dept => {
      const deptTickets = tickets.filter(t => t.departmentId === dept.id);
      const totalTickets = deptTickets.length;
      const resolvedTickets = deptTickets.filter(t => t.isResolved || t.status === 'SOLUCIONADO').length;
      const inProgressTickets = deptTickets.filter(t => t.status === 'EN_PROCESO').length;
      const pendingTickets = deptTickets.filter(t => !t.isResolved && t.status !== 'SOLUCIONADO').length;

      const resolutionRate = totalTickets > 0 ? Math.round((resolvedTickets / totalTickets) * 100) : 0;
      const pendingRate = totalTickets > 0 ? Math.round((pendingTickets / totalTickets) * 100) : 0;
      const inProgressRate = totalTickets > 0 ? Math.round((inProgressTickets / totalTickets) * 100) : 0;

      const attendedToday = deptTickets.filter(t => t.startDate === today).length;
      const attendedWeek = deptTickets.filter(t => t.startDate >= oneWeekAgo).length;
      const attendedMonth = deptTickets.filter(t => t.startDate >= firstDayMonth).length;

      // Unique citizens in this area
      const uniqueCitizenIds = new Set(deptTickets.map(t => t.citizenId));
      const uniqueCitizens = uniqueCitizenIds.size;

      // Find last activity
      const dates = deptTickets.map(t => t.startDate).sort();
      const lastActivityDate = dates.length > 0 ? dates[dates.length - 1] : null;

      let daysSinceLastActivity = 999;
      if (lastActivityDate) {
        const lastDateObj = new Date(lastActivityDate);
        const diffMs = now - lastDateObj.getTime();
        daysSinceLastActivity = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      }

      return {
        departmentId: dept.id,
        departmentName: dept.name,
        category: dept.category,
        color: dept.color,
        leaderName: dept.leaderName,
        totalTickets,
        resolvedTickets,
        pendingTickets,
        inProgressTickets,
        resolutionRate,
        pendingRate,
        inProgressRate,
        attendedToday,
        attendedWeek,
        attendedMonth,
        uniqueCitizens,
        lastActivityDate,
        daysSinceLastActivity,
        isInactiveWarning: daysSinceLastActivity > 3 && dept.active
      };
    });
  }, [departments, tickets]);

  const kpis: MunicipalKPIs = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().getTime();
    const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const firstDayMonth = today.substring(0, 7) + '-01';

    const targetTickets = filteredTickets;
    const totalTickets = targetTickets.length;
    const resolvedTickets = targetTickets.filter(t => t.isResolved || t.status === 'SOLUCIONADO').length;
    const inProgressTickets = targetTickets.filter(t => t.status === 'EN_PROCESO').length;
    const pendingTickets = targetTickets.filter(t => !t.isResolved && t.status !== 'SOLUCIONADO').length;

    const resolutionRate = totalTickets > 0 ? Number(((resolvedTickets / totalTickets) * 100).toFixed(1)) : 0;
    const pendingRate = totalTickets > 0 ? Number(((pendingTickets / totalTickets) * 100).toFixed(1)) : 0;
    const inProgressRate = totalTickets > 0 ? Number(((inProgressTickets / totalTickets) * 100).toFixed(1)) : 0;

    const attendedToday = targetTickets.filter(t => t.startDate === today).length;
    const attendedWeek = targetTickets.filter(t => t.startDate >= oneWeekAgo).length;
    const attendedMonth = targetTickets.filter(t => t.startDate >= firstDayMonth).length;

    const uniqueCitizenDnis = new Set(targetTickets.map(t => t.citizenDni));
    const uniqueCitizensAttended = uniqueCitizenDnis.size;

    // Calculate resolution duration
    let totalResolutionDays = 0;
    let resolvedCountWithDates = 0;
    targetTickets.forEach(t => {
      if (t.isResolved && t.startDate && t.resolvedDate) {
        const start = new Date(t.startDate).getTime();
        const end = new Date(t.resolvedDate).getTime();
        const diffDays = Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24)));
        totalResolutionDays += diffDays;
        resolvedCountWithDates++;
      }
    });
    const averageResolutionDays = resolvedCountWithDates > 0 ? Number((totalResolutionDays / resolvedCountWithDates).toFixed(1)) : 1.5;

    // Delayed tickets calculation
    let delayedTicketsCount = 0;
    let criticalDelayedTicketsCount = 0;
    targetTickets.forEach(t => {
      if (!t.isResolved && t.status !== 'SOLUCIONADO') {
        const start = new Date(t.startDate).getTime();
        const days = Math.floor((now - start) / (1000 * 60 * 60 * 24));
        if (days > 15) {
          criticalDelayedTicketsCount++;
        } else if (days > 7) {
          delayedTicketsCount++;
        }
      }
    });

    // Sports calculation: unique athletes by DNI
    const uniqueSportAthletes = new Set(sportsParticipants.map(p => p.dni.replace(/[^0-9]/g, ''))).size;

    return {
      totalCitizens: citizens.length,
      uniqueCitizensAttended,
      attendedToday,
      attendedWeek,
      attendedMonth,
      totalTickets,
      resolvedTickets,
      pendingTickets,
      inProgressTickets,
      resolutionRate,
      pendingRate,
      inProgressRate,
      averageResolutionDays,
      delayedTicketsCount,
      criticalDelayedTicketsCount,
      totalSportEvents: sportsEvents.length,
      totalSportParticipants: sportsParticipants.length,
      uniqueSportAthletes
    };
  }, [filteredTickets, citizens, sportsEvents, sportsParticipants]);

  // Department Financial Balances
  const departmentBalances: DepartmentFinancialBalance[] = useMemo(() => {
    return departments.map(dept => {
      const deptAllocations = fundAllocations.filter(f => f.departmentId === dept.id && f.status !== 'ANULADO');
      const totalAssigned = deptAllocations.reduce((sum, f) => sum + f.amountAssigned, 0);
      const totalDelivered = deptAllocations.reduce((sum, f) => sum + f.amountDelivered, 0);

      const deptExpenses = expenses.filter(e => e.departmentId === dept.id && e.settlementStatus !== 'ANULADO');
      const totalExpenses = deptExpenses.reduce((sum, e) => sum + e.amount, 0);

      // Available balance formula: Delivered - Registered Expenses
      const availableBalance = totalDelivered - totalExpenses;
      
      // Committed balance: expenses pending review/settlement
      const pendingExpenses = deptExpenses.filter(e => e.settlementStatus !== 'APROBADA');
      const committedBalance = pendingExpenses.reduce((sum, e) => sum + e.amount, 0);

      const approvedExpenses = deptExpenses.filter(e => e.settlementStatus === 'APROBADA');
      const approvedSettlementAmount = approvedExpenses.reduce((sum, e) => sum + e.amount, 0);

      const observedExpenses = deptExpenses.filter(e => e.settlementStatus === 'OBSERVADA');
      const observedSettlementAmount = observedExpenses.reduce((sum, e) => sum + e.amount, 0);

      const pendingSettlementAmount = committedBalance;

      // Rate calculations
      const executionRate = totalDelivered > 0 ? Math.min(100, Math.round((totalExpenses / totalDelivered) * 100)) : 0;
      const settlementRate = totalExpenses > 0 ? Math.min(100, Math.round((approvedSettlementAmount / totalExpenses) * 100)) : 0;

      const isLowBalanceWarning = (totalDelivered > 0 && availableBalance < totalDelivered * 0.15) || availableBalance <= 0;
      const hasObservedSettlements = observedExpenses.length > 0;

      return {
        departmentId: dept.id,
        departmentName: dept.name,
        totalAssigned,
        totalDelivered,
        totalExpenses,
        availableBalance,
        committedBalance,
        pendingSettlementAmount,
        approvedSettlementAmount,
        observedSettlementAmount,
        executionRate,
        settlementRate,
        isLowBalanceWarning,
        hasObservedSettlements
      };
    });
  }, [departments, fundAllocations, expenses]);

  // Municipal Financial KPIs
  const financialKPIs: MunicipalFinancialKPIs = useMemo(() => {
    let totalAssigned = 0;
    let totalDelivered = 0;
    let totalExpenses = 0;
    let totalSettlementApproved = 0;
    let totalSettlementPending = 0;
    let totalSettlementObserved = 0;
    let departmentsWithPendingSettlements = 0;
    let departmentsWithLowBalance = 0;

    departmentBalances.forEach(d => {
      totalAssigned += d.totalAssigned;
      totalDelivered += d.totalDelivered;
      totalExpenses += d.totalExpenses;
      totalSettlementApproved += d.approvedSettlementAmount;
      totalSettlementPending += d.pendingSettlementAmount;
      totalSettlementObserved += d.observedSettlementAmount;
      if (d.pendingSettlementAmount > 0) departmentsWithPendingSettlements++;
      if (d.isLowBalanceWarning && d.totalDelivered > 0) departmentsWithLowBalance++;
    });

    const totalAvailable = totalDelivered - totalExpenses;
    const globalExecutionRate = totalDelivered > 0 ? Number(((totalExpenses / totalDelivered) * 100).toFixed(1)) : 0;
    const globalSettlementRate = totalExpenses > 0 ? Number(((totalSettlementApproved / totalExpenses) * 100).toFixed(1)) : 0;

    return {
      totalAssigned,
      totalDelivered,
      totalExpenses,
      totalAvailable,
      totalSettlementApproved,
      totalSettlementPending,
      totalSettlementObserved,
      globalExecutionRate,
      globalSettlementRate,
      departmentsWithPendingSettlements,
      departmentsWithLowBalance
    };
  }, [departmentBalances]);

  return (
    <MunicipalDataContext.Provider
      value={{
        departments,
        citizens,
        tickets,
        sportsEvents,
        sportsParticipants,
        syncLogs,
        auditLogs,
        fundAllocations,
        expenses,
        expenseCategories,
        financialKPIs,
        departmentBalances,
        departmentsLastSavedAt,
        addDepartment,
        updateDepartment,
        deleteDepartment,
        updateDepartmentLeader,
        necrologicalRecords,
        addNecrologicalRecord,
        updateNecrologicalRecord,
        deleteNecrologicalRecord,
        necrologicalKPIs,
        driversLicenses,
        addDriversLicense,
        updateDriversLicense,
        deleteDriversLicense,
        trafficFines,
        addTrafficFine,
        updateTrafficFine,
        deleteTrafficFine,
        commercialLicenses,
        addCommercialLicense,
        updateCommercialLicense,
        deleteCommercialLicense,
        trafficCheckpoints,
        addTrafficCheckpoint,
        updateTrafficCheckpoint,
        deleteTrafficCheckpoint,
        urbanControlKPIs,
        employees,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        employeeKPIs,
        culturalStudents,
        addCulturalStudent,
        updateCulturalStudent,
        deleteCulturalStudent,
        culturalKPIs,
        escuelaEmpresaStudents,
        addEscuelaEmpresaStudent,
        updateEscuelaEmpresaStudent,
        deleteEscuelaEmpresaStudent,
        escuelaEmpresaKPIs,
        addCitizen,
        updateCitizen,
        findCitizenByDni,
        createTicket,
        updateTicketStatus,
        deriveTicket,
        addTicketComment,
        addSportEvent,
        updateSportEvent,
        addSportParticipant,
        importRowsFromSpreadsheet,
        importSectorWorkbook,
        importMultipleSectorWorkbooks,
        addSyncLog,
        isDriveSyncing,
        driveSyncProgress,
        driveSyncError,
        lastDriveSyncInfo,
        syncFromOfficialDrive,
        clearDriveSyncError,
        addFundAllocation,
        updateFundAllocation,
        cancelFundAllocation,
        addExpense,
        updateExpenseSettlement,
        subsanateExpense,
        cancelExpense,
        addExpenseCategory,
        dateRange,
        setDateRange,
        selectedDepartmentId,
        setSelectedDepartmentId,
        selectedNeighborhood,
        setSelectedNeighborhood,
        selectedStatus,
        setSelectedStatus,
        kpis,
        departmentKPIs,
        filteredTickets,
        filteredCitizens,
        resetAllData,
        clearDemoData
      }}
    >
      {children}
    </MunicipalDataContext.Provider>
  );
};

export const useMunicipalData = () => {
  const context = useContext(MunicipalDataContext);
  if (!context) {
    throw new Error('useMunicipalData must be used within a MunicipalDataProvider');
  }
  return context;
};
