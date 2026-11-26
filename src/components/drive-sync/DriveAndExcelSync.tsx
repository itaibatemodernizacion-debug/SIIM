import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  useMunicipalData,
  SectorImportSummary,
  BatchSectorImportSummary,
  SectorWorkbookBatchItem
} from '../../context/MunicipalDataContext';
import { useAuth } from '../../context/AuthContext';
import {
  FileSpreadsheet,
  Upload,
  Cloud,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Download,
  Check,
  Clock,
  ShieldCheck,
  FolderOpen,
  Folder,
  Search,
  Link2,
  ChevronRight,
  LogOut,
  Users,
  Trophy,
  Palette,
  Shield,
  BookmarkCheck,
  FileText,
  Sparkles,
  ExternalLink,
  Pin,
  Trash2,
  FolderSync,
  CheckCheck,
  Info,
  ChefHat
} from 'lucide-react';
import {
  parseSectorWorkbook,
  parseUploadedSectorFile,
  ParsedWorkbookResult
} from '../../lib/excelUtils';
import {
  getTemplateConfigForDepartment,
  downloadDepartmentTemplate,
  downloadTemplateFromConfig,
  SECTOR_TEMPLATE_CATALOG,
  SectorImportTarget,
  inferDepartmentForDriveFile
} from '../../lib/sectorTemplates';
import {
  DriveFileItem,
  listDriveSpreadsheetsAndFolders,
  listAllSpreadsheetsInFolderRecursive,
  getDriveFileMetadata,
  downloadDriveSpreadsheetBuffer,
  extractDriveFileId,
  isFolder,
  isGoogleSheet
} from '../../lib/googleDriveService';
import { syncStateToFirestore, loadStateFromFirestore } from '../../lib/firestoreSync';
import { EmptyDatabaseModal } from '../common/EmptyDatabaseModal';

interface PreviewState {
  fileName: string;
  sourceType: 'GOOGLE_DRIVE' | 'GOOGLE_SHEETS' | 'EXCEL_LOCAL';
  data: ParsedWorkbookResult;
}

interface LinkedDriveFolderConfig {
  folderId: string;
  folderName: string;
  folderUrl?: string;
  linkedByEmail?: string;
  autoSyncOnConnect: boolean;
  lastSyncedAt?: string;
  syncedFilesMap: Record<string, string>; // fileId -> modifiedTime
}

interface FolderSyncReport {
  timestamp: string;
  folderName: string;
  totalFound: number;
  skippedUnchanged: number;
  emptyOrUnrecognized: string[];
  summary: BatchSectorImportSummary;
  fileFolderPaths: Record<string, string>;
}

const LINKED_FOLDER_STORAGE_KEY = 'ita_ibate_linked_drive_folder';

const TARGET_LABELS: Record<SectorImportTarget, string> = {
  SPORTS: 'Deportes y Recreación',
  CULTURE: 'Cultura y Educación',
  RRHH: 'Recursos Humanos',
  CONTROL_URBANO_CARNETS: 'Control Urbano · Carnets',
  CONTROL_URBANO_MULTAS: 'Control Urbano · Multas',
  CONTROL_URBANO_HABILITACIONES: 'Control Urbano · Habilitaciones',
  CONTROL_URBANO_OPERATIVOS: 'Control Urbano · Operativos Viales',
  NECROLOGICAL: 'Registro Necrológico',
  ESCUELA_EMPRESA: 'Escuela Empresa (Panadería y Pastelería)',
  TICKETS: 'Atención / Trámites del Área'
};

const loadStoredLinkedFolder = (): LinkedDriveFolderConfig | null => {
  try {
    const raw = localStorage.getItem(LINKED_FOLDER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.folderId === 'string' && parsed.folderId.trim()) {
      return {
        folderId: parsed.folderId,
        folderName: parsed.folderName || 'Carpeta Oficial Municipal',
        folderUrl: parsed.folderUrl,
        linkedByEmail: parsed.linkedByEmail,
        autoSyncOnConnect: parsed.autoSyncOnConnect !== false,
        lastSyncedAt: parsed.lastSyncedAt,
        syncedFilesMap: parsed.syncedFilesMap && typeof parsed.syncedFilesMap === 'object' ? parsed.syncedFilesMap : {}
      };
    }
  } catch {
    // ignore storage errors
  }
  return null;
};

