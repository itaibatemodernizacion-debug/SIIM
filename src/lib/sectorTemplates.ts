import * as XLSX from 'xlsx';
import { Department } from '../types';
import { ITA_IBATE_NEIGHBORHOODS } from '../data/initialData';

export type SectorImportTarget =
  | 'SPORTS'
  | 'CULTURE'
  | 'RRHH'
  | 'CONTROL_URBANO_CARNETS'
  | 'CONTROL_URBANO_MULTAS'
  | 'CONTROL_URBANO_HABILITACIONES'
  | 'CONTROL_URBANO_OPERATIVOS'
  | 'NECROLOGICAL'
  | 'ESCUELA_EMPRESA'
  | 'TICKETS';

export interface TemplateSheetDefinition {
  sheetName: string;
  targetType: SectorImportTarget;
  headers: string[];
  colWidths: number[];
  sampleRows: any[][];
}

export interface SectorTemplateConfig {
  id: string;
  title: string;
  subtitle: string;
  fileName: string;
  badge: string;
  requiredHighlights: string[];
  sheets: TemplateSheetDefinition[];
}

const NEIGHBORHOODS_GUIDE_SHEET = (templateTitle: string): { name: string; data: any[][] } => ({
  name: 'Guia_y_Barrios_Oficiales',
  data: [
    ['MUNICIPALIDAD DE ITÁ IBATÉ - GUÍA DE CARGA PARA GOOGLE DRIVE Y SIMM'],
    [`Planilla Modelo: ${templateTitle}`],
    [''],
    ['INSTRUCCIONES IMPORTANTES:'],
    ['1. No modifique ni borre los nombres de las columnas en la fila 1 de las hojas de carga.'],
    ['2. Los campos marcados con (*) son obligatorios para poder importar el registro al sistema.'],
    ['3. Las fechas deben respetarse en formato AAAA-MM-DD (ejemplo: 2026-11-16).'],
    ['4. Puede completar esta planilla en Excel o subirla a Google Drive / Google Sheets para sincronizarla directamente con el sistema.'],
    ['5. En Deportes y Cultura: si el participante/alumno es MENOR DE EDAD (SI o menor de 18 años), es OBLIGATORIO completar los datos del Tutor Responsable.'],
    [''],
    ['LISTADO OFICIAL DE BARRIOS Y PARAJES DE ITÁ IBATÉ (Copiar exactamente en la columna BARRIO):'],
    ...ITA_IBATE_NEIGHBORHOODS.map((nh, idx) => [`${idx + 1}. ${nh}`, nh])
  ]
});

// 1. DEPORTES Y RECREACIÓN (con Tutores obligatorios para Menores)
const TEMPLATE_DEPORTES: SectorTemplateConfig = {
  id: 'tpl-deportes',
  title: 'Dirección General de Deportes y Recreación',
  subtitle: 'Inscripción de deportistas, torneos, disciplinas y sección obligatoria de Tutor Responsable para menores de edad.',
  fileName: 'Modelo_Deportes_ItaIbate_Con_Tutores.xlsx',
  badge: 'Deportes + Tutores Menores',
  requiredHighlights: [
    'DNI y Nombre del Deportista',
    'Edad y Marca SI/NO si es Menor de Edad',
    'Disciplina, Torneo/Evento y Categoría',
    'Datos del Tutor (Nombre, DNI, Teléfono y Vínculo) si es menor'
  ],
  sheets: [
    {
      sheetName: 'Inscripcion_Deportistas',
      targetType: 'SPORTS',
      headers: [
        'DNI_DEPORTISTA (*)',
        'NOMBRE_Y_APELLIDO_DEPORTISTA (*)',
        'EDAD',
        'ES_MENOR_DE_EDAD (SI / NO) (*)',
        'DOMICILIO',
        'BARRIO (*)',
        'TELEFONO_DEPORTISTA',
        'DISCIPLINA (*)',
        'EVENTO_O_TORNEO (*)',
        'CATEGORIA',
        'EQUIPO_O_CLUB',
        'LUGAR_EVENTO',
        'FECHA_INSCRIPCION (AAAA-MM-DD)',
        'NOMBRE_COMPLETO_TUTOR (Obligatorio si es menor)',
        'DNI_TUTOR (Obligatorio si es menor)',
        'TELEFONO_TUTOR (Obligatorio si es menor)',
        'VINCULO_TUTOR (Madre/Padre/Tutor Legal)'
      ],
      colWidths: [18, 28, 8, 24, 24, 20, 18, 22, 30, 16, 22, 26, 22, 32, 22, 22, 24],
      sampleRows: [
        [
          '48.920.114',
          'Santino Gabriel Méndez',
          12,
          'SI',
          'Calle Mitre 412',
          'Medalla Milagrosa',
          '3781-401122',
          'Fútbol',
          'Torneo Infantil Barrial Primavera',
          'Infantil Sub-13',
          'Club Medalla Milagrosa',
          'Polideportivo Municipal de Itá Ibaté',
          '2026-11-16',
          'María Laura Méndez',
          '31.445.890',
          '3781-409988',
          'Madre'
        ],
        [
          '37.210.554',
          'Lucas Emmanuel Duarte',
          27,
          'NO',
          'Av. San Martín 810',
          'San Baltazar',
          '3781-452211',
          'Pesca Deportiva',
          'Concurso de Pesca del Dorado',
          'Libre Embarcado',
          'Peña Náutica Itá Ibaté',
          'Costanera y Muelle de Itá Ibaté',
          '2026-11-16',
          '',
          '',
          '',
          ''
        ]
      ]
    }
  ]
};

