export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
  webViewLink?: string;
  parents?: string[];
}

export type DriveAuthCredentials =
  | string
  | { accessToken: string }
  | { publicProxy: true }
  | { appsScriptUrl: string };

export const DRIVE_MIME_TYPES = {
  FOLDER: 'application/vnd.google-apps.folder',
  GOOGLE_SHEET: 'application/vnd.google-apps.spreadsheet',
  XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  XLS: 'application/vnd.ms-excel',
  CSV: 'text/csv'
};

export const isFolder = (mimeType: string) => mimeType === DRIVE_MIME_TYPES.FOLDER;
export const isGoogleSheet = (mimeType: string) => mimeType === DRIVE_MIME_TYPES.GOOGLE_SHEET;

const isPublicProxyAuth = (auth: DriveAuthCredentials): auth is { publicProxy: true } =>
  typeof auth === 'object' && auth !== null && 'publicProxy' in auth && auth.publicProxy === true;

const isAppsScriptAuth = (auth: DriveAuthCredentials): auth is { appsScriptUrl: string } =>
  typeof auth === 'object' && auth !== null && 'appsScriptUrl' in auth && typeof auth.appsScriptUrl === 'string' && auth.appsScriptUrl.trim().length > 0;

const getOAuthToken = (auth: DriveAuthCredentials): string => {
  if (typeof auth === 'string') return auth;
  if ('accessToken' in auth) return auth.accessToken;
  return '';
};

const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

/**
 * Extracts a Google Drive or Google Sheets File ID from either a full URL or raw ID string.
 */
export const extractDriveFileId = (urlOrId: string): string | null => {
  const trimmed = urlOrId.trim();
  if (!trimmed) return null;

  const dMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]{15,})/);
  if (dMatch && dMatch[1]) return dMatch[1];

  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{15,})/);
  if (idParamMatch && idParamMatch[1]) return idParamMatch[1];

  const foldersMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]{15,})/);
  if (foldersMatch && foldersMatch[1]) return foldersMatch[1];

  if (/^[a-zA-Z0-9_-]{15,}$/.test(trimmed)) return trimmed;

  return null;
};

const handleOAuthDriveError = async (res: Response): Promise<never> => {
  let apiMessage = '';
  try {
    const errJson = await res.json();
    if (errJson?.error?.message) apiMessage = errJson.error.message;
  } catch {
    // ignore
  }

  if (res.status === 401 || res.status === 403) {
    throw new Error(
      'AUTH_EXPIRED: Su sesión o permiso de Google Drive expiró. Utilice el botón verde "Sincronizar Toda la Carpeta Ahora" (sin iniciar sesión) o vuelva a autorizar Google.'
    );
  }

  throw new Error(apiMessage || `Error de Google Drive (${res.status})`);
};

const handlePublicProxyError = async (res: Response): Promise<never> => {
  let msg = `No se pudo leer la carpeta compartida de Google Drive (${res.status}).`;
  try {
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const errJson = await res.json();
      if (errJson?.error) msg = errJson.error;
    }
  } catch {
    // ignore
  }
  throw new Error(msg);
};

const ensureJsonResponse = async (res: Response, endpointLabel: string) => {
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    throw new Error(
      `El servidor (${endpointLabel}) no respondió con datos JSON. Si publicó la app en Netlify arrastrando solo la carpeta dist (sin conectar el repositorio Git), las funciones de servidor no se despliegan; conecte el repositorio en Netlify o utilice el conector de Google Apps Script.`
    );
  }
  return res.json();
};

const fetchPublicFolderJson = async (folderId: string) => {
  const primaryUrl = `/api/drive/public/folder/${encodeURIComponent(folderId)}`;
  let res = await fetch(primaryUrl);
  const ct = res.headers.get('content-type') || '';

  // Fallback directly to Netlify Function endpoint if SPA rewrite intercepted /api/*
  if (!ct.includes('application/json')) {
    const netlifyFallbackUrl = `/.netlify/functions/drive-public?action=folder&id=${encodeURIComponent(folderId)}`;
    const fallbackRes = await fetch(netlifyFallbackUrl);
    const fallbackCt = fallbackRes.headers.get('content-type') || '';
    if (fallbackCt.includes('application/json') || fallbackRes.ok) {
      res = fallbackRes;
    }
  }

  if (!res.ok) {
    await handlePublicProxyError(res);
  }

  return ensureJsonResponse(res, '/api/drive/public/folder');
};

