import * as XLSX from 'xlsx';
import { 
  Citizen, 
  Ticket, 
  SportParticipant, 
  FundAllocation, 
  ExpenseRecord, 
  DepartmentFinancialBalance, 
  NecrologicalRecord,
  DriversLicenseRecord,
  TrafficFineRecord,
  CommercialLicenseRecord,
  TrafficCheckpointRecord,
  MunicipalEmployee,
  CulturalStudent,
  CulturalCourseType,
  EmploymentCondition,
  LicenseProcedureType,
  LicenseCategory,
  LicenseStatus,
  InfractionGravity,
  InfractionStatus,
  BusinessCategory,
  CommercialLicenseStatus,
  CheckpointType,
  CheckpointShift,
  CasketType,
  NicheStatus,
  EscuelaEmpresaStudent,
  EscuelaEmpresaSpecialty
} from '../types';
import { SectorImportTarget } from './sectorTemplates';

export interface ParsedMunicipalRow {
  dni: string;
  fullName: string;
  phone?: string;
  address?: string;
  neighborhood?: string;
  requestType: string;
  description: string;
  responsibleName?: string;
  status?: string;
  isResolved?: boolean;
  startDate?: string;
  resolvedDate?: string;
  notes?: string;
  areaSpecificData?: Record<string, any>;
}

export interface ParsedSportRow {
  dni: string;
  fullName: string;
  age?: number;
  isMinor: boolean;
  address: string;
  neighborhood: string;
  phone: string;
  discipline: string;
  eventName: string;
  category: string;
  teamOrClub: string;
  location: string;
  participationDate: string;
  tutorName?: string;
  tutorDni?: string;
  tutorPhone?: string;
  tutorRelationship?: string;
}

export interface ParsedCultureRow {
  dni: string;
  fullName: string;
  age?: number;
  isMinor: boolean;
  course: CulturalCourseType;
  shift: 'MANANA' | 'TARDE' | 'NOCHE';
  teacherName?: string;
  phone: string;
  address: string;
  neighborhood: string;
  enrollmentDate: string;
  tutorName?: string;
  tutorDni?: string;
  tutorPhone?: string;
  tutorRelationship?: string;
  notes?: string;
}

export interface ParsedEmployeeRow {
  fileNumber?: string;
  fullName: string;
  dni: string;
  cuil: string;
  employmentCondition: EmploymentCondition;
  departmentNameOrId?: string;
  position: string;
  categoryOrScale?: string;
  entryDate: string;
  phone: string;
  address: string;
  neighborhood: string;
  workShift?: 'MANANA' | 'TARDE' | 'NOCHE' | 'ROTATIVO';
  hoursPerWeek?: number;
  socialSecurityNumber?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notes?: string;
}

export interface ParsedEscuelaEmpresaRow {
  dni: string;
  fullName: string;
  age?: number;
  phone: string;
  email?: string;
  address: string;
  neighborhood: string;
  specialty: EscuelaEmpresaSpecialty;
  shift: 'MANANA' | 'TARDE' | 'NOCHE';
  level: 'INICIAL' | 'INTERMEDIO' | 'AVANZADO';
  instructorName?: string;
  hasFoodHandlingCert: boolean;
  enrollmentDate: string;
  status: 'ACTIVO' | 'REGULAR' | 'EGRESADO' | 'BAJA';
  notes?: string;
}

export interface ParsedWorkbookResult {
  fileName: string;
  detectedTargets: SectorImportTarget[];
  inferredDepartmentId?: string;
  ticketRows: ParsedMunicipalRow[];
  sportRows: ParsedSportRow[];
  cultureRows: ParsedCultureRow[];
  employeeRows: ParsedEmployeeRow[];
  licenseRows: Omit<DriversLicenseRecord, 'id' | 'recordNumber' | 'createdAt'>[];
  fineRows: Omit<TrafficFineRecord, 'id' | 'fineNumber' | 'createdAt'>[];
  commercialRows: Omit<CommercialLicenseRecord, 'id' | 'recordNumber' | 'createdAt'>[];
  checkpointRows: Omit<TrafficCheckpointRecord, 'id' | 'checkpointCode' | 'createdAt'>[];
  necrologicalRows: Omit<NecrologicalRecord, 'id' | 'actNumber' | 'createdAt'>[];
  escuelaEmpresaRows: ParsedEscuelaEmpresaRow[];
  warnings: string[];
  totalDetected: number;
}

export interface ParseResult {
  validRows: ParsedMunicipalRow[];
  errors: string[];
  totalDetected: number;
}

// Helper to normalize Excel dates (serial number or string) into YYYY-MM-DD
const normalizeExcelDate = (val: any, fallbackToday = true): string => {
  if (val === undefined || val === null || val === '') {
    return fallbackToday ? new Date().toISOString().split('T')[0] : '';
  }
  if (typeof val === 'number' && val > 25000 && val < 80000) {
    // Excel serial date
    const utcDays = Math.floor(val - 25569);
    const d = new Date(utcDays * 86400 * 1000);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  }
  const str = String(val).trim();
  // DD/MM/YYYY -> YYYY-MM-DD
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return str;
};

const parseYesNo = (val: any): boolean => {
  const s = String(val || '').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return s === 'SI' || s === 'S' || s === 'YES' || s === 'TRUE' || s === '1' || s === 'APROBADO';
};

const normHeader = (h: any): string =>
  String(h || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

// Generate downloadable official template
export const generateMunicipalTemplate = (): void => {
  const wsData = [
    [
      'DNI (*)',
      'NOMBRE_Y_APELLIDO (*)',
      'DOMICILIO',
      'BARRIO',
      'TELEFONO',
      'TRAMITE_O_SOLICITUD (*)',
      'DESCRIPCION_DEL_PROBLEMA (*)',
      'RESPONSABLE_ATENCION',
      'ESTADO (Iniciado / En proceso / Pendiente / Solucionado)',
      'RESUELTO (SI / NO) (*)',
      'FECHA_INICIO (AAAA-MM-DD)',
      'FECHA_RESOLUCION (AAAA-MM-DD)',
      'OBSERVACIONES'
    ],
    [
      '35.123.456',
      'Juan Carlos Pérez',
      'Av. San Martín 550',
      'Barrio Centro',
      '3781-450011',
      'Reparación de Luminaria',
      'Foco quemado frente al domicilio',
      'Ing. Carlos Aguirre',
      'Solucionado',
      'SI',
      '2026-11-01',
      '2026-11-03',
      'Reparado con cuadrilla técnica'
    ],
    [
      '29.876.543',
      'Mirta Noemí Silva',
      'Calle Belgrano 230',
      'Barrio San Francisco',
      '3781-432299',
      'Asistencia Social',
      'Solicitud de módulo de alimentos secos',
      'Lic. Silvina Fernández',
      'En proceso',
      'NO',
      '2026-11-05',
      '',
      'En evaluación socioeconómica'
    ]
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column widths
  ws['!cols'] = [
    { wch: 15 },
    { wch: 28 },
    { wch: 25 },
    { wch: 22 },
    { wch: 16 },
    { wch: 30 },
    { wch: 40 },
    { wch: 25 },
    { wch: 20 },
    { wch: 15 },
    { wch: 18 },
    { wch: 18 },
    { wch: 35 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Planilla_Atencion_Municipal');
  XLSX.writeFile(wb, 'Plantilla_Oficial_Carga_Ita_Ibate.xlsx');
};

// Parse uploaded Excel or CSV file
export const parseUploadedSpreadsheet = async (file: File): Promise<ParseResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonRows.length < 2) {
          resolve({
            validRows: [],
            errors: ['El archivo no contiene filas de datos válidas.'],
            totalDetected: 0
          });
          return;
        }

        const headers = (jsonRows[0] || []).map((h: any) => String(h || '').trim().toUpperCase());
        
        // Find column indices with fuzzy matching
        const findCol = (candidates: string[]) => {
          return headers.findIndex((h: string) => candidates.some(c => h.includes(c)));
        };

        const dniIdx = findCol(['DNI', 'DOCUMENTO', 'IDENTIFICACION']);
        const nameIdx = findCol(['NOMBRE', 'APELLIDO', 'CIUDADANO', 'VECINO']);
        const addressIdx = findCol(['DOMICILIO', 'DIRECCION', 'CALLE']);
        const neighborhoodIdx = findCol(['BARRIO', 'ZONA', 'LOCALIDAD']);
        const phoneIdx = findCol(['TELEFONO', 'CELULAR', 'CONTACTO', 'TEL']);
        const typeIdx = findCol(['TRAMITE', 'SOLICITUD', 'GESTION', 'TIPO']);
        const descIdx = findCol(['DESCRIPCION', 'PROBLEMA', 'MOTIVO', 'DETALLE']);
        const respIdx = findCol(['RESPONSABLE', 'OPERADOR', 'ATENDIO']);
        const statusIdx = findCol(['ESTADO', 'SITUACION']);
        const resolvedIdx = findCol(['RESUELTO', 'SOLUCIONADO', 'FINALIZADO']);
        const startDateIdx = findCol(['FECHA_INICIO', 'INICIO', 'FECHA']);
        const resolvedDateIdx = findCol(['FECHA_RESOLUCION', 'RESOLUCION', 'FECHA_FIN']);
        const notesIdx = findCol(['OBSERVACIONES', 'NOTAS', 'COMENTARIO']);

        const validRows: ParsedMunicipalRow[] = [];
        const errors: string[] = [];

        for (let i = 1; i < jsonRows.length; i++) {
          const row = jsonRows[i];
          if (!row || row.length === 0 || row.every((c: any) => !c)) continue; // skip empty rows

          const dni = dniIdx >= 0 && row[dniIdx] ? String(row[dniIdx]).trim() : '';
          const fullName = nameIdx >= 0 && row[nameIdx] ? String(row[nameIdx]).trim() : '';
          const requestType = typeIdx >= 0 && row[typeIdx] ? String(row[typeIdx]).trim() : 'Consulta General';
          const description = descIdx >= 0 && row[descIdx] ? String(row[descIdx]).trim() : '';

          if (!fullName && !dni) {
            errors.push(`Fila ${i + 1}: Ignorada por no contar con Nombre ni DNI.`);
            continue;
          }

          const rawResolved = resolvedIdx >= 0 ? String(row[resolvedIdx] || '').trim().toUpperCase() : '';
          const isResolved = rawResolved === 'SI' || rawResolved === 'S' || rawResolved === 'TRUE' || rawResolved === '1';

          let status = statusIdx >= 0 ? String(row[statusIdx] || '').trim() : '';
          if (!status) {
            status = isResolved ? 'Solucionado' : 'Iniciado';
          }

          const rowData: ParsedMunicipalRow = {
            dni: dni || 'S/D',
            fullName: fullName || 'Ciudadano Sin Nombre',
            address: addressIdx >= 0 && row[addressIdx] ? String(row[addressIdx]).trim() : '',
            neighborhood: neighborhoodIdx >= 0 && row[neighborhoodIdx] ? String(row[neighborhoodIdx]).trim() : 'Barrio Centro',
            phone: phoneIdx >= 0 && row[phoneIdx] ? String(row[phoneIdx]).trim() : '',
            requestType,
            description: description || `Atención registrada el ${new Date().toLocaleDateString('es-AR')}`,
            responsibleName: respIdx >= 0 && row[respIdx] ? String(row[respIdx]).trim() : 'Operador de Área',
            status,
            isResolved,
            startDate: startDateIdx >= 0 && row[startDateIdx] ? String(row[startDateIdx]).trim() : new Date().toISOString().split('T')[0],
            resolvedDate: isResolved && resolvedDateIdx >= 0 && row[resolvedDateIdx] ? String(row[resolvedDateIdx]).trim() : undefined,
            notes: notesIdx >= 0 && row[notesIdx] ? String(row[notesIdx]).trim() : ''
          };

          validRows.push(rowData);
        }

        resolve({
          validRows,
          errors,
          totalDetected: validRows.length
        });
      } catch (err: any) {
        reject(new Error(`Error al procesar el archivo Excel/CSV: ${err.message}`));
      }
    };

    reader.onerror = () => reject(new Error('Error al leer el archivo en memoria.'));
    reader.readAsArrayBuffer(file);
  });
};

