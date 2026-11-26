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
  | { apiKey: string };

export const DRIVE_MIME_TYPES = {
  FOLDER: 'application/vnd.google-apps.folder',
  GOOGLE_SHEET: 'application/vnd.google-apps.spreadsheet',
  XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  XLS: 'application/vnd.ms-excel',
  CSV: 'text/csv'
};

export const isFolder = (mimeType: string) => mimeType === DRIVE_MIME_TYPES.FOLDER;
export const isGoogleSheet = (mimeType: string) => mimeType === DRIVE_MIME_TYPES.GOOGLE_SHEET;

const resolveDriveAuth = (
  auth: DriveAuthCredentials
): { mode: 'oauth'; token: string } | { mode: 'apikey'; apiKey: string } => {
  if (typeof auth === 'string') {
    return { mode: 'oauth', token: auth };
  }
  if ('accessToken' in auth) {
    return { mode: 'oauth', token: auth.accessToken };
  }
  return { mode: 'apikey', apiKey: auth.apiKey };
};

const fetchDrive = (baseUrl: string, params: URLSearchParams, auth: DriveAuthCredentials) => {
  const resolved = resolveDriveAuth(auth);
  if (resolved.mode === 'apikey') {
    params.set('key', resolved.apiKey);
    return fetch(`${baseUrl}?${params.toString()}`);
  }
  return fetch(`${baseUrl}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${resolved.token}` }
  });
};

/**
 * Extracts a Google Drive or Google Sheets File ID from either a full URL or raw ID string.
 */
export const extractDriveFileId = (urlOrId: string): string | null => {
  const trimmed = urlOrId.trim();
  if (!trimmed) return null;

  // Match /d/<ID>/ or ?id=<ID>
  const dMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]{15,})/);
  if (dMatch && dMatch[1]) return dMatch[1];

  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{15,})/);
  if (idParamMatch && idParamMatch[1]) return idParamMatch[1];

  const foldersMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]{15,})/);
  if (foldersMatch && foldersMatch[1]) return foldersMatch[1];

  // Raw file ID
  if (/^[a-zA-Z0-9_-]{15,}$/.test(trimmed)) return trimmed;

  return null;
};

const handleDriveResponseError = async (res: Response, isPublicMode: boolean): Promise<never> => {
  let apiMessage = '';
  try {
    const errJson = await res.json();
    if (errJson?.error?.message) apiMessage = errJson.error.message;
  } catch {
    // ignore JSON parse issues
  }

  if (isPublicMode) {
    if (res.status === 401 || res.status === 403 || res.status === 404) {
      throw new Error(
        'PUBLIC_ACCESS_DENIED: Esta carpeta de Google Drive requiere permiso público de lectura ("Cualquier persona con el enlace: Lector") o iniciar sesión con Google. Haga clic en "Sign in with Google" para acceder directamente con su cuenta.'
      );
    }
    throw new Error(apiMessage || `Error al leer carpeta compartida (${res.status})`);
  }

  if (res.status === 401 || res.status === 403) {
    throw new Error(
      'AUTH_EXPIRED: Su sesión o permiso de Google Drive expiró o no tiene acceso a esta carpeta. Haga clic en "Sign in with Google" para renovar el acceso.'
    );
  }

  throw new Error(apiMessage || `Error de Google Drive (${res.status})`);
};

export interface DriveFileWithFolder {
  file: DriveFileItem;
  folderName: string;
  folderPath: string;
}

/**
 * Lists folders and spreadsheet/Excel files in Google Drive.
 * Supports both authenticated OAuth tokens and public shared folders via API key.
 */
export const listDriveSpreadsheetsAndFolders = async (
  auth: DriveAuthCredentials,
  options?: { folderId?: string; searchText?: string }
): Promise<DriveFileItem[]> => {
  const isPublicMode = resolveDriveAuth(auth).mode === 'apikey';

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
  } else if (options?.folderId === 'ROOT' && !hasSearch && !isPublicMode) {
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

  const res = await fetchDrive('https://www.googleapis.com/drive/v3/files', params, auth);

  if (!res.ok) {
    await handleDriveResponseError(res, isPublicMode);
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
  const isPublicMode = resolveDriveAuth(auth).mode === 'apikey';
  const params = new URLSearchParams({
    fields: 'id,name,mimeType,modifiedTime,size,webViewLink,parents',
    supportsAllDrives: 'true'
  });

  const res = await fetchDrive(`https://www.googleapis.com/drive/v3/files/${fileId}`, params, auth);

  if (!res.ok) {
    await handleDriveResponseError(res, isPublicMode);
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
  const isPublicMode = resolveDriveAuth(auth).mode === 'apikey';
  let baseUrl = '';
  const params = new URLSearchParams();

  if (file.mimeType === DRIVE_MIME_TYPES.GOOGLE_SHEET) {
    // Export native Google Sheet as .xlsx
    baseUrl = `https://www.googleapis.com/drive/v3/files/${file.id}/export`;
    params.set('mimeType', DRIVE_MIME_TYPES.XLSX);
  } else {
    // Download raw uploaded Excel (.xlsx/.xls) or CSV
    baseUrl = `https://www.googleapis.com/drive/v3/files/${file.id}`;
    params.set('alt', 'media');
    params.set('supportsAllDrives', 'true');
  }

  const res = await fetchDrive(baseUrl, params, auth);

  if (!res.ok) {
    await handleDriveResponseError(res, isPublicMode);
  }

  return await res.arrayBuffer();
};