// 2. CULTURA Y EDUCACIÓN (Cursos: Urbano, Ballet, Música, Folklore + Tutores)
const TEMPLATE_CULTURA: SectorTemplateConfig = {
  id: 'tpl-cultura',
  title: 'Secretaría de Cultura y Educación',
  subtitle: 'Inscripción a los cursos oficiales (Urbano, Ballet, Música, Folklore) con registro de Tutor para alumnos menores.',
  fileName: 'Modelo_Cultura_Cursos_ItaIbate.xlsx',
  badge: 'Urbano • Ballet • Música • Folklore',
  requiredHighlights: [
    'Curso Oficial (URBANO / BALLET / MÚSICA / FOLKLORE)',
    'Turno (MANANA / TARDE / NOCHE) y Docente',
    'Edad y Marca SI/NO si es Menor de Edad',
    'Nombre, DNI, Teléfono y Vínculo del Tutor (para menores)'
  ],
  sheets: [
    {
      sheetName: 'Alumnos_Cursos_Cultura',
      targetType: 'CULTURE',
      headers: [
        'DNI_ALUMNO (*)',
        'NOMBRE_Y_APELLIDO_ALUMNO (*)',
        'EDAD',
        'ES_MENOR_DE_EDAD (SI / NO) (*)',
        'CURSO_O_TALLER (URBANO / BALLET / MÚSICA / FOLKLORE) (*)',
        'TURNO (MANANA / TARDE / NOCHE)',
        'DOCENTE_A_CARGO',
        'TELEFONO_ALUMNO',
        'DOMICILIO',
        'BARRIO (*)',
        'FECHA_INSCRIPCION (AAAA-MM-DD)',
        'NOMBRE_COMPLETO_TUTOR (Obligatorio si es menor)',
        'DNI_TUTOR (Obligatorio si es menor)',
        'TELEFONO_TUTOR (Obligatorio si es menor)',
        'VINCULO_TUTOR',
        'OBSERVACIONES'
      ],
      colWidths: [16, 28, 8, 22, 38, 22, 24, 18, 24, 20, 22, 32, 22, 22, 20, 30],
      sampleRows: [
        [
          '50.112.334',
          'Alma Victoria Benítez',
          10,
          'SI',
          'BALLET',
          'TARDE',
          'Prof. Luciana Sosa',
          '',
          'Calle Belgrano 210',
          'Virgen de Itatí',
          '2026-11-16',
          'Claudia Beatriz Romero',
          '32.890.114',
          '3781-440221',
          'Madre',
          'Apta física presentada'
        ],
        [
          '43.550.219',
          'Mateo Nicolás Insaurralde',
          19,
          'NO',
          'MÚSICA',
          'NOCHE',
          'Prof. Ramón Alegre',
          '3781-471190',
          'Santa Catalina Mz B C 4',
          'Santa Catalina',
          '2026-11-16',
          '',
          '',
          '',
          '',
          'Taller de guitarra y acordeón'
        ]
      ]
    }
  ]
};

// 3. RECURSOS HUMANOS (RRHH)
const TEMPLATE_RRHH: SectorTemplateConfig = {
  id: 'tpl-rrhh',
  title: 'Coordinación de Recursos Humanos (RRHH)',
  subtitle: 'Legajos de personal municipal según condición: Planta Permanente, Contratado, Personal de Gabinete o Jornalizado.',
  fileName: 'Modelo_Recursos_Humanos_ItaIbate.xlsx',
  badge: 'Legajos y Condición Laboral',
  requiredHighlights: [
    'N° Legajo, DNI, CUIL y Nombre Completo',
    'Condición Laboral (PLANTA_PERMANENTE / CONTRATADO / PERSONAL_DE_GABINETE / JORNALIZADO)',
    'Área asignada, Cargo/Función y Fecha de Ingreso',
    'Barrio oficial, Obra Social y Contacto de Emergencia'
  ],
  sheets: [
    {
      sheetName: 'Personal_Municipal',
      targetType: 'RRHH',
      headers: [
        'NRO_LEGAJO (*)',
        'NOMBRE_Y_APELLIDO (*)',
        'DNI (*)',
        'CUIL (*)',
        'CONDICION_LABORAL (PLANTA_PERMANENTE / CONTRATADO / PERSONAL_DE_GABINETE / JORNALIZADO) (*)',
        'AREA_O_SECRETARIA',
        'CARGO_O_FUNCION (*)',
        'CATEGORIA_ESCALAFON',
        'FECHA_INGRESO (AAAA-MM-DD)',
        'TELEFONO',
        'DOMICILIO',
        'BARRIO (*)',
        'TURNO (MANANA / TARDE / NOCHE / ROTATIVO)',
        'HORAS_SEMANALES',
        'OBRA_SOCIAL',
        'CONTACTO_EMERGENCIA',
        'TELEFONO_EMERGENCIA',
        'OBSERVACIONES'
      ],
      colWidths: [14, 28, 15, 16, 48, 28, 26, 18, 20, 16, 24, 20, 24, 16, 16, 24, 18, 28],
      sampleRows: [
        [
          'LEG-00210',
          'Carlos Alberto Ayala',
          '29.410.223',
          '20-29410223-4',
          'PLANTA_PERMANENTE',
          'Secretaría de Planificación Urbana, Obras y Servicios Públicos',
          'Maquinista Vial',
          'Cat. 14',
          '2018-04-01',
          '3781-412233',
          'San Roque 340',
          'San Roque',
          'MANANA',
          35,
          'IOSCOR',
          'Marta Ayala',
          '3781-412299',
          'Licencia de conducir profesional vigente'
        ]
      ]
    }
  ]
};