// Multi-sheet & Multi-sector smart parser (supports local files and Google Drive / Google Sheets ArrayBuffers)
export const parseSectorWorkbook = (
  buffer: ArrayBuffer,
  fileName: string,
  defaultDepartmentId?: string
): ParsedWorkbookResult => {
  const data = new Uint8Array(buffer);
  const workbook = XLSX.read(data, { type: 'array' });

  const result: ParsedWorkbookResult = {
    fileName,
    detectedTargets: [],
    ticketRows: [],
    sportRows: [],
    cultureRows: [],
    employeeRows: [],
    licenseRows: [],
    fineRows: [],
    commercialRows: [],
    checkpointRows: [],
    necrologicalRows: [],
    escuelaEmpresaRows: [],
    warnings: [],
    totalDetected: 0
  };

  const addTarget = (t: SectorImportTarget) => {
    if (!result.detectedTargets.includes(t)) result.detectedTargets.push(t);
  };

  workbook.SheetNames.forEach((sheetName) => {
    const normSheet = normHeader(sheetName);
    if (normSheet.includes('GUIA') || normSheet.includes('BARRIOS_OFICIALES') || normSheet.includes('INSTRUCCIONES')) {
      return;
    }

    const worksheet = workbook.Sheets[sheetName];
    const jsonRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    if (!jsonRows || jsonRows.length < 2) return;

    const rawHeaders = jsonRows[0] || [];
    const headers = rawHeaders.map(normHeader);
    const hasHeader = (terms: string[]) => headers.some((h) => terms.some((t) => h.includes(t)));
    const findCol = (candidates: string[]) => headers.findIndex((h) => candidates.some((c) => h.includes(c)));
    const getCell = (row: any[], idx: number): string => (idx >= 0 && row[idx] !== undefined && row[idx] !== null ? String(row[idx]).trim() : '');

    // Detect exact target type for this sheet
    let sheetType: SectorImportTarget = 'TICKETS';

    if (normSheet.includes('NECROLOG') || hasHeader(['FALLECIDO', 'CAJON_PROVISTO', 'NRO_NICHO', 'CEMENTERIO'])) {
      sheetType = 'NECROLOGICAL';
      if (!result.inferredDepartmentId) result.inferredDepartmentId = 'dir-gen-asistencia-social';
    } else if (normSheet.includes('CARNET') || hasHeader(['NRO_CARNET', 'EXAMEN_MEDICO'])) {
      sheetType = 'CONTROL_URBANO_CARNETS';
      if (!result.inferredDepartmentId) result.inferredDepartmentId = 'dir-gen-seguridad';
    } else if (normSheet.includes('MULTA') || (hasHeader(['NRO_ACTA']) && hasHeader(['PATENTE', 'INFRACTOR']))) {
      sheetType = 'CONTROL_URBANO_MULTAS';
      if (!result.inferredDepartmentId) result.inferredDepartmentId = 'dir-gen-seguridad';
    } else if (normSheet.includes('HABILITACION') || hasHeader(['RAZON_SOCIAL', 'DOMICILIO_COMERCIAL', 'RUBRO_ACTIVIDAD'])) {
      sheetType = 'CONTROL_URBANO_HABILITACIONES';
      if (!result.inferredDepartmentId) result.inferredDepartmentId = 'dir-gen-seguridad';
    } else if (normSheet.includes('OPERATIVO') || hasHeader(['UBICACION_PUESTO', 'VEHICULOS_CONTROLADOS', 'TEST_ALCOHOLEMIA'])) {
      sheetType = 'CONTROL_URBANO_OPERATIVOS';
      if (!result.inferredDepartmentId) result.inferredDepartmentId = 'dir-gen-seguridad';
    } else if (normSheet.includes('PERSONAL') || hasHeader(['NRO_LEGAJO', 'CONDICION_LABORAL', 'CUIL'])) {
      sheetType = 'RRHH';
      if (!result.inferredDepartmentId) result.inferredDepartmentId = 'coord-recursos-humanos';
    } else if (
      normSheet.includes('ESCUELA_EMPRESA') ||
      normSheet.includes('PANADER') ||
      normSheet.includes('PASTELER') ||
      hasHeader(['ESPECIALIDAD_GASTRONOMICA', 'CARNET_MANIPULACION']) ||
      (defaultDepartmentId === 'escuela-empresa' && hasHeader(['ESPECIALIDAD', 'PANADERIA', 'PASTELERIA']))
    ) {
      sheetType = 'ESCUELA_EMPRESA';
      if (!result.inferredDepartmentId) result.inferredDepartmentId = 'escuela-empresa';
    } else if (
      normSheet.includes('CULTUR') ||
      hasHeader(['CURSO_O_TALLER']) ||
      (defaultDepartmentId === 'sec-cultura' && hasHeader(['CURSO', 'TALLER']))
    ) {
      sheetType = 'CULTURE';
      if (!result.inferredDepartmentId) result.inferredDepartmentId = 'sec-cultura';
    } else if (
      normSheet.includes('DEPORT') ||
      hasHeader(['DNI_DEPORTISTA', 'NOMBRE_Y_APELLIDO_DEPORTISTA', 'EVENTO_O_TORNEO', 'EQUIPO_O_CLUB']) ||
      (hasHeader(['DISCIPLINA']) && hasHeader(['TORNEO', 'EQUIPO', 'CATEGORIA']))
    ) {
      sheetType = 'SPORTS';
      if (!result.inferredDepartmentId) result.inferredDepartmentId = 'dir-deportes';
    } else {
      // Infer department for TICKETS sheets from sheet name & sector-specific column headers
      if (!result.inferredDepartmentId) {
        if (normSheet.includes('PUNTO_DIGITAL') || (hasHeader(['GENERO']) && hasHeader(['TURNO']) && hasHeader(['ESTADO DE TRAMITE', 'ESTADO_DE_TRAMITE']))) {
          result.inferredDepartmentId = 'punto-digital';
        } else if (normSheet.includes('TURIS') || hasHeader(['PROCEDENCIA_PROVINCIA_O_PAIS', 'ALOJAMIENTO_O_CABANA'])) {
          result.inferredDepartmentId = 'sec-turismo';
        } else if (normSheet.includes('SALUD') || normSheet.includes('SAPS') || hasHeader(['TIPO_PRESTACION', 'PROFESIONAL_A_CARGO'])) {
          result.inferredDepartmentId = 'coord-saps';
        } else if (normSheet.includes('OBRA') || hasHeader(['CALLE_O_UBICACION_RECLAMO', 'CUADRILLA_O_RESPONSABLE'])) {
          result.inferredDepartmentId = 'sec-obras';
        } else if (normSheet.includes('SOCIAL') || hasHeader(['INTEGRANTES_GRUPO_FAMILIAR', 'TIPO_ASISTENCIA'])) {
          result.inferredDepartmentId = 'sec-social';
        } else if (normSheet.includes('PRODUCTOR') || normSheet.includes('EMPREND') || normSheet.includes('VIVERO') || hasHeader(['NOMBRE_EMPRENDIMIENTO', 'RUBRO_PRODUCTIVO'])) {
          result.inferredDepartmentId = 'sec-produccion';
        } else if (normSheet.includes('RENTA') || normSheet.includes('CATASTR') || normSheet.includes('HACIEND') || hasHeader(['NRO_PARTIDA_O_EXPEDIENTE', 'NOMBRE_CONTRIBUYENTE'])) {
          result.inferredDepartmentId = 'sec-hacienda';
        } else if (normSheet.includes('MESA_ENTRADA') || hasHeader(['NRO_EXPEDIENTE_O_NOTA'])) {
          result.inferredDepartmentId = 'coord-atencion-ciudadana';
        }
      }
    }

    addTarget(sheetType);

    for (let i = 1; i < jsonRows.length; i++) {
      const row = jsonRows[i];
      if (!row || row.length === 0 || row.every((c: any) => c === undefined || c === null || String(c).trim() === '')) {
        continue;
      }

      if (sheetType === 'SPORTS') {
        const dni = getCell(row, findCol(['DNI_DEPORTISTA', 'DNI', 'DOCUMENTO']));
        const fullName = getCell(row, findCol(['NOMBRE_Y_APELLIDO_DEPORTISTA', 'NOMBRE', 'APELLIDO', 'DEPORTISTA']));
        if (!dni && !fullName) {
          result.warnings.push(`Hoja "${sheetName}" fila ${i + 1}: omitida por faltar DNI y Nombre del deportista.`);
          continue;
        }
        const ageRaw = getCell(row, findCol(['EDAD']));
        const ageNum = ageRaw ? parseInt(ageRaw, 10) : undefined;
        const minorCell = getCell(row, findCol(['ES_MENOR', 'MENOR_DE_EDAD', 'MENOR']));
        const isMinor = (minorCell ? parseYesNo(minorCell) : false) || (ageNum !== undefined && !isNaN(ageNum) && ageNum < 18);

        const tutorName = getCell(row, findCol(['NOMBRE_COMPLETO_TUTOR', 'NOMBRE_TUTOR', 'TUTOR']));
        const tutorDni = getCell(row, findCol(['DNI_TUTOR']));
        const tutorPhone = getCell(row, findCol(['TELEFONO_TUTOR', 'TEL_TUTOR', 'CONTACTO_TUTOR']));
        const tutorRelationship = getCell(row, findCol(['VINCULO_TUTOR', 'PARENTESCO'])) || (isMinor ? 'Tutor Legal' : undefined);

        if (isMinor && (!tutorName || !tutorPhone)) {
          result.warnings.push(`Deportes (${fullName || dni}, fila ${i + 1}): marcado como MENOR DE EDAD pero faltan datos completos del Tutor (Nombre/Teléfono).`);
        }

        result.sportRows.push({
          dni: dni || 'S/D',
          fullName: fullName || 'Deportista Sin Nombre',
          age: ageNum && !isNaN(ageNum) ? ageNum : undefined,
          isMinor,
          address: getCell(row, findCol(['DOMICILIO', 'DIRECCION'])) || 'Itá Ibaté',
          neighborhood: getCell(row, findCol(['BARRIO', 'PARAJE'])) || 'Medalla Milagrosa',
          phone: getCell(row, findCol(['TELEFONO_DEPORTISTA', 'TELEFONO', 'CELULAR'])),
          discipline: getCell(row, findCol(['DISCIPLINA'])) || 'Fútbol',
          eventName: getCell(row, findCol(['EVENTO_O_TORNEO', 'TORNEO', 'EVENTO'])) || 'Torneo Municipal Itá Ibaté',
          category: getCell(row, findCol(['CATEGORIA'])) || (isMinor ? 'Infantil / Juvenil' : 'Libre'),
          teamOrClub: getCell(row, findCol(['EQUIPO_O_CLUB', 'CLUB', 'EQUIPO'])) || 'Libre',
          location: getCell(row, findCol(['LUGAR_EVENTO', 'LUGAR', 'SEDE'])) || 'Polideportivo Municipal de Itá Ibaté',
          participationDate: normalizeExcelDate(row[findCol(['FECHA_INSCRIPCION', 'FECHA'])]),
          tutorName: isMinor ? (tutorName || undefined) : undefined,
          tutorDni: isMinor ? (tutorDni || undefined) : undefined,
          tutorPhone: isMinor ? (tutorPhone || undefined) : undefined,
          tutorRelationship: isMinor ? tutorRelationship : undefined
        });
      } else if (sheetType === 'CULTURE') {
        const dni = getCell(row, findCol(['DNI_ALUMNO', 'DNI', 'DOCUMENTO']));
        const fullName = getCell(row, findCol(['NOMBRE_Y_APELLIDO_ALUMNO', 'NOMBRE', 'ALUMNO']));
        if (!dni && !fullName) {
          result.warnings.push(`Hoja "${sheetName}" fila ${i + 1}: omitida por faltar DNI y Nombre del alumno.`);
          continue;
        }
        const ageRaw = getCell(row, findCol(['EDAD']));
        const ageNum = ageRaw ? parseInt(ageRaw, 10) : undefined;
        const minorCell = getCell(row, findCol(['ES_MENOR', 'MENOR_DE_EDAD', 'MENOR']));
        const isMinor = (minorCell ? parseYesNo(minorCell) : false) || (ageNum !== undefined && !isNaN(ageNum) && ageNum < 18);

        const rawCourse = normHeader(getCell(row, findCol(['CURSO_O_TALLER', 'CURSO', 'TALLER'])));
        let course: CulturalCourseType = 'URBANO';
        if (rawCourse.includes('BALLET')) course = 'BALLET';
        else if (rawCourse.includes('MUSIC')) course = 'MÚSICA';
        else if (rawCourse.includes('FOLK')) course = 'FOLKLORE';

        const rawShift = normHeader(getCell(row, findCol(['TURNO'])));
        let shift: 'MANANA' | 'TARDE' | 'NOCHE' = 'TARDE';
        if (rawShift.includes('MANANA')) shift = 'MANANA';
        else if (rawShift.includes('NOCHE')) shift = 'NOCHE';

        const tutorName = getCell(row, findCol(['NOMBRE_COMPLETO_TUTOR', 'NOMBRE_TUTOR', 'TUTOR']));
        const tutorDni = getCell(row, findCol(['DNI_TUTOR']));
        const tutorPhone = getCell(row, findCol(['TELEFONO_TUTOR', 'TEL_TUTOR']));
        const tutorRelationship = getCell(row, findCol(['VINCULO_TUTOR', 'PARENTESCO'])) || (isMinor ? 'Tutor Legal' : undefined);

        if (isMinor && (!tutorName || !tutorPhone)) {
          result.warnings.push(`Cultura (${fullName || dni}, fila ${i + 1}): marcado como MENOR DE EDAD sin datos completos de Tutor.`);
        }

        result.cultureRows.push({
          dni: dni || 'S/D',
          fullName: fullName || 'Alumno Sin Nombre',
          age: ageNum && !isNaN(ageNum) ? ageNum : undefined,
          isMinor,
          course,
          shift,
          teacherName: getCell(row, findCol(['DOCENTE', 'PROFESOR'])) || undefined,
          phone: getCell(row, findCol(['TELEFONO_ALUMNO', 'TELEFONO', 'CELULAR'])),
          address: getCell(row, findCol(['DOMICILIO', 'DIRECCION'])) || 'Itá Ibaté',
          neighborhood: getCell(row, findCol(['BARRIO', 'PARAJE'])) || 'Medalla Milagrosa',
          enrollmentDate: normalizeExcelDate(row[findCol(['FECHA_INSCRIPCION', 'FECHA'])]),
          tutorName: isMinor ? (tutorName || undefined) : undefined,
          tutorDni: isMinor ? (tutorDni || undefined) : undefined,
          tutorPhone: isMinor ? (tutorPhone || undefined) : undefined,
          tutorRelationship: isMinor ? tutorRelationship : undefined,
          notes: getCell(row, findCol(['OBSERVACIONES', 'NOTAS'])) || undefined
        });
      } else if (sheetType === 'RRHH') {
        const dni = getCell(row, findCol(['DNI']));
        const fullName = getCell(row, findCol(['NOMBRE_Y_APELLIDO', 'NOMBRE', 'AGENTE']));
        if (!dni && !fullName) continue;

        const rawCond = normHeader(getCell(row, findCol(['CONDICION_LABORAL', 'CONDICION', 'MODALIDAD'])));
        let employmentCondition: EmploymentCondition = 'CONTRATADO';
        if (rawCond.includes('PERMANENTE') || rawCond.includes('PLANTA')) employmentCondition = 'PLANTA_PERMANENTE';
        else if (rawCond.includes('GABINETE')) employmentCondition = 'PERSONAL_DE_GABINETE';
        else if (rawCond.includes('JORNAL') || rawCond.includes('PERIODICO')) employmentCondition = 'JORNALIZADO';

        const rawShift = normHeader(getCell(row, findCol(['TURNO'])));
        let workShift: 'MANANA' | 'TARDE' | 'NOCHE' | 'ROTATIVO' = 'MANANA';
        if (rawShift.includes('TARDE')) workShift = 'TARDE';
        else if (rawShift.includes('NOCHE')) workShift = 'NOCHE';
        else if (rawShift.includes('ROTAT')) workShift = 'ROTATIVO';

        const hoursRaw = parseInt(getCell(row, findCol(['HORAS_SEMANALES', 'HORAS'])), 10);

        result.employeeRows.push({
          fileNumber: getCell(row, findCol(['NRO_LEGAJO', 'LEGAJO'])) || undefined,
          fullName: fullName || 'Personal Municipal',
          dni: dni || 'S/D',
          cuil: getCell(row, findCol(['CUIL'])) || dni || '-',
          employmentCondition,
          departmentNameOrId: getCell(row, findCol(['AREA_O_SECRETARIA', 'AREA', 'SECRETARIA', 'DIRECCION'])) || undefined,
          position: getCell(row, findCol(['CARGO_O_FUNCION', 'CARGO', 'FUNCION'])) || 'Agente Municipal',
          categoryOrScale: getCell(row, findCol(['CATEGORIA_ESCALAFON', 'CATEGORIA'])) || undefined,
          entryDate: normalizeExcelDate(row[findCol(['FECHA_INGRESO', 'INGRESO'])]),
          phone: getCell(row, findCol(['TELEFONO'])),
          address: getCell(row, findCol(['DOMICILIO', 'DIRECCION'])) || 'Itá Ibaté',
          neighborhood: getCell(row, findCol(['BARRIO'])) || 'Medalla Milagrosa',
          workShift,
          hoursPerWeek: !isNaN(hoursRaw) ? hoursRaw : 30,
          socialSecurityNumber: getCell(row, findCol(['OBRA_SOCIAL'])) || undefined,
          emergencyContactName: getCell(row, findCol(['CONTACTO_EMERGENCIA'])) || undefined,
          emergencyContactPhone: getCell(row, findCol(['TELEFONO_EMERGENCIA'])) || undefined,
          notes: getCell(row, findCol(['OBSERVACIONES'])) || undefined
        });
      } else if (sheetType === 'CONTROL_URBANO_CARNETS') {
        const licenseNumber = getCell(row, findCol(['NRO_CARNET', 'CARNET', 'LICENCIA']));
        const citizenName = getCell(row, findCol(['NOMBRE_Y_APELLIDO', 'NOMBRE', 'CIUDADANO']));
        const citizenDni = getCell(row, findCol(['DNI']));
        if (!citizenName && !citizenDni && !licenseNumber) continue;

        const rawProc = normHeader(getCell(row, findCol(['TIPO_TRAMITE', 'TRAMITE'])));
        let procedureType: LicenseProcedureType = 'ORIGINAL';
        if (rawProc.includes('RENOV')) procedureType = 'RENOVACION';
        else if (rawProc.includes('DUPLIC')) procedureType = 'DUPLICADO';
        else if (rawProc.includes('AMPLI')) procedureType = 'AMPLIACION';

        const catCell = normHeader(getCell(row, findCol(['CATEGORIA', 'CLASE'])));
        const validCats: LicenseCategory[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'D1', 'E1', 'F', 'G'];
        const category: LicenseCategory = validCats.find((c) => catCell.includes(c)) || 'B1';

        const rawStatus = normHeader(getCell(row, findCol(['ESTADO'])));
        let status: LicenseStatus = 'EN_TRAMITE';
        if (rawStatus.includes('ENTREG')) status = 'ENTREGADO';
        else if (rawStatus.includes('EMIT')) status = 'EMITIDO';
        else if (rawStatus.includes('APROB')) status = 'APROBADO';
        else if (rawStatus.includes('RECHAZ')) status = 'RECHAZADO';

        const feeVal = parseFloat(getCell(row, findCol(['MONTO_TASA', 'TASA', 'IMPORTE'])).replace(/[^0-9.]/g, ''));

        result.licenseRows.push({
          licenseNumber: licenseNumber || `CAR-${citizenDni.replace(/[^0-9]/g, '') || Date.now()}`,
          citizenName: citizenName || 'Solicitante Carnet',
          citizenDni: citizenDni || 'S/D',
          citizenPhone: getCell(row, findCol(['TELEFONO'])),
          citizenAddress: getCell(row, findCol(['DOMICILIO', 'DIRECCION'])) || 'Itá Ibaté',
          citizenNeighborhood: getCell(row, findCol(['BARRIO'])) || 'Medalla Milagrosa',
          procedureType,
          category,
          vehicleType: getCell(row, findCol(['VEHICULO'])) || 'Automóvil / Motovehículo',
          issueDate: normalizeExcelDate(row[findCol(['FECHA_EMISION', 'EMISION'])]),
          expirationDate: normalizeExcelDate(row[findCol(['FECHA_VENCIMIENTO', 'VENCIMIENTO'])], false) || '2031-11-16',
          medicalExamPassed: parseYesNo(getCell(row, findCol(['EXAMEN_MEDICO', 'MEDICO']))),
          status,
          feeAmount: !isNaN(feeVal) ? feeVal : 25000,
          isFeePaid: parseYesNo(getCell(row, findCol(['TASA_PAGADA', 'PAGADA']))),
          officerInCharge: getCell(row, findCol(['INSPECTOR_A_CARGO', 'INSPECTOR', 'OFICIAL'])) || 'Control Urbano',
          notes: getCell(row, findCol(['OBSERVACIONES'])) || undefined
        });
      } else if (sheetType === 'CONTROL_URBANO_MULTAS') {
        const actNumber = getCell(row, findCol(['NRO_ACTA', 'ACTA']));
        const infractorName = getCell(row, findCol(['INFRACTOR_NOMBRE', 'INFRACTOR', 'NOMBRE']));
        if (!actNumber && !infractorName) continue;

        const rawGrav = normHeader(getCell(row, findCol(['GRAVEDAD'])));
        let gravity: InfractionGravity = 'GRAVE';
        if (rawGrav.includes('MUY')) gravity = 'MUY_GRAVE';
        else if (rawGrav.includes('LEVE')) gravity = 'LEVE';

        const rawStatus = normHeader(getCell(row, findCol(['ESTADO'])));
        let status: InfractionStatus = 'ACTIVA';
        if (rawStatus.includes('PAGAD')) status = 'PAGADA';
        else if (rawStatus.includes('NOTIF')) status = 'NOTIFICADA';
        else if (rawStatus.includes('DESCARG')) status = 'EN_DESCARGO';
        else if (rawStatus.includes('JUZGADO')) status = 'DERIVADA_JUZGADO';

        const amountVal = parseFloat(getCell(row, findCol(['IMPORTE_MULTA', 'IMPORTE', 'MONTO'])).replace(/[^0-9.]/g, ''));

        result.fineRows.push({
          actNumber: actNumber || `ACT-${Date.now().toString().slice(-5)}`,
          date: normalizeExcelDate(row[findCol(['FECHA'])]),
          time: getCell(row, findCol(['HORA'])) || '12:00',
          location: getCell(row, findCol(['UBICACION', 'LUGAR'])) || 'Vía Pública Itá Ibaté',
          neighborhood: getCell(row, findCol(['BARRIO'])) || 'Barrio Centro',
          infractorName: infractorName || 'Infractor',
          infractorDni: getCell(row, findCol(['DNI_INFRACTOR', 'DNI'])) || 'S/D',
          infractorPhone: getCell(row, findCol(['TELEFONO'])) || undefined,
          vehiclePlate: getCell(row, findCol(['PATENTE', 'DOMINIO'])) || 'S/D',
          vehicleBrandModel: getCell(row, findCol(['VEHICULO'])) || 'Vehículo',
          infractionType: getCell(row, findCol(['TIPO_INFRACCION', 'INFRACCION'])) || 'Infracción Vial',
          gravity,
          amount: !isNaN(amountVal) ? amountVal : 35000,
          status,
          vehicleImpounded: parseYesNo(getCell(row, findCol(['VEHICULO_RETENIDO', 'RETENIDO']))),
          officerBadge: getCell(row, findCol(['INSPECTOR_ACTUANTE', 'INSPECTOR'])) || 'Inspector Control Urbano',
          notes: getCell(row, findCol(['OBSERVACIONES'])) || undefined
        });
      } else if (sheetType === 'CONTROL_URBANO_HABILITACIONES') {
        const businessName = getCell(row, findCol(['RAZON_SOCIAL_O_COMERCIO', 'RAZON_SOCIAL', 'COMERCIO']));
        const ownerName = getCell(row, findCol(['TITULAR', 'PROPIETARIO']));
        if (!businessName && !ownerName) continue;

        const rawCat = normHeader(getCell(row, findCol(['CATEGORIA'])));
        let category: BusinessCategory = 'COMERCIAL';
        if (rawCat.includes('GASTRON')) category = 'GASTRONOMICO';
        else if (rawCat.includes('HOTEL') || rawCat.includes('TURIST')) category = 'HOTELERO_TURISTICO';
        else if (rawCat.includes('INDUST')) category = 'INDUSTRIAL';
        else if (rawCat.includes('SERVIC')) category = 'SERVICIOS';

        const rawStatus = normHeader(getCell(row, findCol(['ESTADO'])));
        let status: CommercialLicenseStatus = 'EN_TRAMITE';
        if (rawStatus.includes('HABILIT')) status = 'HABILITADO';
        else if (rawStatus.includes('VENCID')) status = 'VENCIDO';

        const surfVal = parseFloat(getCell(row, findCol(['SUPERFICIE'])).replace(/[^0-9.]/g, ''));
        const feeVal = parseFloat(getCell(row, findCol(['TASA_ANUAL', 'TASA'])).replace(/[^0-9.]/g, ''));

        result.commercialRows.push({
          expedientNumber: getCell(row, findCol(['NRO_EXPEDIENTE', 'EXPEDIENTE'])) || `EXP-HAB-${Date.now().toString().slice(-4)}`,
          businessName: businessName || 'Comercio Local',
          ownerName: ownerName || 'Titular',
          ownerDniOrCuit: getCell(row, findCol(['DNI_O_CUIT', 'CUIT', 'DNI'])) || 'S/D',
          phone: getCell(row, findCol(['TELEFONO'])),
          commercialAddress: getCell(row, findCol(['DOMICILIO_COMERCIAL', 'DOMICILIO'])) || 'Itá Ibaté',
          neighborhood: getCell(row, findCol(['BARRIO'])) || 'Barrio Centro',
          category,
          rubroDescription: getCell(row, findCol(['RUBRO_ACTIVIDAD', 'RUBRO'])) || 'Comercio General',
          surfaceSquareMeters: !isNaN(surfVal) ? surfVal : 50,
          fireSafetyInspectionPassed: parseYesNo(getCell(row, findCol(['BOMBEROS']))),
          sanitaryBromathologyInspectionPassed: parseYesNo(getCell(row, findCol(['BROMATOLOGIA']))),
          authorizationDate: normalizeExcelDate(row[findCol(['FECHA_HABILITACION'])]),
          expirationDate: normalizeExcelDate(row[findCol(['FECHA_VENCIMIENTO'])], false) || '2027-11-16',
          annualFee: !isNaN(feeVal) ? feeVal : 45000,
          status,
          certificatePrinted: status === 'HABILITADO'
        });
      } else if (sheetType === 'CONTROL_URBANO_OPERATIVOS') {
        const location = getCell(row, findCol(['UBICACION_PUESTO', 'UBICACION', 'PUESTO']));
        const leadOfficer = getCell(row, findCol(['OFICIAL_A_CARGO', 'OFICIAL', 'INSPECTOR']));
        if (!location && !leadOfficer) continue;

        const rawType = normHeader(getCell(row, findCol(['TIPO_OPERATIVO'])));
        let type: CheckpointType = 'CONTROL_GENERAL_VEHICULAR';
        if (rawType.includes('ALCOHOLEMIA')) type = 'ALCOHOLEMIA';
        else if (rawType.includes('CASCO')) type = 'CONTROL_DE_CASCO';
        else if (rawType.includes('NOCTUR')) type = 'NOCTURNIDAD_RUIDOS';
        else if (rawType.includes('TURIS') || rawType.includes('PESCA')) type = 'OPERATIVO_TURISMO_PESCA';

        const rawShift = normHeader(getCell(row, findCol(['TURNO'])));
        let shift: CheckpointShift = 'TARDE';
        if (rawShift.includes('MANANA')) shift = 'MANANA';
        else if (rawShift.includes('NOCHE')) shift = 'NOCHE';
        else if (rawShift.includes('MADRUG')) shift = 'MADRUGADA';

        const numVal = (cands: string[]) => {
          const n = parseInt(getCell(row, findCol(cands)), 10);
          return isNaN(n) ? 0 : n;
        };

        result.checkpointRows.push({
          date: normalizeExcelDate(row[findCol(['FECHA'])]),
          location: location || 'Acceso Itá Ibaté',
          neighborhood: getCell(row, findCol(['BARRIO'])) || 'Barrio Centro',
          type,
          shift,
          leadOfficer: leadOfficer || 'Oficial Control Urbano',
          inspectorsCount: numVal(['CANT_INSPECTORES', 'INSPECTORES']) || 2,
          policeSupport: parseYesNo(getCell(row, findCol(['APOYO_POLICIAL', 'POLICIA']))),
          vehiclesChecked: numVal(['VEHICULOS_CONTROLADOS', 'VEHICULOS']),
          motorcyclesChecked: numVal(['MOTOS_CONTROLADAS', 'MOTOS']),
          carsTrucksChecked: numVal(['AUTOS_CONTROLADOS', 'AUTOS']),
          breathalyzerTestsCount: numVal(['TEST_ALCOHOLEMIA']),
          positiveBreathalyzerCount: numVal(['ALCOHOLEMIAS_POSITIVAS']),
          finesIssuedCount: numVal(['ACTAS_LABRADAS', 'ACTAS']),
          impoundedVehiclesCount: numVal(['RETENCIONES_CORRALON', 'RETENCIONES']),
          summaryObservations: getCell(row, findCol(['OBSERVACIONES'])) || undefined
        });
      } else if (sheetType === 'NECROLOGICAL') {
        const deceasedFullName = getCell(row, findCol(['FALLECIDO_NOMBRE', 'FALLECIDO']));
        const deceasedDni = getCell(row, findCol(['DNI_FALLECIDO']));
        if (!deceasedFullName && !deceasedDni) continue;

        const ageNum = parseInt(getCell(row, findCol(['EDAD'])), 10);
        const usedCasket = parseYesNo(getCell(row, findCol(['CAJON_PROVISTO', 'CAJON'])));
        const assignedNiche = parseYesNo(getCell(row, findCol(['NICHO_ASIGNADO', 'NICHO'])));
        const rawCasket = getCell(row, findCol(['TIPO_CAJON'])) as CasketType;
        const rawNicheStatus = normHeader(getCell(row, findCol(['CONDICION_NICHO'])));
        let nicheStatus: NicheStatus = 'ASIGNADO';
        if (rawNicheStatus.includes('TEMPORAL')) nicheStatus = 'CONCESION_TEMPORAL';
        else if (rawNicheStatus.includes('PERPETUIDAD')) nicheStatus = 'A_PERPETUIDAD';
        else if (rawNicheStatus.includes('TRAMITE')) nicheStatus = 'EN_TRAMITE';

        result.necrologicalRows.push({
          serviceDate: normalizeExcelDate(row[findCol(['FECHA_SERVICIO', 'FECHA'])]),
          deceasedFullName: deceasedFullName || 'Fallecido',
          deceasedDni: deceasedDni || 'S/D',
          deceasedAge: !isNaN(ageNum) ? ageNum : undefined,
          deathDate: normalizeExcelDate(row[findCol(['FECHA_DEFUNCION'])]),
          deathCertificateNumber: getCell(row, findCol(['CERTIFICADO_DEFUNCION'])) || undefined,
          familyContactName: getCell(row, findCol(['FAMILIAR_SOLICITANTE', 'FAMILIAR'])) || 'Familiar',
          familyContactDni: getCell(row, findCol(['DNI_FAMILIAR'])) || 'S/D',
          familyRelationship: getCell(row, findCol(['PARENTESCO'])) || 'Familiar Directo',
          familyPhone: getCell(row, findCol(['TELEFONO_FAMILIAR', 'TELEFONO'])) || '',
          familyAddress: getCell(row, findCol(['DOMICILIO_FAMILIAR', 'DOMICILIO'])) || 'Itá Ibaté',
          familyNeighborhood: getCell(row, findCol(['BARRIO'])) || 'Medalla Milagrosa',
          usedCasket,
          casketType: usedCasket ? (rawCasket || 'Estándar Adulto (Madera Lustrada)') : undefined,
          casketCodeOrModel: getCell(row, findCol(['CODIGO_CAJON'])) || undefined,
          casketCostExempted: parseYesNo(getCell(row, findCol(['EXENCION_SOCIAL', 'EXENCION']))),
          assignedNiche,
          cemeteryName: getCell(row, findCol(['CEMENTERIO'])) || 'Cementerio Municipal San Juan Bautista de Itá Ibaté',
          nicheSectorOrPavilion: getCell(row, findCol(['PABELLON_O_SECTOR', 'PABELLON', 'SECTOR'])) || 'Sector General',
          nicheRowOrLevel: getCell(row, findCol(['FILA_O_NIVEL', 'FILA'])) || undefined,
          nicheNumber: getCell(row, findCol(['NRO_NICHO'])) || 'S/N',
          nicheStatus,
          responsibleOfficer: getCell(row, findCol(['FUNCIONARIO_AUTORIZANTE', 'FUNCIONARIO'])) || 'Secretaría Desarrollo Social',
          notes: getCell(row, findCol(['OBSERVACIONES'])) || undefined
        });
      } else if (sheetType === 'ESCUELA_EMPRESA') {
        const dni = getCell(row, findCol(['DNI', 'DOCUMENTO']));
        const combinedName = getCell(row, findCol(['NOMBRE_Y_APELLIDO', 'ALUMNO', 'APELLIDO_Y_NOMBRE']));
        const lastName = getCell(row, headers.findIndex((h) => h === 'APELLIDO' || (h.includes('APELLIDO') && !h.includes('NOMBRE'))));
        const firstName = getCell(row, headers.findIndex((h) => h === 'NOMBRE' || (h.includes('NOMBRE') && !h.includes('APELLIDO'))));
        const fullName = combinedName || [lastName, firstName].filter(Boolean).join(' ').trim();
        if (!dni && !fullName) continue;

        const ageNum = parseInt(getCell(row, findCol(['EDAD'])), 10);
        const rawSpecialty = normHeader(getCell(row, findCol(['ESPECIALIDAD_GASTRONOMICA', 'ESPECIALIDAD', 'CURSO', 'TALLER'])));
        let specialty: EscuelaEmpresaSpecialty = 'PANADERIA_Y_PASTELERIA';
        if (rawSpecialty.includes('PANADER') && rawSpecialty.includes('PASTEL')) {
          specialty = 'PANADERIA_Y_PASTELERIA';
        } else if (rawSpecialty.includes('PASTEL') || rawSpecialty.includes('REPOSTER')) {
          specialty = 'PASTELERIA';
        } else if (rawSpecialty.includes('PANADER') || rawSpecialty.includes('PANIF')) {
          specialty = 'PANADERIA';
        }

        const rawShift = normHeader(getCell(row, findCol(['TURNO'])));
        let shift: 'MANANA' | 'TARDE' | 'NOCHE' = 'TARDE';
        if (rawShift.includes('MANANA')) shift = 'MANANA';
        else if (rawShift.includes('NOCHE')) shift = 'NOCHE';

        const rawLevel = normHeader(getCell(row, findCol(['NIVEL'])));
        let level: 'INICIAL' | 'INTERMEDIO' | 'AVANZADO' = 'INICIAL';
        if (rawLevel.includes('AVANZ')) level = 'AVANZADO';
        else if (rawLevel.includes('INTERM')) level = 'INTERMEDIO';

        const rawStatus = normHeader(getCell(row, findCol(['ESTADO'])));
        let status: 'ACTIVO' | 'REGULAR' | 'EGRESADO' | 'BAJA' = 'ACTIVO';
        if (rawStatus.includes('EGRES')) status = 'EGRESADO';
        else if (rawStatus.includes('REGULAR')) status = 'REGULAR';
        else if (rawStatus.includes('BAJA')) status = 'BAJA';

        result.escuelaEmpresaRows.push({
          dni: dni || 'S/D',
          fullName: fullName || 'Alumno Escuela Empresa',
          age: !isNaN(ageNum) ? ageNum : undefined,
          phone: getCell(row, findCol(['TELEFONO', 'CELULAR'])) || '',
          email: getCell(row, findCol(['EMAIL', 'CORREO'])) || undefined,
          address: getCell(row, findCol(['DOMICILIO', 'DIRECCION'])) || 'Itá Ibaté',
          neighborhood: getCell(row, findCol(['BARRIO'])) || 'Medalla Milagrosa',
          specialty,
          shift,
          level,
          instructorName: getCell(row, findCol(['INSTRUCTOR', 'DOCENTE', 'PROFESOR'])) || undefined,
          hasFoodHandlingCert: parseYesNo(getCell(row, findCol(['CARNET_MANIPULACION', 'MANIPULACION', 'CARNET']))),
          enrollmentDate: normalizeExcelDate(row[findCol(['FECHA_INSCRIPCION', 'FECHA'])]),
          status,
          notes: getCell(row, findCol(['OBSERVACIONES'])) || undefined
        });
      } else {
        // General or Sector-specific Tickets (Punto Digital, Obras, Social, Salud, Turismo, Producción, Hacienda, Jefatura)
        const dniIdx = findCol(['DNI_O_CUIT_CONTRIBUYENTE', 'DNI_O_DOCUMENTO', 'DNI_O_CUIT', 'DNI', 'DOCUMENTO']);
        const combinedNameIdx = findCol([
          'NOMBRE_Y_APELLIDO',
          'VECINO_SOLICITANTE',
          'NOMBRE_VISITANTE',
          'NOMBRE_PRODUCTOR',
          'NOMBRE_CONTRIBUYENTE',
          'CIUDADANO'
        ]);
        const lastNameIdx = headers.findIndex((h) => h === 'APELLIDO' || (h.includes('APELLIDO') && !h.includes('NOMBRE')));
        const firstNameIdx = headers.findIndex((h) => h === 'NOMBRE' || (h.includes('NOMBRE') && !h.includes('APELLIDO') && !h.includes('EMPRENDIMIENTO')));
        const addressIdx = findCol(['DOMICILIO_PARCELA', 'DOMICILIO', 'CALLE_O_UBICACION', 'DIRECCION']);
        const neighborhoodIdx = findCol(['BARRIO_O_PARAJE', 'BARRIO', 'PROCEDENCIA_PROVINCIA_O_PAIS', 'PROCEDENCIA']);
        const phoneIdx = findCol(['TELEFONO_O_CONTACTO', 'TELEFONO', 'CELULAR']);
        const statusIdx = findCol(['ESTADO_DE_TRAMITE', 'ESTADO DE TRAMITE', 'ESTADO']);
        const typeIdx = headers.findIndex((h) => {
          if (h.includes('ESTADO')) return false;
          return [
            'TRAMITE_O_SOLICITUD',
            'TRAMITE_O_ASUNTO',
            'TIPO_ASISTENCIA',
            'TIPO_TRABAJO',
            'TIPO_PRESTACION',
            'MOTIVO_VISITA',
            'PROGRAMA_O_SOLICITUD',
            'TIPO_TRAMITE',
            'TRAMITE'
          ].some((c) => h.includes(c));
        });
        const descIdx = findCol([
          'DESCRIPCION',
          'DESCRIPCION_TECNICA',
          'DESCRIPCION_SITUACION',
          'DETALLE_ATENCION',
          'CONSULTA_O_SERVICIO',
          'DETALLE_O_CANTIDAD',
          'DETALLE_DEL_TRAMITE',
          'DETALLE'
        ]);
        const respIdx = findCol([
          'RESPONSABLE_ATENCION',
          'CUADRILLA_O_RESPONSABLE',
          'PROFESIONAL_A_CARGO',
          'OPERADOR_TURISMO',
          'RESPONSABLE_AREA',
          'RESPONSABLE'
        ]);
        const resolvedIdx = findCol(['RESUELTO', 'SOLUCIONADO']);
        const startIdx = findCol(['FECHA_INICIO', 'FECHA_ATENCION', 'FECHA_VISITA', 'FECHA_REGISTRO', 'FECHA']);
        const resolvedDateIdx = findCol(['FECHA_RESOLUCION']);
        const notesIdx = findCol(['OBSERVACIONES', 'MATERIALES_U_OBSERVACIONES', 'NOTAS']);
        const genderIdx = findCol(['GENERO', 'SEXO']);
        const shiftIdx = findCol(['TURNO']);

        const dni = getCell(row, dniIdx);
        let fullName = '';
        const lastName = getCell(row, lastNameIdx);
        const firstName = getCell(row, firstNameIdx);
        if (lastName || firstName) {
          fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
        } else {
          fullName = getCell(row, combinedNameIdx);
        }

        if (!dni && !fullName) {
          result.warnings.push(`Hoja "${sheetName}" fila ${i + 1}: omitida por no incluir DNI ni Nombre.`);
          continue;
        }

        const rawStatus = getCell(row, statusIdx);
        const normStatus = normHeader(rawStatus);
        const resolvedFromStatus =
          normStatus.includes('SOLUCIONAD') ||
          normStatus.includes('RESUELT') ||
          normStatus.includes('FINALIZAD') ||
          normStatus.includes('COMPLETAD') ||
          normStatus.includes('TERMINAD') ||
          normStatus.includes('ENTREGAD');
        const isResolved = resolvedIdx >= 0 ? parseYesNo(getCell(row, resolvedIdx)) : resolvedFromStatus;
        let status = rawStatus;
        if (!status) {
          status = isResolved ? 'SOLUCIONADO' : 'INICIADO';
        } else if (resolvedFromStatus) {
          status = 'SOLUCIONADO';
        } else if (normStatus.includes('PROCESO') || normStatus.includes('TRAMITE')) {
          status = 'EN_PROCESO';
        } else if (normStatus.includes('PENDIENTE')) {
          status = 'PENDIENTE';
        } else if (normStatus.includes('DERIVAD')) {
          status = 'DERIVADO';
        } else if (normStatus.includes('INICIAD')) {
          status = 'INICIADO';
        }

        // Capture extra sector-specific fields cleanly
        const areaSpecificData: Record<string, any> = {};
        if (lastName) areaSpecificData.lastName = lastName;
        if (firstName) areaSpecificData.firstName = firstName;
        const genderVal = getCell(row, genderIdx);
        if (genderVal) areaSpecificData.gender = genderVal;
        const shiftVal = getCell(row, shiftIdx);
        if (shiftVal) areaSpecificData.shift = shiftVal;
        if (rawStatus) areaSpecificData.originalStatus = rawStatus;
        const expVal = getCell(row, findCol(['NRO_EXPEDIENTE', 'NRO_PARTIDA']));
        if (expVal) areaSpecificData.expedientOrPartida = expVal;
        const montoVal = getCell(row, findCol(['MONTO_IMPORTE', 'MONTO', 'IMPORTE']));
        if (montoVal) areaSpecificData.amount = montoVal;
        const famVal = getCell(row, findCol(['INTEGRANTES_GRUPO_FAMILIAR']));
        if (famVal) areaSpecificData.familyMembers = famVal;
        const origVal = getCell(row, findCol(['PROCEDENCIA_PROVINCIA_O_PAIS']));
        if (origVal) areaSpecificData.origin = origVal;
        const empVal = getCell(row, findCol(['NOMBRE_EMPRENDIMIENTO']));
        if (empVal) areaSpecificData.undertaking = empVal;
        const streetVal = getCell(row, findCol(['CALLE_O_UBICACION_RECLAMO']));
        if (streetVal) areaSpecificData.street = streetVal;

        const reqType = getCell(row, typeIdx) || 'Atención Sectorial';
        const fallbackDetails = [
          shiftVal ? `Turno: ${shiftVal}` : '',
          genderVal ? `Género: ${genderVal}` : '',
          rawStatus ? `Estado: ${rawStatus}` : ''
        ]
          .filter(Boolean)
          .join(' · ');

        result.ticketRows.push({
          dni: dni || 'S/D',
          fullName: fullName || 'Ciudadano',
          address: getCell(row, addressIdx),
          neighborhood: getCell(row, neighborhoodIdx) || 'Barrio Centro',
          phone: getCell(row, phoneIdx),
          requestType: reqType,
          description: getCell(row, descIdx) || (fallbackDetails ? `${reqType} (${fallbackDetails})` : 'Registro importado desde planilla de área'),
          responsibleName: getCell(row, respIdx) || (defaultDepartmentId === 'punto-digital' ? 'Punto Digital Itá Ibaté' : 'Responsable de Área'),
          status,
          isResolved,
          startDate: normalizeExcelDate(row[startIdx]),
          resolvedDate: isResolved ? normalizeExcelDate(row[resolvedDateIdx], false) || normalizeExcelDate(row[startIdx]) : undefined,
          notes: getCell(row, notesIdx),
          areaSpecificData
        });
      }
    }
  });

  result.totalDetected =
    result.ticketRows.length +
    result.sportRows.length +
    result.cultureRows.length +
    result.employeeRows.length +
    result.licenseRows.length +
    result.fineRows.length +
    result.commercialRows.length +
    result.checkpointRows.length +
    result.necrologicalRows.length +
    result.escuelaEmpresaRows.length;

  return result;
};