export const DriveAndExcelSync: React.FC = () => {
  const { departments, syncLogs, importSectorWorkbook, importMultipleSectorWorkbooks } = useMunicipalData();
  const { googleToken, googleEmail, connectGoogleDrive, disconnectGoogleDrive, clearGoogleToken } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedDeptId, setSelectedDeptId] = useState(
    departments.find(d => d.id === 'punto-digital')?.id ||
      departments.find(d => d.id === 'dir-deportes')?.id ||
      departments[0]?.id ||
      ''
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [parsedPreview, setParsedPreview] = useState<PreviewState | null>(null);
  const [importSummary, setImportSummary] = useState<SectorImportSummary | null>(null);

  // Linked Official Google Drive Folder state (persisted in localStorage + Firestore)
  const [linkedFolder, setLinkedFolder] = useState<LinkedDriveFolderConfig | null>(() => loadStoredLinkedFolder());
  const [isEditingLinkedFolder, setIsEditingLinkedFolder] = useState(false);
  const [folderLinkInput, setFolderLinkInput] = useState('');
  const [isLinkingFolder, setIsLinkingFolder] = useState(false);
  const [isSyncingFolder, setIsSyncingFolder] = useState(false);
  const [syncProgressText, setSyncProgressText] = useState<string | null>(null);
  const [folderSyncReport, setFolderSyncReport] = useState<FolderSyncReport | null>(null);
  const [showEmptyDbModal, setShowEmptyDbModal] = useState(false);

  // Google Drive Explorer State
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  const [driveFiles, setDriveFiles] = useState<DriveFileItem[]>([]);
  const [folderStack, setFolderStack] = useState<{ id: string; name: string }[]>([
    { id: 'ROOT', name: 'Mi Unidad (Google Drive)' }
  ]);
  const [driveSearch, setDriveSearch] = useState('');
  const [sheetsUrl, setSheetsUrl] = useState('');
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null);

  const selectedDept = departments.find(d => d.id === selectedDeptId) || departments[0];
  const selectedTemplate = selectedDept
    ? getTemplateConfigForDepartment(selectedDept)
    : SECTOR_TEMPLATE_CATALOG[0];

  const currentFolder = folderStack[folderStack.length - 1];

  const persistLinkedFolder = useCallback((cfg: LinkedDriveFolderConfig | null) => {
    setLinkedFolder(cfg);
    try {
      if (cfg) {
        localStorage.setItem(LINKED_FOLDER_STORAGE_KEY, JSON.stringify(cfg));
      } else {
        localStorage.removeItem(LINKED_FOLDER_STORAGE_KEY);
      }
    } catch {
      // ignore storage quota errors
    }
    syncStateToFirestore({ linkedDriveFolder: cfg }).catch(() => {
      // non-blocking cloud backup
    });
  }, []);

  // Hydrate linked Drive folder config from Firestore if available
  useEffect(() => {
    let active = true;
    loadStateFromFirestore()
      .then(cloud => {
        if (!active || !cloud?.linkedDriveFolder) return;
        const remote = cloud.linkedDriveFolder as LinkedDriveFolderConfig;
        if (!remote.folderId) return;
        setLinkedFolder(prev => {
          if (!prev) {
            try {
              localStorage.setItem(LINKED_FOLDER_STORAGE_KEY, JSON.stringify(remote));
            } catch {
              // ignore
            }
            return remote;
          }
          if (remote.lastSyncedAt && (!prev.lastSyncedAt || remote.lastSyncedAt > prev.lastSyncedAt)) {
            try {
              localStorage.setItem(LINKED_FOLDER_STORAGE_KEY, JSON.stringify(remote));
            } catch {
              // ignore
            }
            return remote;
          }
          return prev;
        });
      })
      .catch(() => {
        // local persistence remains active
      });
    return () => {
      active = false;
    };
  }, []);

  const loadDriveFiles = useCallback(
    async (tokenOverride?: string, folderIdOverride?: string, searchOverride?: string) => {
      const token = tokenOverride || googleToken;
      if (!token) return;

      setIsLoadingDrive(true);
      setStatusError(null);
      try {
        const files = await listDriveSpreadsheetsAndFolders(token, {
          folderId: searchOverride?.trim() ? undefined : (folderIdOverride ?? currentFolder.id),
          searchText: searchOverride !== undefined ? searchOverride : driveSearch
        });
        setDriveFiles(files);
      } catch (err: any) {
        if (err.message?.includes('AUTH_EXPIRED')) {
          clearGoogleToken();
        }
        setStatusError(err.message || 'No se pudieron listar los archivos de Google Drive.');
      } finally {
        setIsLoadingDrive(false);
      }
    },
    [googleToken, currentFolder.id, driveSearch, clearGoogleToken]
  );

  useEffect(() => {
    if (googleToken) {
      loadDriveFiles(googleToken, currentFolder.id, driveSearch);
    } else {
      setDriveFiles([]);
    }
  }, [googleToken, currentFolder.id]);

  // Core 1-click recursive synchronization of the Linked Official Drive Folder
  const handleSyncLinkedFolder = useCallback(
    async (forceAll = false, tokenOverride?: string, folderOverride?: LinkedDriveFolderConfig | null) => {
      const token = tokenOverride || googleToken;
      const targetFolder = folderOverride || linkedFolder;

      if (!token) {
        setStatusError('Primero conecte su cuenta de Google Drive para sincronizar la carpeta oficial.');
        return;
      }
      if (!targetFolder) {
        setStatusError('Todavía no hay una carpeta oficial de Google Drive vinculada.');
        return;
      }

      setIsSyncingFolder(true);
      setStatusError(null);
      setStatusNotice(null);
      setImportSummary(null);
      setFolderSyncReport(null);
      setSyncProgressText(`Escaneando carpeta "${targetFolder.folderName}" y sus subcarpetas...`);

      try {
        const allFound = await listAllSpreadsheetsInFolderRecursive(
          token,
          targetFolder.folderId,
          targetFolder.folderName,
          2
        );

        if (allFound.length === 0) {
          setStatusNotice(
            `La carpeta "${targetFolder.folderName}" está conectada correctamente, pero aún no contiene archivos Excel (.xlsx, .xls, .csv) ni Hojas de Google.`
          );
          const updatedCfg: LinkedDriveFolderConfig = {
            ...targetFolder,
            lastSyncedAt: new Date().toISOString()
          };
          persistLinkedFolder(updatedCfg);
          return;
        }

        const previousMap = targetFolder.syncedFilesMap || {};
        const filesToProcess = forceAll
          ? allFound
          : allFound.filter(entry => previousMap[entry.file.id] !== (entry.file.modifiedTime || 'static'));

        const skippedUnchanged = allFound.length - filesToProcess.length;

        if (filesToProcess.length === 0) {
          setStatusNotice(
            `Todos los ${allFound.length} archivo(s) de "${targetFolder.folderName}" ya están sincronizados y sin cambios nuevos. Use "Re-sincronizar Todo" si desea volver a procesarlos.`
          );
          const updatedCfg: LinkedDriveFolderConfig = {
            ...targetFolder,
            lastSyncedAt: new Date().toISOString()
          };
          persistLinkedFolder(updatedCfg);
          return;
        }

        const batchItems: SectorWorkbookBatchItem[] = [];
        const emptyOrUnrecognized: string[] = [];
        const fileFolderPaths: Record<string, string> = {};
        const nextSyncedMap: Record<string, string> = { ...previousMap };

        for (let i = 0; i < filesToProcess.length; i++) {
          const entry = filesToProcess[i];
          setSyncProgressText(
            `Leyendo archivo ${i + 1} de ${filesToProcess.length}: ${entry.file.name}...`
          );

          const buffer = await downloadDriveSpreadsheetBuffer(token, entry.file);
          const parsed = parseSectorWorkbook(buffer, entry.file.name);

          if (parsed.totalDetected === 0) {
            emptyOrUnrecognized.push(`${entry.file.name} (${entry.folderPath})`);
            nextSyncedMap[entry.file.id] = entry.file.modifiedTime || 'static';
            continue;
          }

          const inferredDeptId = inferDepartmentForDriveFile(
            entry.file.name,
            entry.folderPath,
            parsed.inferredDepartmentId,
            departments,
            selectedDeptId
          );

          batchItems.push({
            parsed,
            targetDepartmentId: inferredDeptId,
            sourceName: entry.file.name,
            sourceType: isGoogleSheet(entry.file.mimeType) ? 'GOOGLE_SHEETS' : 'GOOGLE_DRIVE'
          });
          fileFolderPaths[entry.file.name] = entry.folderPath;
          nextSyncedMap[entry.file.id] = entry.file.modifiedTime || 'static';
        }

        const nowIso = new Date().toISOString();
        const updatedCfg: LinkedDriveFolderConfig = {
          ...targetFolder,
          lastSyncedAt: nowIso,
          syncedFilesMap: nextSyncedMap
        };
        persistLinkedFolder(updatedCfg);

        if (batchItems.length === 0) {
          setStatusNotice(
            `Se revisaron ${filesToProcess.length} archivo(s) nuevos/modificados en "${targetFolder.folderName}", pero ninguno tenía filas válidas con las columnas del modelo oficial.`
          );
          return;
        }

        setSyncProgressText(`Incorporando ${batchItems.length} planilla(s) a la base de datos municipal...`);
        const summary = importMultipleSectorWorkbooks(batchItems);

        setFolderSyncReport({
          timestamp: nowIso,
          folderName: targetFolder.folderName,
          totalFound: allFound.length,
          skippedUnchanged,
          emptyOrUnrecognized,
          summary,
          fileFolderPaths
        });
      } catch (err: any) {
        if (err.message?.includes('AUTH_EXPIRED')) {
          clearGoogleToken();
        }
        setStatusError(err.message || 'Ocurrió un error al sincronizar la carpeta oficial de Google Drive.');
      } finally {
        setIsSyncingFolder(false);
        setSyncProgressText(null);
      }
    },
    [googleToken, linkedFolder, departments, selectedDeptId, importMultipleSectorWorkbooks, persistLinkedFolder, clearGoogleToken]
  );

  const handleConnectGoogle = async () => {
    setIsConnectingGoogle(true);
    setStatusError(null);
    setStatusNotice(null);
    const res = await connectGoogleDrive();
    setIsConnectingGoogle(false);
    if (!res.success) {
      setStatusError(res.error || 'No se pudo autorizar el acceso a Google Drive.');
    } else if (res.token) {
      if (linkedFolder) {
        setFolderStack([
          { id: 'ROOT', name: 'Mi Unidad (Google Drive)' },
          { id: linkedFolder.folderId, name: linkedFolder.folderName }
        ]);
        await loadDriveFiles(res.token, linkedFolder.folderId, '');
        if (linkedFolder.autoSyncOnConnect) {
          await handleSyncLinkedFolder(false, res.token, linkedFolder);
        }
      } else {
        await loadDriveFiles(res.token, 'ROOT', '');
      }
    }
  };

  const handleLinkFolderByUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderLinkInput.trim()) return;
    if (!googleToken) {
      setStatusError('Primero conecte su cuenta de Google Drive para poder verificar y vincular la carpeta.');
      return;
    }

    const folderId = extractDriveFileId(folderLinkInput);
    if (!folderId) {
      setStatusError('Pegue el enlace completo de una carpeta de Google Drive (ej. https://drive.google.com/drive/folders/...) o su ID.');
      return;
    }

    setIsLinkingFolder(true);
    setStatusError(null);
    setStatusNotice(null);
    try {
      const meta = await getDriveFileMetadata(googleToken, folderId);
      if (!isFolder(meta.mimeType)) {
        setStatusError(
          `El enlace ingresado corresponde al archivo "${meta.name}", no a una carpeta. Para archivos individuales use "Leer Enlace" en el explorador; aquí pegue el enlace de la carpeta.`
        );
        return;
      }

      const newCfg: LinkedDriveFolderConfig = {
        folderId: meta.id,
        folderName: meta.name,
        folderUrl: meta.webViewLink || `https://drive.google.com/drive/folders/${meta.id}`,
        linkedByEmail: googleEmail || undefined,
        autoSyncOnConnect: linkedFolder?.autoSyncOnConnect ?? true,
        syncedFilesMap: linkedFolder?.folderId === meta.id ? linkedFolder.syncedFilesMap : {}
      };

      persistLinkedFolder(newCfg);
      setFolderLinkInput('');
      setIsEditingLinkedFolder(false);
      setFolderStack([
        { id: 'ROOT', name: 'Mi Unidad (Google Drive)' },
        { id: meta.id, name: meta.name }
      ]);
      setStatusNotice(`Carpeta oficial "${meta.name}" vinculada correctamente. Ya puede sincronizar todas sus planillas con 1 clic.`);
    } catch (err: any) {
      if (err.message?.includes('AUTH_EXPIRED')) {
        clearGoogleToken();
      }
      setStatusError(err.message || 'No se pudo acceder a la carpeta de Google Drive. Verifique que su cuenta tenga permiso de lectura.');
    } finally {
      setIsLinkingFolder(false);
    }
  };

  const handlePinFolderAsOfficial = (folder: { id: string; name: string; webViewLink?: string }) => {
    const newCfg: LinkedDriveFolderConfig = {
      folderId: folder.id,
      folderName: folder.name,
      folderUrl: folder.webViewLink || `https://drive.google.com/drive/folders/${folder.id}`,
      linkedByEmail: googleEmail || undefined,
      autoSyncOnConnect: linkedFolder?.autoSyncOnConnect ?? true,
      syncedFilesMap: linkedFolder?.folderId === folder.id ? linkedFolder.syncedFilesMap : {}
    };
    persistLinkedFolder(newCfg);
    setIsEditingLinkedFolder(false);
    setStatusError(null);
    setStatusNotice(`La carpeta "${folder.name}" quedó fijada como Ubicación Oficial de Google Drive.`);
  };

  const handleToggleAutoSync = () => {
    if (!linkedFolder) return;
    persistLinkedFolder({
      ...linkedFolder,
      autoSyncOnConnect: !linkedFolder.autoSyncOnConnect
    });
  };

  const handleUnlinkFolder = () => {
    persistLinkedFolder(null);
    setFolderSyncReport(null);
    setIsEditingLinkedFolder(false);
    setStatusNotice('Se desvinculó la carpeta oficial de Google Drive. Puede elegir o enlazar otra cuando desee.');
  };

  const handleOpenFolder = (folder: DriveFileItem) => {
    setDriveSearch('');
    setFolderStack(prev => [...prev, { id: folder.id, name: folder.name }]);
  };

  const handleBreadcrumbClick = (index: number) => {
    setDriveSearch('');
    setFolderStack(prev => prev.slice(0, index + 1));
  };

  const handleReadDriveFile = async (file: DriveFileItem) => {
    if (!googleToken) {
      setStatusError('Primero conecte su cuenta de Google Drive.');
      return;
    }

    setLoadingFileId(file.id);
    setStatusError(null);
    setStatusNotice(null);
    setImportSummary(null);
    try {
      const buffer = await downloadDriveSpreadsheetBuffer(googleToken, file);
      const parsed = parseSectorWorkbook(buffer, file.name, selectedDeptId);
      if (parsed.totalDetected === 0) {
        setStatusError(
          `El archivo "${file.name}" no contiene filas de datos válidas o no coincide con las columnas del modelo oficial.`
        );
      } else {
        const autoDept = inferDepartmentForDriveFile(
          file.name,
          currentFolder.name,
          parsed.inferredDepartmentId,
          departments,
          selectedDeptId
        );
        if (autoDept) setSelectedDeptId(autoDept);
        setParsedPreview({
          fileName: file.name,
          sourceType: isGoogleSheet(file.mimeType) ? 'GOOGLE_SHEETS' : 'GOOGLE_DRIVE',
          data: parsed
        });
      }
    } catch (err: any) {
      if (err.message?.includes('AUTH_EXPIRED')) {
        clearGoogleToken();
      }
      setStatusError(err.message || `Error al leer "${file.name}" desde Google Drive.`);
    } finally {
      setLoadingFileId(null);
    }
  };

  const handleLoadByUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetsUrl.trim()) return;
    if (!googleToken) {
      setStatusError('Conéctese primero con Google Drive para poder leer el enlace compartido.');
      return;
    }

    const fileId = extractDriveFileId(sheetsUrl);
    if (!fileId) {
      setStatusError('El enlace o ID ingresado no corresponde a un archivo válido de Google Drive / Sheets.');
      return;
    }

    setIsProcessing(true);
    setStatusError(null);
    setImportSummary(null);
    try {
      const meta = await getDriveFileMetadata(googleToken, fileId);
      if (isFolder(meta.mimeType)) {
        setFolderStack([
          { id: 'ROOT', name: 'Mi Unidad (Google Drive)' },
          { id: meta.id, name: meta.name }
        ]);
        setSheetsUrl('');
      } else {
        await handleReadDriveFile(meta);
        setSheetsUrl('');
      }
    } catch (err: any) {
      if (err.message?.includes('AUTH_EXPIRED')) {
        clearGoogleToken();
      }
      setStatusError(err.message || 'No se pudo acceder al archivo desde el enlace proporcionado.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Local Excel upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setStatusError(null);
    setStatusNotice(null);
    setImportSummary(null);

    try {
      const parsed = await parseUploadedSectorFile(file, selectedDeptId);
      if (parsed.totalDetected === 0) {
        setStatusError(
          `No se detectaron registros importables en "${file.name}". Verifique que utilizó el modelo Excel del área correspondiente.`
        );
      } else {
        const autoDept = inferDepartmentForDriveFile(
          file.name,
          '',
          parsed.inferredDepartmentId,
          departments,
          selectedDeptId
        );
        if (autoDept) setSelectedDeptId(autoDept);
        setParsedPreview({
          fileName: file.name,
          sourceType: 'EXCEL_LOCAL',
          data: parsed
        });
      }
    } catch (err: any) {
      setStatusError(`Error al procesar el archivo: ${err.message}`);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = () => {
    if (!parsedPreview || parsedPreview.data.totalDetected === 0) return;
    const summary = importSectorWorkbook(
      parsedPreview.data,
      selectedDeptId,
      parsedPreview.fileName,
      parsedPreview.sourceType
    );
    setImportSummary(summary);
    setParsedPreview(null);
  };

  const minorSportsCount = parsedPreview?.data.sportRows.filter(r => r.isMinor).length || 0;
  const minorCultureCount = parsedPreview?.data.cultureRows.filter(r => r.isMinor).length || 0;
  const trackedFilesCount = linkedFolder ? Object.keys(linkedFolder.syncedFilesMap || {}).length : 0;

  const formatDateTime = (iso?: string) => {
    if (!iso) return 'Aún no sincronizada';
    try {
      return new Date(iso).toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return iso.substring(0, 16).replace('T', ' ');
    }
  };

  const getDeptShortName = (deptId: string) =>
    departments.find(d => d.id === deptId)?.shortName || deptId;

  const renderGoogleSignInButton = (label?: string) => (
    <button
      type="button"
      onClick={handleConnectGoogle}
      disabled={isConnectingGoogle}
      className="inline-flex items-center gap-3 px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-800 font-semibold text-sm rounded-full shadow-lg border border-slate-300 transition cursor-pointer disabled:opacity-60"
    >
      <svg
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 48 48"
        className="w-5 h-5 block shrink-0"
      >
        <path
          fill="#EA4335"
          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
        />
        <path
          fill="#4285F4"
          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
        />
        <path
          fill="#FBBC05"
          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
        />
        <path
          fill="#34A853"
          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
        />
      </svg>
      <span>
        {isConnectingGoogle
          ? 'Conectando...'
          : label || 'Sign in with Google · Conectar Drive'}
      </span>
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Ubicación Oficial en Google Drive y Modelos Excel por Área
            </h2>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
              Sincronización Automática de Carpeta
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Enlace una carpeta fija en su Google Drive para que cada Secretaría o Dirección solo suba sus planillas Excel y el sistema tome, clasifique y actualice todos los datos automáticamente.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setShowEmptyDbModal(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-rose-950/70 hover:bg-rose-600 text-rose-200 hover:text-white border border-rose-500/40 rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
            title="Vacía todos los datos de prueba para iniciar a cargar desde Google Drive (conserva autoridades y organigrama)"
          >
            <Trash2 className="w-4 h-4" />
            <span>Vaciar Base de Datos</span>
          </button>

          <button
            onClick={() => selectedDept && downloadDepartmentTemplate(selectedDept)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Descargar Modelo: {selectedDept?.shortName}</span>
          </button>
        </div>
      </div>

      <EmptyDatabaseModal
        isOpen={showEmptyDbModal}
        onClose={() => setShowEmptyDbModal(false)}
        onCleared={() => {
          setParsedPreview(null);
          setImportSummary(null);
          setFolderSyncReport(null);
          if (linkedFolder) {
            setLinkedFolder({ ...linkedFolder, syncedFilesMap: {}, lastSyncedAt: undefined });
          }
          setStatusNotice('Base de datos vaciada por completo. Ya puede conectar Google Drive y sincronizar sus planillas reales.');
        }}
      />

      {/* SECTION 0 (PRIMARY): Linked Official Google Drive Folder */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/30 border border-sky-500/30 rounded-2xl p-5 shadow-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center shrink-0">
              <FolderSync className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-white text-sm">
                  Carpeta Oficial de Google Drive (Toma Automática de Planillas)
                </h3>
                {linkedFolder ? (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Carpeta Enlazada
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-full">
                    Sin Carpeta Fija Aún
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {googleToken
                  ? `Sesión activa: ${googleEmail || 'Cuenta Google Autorizada'}`
                  : 'Conecte la cuenta de Google Drive municipal (ej. itaibatemodernizacion@gmail.com) para leer automáticamente todos los Excel de la carpeta elegida.'}
              </p>
            </div>
          </div>

          {googleToken && (
            <button
              onClick={disconnectGoogleDrive}
              className="px-3 py-1.5 bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer self-start md:self-auto"
              title="Desconectar cuenta de Google Drive"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Desconectar Google</span>
            </button>
          )}
        </div>

        {/* Case A: Not connected to Google yet */}
        {!googleToken ? (
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-4">
            {linkedFolder ? (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs text-slate-400">Ubicación oficial guardada en el sistema:</div>
                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{linkedFolder.folderName}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex flex-wrap gap-3">
                    <span>Última sincronización: <strong className="text-slate-200">{formatDateTime(linkedFolder.lastSyncedAt)}</strong></span>
                    <span>•</span>
                    <span>Archivos seguidos: <strong className="text-slate-200">{trackedFilesCount}</strong></span>
                  </div>
                  {linkedFolder.autoSyncOnConnect && (
                    <div className="text-[11px] text-emerald-400 pt-0.5">
                      Al conectar con Google, los archivos nuevos o modificados de esta carpeta se sincronizarán automáticamente.
                    </div>
                  )}
                </div>
                <div className="shrink-0">
                  {renderGoogleSignInButton('Sign in with Google · Conectar y Sincronizar')}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                <div className="lg:col-span-7 space-y-2">
                  <h4 className="text-xs font-bold text-sky-300 uppercase tracking-wider">
                    Cómo funciona en 3 pasos simples
                  </h4>
                  <ol className="space-y-1.5 text-xs text-slate-300 list-decimal list-inside">
                    <li>
                      En su Google Drive (<span className="font-mono text-sky-300">itaibatemodernizacion@gmail.com</span>), cree una carpeta (ej. <strong>Planillas_Ita_Ibate</strong>) y compártala con los encargados de cada área.
                    </li>
                    <li>
                      Haga clic en <strong>Conectar Drive</strong> y pegue el enlace de esa carpeta (o fíjela con un clic desde el explorador de abajo) una sola vez.
                    </li>
                    <li>
                      Cuando las áreas suban sus archivos Excel (sueltos o en subcarpetas por Secretaría), presione <strong>Sincronizar Toda la Carpeta</strong> y el sistema importará todo automáticamente sin duplicados.
                    </li>
                  </ol>
                </div>
                <div className="lg:col-span-5 flex flex-col items-center lg:items-end justify-center gap-2">
                  {renderGoogleSignInButton('Sign in with Google · Conectar Drive')}
                  <span className="text-[11px] text-slate-500">
                    Acceso seguro de solo lectura (no modifica ni borra sus archivos)
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : !linkedFolder || isEditingLinkedFolder ? (
          /* Case B: Connected to Google, linking or changing the official folder */
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-bold text-white">
                {linkedFolder ? 'Cambiar Ubicación Oficial de Google Drive' : 'Enlazar Carpeta Oficial de Google Drive (Una sola vez)'}
              </div>
              {isEditingLinkedFolder && (
                <button
                  type="button"
                  onClick={() => setIsEditingLinkedFolder(false)}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
              )}
            </div>

            <form onSubmit={handleLinkFolderByUrl} className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Link2 className="w-4 h-4 text-sky-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={folderLinkInput}
                  onChange={(e) => setFolderLinkInput(e.target.value)}
                  placeholder="Pegar enlace de la carpeta de Google Drive (ej. https://drive.google.com/drive/folders/...)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <button
                type="submit"
                disabled={isLinkingFolder || !folderLinkInput.trim()}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0"
              >
                {isLinkingFolder ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Pin className="w-3.5 h-3.5" />
                )}
                <span>{isLinkingFolder ? 'Verificando...' : 'Vincular Carpeta Oficial'}</span>
              </button>
            </form>

            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>
                <strong>Opción aún más rápida:</strong> En el Explorador de Google Drive más abajo, busque su carpeta y presione el botón <strong className="text-amber-300">«Fijar Oficial»</strong>.
              </span>
            </div>
          </div>
        ) : (
          /* Case C: Connected AND Official Folder is Linked */
          <div className="bg-slate-950/80 border border-emerald-500/25 rounded-xl p-4 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Folder className="w-5 h-5 text-amber-400 shrink-0" />
                  <span className="text-sm font-bold text-white truncate">{linkedFolder.folderName}</span>
                  <a
                    href={linkedFolder.folderUrl || `https://drive.google.com/drive/folders/${linkedFolder.folderId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 font-semibold"
                  >
                    <span>Abrir en Drive</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
                  <span>
                    Última sincronización: <strong className="text-slate-200">{formatDateTime(linkedFolder.lastSyncedAt)}</strong>
                  </span>
                  <span>
                    Planillas monitoreadas: <strong className="text-slate-200">{trackedFilesCount}</strong>
                  </span>
                  <span>
                    Escaneo: <strong className="text-emerald-300">Carpeta + Subcarpetas por Área</strong>
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleSyncLinkedFolder(false)}
                  disabled={isSyncingFolder}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950/50 transition cursor-pointer disabled:opacity-60 flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncingFolder ? 'animate-spin' : ''}`} />
                  <span>{isSyncingFolder ? 'Sincronizando...' : 'Sincronizar Toda la Carpeta Ahora'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSyncLinkedFolder(true)}
                  disabled={isSyncingFolder}
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  title="Vuelve a leer todos los archivos Excel de la carpeta aunque no hayan cambiado"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-sky-400" />
                  <span>Re-sincronizar Todo</span>
                </button>
              </div>
            </div>

            {/* Secondary Controls Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs">
              <label className="inline-flex items-center gap-2 text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={linkedFolder.autoSyncOnConnect}
                  onChange={handleToggleAutoSync}
                  className="rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                />
                <span>Sincronizar automáticamente los archivos nuevos/modificados al conectar Google Drive</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFolderStack([
                      { id: 'ROOT', name: 'Mi Unidad (Google Drive)' },
                      { id: linkedFolder.folderId, name: linkedFolder.folderName }
                    ]);
                  }}
                  className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 text-sky-300 rounded-lg text-[11px] font-semibold cursor-pointer"
                >
                  Ver Archivos
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingLinkedFolder(true)}
                  className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-semibold cursor-pointer"
                >
                  Cambiar Carpeta
                </button>
                <button
                  type="button"
                  onClick={handleUnlinkFolder}
                  className="px-2.5 py-1 bg-slate-800/80 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 rounded-lg text-[11px] font-semibold cursor-pointer flex items-center gap-1"
                  title="Desvincular carpeta oficial"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Desvincular</span>
                </button>
              </div>
            </div>

            {/* Live Sync Progress */}
            {isSyncingFolder && syncProgressText && (
              <div className="bg-sky-950/50 border border-sky-500/30 rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 text-xs text-sky-200">
                <RefreshCw className="w-4 h-4 animate-spin text-sky-400 shrink-0" />
                <span className="font-medium">{syncProgressText}</span>
              </div>
            )}
          </div>
        )}

        {/* Per-File Folder Sync Report */}
        {folderSyncReport && (
          <div className="bg-emerald-950/50 border border-emerald-500/40 rounded-xl p-4 space-y-3 text-xs">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-emerald-300 text-sm">
                    Sincronización Completada: {folderSyncReport.folderName}
                  </h4>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-emerald-100/90">
                    <span>Archivos encontrados: <strong className="text-white">{folderSyncReport.totalFound}</strong></span>
                    <span>Procesados ahora: <strong className="text-white">{folderSyncReport.summary.perFile.length}</strong></span>
                    {folderSyncReport.skippedUnchanged > 0 && (
                      <span>Sin cambios (omitidos): <strong className="text-slate-300">{folderSyncReport.skippedUnchanged}</strong></span>
                    )}
                    <span>Nuevos registros: <strong className="text-emerald-300">+{folderSyncReport.summary.added}</strong></span>
                    <span>Actualizados: <strong className="text-sky-300">{folderSyncReport.summary.updated}</strong></span>
                    <span>Duplicados evitados: <strong className="text-slate-300">{folderSyncReport.summary.duplicates}</strong></span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFolderSyncReport(null)}
                className="text-emerald-400 hover:text-white font-semibold cursor-pointer"
              >
                Cerrar
              </button>
            </div>

            {Object.keys(folderSyncReport.summary.breakdown).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(folderSyncReport.summary.breakdown).map(([moduleName, count]) => (
                  <span
                    key={moduleName}
                    className="px-2 py-0.5 rounded bg-emerald-900/70 border border-emerald-500/30 text-[11px] text-emerald-200 font-semibold"
                  >
                    {moduleName}: +{count}
                  </span>
                ))}
              </div>
            )}

            <div className="overflow-x-auto border border-emerald-500/20 rounded-xl bg-slate-950/70">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="py-2 px-3">Planilla Excel / Sheet</th>
                    <th className="py-2 px-3">Ubicación</th>
                    <th className="py-2 px-3">Área Asignada Automáticamente</th>
                    <th className="py-2 px-3 text-center">Nuevos</th>
                    <th className="py-2 px-3 text-center">Act.</th>
                    <th className="py-2 px-3 text-center">Dup.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {folderSyncReport.summary.perFile.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/60">
                      <td className="py-2 px-3 font-semibold text-slate-100">{item.sourceName}</td>
                      <td className="py-2 px-3 text-slate-400 text-[11px]">
                        {folderSyncReport.fileFolderPaths[item.sourceName] || folderSyncReport.folderName}
                      </td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 text-[10px] font-bold">
                          {getDeptShortName(item.departmentId)}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-emerald-400">+{item.added}</td>
                      <td className="py-2 px-3 text-center text-sky-300">{item.updated}</td>
                      <td className="py-2 px-3 text-center text-slate-400">{item.duplicates}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {folderSyncReport.emptyOrUnrecognized.length > 0 && (
              <div className="text-[11px] text-amber-300 bg-amber-950/40 border border-amber-500/30 rounded-lg px-3 py-2">
                <strong>Archivos omitidos por no coincidir con columnas del modelo oficial:</strong>{' '}
                {folderSyncReport.emptyOrUnrecognized.join(', ')}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Global Error / Notice Banners */}
      {statusError && (
        <div className="bg-rose-950/60 border border-rose-500/40 rounded-2xl p-4 text-xs text-rose-200 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-rose-300 text-sm">Aviso de Conexión o Lectura</h4>
              <p className="mt-0.5 text-rose-200/90">{statusError}</p>
            </div>
          </div>
          <button
            onClick={() => setStatusError(null)}
            className="text-rose-300 hover:text-white font-semibold cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {statusNotice && (
        <div className="bg-sky-950/50 border border-sky-500/40 rounded-2xl p-4 text-xs text-sky-200 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
            <p className="mt-0.5 text-sky-100">{statusNotice}</p>
          </div>
          <button
            onClick={() => setStatusNotice(null)}
            className="text-sky-300 hover:text-white font-semibold cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* SECTION 1: Sector-specific Excel Model Downloads */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              1. Modelos Descargables Específicos por Secretaría y Dirección
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Cada sector descarga su planilla oficial, la completa y la sube a la carpeta compartida de Google Drive.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400 font-medium whitespace-nowrap">Elegir Área:</label>
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 max-w-xs"
            >
              {departments.map(d => (
                <option key={d.id} value={d.id}>
                  {d.category === 'SECRETARIA' ? '🏛️ ' : d.category === 'DIRECCION_GENERAL' ? '📁 ' : '📌 '}
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Area Model Preview Card */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-white">{selectedTemplate.title}</span>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30 rounded-full">
                {selectedTemplate.badge}
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Archivo: {selectedTemplate.fileName}
              </span>
            </div>
            <p className="text-xs text-slate-400">{selectedTemplate.subtitle}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              {selectedTemplate.requiredHighlights.map((item, i) => (
                <span
                  key={i}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1.5"
                >
                  <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                  {item}
                </span>
              ))}
            </div>
            {(selectedDept?.id === 'dir-deportes' || selectedDept?.id === 'sec-cultura') && (
              <div className="mt-2 p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/30 text-[11px] text-amber-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <span>
                  <strong>Menores de Edad:</strong> Esta planilla incluye columnas obligatorias para el{' '}
                  <strong>Tutor Responsable</strong> (Nombre Completo, DNI, Teléfono y Vínculo) cuando el inscripto es menor de 18 años.
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => downloadTemplateFromConfig(selectedTemplate)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shrink-0 shadow-lg shadow-emerald-950/40"
          >
            <Download className="w-4 h-4" />
            <span>Descargar Modelo (.xlsx)</span>
          </button>
        </div>

        {/* Quick Catalog Grid of All Specialized Templates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
          {SECTOR_TEMPLATE_CATALOG.map(tpl => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => downloadTemplateFromConfig(tpl)}
              className="text-left p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/40 transition cursor-pointer group flex flex-col justify-between gap-2"
            >
              <div>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    {tpl.badge}
                  </span>
                  <Download className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition" />
                </div>
                <div className="text-xs font-bold text-slate-200 mt-1 line-clamp-2">
                  {tpl.title}
                </div>
              </div>
              <div className="text-[10px] text-slate-500 font-mono truncate">
                {tpl.sheets.length} {tpl.sheets.length === 1 ? 'hoja de datos' : 'hojas especializadas'}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 2: Google Drive Real Explorer + Local Excel Upload */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Google Drive Explorer (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                <Cloud className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">
                  2. Explorador de Google Drive (Elegir Carpeta o Archivo Puntual)
                </h3>
                <p className="text-[11px] text-slate-400">
                  {googleToken
                    ? 'Navegue sus carpetas, fije una como Ubicación Oficial o previsualice un archivo individual.'
                    : 'Conecte su cuenta de Google arriba para explorar carpetas y archivos de Drive.'}
                </p>
              </div>
            </div>

            {googleToken && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadDriveFiles()}
                  disabled={isLoadingDrive}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDrive ? 'animate-spin' : ''}`} />
                  <span>Actualizar</span>
                </button>
              </div>
            )}
          </div>

          {!googleToken ? (
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-6 text-center space-y-4">
              <div className="max-w-md mx-auto space-y-2">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Conecte su cuenta de Google Drive para examinar carpetas, fijar la carpeta oficial municipal o revisar planillas individuales antes de importarlas.
                </p>
              </div>
              <div className="flex justify-center">
                {renderGoogleSignInButton('Sign in with Google · Conectar Drive')}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Direct URL / Link reader */}
              <form onSubmit={handleLoadByUrl} className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Link2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={sheetsUrl}
                    onChange={(e) => setSheetsUrl(e.target.value)}
                    placeholder="Pegar enlace o ID de un archivo puntual o carpeta en Google Drive..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isProcessing || !sheetsUrl.trim()}
                  className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50 shrink-0"
                >
                  Abrir Enlace
                </button>
              </form>

              {/* Search & Breadcrumbs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-800">
                <div className="flex items-center flex-wrap gap-1 text-xs">
                  {folderStack.map((f, idx) => (
                    <React.Fragment key={f.id}>
                      {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-600" />}
                      <button
                        type="button"
                        onClick={() => handleBreadcrumbClick(idx)}
                        className={`px-1.5 py-0.5 rounded hover:bg-slate-800 cursor-pointer ${
                          idx === folderStack.length - 1
                            ? 'text-sky-400 font-bold'
                            : 'text-slate-400'
                        }`}
                      >
                        {f.name}
                      </button>
                    </React.Fragment>
                  ))}

                  {currentFolder.id !== 'ROOT' && (
                    linkedFolder?.folderId === currentFolder.id ? (
                      <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold inline-flex items-center gap-1">
                        <Pin className="w-2.5 h-2.5" />
                        Ubicación Oficial
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handlePinFolderAsOfficial(currentFolder)}
                        className="ml-2 px-2 py-0.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition"
                      >
                        <Pin className="w-2.5 h-2.5" />
                        Fijar esta Carpeta como Oficial
                      </button>
                    )
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="relative">
                    <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-2" />
                    <input
                      type="text"
                      value={driveSearch}
                      onChange={(e) => setDriveSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          loadDriveFiles(undefined, currentFolder.id, driveSearch);
                        }
                      }}
                      placeholder="Buscar en Drive..."
                      className="bg-slate-900 border border-slate-700 rounded-lg pl-7 pr-2 py-1 text-[11px] text-white focus:outline-none focus:border-sky-500 w-36"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => loadDriveFiles(undefined, currentFolder.id, driveSearch)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-semibold cursor-pointer"
                  >
                    Buscar
                  </button>
                </div>
              </div>

              {/* Files List */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl divide-y divide-slate-800/70 max-h-72 overflow-y-auto">
                {isLoadingDrive ? (
                  <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                    <span>Consultando archivos en Google Drive...</span>
                  </div>
                ) : driveFiles.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No se encontraron carpetas ni planillas (.xlsx / Google Sheets) en esta ubicación.
                  </div>
                ) : (
                  driveFiles.map(file => {
                    const folder = isFolder(file.mimeType);
                    const gSheet = isGoogleSheet(file.mimeType);
                    const isReadingThis = loadingFileId === file.id;
                    const isPinnedOfficial = folder && linkedFolder?.folderId === file.id;

                    return (
                      <div
                        key={file.id}
                        className="px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-900/70 transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {folder ? (
                            <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                          ) : gSheet ? (
                            <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-sky-400 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-200 truncate flex items-center gap-1.5">
                              <span className="truncate">{file.name}</span>
                              {isPinnedOfficial && (
                                <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold shrink-0">
                                  OFICIAL
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-2">
                              <span>{folder ? 'Carpeta' : gSheet ? 'Google Sheets' : 'Archivo Excel / CSV'}</span>
                              {file.modifiedTime && (
                                <span>• Modif: {file.modifiedTime.substring(0, 10)}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-800"
                              title="Abrir en Google Drive"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}

                          {folder ? (
                            <>
                              {!isPinnedOfficial && (
                                <button
                                  type="button"
                                  onClick={() => handlePinFolderAsOfficial(file)}
                                  className="px-2.5 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-lg text-[11px] font-semibold cursor-pointer flex items-center gap-1"
                                  title="Fijar esta carpeta como Ubicación Oficial para sincronizar todos sus Excel"
                                >
                                  <Pin className="w-3 h-3" />
                                  <span>Fijar Oficial</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleOpenFolder(file)}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-semibold cursor-pointer flex items-center gap-1"
                              >
                                <FolderOpen className="w-3.5 h-3.5 text-amber-300" />
                                <span>Abrir</span>
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              disabled={isReadingThis}
                              onClick={() => handleReadDriveFile(file)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold cursor-pointer flex items-center gap-1 disabled:opacity-50"
                            >
                              {isReadingThis ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <Cloud className="w-3 h-3" />
                              )}
                              <span>{isReadingThis ? 'Leyendo...' : 'Tomar Datos'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Local File Upload & Validation Info (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Upload className="w-4 h-4 text-sky-400" />
              3. Carga Directa desde Archivo Excel Local
            </h3>
            <p className="text-xs text-slate-400">
              Si posee el archivo en su computadora (.xlsx, .xls o .csv), cárguelo aquí para analizar sus hojas e incorporarlo a <strong className="text-slate-200">{selectedDept?.shortName}</strong>.
            </p>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-sky-500 bg-slate-950/60 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2.5 group"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx, .xls, .csv"
                className="hidden"
              />
              <div className="w-11 h-11 rounded-2xl bg-sky-500/10 group-hover:bg-sky-500/20 text-sky-400 flex items-center justify-center transition">
                <Upload className="w-5 h-5" />
              </div>
              <p className="font-bold text-white text-xs">
                Seleccionar Planilla Excel (.xlsx, .xls, .csv)
              </p>
              <span className="text-[11px] px-3 py-1 rounded-full bg-slate-800 text-slate-300 font-medium border border-slate-700">
                {isProcessing ? 'Analizando hojas...' : 'Examinar Archivo'}
              </span>
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-1.5 text-[11px] text-slate-300">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
              <ShieldCheck className="w-4 h-4" />
              <span>Clasificación Automática por Área y Control de Duplicados</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Tanto al sincronizar la carpeta de Drive como al subir un archivo, el sistema identifica automáticamente si corresponde a <strong>Punto Digital</strong>, <strong>Deportes (con Tutores)</strong>, <strong>Cultura</strong>, <strong>RRHH</strong>, <strong>Control Urbano</strong>, <strong>Necrológico</strong> o cualquier Secretaría, evitando duplicar registros ya cargados.
            </p>
          </div>
        </div>
      </div>

      {/* Import Result Summary (single-file import) */}
      {importSummary && (
        <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-2xl p-4 text-xs text-emerald-200 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-emerald-300 text-sm">
                Datos Incorporados al Sistema Municipal con Éxito
              </h4>
              <div className="flex flex-wrap gap-4 text-xs">
                <span>Nuevos registros: <strong className="text-white">+{importSummary.added}</strong></span>
                <span>Actualizados: <strong className="text-white">{importSummary.updated}</strong></span>
                <span>Duplicados omitidos: <strong className="text-white">{importSummary.duplicates}</strong></span>
              </div>
              {Object.keys(importSummary.breakdown).length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {Object.entries(importSummary.breakdown).map(([moduleName, count]) => (
                    <span
                      key={moduleName}
                      className="px-2 py-0.5 rounded bg-emerald-900/70 border border-emerald-500/30 text-[11px] text-emerald-200 font-semibold"
                    >
                      {moduleName}: +{count}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setImportSummary(null)}
            className="text-emerald-400 hover:text-white text-xs font-semibold cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* SECTION 3: Multi-Sector Preview before Committing */}
      {parsedPreview && (
        <div className="bg-slate-900 border border-sky-500/40 rounded-2xl p-5 space-y-4 text-xs shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-bold text-white text-sm">
                  Vista Previa: {parsedPreview.fileName}
                </h4>
                <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-bold">
                  {parsedPreview.sourceType === 'GOOGLE_SHEETS'
                    ? 'Google Sheets'
                    : parsedPreview.sourceType === 'GOOGLE_DRIVE'
                      ? 'Google Drive'
                      : 'Excel Local'}
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-0.5">
                Se detectaron <strong className="text-white">{parsedPreview.data.totalDetected}</strong> registros listos para incorporar.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {parsedPreview.data.detectedTargets.map(t => (
                  <span
                    key={t}
                    className="px-2 py-0.5 rounded-full bg-slate-800 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold"
                  >
                    {TARGET_LABELS[t]}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {parsedPreview.data.ticketRows.length > 0 && (
                <select
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  title="Área destino para trámites generales"
                >
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>Destino: {d.shortName}</option>
                  ))}
                </select>
              )}
              <button
                onClick={() => setParsedPreview(null)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmImport}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Confirmar e Incorporar a la Base de Datos</span>
              </button>
            </div>
          </div>

          {/* Warnings (e.g., Minor missing Tutor info) */}
          {parsedPreview.data.warnings.length > 0 && (
            <div className="bg-amber-950/40 border border-amber-500/40 p-3 rounded-xl text-amber-200 text-[11px] space-y-1">
              <strong className="block text-amber-300">
                Avisos de validación ({parsedPreview.data.warnings.length}):
              </strong>
              {parsedPreview.data.warnings.slice(0, 5).map((w, idx) => (
                <div key={idx}>• {w}</div>
              ))}
            </div>
          )}

          {/* Deportes Preview (with Tutor visibility) */}
          {parsedPreview.data.sportRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h5 className="font-bold text-orange-300 flex items-center gap-1.5">
                  <Trophy className="w-4 h-4" />
                  Deportes ({parsedPreview.data.sportRows.length} inscriptos · {minorSportsCount} menores con datos de Tutor)
                </h5>
              </div>
              <div className="overflow-x-auto max-h-56 overflow-y-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950 text-slate-400 uppercase text-[10px]">
                      <th className="py-2 px-2.5">DNI</th>
                      <th className="py-2 px-2.5">Deportista</th>
                      <th className="py-2 px-2.5">Edad / Cond.</th>
                      <th className="py-2 px-2.5">Disciplina / Torneo</th>
                      <th className="py-2 px-2.5">Barrio</th>
                      <th className="py-2 px-2.5">Tutor Responsable (Menores)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {parsedPreview.data.sportRows.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-950/60">
                        <td className="py-2 px-2.5 font-mono text-slate-300">{row.dni}</td>
                        <td className="py-2 px-2.5 font-semibold text-slate-100">{row.fullName}</td>
                        <td className="py-2 px-2.5">
                          {row.isMinor ? (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                              Menor {row.age ? `(${row.age}a)` : ''}
                            </span>
                          ) : (
                            <span className="text-slate-400">{row.age ? `${row.age} años` : 'Mayor'}</span>
                          )}
                        </td>
                        <td className="py-2 px-2.5 text-slate-300">
                          <span className="font-semibold text-orange-300">{row.discipline}</span> · {row.eventName}
                        </td>
                        <td className="py-2 px-2.5 text-slate-400">{row.neighborhood}</td>
                        <td className="py-2 px-2.5">
                          {row.isMinor ? (
                            row.tutorName ? (
                              <div className="text-[11px] text-emerald-300">
                                <strong>{row.tutorName}</strong> ({row.tutorRelationship}) · DNI {row.tutorDni || '-'} · Tel {row.tutorPhone || '-'}
                              </div>
                            ) : (
                              <span className="text-rose-400 font-semibold">Falta Tutor</span>
                            )
                          ) : (
                            <span className="text-slate-500">No aplica</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Cultura Preview */}
          {parsedPreview.data.cultureRows.length > 0 && (
            <div className="space-y-2">
              <h5 className="font-bold text-pink-300 flex items-center gap-1.5">
                <Palette className="w-4 h-4" />
                Cultura y Educación ({parsedPreview.data.cultureRows.length} alumnos · {minorCultureCount} menores)
              </h5>
              <div className="overflow-x-auto max-h-48 overflow-y-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950 text-slate-400 uppercase text-[10px]">
                      <th className="py-2 px-2.5">DNI</th>
                      <th className="py-2 px-2.5">Alumno</th>
                      <th className="py-2 px-2.5">Curso</th>
                      <th className="py-2 px-2.5">Menor</th>
                      <th className="py-2 px-2.5">Tutor Responsable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {parsedPreview.data.cultureRows.slice(0, 8).map((row, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-2.5 font-mono text-slate-300">{row.dni}</td>
                        <td className="py-2 px-2.5 font-semibold text-white">{row.fullName}</td>
                        <td className="py-2 px-2.5 text-pink-300 font-bold">{row.course} ({row.shift})</td>
                        <td className="py-2 px-2.5">{row.isMinor ? 'SÍ' : 'NO'}</td>
                        <td className="py-2 px-2.5 text-slate-300">
                          {row.isMinor ? `${row.tutorName || 'Falta'} · ${row.tutorPhone || ''}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Escuela Empresa Preview */}
          {parsedPreview.data.escuelaEmpresaRows.length > 0 && (
            <div className="space-y-2">
              <h5 className="font-bold text-amber-300 flex items-center gap-1.5">
                <ChefHat className="w-4 h-4" />
                Escuela Empresa · Panadería y Pastelería — Dependiente del D.E.M. ({parsedPreview.data.escuelaEmpresaRows.length} inscriptos)
              </h5>
              <div className="overflow-x-auto max-h-48 overflow-y-auto border border-amber-500/20 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950 text-slate-400 uppercase text-[10px]">
                      <th className="py-2 px-2.5">DNI</th>
                      <th className="py-2 px-2.5">Alumno</th>
                      <th className="py-2 px-2.5">Especialidad</th>
                      <th className="py-2 px-2.5">Turno / Nivel</th>
                      <th className="py-2 px-2.5">Barrio</th>
                      <th className="py-2 px-2.5">Carnet Manipulación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {parsedPreview.data.escuelaEmpresaRows.slice(0, 8).map((row, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-2.5 font-mono text-slate-300">{row.dni}</td>
                        <td className="py-2 px-2.5 font-semibold text-white">{row.fullName}</td>
                        <td className="py-2 px-2.5 text-amber-300 font-bold">
                          {row.specialty === 'PANADERIA_Y_PASTELERIA'
                            ? 'Panadería y Pastelería'
                            : row.specialty === 'PASTELERIA'
                            ? 'Pastelería'
                            : 'Panadería'}
                        </td>
                        <td className="py-2 px-2.5 text-slate-300">{row.shift} · {row.level}</td>
                        <td className="py-2 px-2.5 text-slate-400">{row.neighborhood}</td>
                        <td className="py-2 px-2.5">
                          {row.hasFoodHandlingCert ? (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                              VIGENTE
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">Pendiente</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* RRHH Preview */}
          {parsedPreview.data.employeeRows.length > 0 && (
            <div className="space-y-2">
              <h5 className="font-bold text-blue-300 flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                Recursos Humanos ({parsedPreview.data.employeeRows.length} legajos)
              </h5>
              <div className="overflow-x-auto max-h-48 overflow-y-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950 text-slate-400 uppercase text-[10px]">
                      <th className="py-2 px-2.5">Legajo</th>
                      <th className="py-2 px-2.5">Nombre y Apellido</th>
                      <th className="py-2 px-2.5">DNI</th>
                      <th className="py-2 px-2.5">Condición</th>
                      <th className="py-2 px-2.5">Cargo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {parsedPreview.data.employeeRows.slice(0, 8).map((row, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-2.5 font-mono text-sky-300">{row.fileNumber || 'Auto'}</td>
                        <td className="py-2 px-2.5 font-semibold text-white">{row.fullName}</td>
                        <td className="py-2 px-2.5 font-mono text-slate-300">{row.dni}</td>
                        <td className="py-2 px-2.5 text-blue-300 font-semibold">{row.employmentCondition}</td>
                        <td className="py-2 px-2.5 text-slate-300">{row.position}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Control Urbano Summary */}
          {(parsedPreview.data.licenseRows.length > 0 ||
            parsedPreview.data.fineRows.length > 0 ||
            parsedPreview.data.commercialRows.length > 0 ||
            parsedPreview.data.checkpointRows.length > 0) && (
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <h5 className="font-bold text-sky-300 flex items-center gap-1.5">
                <Shield className="w-4 h-4" />
                Control Urbano y Seguridad Vial Detectado:
              </h5>
              <div className="flex flex-wrap gap-3 text-xs text-slate-200">
                {parsedPreview.data.licenseRows.length > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800">
                    Carnets de Conducir: <strong>{parsedPreview.data.licenseRows.length}</strong>
                  </span>
                )}
                {parsedPreview.data.fineRows.length > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800">
                    Multas / Actas: <strong>{parsedPreview.data.fineRows.length}</strong>
                  </span>
                )}
                {parsedPreview.data.commercialRows.length > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800">
                    Habilitaciones Comerciales: <strong>{parsedPreview.data.commercialRows.length}</strong>
                  </span>
                )}
                {parsedPreview.data.checkpointRows.length > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800">
                    Operativos Viales: <strong>{parsedPreview.data.checkpointRows.length}</strong>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Necrological Summary */}
          {parsedPreview.data.necrologicalRows.length > 0 && (
            <div className="p-3 bg-slate-950 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-200">
              <BookmarkCheck className="w-4 h-4 text-rose-400" />
              <span>
                <strong>Registro Necrológico:</strong> {parsedPreview.data.necrologicalRows.length} servicios detectados (con detalle de Cajones y Nichos).
              </span>
            </div>
          )}

          {/* General Area Tickets Preview */}
          {parsedPreview.data.ticketRows.length > 0 && (
            <div className="space-y-2">
              <h5 className="font-bold text-emerald-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                Atenciones / Trámites del Área ({parsedPreview.data.ticketRows.length} filas)
              </h5>
              <div className="overflow-x-auto max-h-52 overflow-y-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950 text-slate-400 uppercase text-[10px]">
                      <th className="py-2 px-2.5">DNI</th>
                      <th className="py-2 px-2.5">Ciudadano / Titular</th>
                      <th className="py-2 px-2.5">Barrio</th>
                      <th className="py-2 px-2.5">Trámite</th>
                      <th className="py-2 px-2.5">Estado</th>
                      <th className="py-2 px-2.5">Turno / Género</th>
                      <th className="py-2 px-2.5">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {parsedPreview.data.ticketRows.slice(0, 8).map((row, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-2.5 font-mono text-slate-300">{row.dni}</td>
                        <td className="py-2 px-2.5 font-semibold text-slate-200">{row.fullName}</td>
                        <td className="py-2 px-2.5 text-slate-400">{row.neighborhood || '-'}</td>
                        <td className="py-2 px-2.5 text-slate-300">{row.requestType}</td>
                        <td className="py-2 px-2.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              row.isResolved
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {row.areaSpecificData?.originalStatus || row.status || (row.isResolved ? 'Solucionado' : 'Pendiente')}
                          </span>
                        </td>
                        <td className="py-2 px-2.5 text-slate-400 text-[11px]">
                          {[row.areaSpecificData?.shift, row.areaSpecificData?.gender].filter(Boolean).join(' · ') || '-'}
                        </td>
                        <td className="py-2 px-2.5 font-mono text-slate-400 text-[11px]">
                          {row.startDate || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sync History / Audit Logs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-400" />
              Historial de Archivos y Sincronizaciones Procesadas
            </h3>
            <p className="text-xs text-slate-400">
              Registro de cargas con fecha, hora, origen (Google Drive, Sheets o Excel local) y resultado.
            </p>
          </div>
          <span className="text-xs text-slate-400 font-semibold">{syncLogs.length} eventos</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[11px] font-semibold">
                <th className="py-2.5 px-3">Fecha y Hora</th>
                <th className="py-2.5 px-3">Origen</th>
                <th className="py-2.5 px-3">Archivo / Recurso</th>
                <th className="py-2.5 px-3 text-center">Procesados</th>
                <th className="py-2.5 px-3 text-center">Agregados</th>
                <th className="py-2.5 px-3 text-center">Duplicados</th>
                <th className="py-2.5 px-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {syncLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-2.5 px-3 text-slate-300 font-mono">{log.date}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.source === 'GOOGLE_DRIVE'
                          ? 'bg-sky-500/10 text-sky-300 border border-sky-500/20'
                          : log.source === 'GOOGLE_SHEETS'
                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                            : 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                      }`}
                    >
                      {log.source === 'GOOGLE_DRIVE'
                        ? 'Google Drive'
                        : log.source === 'GOOGLE_SHEETS'
                          ? 'Sheets API'
                          : 'Excel Local'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-200">{log.fileName}</td>
                  <td className="py-2.5 px-3 text-center text-slate-300 font-semibold">
                    {log.recordsProcessed}
                  </td>
                  <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">
                    +{log.recordsAdded}
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-400">{log.duplicatesSkipped}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
              {syncLogs.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No hay sincronizaciones registradas todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