// 4. CONTROL URBANO Y SEGURIDAD VIAL (Multi-hoja: Carnets, Multas, Habilitaciones, Operativos)
const TEMPLATE_CONTROL_URBANO: SectorTemplateConfig = {
  id: 'tpl-control-urbano',
  title: 'Dirección General de Seguridad Ciudadana y Control Urbano',
  subtitle: 'Libro multi-hoja específico para: 1) Carnets de Conducir, 2) Multas de Tránsito, 3) Habilitaciones Comerciales y 4) Operativos Viales.',
  fileName: 'Modelo_Control_Urbano_Vial_ItaIbate.xlsx',
  badge: '4 Hojas Especializadas',
  requiredHighlights: [
    'Hoja 1: Trámites de Carnet de Conducir (N° Carnet, Categoría, Examen)',
    'Hoja 2: Multas de Tránsito (N° Acta, Patente, Infracción, Retención)',
    'Hoja 3: Habilitaciones Comerciales (Expediente, Razón Social, Bromatología/Bomberos)',
    'Hoja 4: Operativos de Control Vial (Vehículos, Alcoholemias, Actas)'
  ],
  sheets: [
    {
      sheetName: 'Carnets_Conducir',
      targetType: 'CONTROL_URBANO_CARNETS',
      headers: [
        'NRO_CARNET (*)',
        'DNI (*)',
        'NOMBRE_Y_APELLIDO (*)',
        'TELEFONO',
        'DOMICILIO',
        'BARRIO (*)',
        'TIPO_TRAMITE (ORIGINAL / RENOVACION / DUPLICADO / AMPLIACION) (*)',
        'CATEGORIA (A1/A2/B1/B2/C1/D1) (*)',
        'VEHICULO',
        'FECHA_EMISION (AAAA-MM-DD)',
        'FECHA_VENCIMIENTO (AAAA-MM-DD)',
        'EXAMEN_MEDICO (SI / NO)',
        'MONTO_TASA ($)',
        'TASA_PAGADA (SI / NO)',
        'ESTADO (EN_TRAMITE / APROBADO / EMITIDO / ENTREGADO)',
        'INSPECTOR_A_CARGO',
        'OBSERVACIONES'
      ],
      colWidths: [18, 15, 28, 16, 24, 18, 32, 22, 22, 20, 20, 18, 15, 16, 26, 24, 28],
      sampleRows: [
        [
          'CAR-38120455',
          '38.120.455',
          'Diego Armando Sosa',
          '3781-489012',
          'Calle Independencia 120',
          'San Cayetano',
          'RENOVACION',
          'B1',
          'Automóvil Particular',
          '2026-11-16',
          '2031-11-16',
          'SI',
          28500,
          'SI',
          'ENTREGADO',
          'Comisario (R) Hugo Ojeda',
          'Apto médico y teórico aprobado (95/100)'
        ]
      ]
    },
    {
      sheetName: 'Multas_Transito',
      targetType: 'CONTROL_URBANO_MULTAS',
      headers: [
        'NRO_ACTA (*)',
        'FECHA (AAAA-MM-DD) (*)',
        'HORA',
        'UBICACION (*)',
        'BARRIO',
        'INFRACTOR_NOMBRE (*)',
        'DNI_INFRACTOR (*)',
        'TELEFONO_INFRACTOR',
        'PATENTE (*)',
        'VEHICULO',
        'TIPO_INFRACCION (*)',
        'GRAVEDAD (LEVE / GRAVE / MUY_GRAVE)',
        'IMPORTE_MULTA ($)',
        'VEHICULO_RETENIDO (SI / NO)',
        'ESTADO (ACTIVA / NOTIFICADA / PAGADA)',
        'INSPECTOR_ACTUANTE',
        'OBSERVACIONES'
      ],
      colWidths: [16, 18, 10, 28, 18, 26, 16, 16, 14, 20, 28, 22, 16, 20, 22, 22, 28],
      sampleRows: [
        [
          'ACT-004521',
          '2026-11-15',
          '18:45',
          'Av. San Martín y Rivadavia',
          'Barrio Centro',
          'Roberto Carlos Gómez',
          '34.119.022',
          '3781-403311',
          'A123BCD',
          'Motocicleta 110cc',
          'Falta de Casco Reglamentario',
          'GRAVE',
          45000,
          'NO',
          'ACTIVA',
          'Insp. M. Giménez',
          'Se entregó notificación de descargo'
        ]
      ]
    },
    {
      sheetName: 'Habilitaciones_Comerciales',
      targetType: 'CONTROL_URBANO_HABILITACIONES',
      headers: [
        'NRO_EXPEDIENTE (*)',
        'RAZON_SOCIAL_O_COMERCIO (*)',
        'TITULAR (*)',
        'DNI_O_CUIT (*)',
        'TELEFONO',
        'DOMICILIO_COMERCIAL (*)',
        'BARRIO (*)',
        'CATEGORIA (COMERCIAL / GASTRONOMICO / HOTELERO_TURISTICO / SERVICIOS)',
        'RUBRO_ACTIVIDAD (*)',
        'SUPERFICIE_M2',
        'BOMBEROS_APROBADO (SI / NO)',
        'BROMATOLOGIA_APROBADO (SI / NO)',
        'FECHA_HABILITACION',
        'FECHA_VENCIMIENTO',
        'TASA_ANUAL ($)',
        'ESTADO (EN_TRAMITE / HABILITADO / VENCIDO)'
      ],
      colWidths: [18, 28, 26, 18, 16, 28, 18, 32, 26, 14, 20, 22, 18, 18, 14, 24],
      sampleRows: [
        [
          'EXP-HAB-2026-102',
          'Despensa Don Pedro',
          'Pedro Pablo Verón',
          '20-26881920-3',
          '3781-422110',
          'Calle 25 de Mayo 340',
          'Santa Librada',
          'COMERCIAL',
          'Almacén y Despensa Barrial',
          65,
          'SI',
          'SI',
          '2026-11-10',
          '2027-11-10',
          52000,
          'HABILITADO'
        ]
      ]
    },
    {
      sheetName: 'Operativos_Viales',
      targetType: 'CONTROL_URBANO_OPERATIVOS',
      headers: [
        'FECHA (AAAA-MM-DD) (*)',
        'UBICACION_PUESTO (*)',
        'BARRIO',
        'TIPO_OPERATIVO (CONTROL_GENERAL_VEHICULAR / ALCOHOLEMIA / CONTROL_DE_CASCO / OPERATIVO_TURISMO_PESCA)',
        'TURNO (MANANA / TARDE / NOCHE / MADRUGADA)',
        'OFICIAL_A_CARGO (*)',
        'CANT_INSPECTORES',
        'APOYO_POLICIAL (SI / NO)',
        'VEHICULOS_CONTROLADOS',
        'MOTOS_CONTROLADAS',
        'AUTOS_CONTROLADOS',
        'TEST_ALCOHOLEMIA',
        'ALCOHOLEMIAS_POSITIVAS',
        'ACTAS_LABRADAS',
        'RETENCIONES_CORRALON',
        'OBSERVACIONES'
      ],
      colWidths: [18, 28, 18, 38, 22, 24, 16, 18, 18, 16, 16, 16, 18, 14, 18, 30],
      sampleRows: [
        [
          '2026-11-15',
          'Acceso Ruta Nacional 12 Km 1182',
          'San Expedito',
          'OPERATIVO_TURISMO_PESCA',
          'TARDE',
          'Comisario (R) Hugo Ojeda',
          6,
          'SI',
          84,
          38,
          46,
          24,
          1,
          4,
          1,
          'Control conjunto con Policía de Corrientes'
        ]
      ]
    }
  ]
};