export const parseUploadedSectorFile = async (
  file: File,
  defaultDepartmentId?: string
): Promise<ParsedWorkbookResult> => {
  const buffer = await file.arrayBuffer();
  return parseSectorWorkbook(buffer, file.name, defaultDepartmentId);
};

// Export active data to Excel (.xlsx)
export const exportTicketsToExcel = (tickets: Ticket[], areaName?: string): void => {
  const data = tickets.map(t => ({
    'Código Trámite': t.ticketCode,
    'DNI Ciudadano': t.citizenDni,
    'Nombre y Apellido': t.citizenName,
    'Teléfono': t.citizenPhone,
    'Barrio': t.citizenNeighborhood,
    'Área Asignada': t.departmentId,
    'Tipo de Trámite': t.requestType,
    'Descripción': t.description,
    'Fecha Inicio': t.startDate,
    'Estado': t.status,
    '¿Resuelto?': t.isResolved ? 'SÍ' : 'NO',
    'Fecha Resolución': t.resolvedDate || '-',
    'Responsable': t.responsibleName,
    'Prioridad': t.priority
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Tramites_Ita_Ibate');
  
  const timestamp = new Date().toISOString().split('T')[0];
  const nameSuffix = areaName ? `_${areaName.replace(/\s+/g, '_')}` : '_General';
  XLSX.writeFile(wb, `Reporte_Tramites_ItaIbate${nameSuffix}_${timestamp}.xlsx`);
};

// Export citizens list to Excel
export const exportCitizensToExcel = (citizens: Citizen[]): void => {
  const data = citizens.map(c => ({
    'DNI': c.dni,
    'Nombre Completo': c.fullName,
    'Domicilio': c.address,
    'Barrio': c.neighborhood,
    'Teléfono': c.phone,
    'Fecha Nacimiento': c.birthDate || '-',
    'Fecha Registro': c.registrationDate,
    'Área de Registro': c.departmentRegisteredId,
    'Observaciones': c.notes || '-'
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Padron_Ciudadanos');
  XLSX.writeFile(wb, `Padron_Ciudadanos_ItaIbate_${new Date().toISOString().split('T')[0]}.xlsx`);
};

// Export sports participants to Excel
export const exportSportsToExcel = (participants: SportParticipant[]): void => {
  const data = participants.map(p => ({
    'DNI': p.dni,
    'Nombre y Apellido': p.fullName,
    'Disciplina': p.discipline,
    'Torneo / Evento': p.eventName,
    'Categoría': p.category,
    'Equipo / Club': p.teamOrClub,
    'Barrio': p.neighborhood,
    'Teléfono': p.phone,
    'Lugar': p.location,
    'Fecha': p.participationDate
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Participantes_Deportes');
  XLSX.writeFile(wb, `Registro_Deportes_ItaIbate_${new Date().toISOString().split('T')[0]}.xlsx`);
};

// Export general summary KPI to CSV
export const exportSummaryCSV = (summaryData: Record<string, any>, filename: string): void => {
  const headers = Object.keys(summaryData);
  const values = Object.values(summaryData).map(v => `"${String(v).replace(/"/g, '""')}"`);
  
  const csvContent = "\uFEFF" + headers.join(',') + '\n' + values.join(',');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Export Fund Allocations to Excel (.xlsx)
export const exportFundAllocationsToExcel = (allocations: FundAllocation[], deptName?: string): void => {
  const data = allocations.map(a => ({
    'N° Comprobante / Exp.': a.voucherNumber,
    'Área Destinataria': a.departmentId,
    'Responsable Receptor': a.receiverName,
    'DNI Receptor': a.receiverDni,
    'Fecha de Entrega': a.deliveryDate,
    'Monto Asignado ($)': a.amountAssigned,
    'Monto Efectivo Entregado ($)': a.amountDelivered,
    'Concepto / Destino': a.concept,
    'Programa / Proyecto': a.programOrActivity,
    'Fuente de Financiamiento': a.fundingSource,
    'Autorizado Por': a.authorizedByName,
    'Estado': a.status,
    'Observaciones': a.notes || '-'
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Entregas_Fondos');
  
  const timestamp = new Date().toISOString().split('T')[0];
  const nameSuffix = deptName ? `_${deptName.replace(/\s+/g, '_')}` : '_Municipal';
  XLSX.writeFile(wb, `Entregas_Fondos_ItaIbate${nameSuffix}_${timestamp}.xlsx`);
};

// Export Expenses to Excel (.xlsx)
export const exportExpensesToExcel = (expenses: ExpenseRecord[], deptName?: string): void => {
  const data = expenses.map(e => ({
    'Código Gasto': e.expenseCode,
    'Área Responsable': e.departmentId,
    'Fecha': e.expenseDate,
    'Concepto': e.concept,
    'Categoría': e.category,
    'Descripción': e.description,
    'Proveedor / Comercio': e.supplierName,
    'CUIT Proveedor': e.supplierCuit || '-',
    'N° Factura / Comprobante': e.invoiceNumber,
    'Importe ($)': e.amount,
    'Medio de Pago': e.paymentMethod,
    'Estado Rendición': e.settlementStatus,
    'Observaciones de Auditoría': e.settlementObservation || '-',
    'Fecha Aprobación': e.settlementDate || '-',
    'Registrado Por': e.createdByUserName
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Gastos_Rendiciones');

  const timestamp = new Date().toISOString().split('T')[0];
  const nameSuffix = deptName ? `_${deptName.replace(/\s+/g, '_')}` : '_Municipal';
  XLSX.writeFile(wb, `Gastos_Rendiciones_ItaIbate${nameSuffix}_${timestamp}.xlsx`);
};

// Export Financial Balances & Execution by Department
export const exportFinancialBalanceToExcel = (balances: DepartmentFinancialBalance[]): void => {
  const data = balances.map(b => ({
    'Área / Dependencia': b.departmentName,
    'Total Asignado ($)': b.totalAssigned,
    'Total Entregado ($)': b.totalDelivered,
    'Total Gastos ($)': b.totalExpenses,
    'Saldo Disponible ($)': b.availableBalance,
    'Gastos Aprobados ($)': b.approvedSettlementAmount,
    'Gastos en Rendición / Pendientes ($)': b.pendingSettlementAmount,
    'Gastos Observados ($)': b.observedSettlementAmount,
    '% Ejecución': `${b.executionRate}%`,
    '% Rendición': `${b.settlementRate}%`,
    'Alerta Saldo': b.isLowBalanceWarning ? 'SALDO BAJO / CRÍTICO' : 'NORMAL'
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Balance_Financiero_Areas');
  
  const timestamp = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `Balance_Financiero_Sectores_ItaIbate_${timestamp}.xlsx`);
};

// Export Registro Necrológico (Desarrollo Social)
export const exportNecrologicalToExcel = (records: NecrologicalRecord[]): void => {
  const data = records.map(r => ({
    'N° Acta': r.actNumber,
    'Fecha Servicio': r.serviceDate,
    'Fallecido': r.deceasedFullName,
    'DNI Fallecido': r.deceasedDni,
    'Edad': r.deceasedAge || '-',
    'Fecha Defunción': r.deathDate,
    'Certificado Defunción': r.deathCertificateNumber || '-',
    'Causa de Muerte': r.causeOfDeath || '-',
    'Familiar Solicitante': r.familyContactName,
    'DNI Familiar': r.familyContactDni,
    'Parentesco': r.familyRelationship,
    'Teléfono': r.familyPhone,
    'Domicilio': r.familyAddress,
    'Barrio': r.familyNeighborhood || '-',
    'Cajón Provisto': r.usedCasket ? 'SÍ' : 'NO',
    'Tipo de Cajón': r.casketType || '-',
    'Código/Remito Cajón': r.casketCodeOrModel || '-',
    'Exención Social (100%)': r.casketCostExempted ? 'SÍ (Subsidio)' : 'NO',
    'Nicho Asignado': r.assignedNiche ? 'SÍ' : 'NO',
    'Cementerio': r.cemeteryName,
    'Sector / Pabellón': r.nicheSectorOrPavilion || '-',
    'Nivel / Fila': r.nicheRowOrLevel || '-',
    'N° Nicho / Parcela': r.nicheNumber || '-',
    'Condición Nicho': r.nicheStatus,
    'Fecha Inhumación': r.burialDate || '-',
    'Vencimiento Concesión': r.concessionExpirationDate || '-',
    'Funcionario Autorizante': r.responsibleOfficer,
    'Observaciones': r.notes || '-'
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Registro_Necrologico');

  const timestamp = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `Registro_Necrologico_ItaIbate_${timestamp}.xlsx`);
};

// Export Carnets de Conducir (Control Urbano)
export const exportDriversLicensesToExcel = (licenses: DriversLicenseRecord[]): void => {
  const data = licenses.map(l => ({
    'N° Registro': l.recordNumber,
    'N° Carnet / Licencia': l.licenseNumber,
    'Ciudadano': l.citizenName,
    'DNI': l.citizenDni,
    'Teléfono': l.citizenPhone,
    'Domicilio': l.citizenAddress,
    'Barrio': l.citizenNeighborhood,
    'Tipo de Trámite': l.procedureType,
    'Clase / Categoría': l.category,
    'Tipo de Vehículo': l.vehicleType,
    'Fecha Emisión': l.issueDate,
    'Fecha Vencimiento': l.expirationDate,
    'Examen Médico': l.medicalExamPassed ? 'APROBADO' : 'PENDIENTE',
    'Nota Teórico': l.theoreticalExamScore ?? '-',
    'Nota Práctico': l.practicalExamScore ?? '-',
    'Estado': l.status,
    'Monto Tasa ($)': l.feeAmount,
    'Tasa Pagada': l.isFeePaid ? 'SÍ' : 'NO',
    'Inspector / Oficial': l.officerInCharge,
    'Observaciones': l.notes || '-'
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Carnets_Conducir');
  const timestamp = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `Carnets_Conducir_ItaIbate_${timestamp}.xlsx`);
};

// Export Multas de Tránsito
export const exportTrafficFinesToExcel = (fines: TrafficFineRecord[]): void => {
  const data = fines.map(f => ({
    'N° Multa': f.fineNumber,
    'N° Acta': f.actNumber,
    'Fecha': f.date,
    'Hora': f.time,
    'Ubicación': f.location,
    'Barrio': f.neighborhood,
    'Infractor': f.infractorName,
    'DNI Infractor': f.infractorDni,
    'Patente': f.vehiclePlate,
    'Vehículo': f.vehicleBrandModel,
    'Infracción Cometida': f.infractionType,
    'Gravedad': f.gravity,
    'Importe Multa ($)': f.amount,
    'Pago Voluntario ($)': f.discountEarlyPaymentAmount ?? '-',
    'Estado': f.status,
    'Vehículo Retenido': f.vehicleImpounded ? 'SÍ (Corralón)' : 'NO',
    'Ubicación Corralón': f.impoundLotNumber || '-',
    'Inspector': f.officerBadge,
    'Fecha Pago': f.paidDate || '-',
    'N° Recibo Caja': f.receiptNumber || '-',
    'Observaciones': f.notes || '-'
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Multas_Transito');
  const timestamp = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `Multas_Transito_ItaIbate_${timestamp}.xlsx`);
};

// Export Habilitaciones Comerciales Municipales
export const exportCommercialLicensesToExcel = (licenses: CommercialLicenseRecord[]): void => {
  const data = licenses.map(c => ({
    'N° Registro': c.recordNumber,
    'N° Expediente': c.expedientNumber,
    'Nombre / Razón Social': c.businessName,
    'Titular': c.ownerName,
    'DNI / CUIT': c.ownerDniOrCuit,
    'Teléfono': c.phone,
    'Correo': c.email || '-',
    'Domicilio Comercial': c.commercialAddress,
    'Barrio': c.neighborhood,
    'Rubro / Categoría': c.category,
    'Actividad Principal': c.rubroDescription,
    'Superficie (m²)': c.surfaceSquareMeters,
    'Bomberos / Seguridad': c.fireSafetyInspectionPassed ? 'APROBADO' : 'PENDIENTE',
    'Bromatología / Salud': c.sanitaryBromathologyInspectionPassed ? 'APROBADO' : 'PENDIENTE',
    'Fecha Habilitación': c.authorizationDate,
    'Fecha Vencimiento': c.expirationDate,
    'Tasa Anual ($)': c.annualFee,
    'Estado': c.status,
    'Certificado Emitido': c.certificatePrinted ? 'SÍ' : 'NO',
    'Observaciones Inspector': c.inspectorsNotes || '-'
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Habilitaciones_Comerciales');
  const timestamp = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `Habilitaciones_Comerciales_ItaIbate_${timestamp}.xlsx`);
};

// Export Operativos de Control Vial
export const exportTrafficCheckpointsToExcel = (checkpoints: TrafficCheckpointRecord[]): void => {
  const data = checkpoints.map(c => ({
    'Código Operativo': c.checkpointCode,
    'Fecha': c.date,
    'Ubicación / Puesto': c.location,
    'Barrio / Sector': c.neighborhood,
    'Tipo de Operativo': c.type,
    'Turno': c.shift,
    'Oficial a Cargo': c.leadOfficer,
    'Cantidad Inspectores': c.inspectorsCount,
    'Apoyo Policial': c.policeSupport ? 'SÍ' : 'NO',
    'Total Vehículos': c.vehiclesChecked,
    'Motos Controladas': c.motorcyclesChecked,
    'Autos/Camionetas': c.carsTrucksChecked,
    'Test Alcoholemia': c.breathalyzerTestsCount,
    'Alcoholemias Positivas': c.positiveBreathalyzerCount,
    'Actas Labradas': c.finesIssuedCount,
    'Retenciones Corralón': c.impoundedVehiclesCount,
    'Observaciones Generales': c.summaryObservations || '-'
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Operativos_Viales');
  const timestamp = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `Operativos_Control_Vial_ItaIbate_${timestamp}.xlsx`);
};

// Export Plantel de Personal Municipal (Recursos Humanos)
export const exportEmployeesToExcel = (employees: MunicipalEmployee[]): void => {
  const conditionLabels: Record<string, string> = {
    PLANTA_PERMANENTE: 'Planta Permanente',
    CONTRATADO: 'Contratado',
    PERSONAL_DE_GABINETE: 'Personal de Gabinete',
    JORNALIZADO: 'Jornalizado'
  };

  const data = employees.map(e => ({
    'N° Legajo': e.fileNumber,
    'Nombre Completo': e.fullName,
    'DNI': e.dni,
    'CUIL': e.cuil,
    'Fecha Nacimiento': e.birthDate || '-',
    'Género': e.gender || '-',
    'Nacionalidad': e.nationality,
    'Teléfono': e.phone,
    'Correo Electrónico': e.email || '-',
    'Domicilio': e.address,
    'Barrio': e.neighborhood,
    'Condición Laboral': conditionLabels[e.employmentCondition] || e.employmentCondition,
    'Área / Dependencia': e.departmentId,
    'Cargo / Función': e.position,
    'Categoría / Escalafón': e.categoryOrScale || '-',
    'Fecha de Ingreso': e.entryDate,
    'Estado': e.status,
    'Turno': e.workShift || '-',
    'Carga Horaria Semanal': e.hoursPerWeek ? `${e.hoursPerWeek} hs` : '-',
    'Básico / Asignación ($)': e.basicSalary || 0,
    'CBU / Cuenta Sueldo': e.bankAccountNumber || '-',
    'Obra Social': e.socialSecurityNumber || '-',
    'Contacto Emergencia': e.emergencyContactName || '-',
    'Teléfono Emergencia': e.emergencyContactPhone || '-',
    'Observaciones': e.notes || '-'
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Personal_Municipal');
  const timestamp = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `Nomina_Personal_ItaIbate_${timestamp}.xlsx`);
};

// Export Alumnos de Talleres y Cursos Oficiales (Cultura y Educación)
export const exportCulturalStudentsToExcel = (students: CulturalStudent[]): void => {
  const data = students.map(s => ({
    'N° Matrícula': s.enrollmentNumber,
    'Nombre y Apellido': s.fullName,
    'DNI': s.dni,
    'Edad': s.age ?? '-',
    '¿Es Menor de Edad?': s.isMinor ? 'SÍ' : 'NO',
    'Tutor Responsable': s.isMinor ? (s.tutorName || '-') : 'No aplica (Mayor de edad)',
    'DNI Tutor': s.isMinor ? (s.tutorDni || '-') : '-',
    'Teléfono Tutor': s.isMinor ? (s.tutorPhone || '-') : '-',
    'Vínculo Tutor': s.isMinor ? (s.tutorRelationship || '-') : '-',
    'Curso / Taller': s.course,
    'Turno': s.shift,
    'Docente a Cargo': s.teacherName || '-',
    'Teléfono Contacto': s.phone,
    'Domicilio': s.address,
    'Barrio': s.neighborhood,
    'Fecha de Inscripción': s.enrollmentDate,
    'Estado': s.status,
    'Observaciones': s.notes || '-'
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Alumnos_Cultura_Educacion');
  const timestamp = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `Alumnos_Cursos_Cultura_ItaIbate_${timestamp}.xlsx`);
};

// Export Alumnos de Escuela Empresa (Panadería y Pastelería - Dependiente del D.E.M.)
export const exportEscuelaEmpresaStudentsToExcel = (students: EscuelaEmpresaStudent[]): void => {
  const specialtyLabels: Record<EscuelaEmpresaSpecialty, string> = {
    PANADERIA: 'Panadería',
    PASTELERIA: 'Pastelería',
    PANADERIA_Y_PASTELERIA: 'Panadería y Pastelería'
  };

  const data = students.map(s => ({
    'N° Matrícula': s.enrollmentNumber,
    'Nombre y Apellido': s.fullName,
    'DNI': s.dni,
    'Edad': s.age ?? '-',
    'Teléfono': s.phone,
    'Email': s.email || '-',
    'Domicilio': s.address,
    'Barrio': s.neighborhood,
    'Especialidad': specialtyLabels[s.specialty] || s.specialty,
    'Turno': s.shift,
    'Nivel': s.level,
    'Instructor / Chef a Cargo': s.instructorName || '-',
    'Carnet Manipulación de Alimentos': s.hasFoodHandlingCert ? 'SÍ' : 'PENDIENTE',
    'Fecha de Inscripción': s.enrollmentDate,
    'Estado': s.status,
    'Dependencia': 'D.E.M. (Departamento Ejecutivo Municipal)',
    'Observaciones': s.notes || '-'
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Alumnos_Escuela_Empresa');
  const timestamp = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `Escuela_Empresa_Panaderia_Pasteleria_ItaIbate_${timestamp}.xlsx`);
};