const fetchPublicDownloadBuffer = async (file: Pick<DriveFileItem, 'id' | 'name' | 'mimeType'>): Promise<ArrayBuffer> => {
  const params = new URLSearchParams({ mimeType: file.mimeType || '' });
  const primaryUrl = `/api/drive/public/download/${encodeURIComponent(file.id)}?${params.toString()}`;
  let res = await fetch(primaryUrl);
  const ct = res.headers.get('content-type') || '';

  if (ct.includes('text/html')) {
    const fallbackParams = new URLSearchParams({
      action: 'download',
      id: file.id,
      mimeType: file.mimeType || ''
    });
    const fallbackRes = await fetch(`/.netlify/functions/drive-public?${fallbackParams.toString()}`);
    const fallbackCt = fallbackRes.headers.get('content-type') || '';
    if (!fallbackCt.includes('text/html')) {
      res = fallbackRes;
    }
  }

  if (!res.ok) {
    await handlePublicProxyError(res);
  }

  const finalCt = res.headers.get('content-type') || '';
  if (finalCt.includes('text/html')) {
    throw new Error(
      `No se pudo descargar "${file.name}" directamente. Verifique que el archivo tenga permiso "Cualquier persona con el enlace: Lector" y que las Netlify Functions estén desplegadas.`
    );
  }

  return await res.arrayBuffer();
};

export interface DriveFileWithFolder {
  file: DriveFileItem;
  folderName: string;
  folderPath: string;
}

/**
 * Lists folders and spreadsheet/Excel files in Google Drive.
 * Supports: (1) Built-in shared-folder proxy (zero login), (2) Google Apps Script Web App URL, (3) OAuth token.
 */
export const listDriveSpreadsheetsAndFolders = async (
  auth: DriveAuthCredentials,
  options?: { folderId?: string; searchText?: string }
): Promise<DriveFileItem[]> => {
  if (isAppsScriptAuth(auth)) {
    const folderId = options?.folderId;
    if (!folderId || folderId === 'ROOT') return [];
    const sep = auth.appsScriptUrl.includes('?') ? '&' : '?';
    const url = `${auth.appsScriptUrl.trim()}${sep}action=list&folderId=${encodeURIComponent(folderId)}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Error al consultar Google Apps Script (${res.status}). Verifique que el script esté publicado como "Cualquier persona".`);
    }
    const data = await ensureJsonResponse(res, 'Google Apps Script');
    if (data.error) throw new Error(data.error);
    let files = (data.files || []) as DriveFileItem[];
    if (options?.searchText && options.searchText.trim()) {
      const needle = options.searchText.trim().toLowerCase();
      files = files.filter(f => f.name.toLowerCase().includes(needle));
    }
    return files;
  }

  if (isPublicProxyAuth(auth)) {
    const folderId = options?.folderId;
    if (!folderId || folderId === 'ROOT') {
      return [];
    }

    const data = await fetchPublicFolderJson(folderId);
    let files = (data.files || []) as DriveFileItem[];

    if (options?.searchText && options.searchText.trim()) {
      const needle = options.searchText.trim().toLowerCase();
      files = files.filter(f => f.name.toLowerCase().includes(needle));
    }
    return files;
  }

  const token = getOAuthToken(auth);
  const mimeConditions = [
    `mimeType='${DRIVE_MIME_TYPES.FOLDER}'`,
    `mimeType='${DRIVE_MIME_TYPES.GOOGLE_SHEET}'`,
    `mimeType='${DRIVE_MIME_TYPES.XLSX}'`,
    `mimeType='${DRIVE_MIME_TYPES.XLS}'`,
    `mimeType='${DRIVE_MIME_TYPES.CSV}'`
  ].join(' or ');

  const qParts: string[] = [`(${mimeConditions})`, 'trashed=false'];
  const hasSearch = !!(options?.searchText && options.searchText.trim());

  if (options?.folderId && options.folderId !== 'ROOT') {
    qParts.push(`'${options.folderId}' in parents`);
  } else if (options?.folderId === 'ROOT' && !hasSearch) {
    qParts.push(`'root' in parents`);
  }

  if (hasSearch && options?.searchText) {
    const escaped = options.searchText.trim().replace(/'/g, "\\'");
    qParts.push(`name contains '${escaped}'`);
  }

  const params = new URLSearchParams({
    q: qParts.join(' and '),
    fields: 'files(id,name,mimeType,modifiedTime,size,webViewLink,parents)',
    orderBy: 'folder,modifiedTime desc',
    pageSize: '100',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true'
  });

  const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    await handleOAuthDriveError(res);
  }

  const data = await res.json();
  return (data.files || []) as DriveFileItem[];
};