// 5. DESARROLLO SOCIAL Y REGISTRO NECROLÓGICO (2 Hojas: Asistencia Social + Registro Necrológico)
const TEMPLATE_DESARROLLO_SOCIAL: SectorTemplateConfig = {
  id: 'tpl-desarrollo-social',
  title: 'Secretaría de Desarrollo Social y Humano',
  subtitle: 'Incluye hoja de Asistencia Social Inmediata / Familia y hoja específica de Registro Necrológico (Cajones y Nichos).',
  fileName: 'Modelo_Desarrollo_Social_y_Necrologico_ItaIbate.xlsx',
  badge: 'Asistencia Social + Necrológico',
  requiredHighlights: [
    'Hoja 1 (Asistencia_Social): DNI, Integrantes Grupo Familiar, Tipo de Ayuda Social y Barrio',
    'Hoja 2 (Registro_Necrologico): Datos del Fallecido, Familiar, Cajón Provisto y Nicho Asignado'
  ],
  sheets: [
    {
      sheetName: 'Asistencia_Social',
      targetType: 'TICKETS',
      headers: [
        'DNI (*)',
        'NOMBRE_Y_APELLIDO (*)',
        'DOMICILIO',
        'BARRIO (*)',
        'TELEFONO',
        'INTEGRANTES_GRUPO_FAMILIAR',
        'TIPO_ASISTENCIA (Módulo Alimentario / Chapas-Materiales / Medicamentos / Pasaje / Subsidio) (*)',
        'DESCRIPCION_SITUACION (*)',
        'PRIORIDAD (ALTA / MEDIA / BAJA)',
        'RESPONSABLE_ATENCION',
        'ESTADO (Iniciado / En proceso / Solucionado)',
        'RESUELTO (SI / NO) (*)',
        'FECHA_INICIO (AAAA-MM-DD)',
        'FECHA_RESOLUCION (AAAA-MM-DD)',
        'OBSERVACIONES'
      ],
      colWidths: [15, 28, 24, 20, 16, 20, 38, 36, 18, 24, 22, 16, 20, 20, 30],
      sampleRows: [
        [
          '28.341.902',
          'Elena Beatriz Vargas',
          'Calle Las Heras s/n',
          'Santa Maravilla de Jesús',
          '3781-418822',
          5,
          'Módulo Alimentario',
          'Asistencia alimentaria familiar mensual por vulnerabilidad social',
          'ALTA',
          'Lic. Silvina Fernández',
          'Solucionado',
          'SI',
          '2026-11-16',
          '2026-11-16',
          'Entregado con remito N° 445'
        ]
      ]
    },
    {
      sheetName: 'Registro_Necrologico',
      targetType: 'NECROLOGICAL',
      headers: [
        'FECHA_SERVICIO (AAAA-MM-DD) (*)',
        'FALLECIDO_NOMBRE (*)',
        'DNI_FALLECIDO (*)',
        'EDAD',
        'FECHA_DEFUNCION (AAAA-MM-DD)',
        'CERTIFICADO_DEFUNCION',
        'FAMILIAR_SOLICITANTE (*)',
        'DNI_FAMILIAR (*)',
        'PARENTESCO',
        'TELEFONO_FAMILIAR',
        'DOMICILIO_FAMILIAR',
        'BARRIO',
        'CAJON_PROVISTO (SI / NO) (*)',
        'TIPO_CAJON',
        'CODIGO_CAJON',
        'EXENCION_SOCIAL (SI / NO)',
        'NICHO_ASIGNADO (SI / NO) (*)',
        'CEMENTERIO',
        'PABELLON_O_SECTOR',
        'FILA_O_NIVEL',
        'NRO_NICHO',
        'CONDICION_NICHO (ASIGNADO / CONCESION_TEMPORAL / A_PERPETUIDAD)',
        'FUNCIONARIO_AUTORIZANTE',
        'OBSERVACIONES'
      ],
      colWidths: [20, 28, 16, 8, 20, 20, 26, 16, 16, 16, 24, 18, 18, 26, 16, 18, 18, 32, 20, 16, 14, 30, 24, 28],
      sampleRows: [
        [
          '2026-11-14',
          'Ramón Antonio Escalante',
          '11.452.900',
          74,
          '2026-11-13',
          'CD-2026-882',
          'Laura Escalante',
          '30.221.490',
          'Hija',
          '3781-409911',
          'San Antonio 120',
          'San Antonio',
          'SI',
          'Estándar Adulto (Madera Lustrada)',
          'CAJ-2026-041',
          'SI',
          'SI',
          'Cementerio Municipal San Juan Bautista de Itá Ibaté',
          'Pabellón B',
          'Fila 2',
          'Nicho 78',
          'ASIGNADO',
          'Lic. Matías Meza',
          'Servicio completo subsidiado por Asistencia Inmediata'
        ]
      ]
    }
  ]
};

// 6. PLANIFICACIÓN URBANA, OBRAS Y SERVICIOS PÚBLICOS
const TEMPLATE_OBRAS_PUBLICAS: SectorTemplateConfig = {
  id: 'tpl-obras-publicas',
  title: 'Secretaría de Planificación Urbana, Obras y Servicios Públicos',
  subtitle: 'Planilla de reclamos vecinales, reparaciones de luminarias, bacheo, zanjeo, poda y recolección.',
  fileName: 'Modelo_Obras_y_Servicios_Publicos_ItaIbate.xlsx',
  badge: 'Reclamos e Infraestructura',
  requiredHighlights: [
    'Barrio y Calle/Ubicación exacta del reclamo',
    'Tipo de Trabajo (Luminaria / Bacheo / Zanjeo / Poda / Agua / Recolección)',
    'Cuadrilla o Responsable de ejecución y Estado (SI/NO resuelto)'
  ],
  sheets: [
    {
      sheetName: 'Reclamos_Obras_Servicios',
      targetType: 'TICKETS',
      headers: [
        'DNI (*)',
        'VECINO_SOLICITANTE (*)',
        'TELEFONO',
        'BARRIO (*)',
        'CALLE_O_UBICACION_RECLAMO (*)',
        'TIPO_TRABAJO (Luminaria / Bacheo / Zanjeo / Poda / Recolección / Red de Agua) (*)',
        'DESCRIPCION_TECNICA (*)',
        'CUADRILLA_O_RESPONSABLE',
        'PRIORIDAD (ALTA / MEDIA / BAJA)',
        'ESTADO (Iniciado / En proceso / Solucionado)',
        'RESUELTO (SI / NO) (*)',
        'FECHA_INICIO (AAAA-MM-DD)',
        'FECHA_RESOLUCION (AAAA-MM-DD)',
        'MATERIALES_U_OBSERVACIONES'
      ],
      colWidths: [15, 28, 16, 20, 30, 38, 36, 24, 18, 22, 16, 20, 20, 32],
      sampleRows: [
        [
          '24.551.890',
          'José María Cáceres',
          '3781-430912',
          'Virgen de Luján',
          'Calle Berón de Astrada al 400',
          'Luminaria',
          'Cambio de artefacto LED 150W apagado en esquina',
          'Cuadrilla Alumbrado Público',
          'MEDIA',
          'Solucionado',
          'SI',
          '2026-11-14',
          '2026-11-15',
          'Se colocó foco LED nuevo'
        ]
      ]
    }
  ]
};

