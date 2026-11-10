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
  TrafficCheckpointRecord
} from '../types';

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
}

export interface ParseResult {
  validRows: ParsedMunicipalRow[];
  errors: string[];
  totalDetected: number;
}

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

