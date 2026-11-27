import * as XLSX from 'xlsx';
import { Department } from '../types';

export interface AuthoritiesExportPayload {
  updatedAt: string;
  municipality: string;
  departments: Department[];
}

const normalizeHeader = (val: any): string =>
  String(val || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

export const isAuthoritiesFileName = (fileName: string): boolean => {
  const norm = normalizeHeader(fileName);
  return (
    norm.includes('autoridad') ||
    norm.includes('organigrama') ||
    norm.includes('secretario') ||
    norm.includes('director') ||
    norm.includes('titular')
  );
};

export const exportAuthoritiesToJson = (departments: Department[]) => {
  const payload: AuthoritiesExportPayload = {
    updatedAt: new Date().toISOString(),
    municipality: 'Municipalidad de Itá Ibaté - Corrientes',
    departments
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'autoridades.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportAuthoritiesToExcel = (departments: Department[]) => {
  const rows = departments.map((d) => ({
    'ID Area': d.id,
    'Categoria': d.category,
    'Secretaria / Direccion / Area': d.name,
    'Nombre Corto': d.shortName,
    'Cargo': d.leaderTitle || '',
    'Titular a Cargo': d.leaderName || '',
    'DNI': d.leaderDni || '',
    'Email': d.leaderEmail || '',
    'Telefono': d.phone || '',
    'Referencia Legal': d.legalReference || ''
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 28 },
    { wch: 18 },
    { wch: 48 },
    { wch: 28 },
    { wch: 34 },
    { wch: 30 },
    { wch: 15 },
    { wch: 30 },
    { wch: 16 },
    { wch: 26 }
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Autoridades');
  XLSX.writeFile(wb, 'Autoridades_Organigrama_ItaIbate.xlsx');
};

/**
 * Applies authority updates from an Excel ArrayBuffer (Autoridades_Organigrama_ItaIbate.xlsx)
 * onto an existing Department[] list, matching by ID or normalized area name.
 */
export const mergeAuthoritiesFromExcelBuffer = (
  buffer: ArrayBuffer,
  currentDepartments: Department[]
): { updated: Department[]; matchedCount: number } => {
  const wb = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) return { updated: currentDepartments, matchedCount: 0 };

  const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(wb.Sheets[firstSheetName], {
    defval: ''
  });
  if (!rawRows.length) return { updated: currentDepartments, matchedCount: 0 };

  const updatesById = new Map<string, Partial<Department>>();
  const updatesByNormName = new Map<string, Partial<Department>>();

  for (const row of rawRows) {
    const map: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      map[normalizeHeader(k)] = String(v ?? '').trim();
    }

    const idVal = map['idarea'] || map['id'] || map['codigo'] || '';
    const areaName =
      map['secretariadireccionarea'] ||
      map['area'] ||
      map['secretaria'] ||
      map['direccion'] ||
      map['dependencia'] ||
      map['nombre'] ||
      '';
    const leaderName =
      map['titularacargo'] ||
      map['titular'] ||
      map['encargado'] ||
      map['responsable'] ||
      map['nombretitular'] ||
      map['directorsecretario'] ||
      map['secretariodirector'] ||
      '';
    const leaderTitle = map['cargo'] || map['titulo'] || map['puesto'] || '';
    const leaderDni = map['dni'] || map['documento'] || '';
    const leaderEmail = map['email'] || map['correo'] || map['mail'] || '';
    const phone = map['telefono'] || map['tel'] || map['celular'] || '';
    const legalReference = map['referencialegal'] || map['decreto'] || map['articulo'] || '';

    if (!leaderName && !leaderTitle && !leaderEmail && !phone) continue;

    const patch: Partial<Department> = {};
    if (leaderName) patch.leaderName = leaderName;
    if (leaderTitle) patch.leaderTitle = leaderTitle;
    if (leaderDni) patch.leaderDni = leaderDni;
    if (leaderEmail) patch.leaderEmail = leaderEmail;
    if (phone) patch.phone = phone;
    if (legalReference) patch.legalReference = legalReference;

    if (idVal) updatesById.set(idVal, patch);
    if (areaName) updatesByNormName.set(normalizeHeader(areaName), patch);
  }

  let matchedCount = 0;
  const updated = currentDepartments.map((dept) => {
    const patch =
      updatesById.get(dept.id) ||
      updatesByNormName.get(normalizeHeader(dept.name)) ||
      updatesByNormName.get(normalizeHeader(dept.shortName));

    if (!patch) return dept;
    matchedCount++;
    return {
      ...dept,
      ...patch
    };
  });

  return { updated, matchedCount };
};