// 7. SALUD, BROMATOLOGÍA, ZOONOSIS Y SAPS
const TEMPLATE_SALUD: SectorTemplateConfig = {
  id: 'tpl-salud',
  title: 'Dirección General de Salud, Bromatología, Zoonosis y SAPS',
  subtitle: 'Registro de atenciones médicas del SAPS, vacunación, enfermería, control bromatológico y campañas antirrábicas.',
  fileName: 'Modelo_Salud_SAPS_Bromatologia_ItaIbate.xlsx',
  badge: 'Salud y SAPS Municipal',
  requiredHighlights: [
    'DNI y Edad del Paciente / Titular',
    'Tipo de Prestación (Consulta SAPS / Vacunación / Enfermería / Zoonosis / Bromatología)',
    'Profesional o Inspector a Cargo y Barrio'
  ],
  sheets: [
    {
      sheetName: 'Atenciones_Salud_SAPS',
      targetType: 'TICKETS',
      headers: [
        'DNI (*)',
        'NOMBRE_Y_APELLIDO (*)',
        'EDAD',
        'DOMICILIO',
        'BARRIO (*)',
        'TELEFONO',
        'TIPO_PRESTACION (Consulta Médica SAPS / Vacunación / Enfermería / Control Embarazo / Zoonosis / Bromatología) (*)',
        'DETALLE_ATENCION_O_DIAGNOSTICO (*)',
        'PROFESIONAL_A_CARGO',
        'ESTADO (Iniciado / En proceso / Solucionado)',
        'RESUELTO (SI / NO) (*)',
        'FECHA_ATENCION (AAAA-MM-DD)',
        'OBSERVACIONES'
      ],
      colWidths: [15, 28, 8, 24, 20, 16, 44, 36, 24, 22, 16, 20, 30],
      sampleRows: [
        [
          '39.210.440',
          'Romina Soledad Núñez',
          26,
          'Paraje Tirita s/n',
          'Paraje Tirita',
          '3781-492011',
          'Consulta Médica SAPS',
          'Control clínico general y entrega de medicación ambulatoria',
          'Dr. Hernán Silva',
          'Solucionado',
          'SI',
          '2026-11-16',
          'Derivación a control odontológico preventivo'
        ]
      ]
    }
  ]
};

// 8. TURISMO
const TEMPLATE_TURISMO: SectorTemplateConfig = {
  id: 'tpl-turismo',
  title: 'Secretaría de Turismo de Itá Ibaté',
  subtitle: 'Registro de visitantes y turistas, provincia/país de procedencia, motivos (pesca deportiva, cabañas) y consultas.',
  fileName: 'Modelo_Turismo_ItaIbate.xlsx',
  badge: 'Atención al Turista',
  requiredHighlights: [
    'Documento / DNI del Visitante',
    'Provincia o País de Procedencia',
    'Cantidad de Personas, Alojamiento y Motivo (Pesca / Excursión / Recreación)'
  ],
  sheets: [
    {
      sheetName: 'Registro_Turistas',
      targetType: 'TICKETS',
      headers: [
        'DNI_O_DOCUMENTO (*)',
        'NOMBRE_VISITANTE (*)',
        'PROCEDENCIA_PROVINCIA_O_PAIS (*)',
        'TELEFONO_O_CONTACTO',
        'CANTIDAD_PERSONAS',
        'MOTIVO_VISITA (Pesca Deportiva / Alojamiento / Excursión / Información Turística) (*)',
        'ALOJAMIENTO_O_CABANA',
        'CONSULTA_O_SERVICIO_BRINDADO (*)',
        'OPERADOR_TURISMO',
        'RESUELTO (SI / NO) (*)',
        'FECHA_VISITA (AAAA-MM-DD)',
        'OBSERVACIONES'
      ],
      colWidths: [18, 28, 28, 18, 16, 38, 24, 34, 22, 16, 20, 28],
      sampleRows: [
        [
          '27.104.332',
          'Marcelo Fabián Roldán',
          'Santa Fe (Rosario)',
          '341-5521090',
          4,
          'Pesca Deportiva',
          'Cabañas del Paraná',
          'Información sobre guías habilitados, bajada de lanchas y reglamento de pesca',
          'Tec. Gustavo Benítez',
          'SI',
          '2026-11-16',
          'Grupo de 4 pescadores por 4 días'
        ]
      ]
    }
  ]
};

// 9. DESARROLLO PRODUCTIVO Y AMBIENTE / EMPRENDEDORES / VIVERO
const TEMPLATE_PRODUCCION: SectorTemplateConfig = {
  id: 'tpl-produccion',
  title: 'Secretaría de Desarrollo Productivo, Ambiente, Emprendedores y Vivero',
  subtitle: 'Registro de productores rurales, emprendedores locales, economía circular y entregas de plantines del Vivero Municipal.',
  fileName: 'Modelo_Produccion_Emprendedores_Vivero_ItaIbate.xlsx',
  badge: 'Producción • Emprendedores • Vivero',
  requiredHighlights: [
    'DNI/CUIT y Nombre del Productor o Emprendedor',
    'Nombre del Emprendimiento y Rubro Productivo',
    'Programa (Vivero Municipal / Feria Franca / Economía Circular / Asistencia Técnica)'
  ],
  sheets: [
    {
      sheetName: 'Productores_y_Emprendedores',
      targetType: 'TICKETS',
      headers: [
        'DNI_O_CUIT (*)',
        'NOMBRE_PRODUCTOR_O_EMPRENDEDOR (*)',
        'NOMBRE_EMPRENDIMIENTO',
        'RUBRO_PRODUCTIVO (*)',
        'DOMICILIO',
        'BARRIO_O_PARAJE (*)',
        'TELEFONO',
        'PROGRAMA_O_SOLICITUD (Entrega Plantines Vivero / Asistencia Técnica / Feria Franca / Economía Circular) (*)',
        'DETALLE_O_CANTIDAD_ENTREGADA (*)',
        'RESPONSABLE_AREA',
        'ESTADO (Iniciado / En proceso / Solucionado)',
        'RESUELTO (SI / NO) (*)',
        'FECHA_REGISTRO (AAAA-MM-DD)',
        'OBSERVACIONES'
      ],
      colWidths: [18, 30, 24, 22, 24, 20, 16, 42, 34, 24, 20, 16, 20, 28],
      sampleRows: [
        [
          '33.190.442',
          'Marta Graciela Alarcón',
          'Huerta Orgánica La Ribera',
          'Horticultura / Vivero',
          'Paraje Arerunguá Km 4',
          'Paraje Arerunguá',
          '3781-415500',
          'Entrega Plantines Vivero',
          'Entrega de 40 plantines de cítricos y semillas de huerta familiar',
          'Sr. José Luis Duarte',
          'Solucionado',
          'SI',
          '2026-11-16',
          'Seguimiento técnico en 30 días'
        ]
      ]
    }
  ]
};