/**
 * Recursively lists all Excel/CSV/Google Sheets files inside a linked Google Drive folder (and its subfolders).
 */
export const listAllSpreadsheetsInFolderRecursive = async (
  auth: DriveAuthCredentials,
  rootFolderId: string,
  rootFolderName = 'Carpeta Municipal',
  maxDepth = 2
): Promise<DriveFileWithFolder[]> => {
  const collected: DriveFileWithFolder[] = [];
  const visitedFolders = new Set<string>();

  const walk = async (folderId: string, folderName: string, folderPath: string, depth: number) => {
    if (visitedFolders.has(folderId)) return;
    visitedFolders.add(folderId);

    const items = await listDriveSpreadsheetsAndFolders(auth, { folderId });
    const subfolders: DriveFileItem[] = [];

    for (const item of items) {
      if (isFolder(item.mimeType)) {
        if (depth < maxDepth) {
          subfolders.push(item);
        }
      } else {
        collected.push({
          file: item,
          folderName,
          folderPath
        });
      }
    }

    for (const sub of subfolders) {
      await walk(sub.id, sub.name, `${folderPath} / ${sub.name}`, depth + 1);
    }
  };

  await walk(rootFolderId, rootFolderName, rootFolderName, 0);
  return collected;
};

/**
 * Fetches metadata for a single file or folder in Google Drive.
 */
export const getDriveFileMetadata = async (
  auth: DriveAuthCredentials,
  fileId: string
): Promise<DriveFileItem> => {
  if (isAppsScriptAuth(auth)) {
    const sep = auth.appsScriptUrl.includes('?') ? '&' : '?';
    const res = await fetch(`${auth.appsScriptUrl.trim()}${sep}action=list&folderId=${encodeURIComponent(fileId)}`);
    if (!res.ok) {
      throw new Error(`No se pudo consultar la carpeta vía Apps Script (${res.status}).`);
    }
    const data = await ensureJsonResponse(res, 'Google Apps Script');
    if (data.error) throw new Error(data.error);
    return {
      id: fileId,
      name: data.folderName || 'Carpeta Oficial Municipal',
      mimeType: DRIVE_MIME_TYPES.FOLDER,
      webViewLink: `https://drive.google.com/drive/folders/${fileId}`
    };
  }

  if (isPublicProxyAuth(auth)) {
    const data = await fetchPublicFolderJson(fileId);
    return {
      id: fileId,
      name: data.folderName || 'Carpeta Oficial Municipal',
      mimeType: DRIVE_MIME_TYPES.FOLDER,
      webViewLink: `https://drive.google.com/drive/folders/${fileId}`
    };
  }

  const token = getOAuthToken(auth);
  const params = new URLSearchParams({
    fields: 'id,name,mimeType,modifiedTime,size,webViewLink,parents',
    supportsAllDrives: 'true'
  });

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    await handleOAuthDriveError(res);
  }

  return (await res.json()) as DriveFileItem;
};

/**
 * Downloads an Excel/CSV file directly or exports a Google Sheet as .xlsx ArrayBuffer.
 */
export const downloadDriveSpreadsheetBuffer = async (
  auth: DriveAuthCredentials,
  file: Pick<DriveFileItem, 'id' | 'name' | 'mimeType'>
): Promise<ArrayBuffer> => {
  if (isAppsScriptAuth(auth)) {
    const sep = auth.appsScriptUrl.includes('?') ? '&' : '?';
    const url = `${auth.appsScriptUrl.trim()}${sep}action=download&fileId=${encodeURIComponent(file.id)}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Error al descargar "${file.name}" vía Apps Script (${res.status}).`);
    }
    const data = await ensureJsonResponse(res, 'Google Apps Script');
    if (data.error || !data.base64) {
      throw new Error(data.error || `No se recibió el contenido de "${file.name}".`);
    }
    return base64ToArrayBuffer(data.base64);
  }

  if (isPublicProxyAuth(auth)) {
    return fetchPublicDownloadBuffer(file);
  }

  const token = getOAuthToken(auth);
  let url = '';
  if (file.mimeType === DRIVE_MIME_TYPES.GOOGLE_SHEET) {
    url = `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=${encodeURIComponent(DRIVE_MIME_TYPES.XLSX)}`;
  } else {
    url = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&supportsAllDrives=true`;
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    await handleOAuthDriveError(res);
  }

  return await res.arrayBuffer();
};