// 10. HACIENDA, FINANZAS, RENTAS Y CATASTRO
const TEMPLATE_HACIENDA: SectorTemplateConfig = {
  id: 'tpl-hacienda',
  title: 'Secretaría de Hacienda, Rentas Públicas y Catastro',
  subtitle: 'Registro de trámites tributarios, libre deuda, partidas inmobiliarias, mensuras catastrales y tasas municipales.',
  fileName: 'Modelo_Hacienda_Rentas_Catastro_ItaIbate.xlsx',
  badge: 'Rentas • Catastro • Hacienda',
  requiredHighlights: [
    'DNI/CUIT del Contribuyente y N° de Partida o Expediente',
    'Tipo de Trámite (Libre Deuda / Plano Mensura / Tasa Inmobiliaria / Patente)',
    'Importe / Monto ($) y Estado de Resolución'
  ],
  sheets: [
    {
      sheetName: 'Tramites_Rentas_Catastro',
      targetType: 'TICKETS',
      headers: [
        'DNI_O_CUIT_CONTRIBUYENTE (*)',
        'NOMBRE_CONTRIBUYENTE (*)',
        'NRO_PARTIDA_O_EXPEDIENTE',
        'DOMICILIO_PARCELA',
        'BARRIO (*)',
        'TELEFONO',
        'TIPO_TRAMITE (Libre Deuda / Plano Mensura / Tasa Inmobiliaria / Patente Automotor / Convenio Pago) (*)',
        'DETALLE_DEL_TRAMITE (*)',
        'MONTO_IMPORTE ($)',
        'RESPONSABLE_ATENCION',
        'ESTADO (Iniciado / En proceso / Solucionado)',
        'RESUELTO (SI / NO) (*)',
        'FECHA_INICIO (AAAA-MM-DD)',
        'FECHA_RESOLUCION (AAAA-MM-DD)',
        'OBSERVACIONES'
      ],
      colWidths: [20, 28, 22, 24, 20, 16, 40, 34, 16, 24, 20, 16, 20, 20, 28],
      sampleRows: [
        [
          '20-23901122-8',
          'Héctor Raúl Quintana',
          'PART-00412-IB',
          'Manzana 14 Lote 8',
          'Barrio Centro',
          '3781-421190',
          'Libre Deuda',
          'Certificado de Libre Deuda Municipal y verificación catastral',
          12500,
          'C.P.N. Martín Almirón',
          'Solucionado',
          'SI',
          '2026-11-16',
          '2026-11-16',
          'Comprobante abonado en Caja Municipal'
        ]
      ]
    }
  ]
};

// 11. PUNTO DIGITAL ITÁ IBATÉ
const TEMPLATE_PUNTO_DIGITAL: SectorTemplateConfig = {
  id: 'tpl-punto-digital',
  title: 'Punto Digital Itá Ibaté',
  subtitle: 'Planilla oficial de atención ciudadana en Punto Digital: trámites digitales, turnos, género y estado de trámite.',
  fileName: 'Modelo_Punto_Digital_ItaIbate.xlsx',
  badge: 'Punto Digital • Trámites TIC',
  requiredHighlights: [
    'DNI, Apellido y Nombre del Ciudadano',
    'Barrio, Teléfono y Género',
    'Trámite y Estado de Trámite',
    'Turno (Mañana / Tarde) y Fecha'
  ],
  sheets: [
    {
      sheetName: 'Atenciones_Punto_Digital',
      targetType: 'TICKETS',
      headers: [
        'DNI',
        'Apellido',
        'Nombre',
        'Barrio',
        'Trámite',
        'Teléfono',
        'Género',
        'Estado de Trámite',
        'Turno',
        'Fecha'
      ],
      colWidths: [15, 22, 22, 22, 32, 18, 16, 22, 14, 15],
      sampleRows: [
        [
          '42.881.904',
          'Ojeda',
          'Facundo Andrés',
          'Santa Catalina',
          'Mi ANSES / Beca Progresar',
          '3781-499011',
          'Masculino',
          'Solucionado',
          'Mañana',
          '2026-11-25'
        ],
        [
          '36.412.785',
          'Ramírez',
          'María Belén',
          'Medalla Milagrosa',
          'Constancia de CUIL / Libreta AUH',
          '3781-452310',
          'Femenino',
          'En proceso',
          'Tarde',
          '2026-11-25'
        ]
      ]
    }
  ]
};

// 12. JEFATURA DE GABINETE, MODERNIZACIÓN, MESA DE ENTRADA Y LEGAL
const TEMPLATE_JEFATURA_ADMINISTRATIVA: SectorTemplateConfig = {
  id: 'tpl-jefatura',
  title: 'Jefatura de Gabinete, Mesa de Entrada, Modernización y Legal',
  subtitle: 'Modelo para expedientes, notas ingresadas por Mesa de Entrada, Boletín Oficial y gestiones legales.',
  fileName: 'Modelo_Mesa_Entrada_Modernizacion_Legal.xlsx',
  badge: 'Expedientes y Mesa de Entrada',
  requiredHighlights: [
    'N° de Expediente / Nota y DNI del Solicitante',
    'Asunto / Trámite y Descripción Detallada',
    'Área Destinataria o Responsable y Estado de Resolución'
  ],
  sheets: [
    {
      sheetName: 'Mesa_Entrada_y_Expedientes',
      targetType: 'TICKETS',
      headers: [
        'NRO_EXPEDIENTE_O_NOTA',
        'DNI (*)',
        'NOMBRE_Y_APELLIDO (*)',
        'DOMICILIO',
        'BARRIO (*)',
        'TELEFONO',
        'TRAMITE_O_ASUNTO (*)',
        'DESCRIPCION_DETALLADA (*)',
        'RESPONSABLE_ATENCION',
        'ESTADO (Iniciado / En proceso / Pendiente / Solucionado)',
        'RESUELTO (SI / NO) (*)',
        'FECHA_INICIO (AAAA-MM-DD)',
        'FECHA_RESOLUCION (AAAA-MM-DD)',
        'OBSERVACIONES'
      ],
      colWidths: [20, 15, 28, 24, 20, 16, 32, 38, 24, 24, 16, 20, 20, 30],
      sampleRows: [
        [
          'EXP-ME-2026-310',
          '42.881.904',
          'Facundo Andrés Ojeda',
          'Santa Catalina Mz 2 C 5',
          'Santa Catalina',
          '3781-499011',
          'Nota Solicitud de Audiencia',
          'Ingreso formal de expediente por Mesa de Entrada Municipal',
          'Tec. Natalia Aquino',
          'Solucionado',
          'SI',
          '2026-11-16',
          '2026-11-16',
          'Derivado y respondido'
        ]
      ]
    }
  ]
};

// 13. ESCUELA EMPRESA (PANADERÍA Y PASTELERÍA - DEPENDIENTE DEL D.E.M.)
const TEMPLATE_ESCUELA_EMPRESA: SectorTemplateConfig = {
  id: 'tpl-escuela-empresa',
  title: 'Escuela Empresa (Panadería y Pastelería · Dependiente del D.E.M.)',
  subtitle: 'Inscripción de alumnos y emprendedores en formación oficial de Panadería, Pastelería o Trayecto Integral (D.E.M.).',
  fileName: 'Modelo_Escuela_Empresa_Panaderia_Pasteleria_ItaIbate.xlsx',
  badge: 'Panadería • Pastelería (D.E.M.)',
  requiredHighlights: [
    'DNI, Nombre y Apellido, Teléfono y Barrio del Inscripto',
    'Especialidad (PANADERIA / PASTELERIA / PANADERIA_Y_PASTELERIA)',
    'Turno (MANANA / TARDE / NOCHE) y Nivel (INICIAL / INTERMEDIO / AVANZADO)',
    'Carnet de Manipulación de Alimentos (SI / NO) y Estado'
  ],
  sheets: [
    {
      sheetName: 'Alumnos_Escuela_Empresa',
      targetType: 'ESCUELA_EMPRESA',
      headers: [
        'DNI (*)',
        'NOMBRE_Y_APELLIDO (*)',
        'EDAD',
        'TELEFONO (*)',
        'EMAIL',
        'DOMICILIO',
        'BARRIO (*)',
        'ESPECIALIDAD_GASTRONOMICA (PANADERIA / PASTELERIA / PANADERIA_Y_PASTELERIA) (*)',
        'TURNO (MANANA / TARDE / NOCHE)',
        'NIVEL (INICIAL / INTERMEDIO / AVANZADO)',
        'INSTRUCTOR_A_CARGO',
        'CARNET_MANIPULACION_ALIMENTOS (SI / NO)',
        'FECHA_INSCRIPCION (AAAA-MM-DD)',
        'ESTADO (ACTIVO / REGULAR / EGRESADO / BAJA)',
        'OBSERVACIONES'
      ],
      colWidths: [15, 28, 8, 16, 24, 24, 20, 44, 20, 22, 24, 26, 20, 22, 32],
      sampleRows: [
        [
          '35.421.890',
          'Lucía Fernanda Paredes',
          29,
          '3781-451120',
          'lucia.paredes@mail.com',
          'Calle Mitre 320',
          'Medalla Milagrosa',
          'PANADERIA_Y_PASTELERIA',
          'TARDE',
          'INICIAL',
          'Chef Past. Patricia Ramírez',
          'SI',
          '2026-11-25',
          'ACTIVO',
          'Interesada en emprendimiento familiar de panadería'
        ],
        [
          '40.128.774',
          'Enzo Maximiliano Soto',
          25,
          '3781-470319',
          '',
          'Calle San Roque 185',
          'San Roque',
          'PANADERIA',
          'MANANA',
          'INTERMEDIO',
          'Mtro. Panadero Héctor Gómez',
          'NO',
          '2026-11-25',
          'ACTIVO',
          'En trámite carnet de manipulación de alimentos'
        ]
      ]
    }
  ]
};

export const SECTOR_TEMPLATE_CATALOG: SectorTemplateConfig[] = [
  TEMPLATE_PUNTO_DIGITAL,
  TEMPLATE_ESCUELA_EMPRESA,
  TEMPLATE_DEPORTES,
  TEMPLATE_CULTURA,
  TEMPLATE_RRHH,
  TEMPLATE_CONTROL_URBANO,
  TEMPLATE_DESARROLLO_SOCIAL,
  TEMPLATE_OBRAS_PUBLICAS,
  TEMPLATE_SALUD,
  TEMPLATE_TURISMO,
  TEMPLATE_PRODUCCION,
  TEMPLATE_HACIENDA,
  TEMPLATE_JEFATURA_ADMINISTRATIVA
];

export const getTemplateConfigForDepartment = (dept: Department): SectorTemplateConfig => {
  const id = dept.id;
  const name = dept.name.toLowerCase();
  const mod = dept.moduleType;

  if (id === 'escuela-empresa' || mod === 'ESCUELA_EMPRESA' || name.includes('escuela empresa') || name.includes('panader')) {
    return { ...TEMPLATE_ESCUELA_EMPRESA, title: dept.name };
  }
  if (id === 'punto-digital' || mod === 'PUNTO_DIGITAL' || name.includes('punto digital')) {
    return { ...TEMPLATE_PUNTO_DIGITAL, title: dept.name };
  }
  if (id === 'dir-deportes' || mod === 'DEPORTES' || name.includes('deporte')) {
    return { ...TEMPLATE_DEPORTES, title: dept.name };
  }
  if (id === 'sec-cultura' || mod === 'CULTURA' || name.includes('cultura')) {
    return { ...TEMPLATE_CULTURA, title: dept.name };
  }
  if (id === 'coord-recursos-humanos' || mod === 'RRHH' || name.includes('recursos humanos')) {
    return { ...TEMPLATE_RRHH, title: dept.name };
  }
  if (id === 'dir-gen-seguridad' || mod === 'CONTROL_URBANO' || name.includes('control urbano') || name.includes('seguridad ciudadana')) {
    return { ...TEMPLATE_CONTROL_URBANO, title: dept.name };
  }
  if (
    id === 'sec-social' ||
    id === 'dir-gen-asistencia-social' ||
    id === 'dir-gen-mujer-familia' ||
    id === 'dir-gen-juventud' ||
    mod === 'ACCION_SOCIAL' ||
    name.includes('desarrollo social') ||
    name.includes('asistencia social') ||
    name.includes('mujer')
  ) {
    return {
      ...TEMPLATE_DESARROLLO_SOCIAL,
      title: dept.name,
      fileName: `Modelo_${dept.shortName.replace(/[^a-zA-Z0-9]+/g, '_')}_ItaIbate.xlsx`
    };
  }
  if (
    id === 'sec-obras' ||
    id === 'dir-gen-servicios-publicos' ||
    id === 'dir-gen-desarrollo-urbano' ||
    mod === 'OBRAS_PUBLICAS'
  ) {
    return {
      ...TEMPLATE_OBRAS_PUBLICAS,
      title: dept.name,
      fileName: `Modelo_${dept.shortName.replace(/[^a-zA-Z0-9]+/g, '_')}_ItaIbate.xlsx`
    };
  }
  if (id === 'dir-gen-salud-bromatologia' || id === 'coord-saps' || mod === 'SALUD' || name.includes('salud') || name.includes('saps')) {
    return {
      ...TEMPLATE_SALUD,
      title: dept.name,
      fileName: `Modelo_${dept.shortName.replace(/[^a-zA-Z0-9]+/g, '_')}_ItaIbate.xlsx`
    };
  }
  if (id === 'sec-turismo' || mod === 'TURISMO' || name.includes('turismo')) {
    return { ...TEMPLATE_TURISMO, title: dept.name };
  }
  if (
    id === 'sec-produccion' ||
    id === 'dir-gen-produccion-sustentable' ||
    id === 'coord-emprendedores' ||
    id === 'coord-vivero' ||
    name.includes('productivo') ||
    name.includes('emprendedores') ||
    name.includes('vivero')
  ) {
    return {
      ...TEMPLATE_PRODUCCION,
      title: dept.name,
      fileName: `Modelo_${dept.shortName.replace(/[^a-zA-Z0-9]+/g, '_')}_ItaIbate.xlsx`
    };
  }
  if (id === 'sec-hacienda' || id === 'dir-gen-rentas' || id === 'coord-catastro' || name.includes('hacienda') || name.includes('rentas') || name.includes('catastro')) {
    return {
      ...TEMPLATE_HACIENDA,
      title: dept.name,
      fileName: `Modelo_${dept.shortName.replace(/[^a-zA-Z0-9]+/g, '_')}_ItaIbate.xlsx`
    };
  }

  return {
    ...TEMPLATE_JEFATURA_ADMINISTRATIVA,
    title: dept.name,
    fileName: `Modelo_${dept.shortName.replace(/[^a-zA-Z0-9]+/g, '_')}_ItaIbate.xlsx`
  };
};

export const downloadTemplateFromConfig = (config: SectorTemplateConfig): void => {
  const wb = XLSX.utils.book_new();

  config.sheets.forEach((sheetDef) => {
    const wsData = [sheetDef.headers, ...sheetDef.sampleRows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = sheetDef.colWidths.map((w) => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, sheetDef.sheetName.substring(0, 31));
  });

  // Add official neighborhoods & instructions guide sheet
  const guide = NEIGHBORHOODS_GUIDE_SHEET(config.title);
  const guideWs = XLSX.utils.aoa_to_sheet(guide.data);
  guideWs['!cols'] = [{ wch: 75 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(wb, guideWs, guide.name);

  XLSX.writeFile(wb, config.fileName);
};

export const downloadDepartmentTemplate = (dept: Department): SectorTemplateConfig => {
  const config = getTemplateConfigForDepartment(dept);
  downloadTemplateFromConfig(config);
  return config;
};

const normalizeText = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

/**
 * Automatically determines which municipal Secretaría/Dirección a Drive Excel file belongs to,
 * checking header inference first, then file name & subfolder path keywords, then fallback.
 */
export const inferDepartmentForDriveFile = (
  fileName: string,
  folderPath: string,
  headerInferredDeptId: string | undefined,
  departments: Department[],
  fallbackDeptId: string
): string => {
  const combined = normalizeText(`${folderPath} ${fileName}`);

  // 1. High-confidence keyword matches on filename or subfolder name
  const rules: { keywords: string[]; deptId: string }[] = [
    { keywords: ['escuela empresa', 'escuela_empresa', 'panaderia', 'pasteleria'], deptId: 'escuela-empresa' },
    { keywords: ['punto digital', 'punto_digital', 'puntodigital'], deptId: 'punto-digital' },
    { keywords: ['deporte', 'torneo', 'atleta'], deptId: 'dir-deportes' },
    { keywords: ['cultura', 'ballet', 'folklore', 'musica', 'urbano'], deptId: 'sec-cultura' },
    { keywords: ['recursos humanos', 'rrhh', 'legajo', 'personal'], deptId: 'coord-recursos-humanos' },
    { keywords: ['control urbano', 'seguridad', 'carnet', 'multa', 'habilitacion', 'operativo', 'transito'], deptId: 'dir-gen-seguridad' },
    { keywords: ['necrolog', 'cementerio', 'nicho', 'cajon'], deptId: 'dir-gen-asistencia-social' },
    { keywords: ['asistencia social'], deptId: 'dir-gen-asistencia-social' },
    { keywords: ['mujer', 'ninez', 'familia', 'tercera edad'], deptId: 'dir-gen-mujer-familia' },
    { keywords: ['juventud'], deptId: 'dir-gen-juventud' },
    { keywords: ['desarrollo social', 'accion social'], deptId: 'sec-social' },
    { keywords: ['saps'], deptId: 'coord-saps' },
    { keywords: ['salud', 'bromatologia', 'zoonosis'], deptId: 'dir-gen-salud-bromatologia' },
    { keywords: ['servicios publicos', 'higiene'], deptId: 'dir-gen-servicios-publicos' },
    { keywords: ['desarrollo urbano'], deptId: 'dir-gen-desarrollo-urbano' },
    { keywords: ['obras', 'planificacion'], deptId: 'sec-obras' },
    { keywords: ['turismo', 'turista', 'pesca'], deptId: 'sec-turismo' },
    { keywords: ['vivero'], deptId: 'coord-vivero' },
    { keywords: ['emprendedor', 'economia circular'], deptId: 'coord-emprendedores' },
    { keywords: ['produccion', 'productivo', 'ambiente'], deptId: 'sec-produccion' },
    { keywords: ['catastro'], deptId: 'coord-catastro' },
    { keywords: ['rentas', 'ingresos publicos'], deptId: 'dir-gen-rentas' },
    { keywords: ['hacienda', 'finanzas'], deptId: 'sec-hacienda' },
    { keywords: ['mesa de entrada', 'atencion ciudadana'], deptId: 'coord-atencion-ciudadana' },
    { keywords: ['boletin', 'archivo', 'despacho'], deptId: 'coord-boletin-archivo' },
    { keywords: ['legal', 'tecnica'], deptId: 'dir-gen-legal-tecnica' },
    { keywords: ['modernizacion', 'estadistica'], deptId: 'dir-gen-modernizacion' },
    { keywords: ['gabinete', 'jefatura'], deptId: 'sec-jefatura-gabinete' }
  ];

  // If header analysis already detected a specialized module/area, prefer specific subfolder/filename match first, otherwise header match
  for (const rule of rules) {
    if (rule.keywords.some((kw) => combined.includes(kw))) {
      if (departments.some((d) => d.id === rule.deptId)) {
        return rule.deptId;
      }
    }
  }

  if (headerInferredDeptId && departments.some((d) => d.id === headerInferredDeptId)) {
    return headerInferredDeptId;
  }

  // Fallback to fuzzy department name match
  const matched = departments.find(
    (d) => combined.includes(normalizeText(d.shortName)) || combined.includes(normalizeText(d.name))
  );
  if (matched) return matched.id;

  return fallbackDeptId || departments[0]?.id || 'coord-atencion-ciudadana';
};
