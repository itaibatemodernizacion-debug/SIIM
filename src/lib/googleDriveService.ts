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
  | { publicProxy: true };

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

const getOAuthToken = (auth: DriveAuthCredentials): string => {
  if (typeof auth === 'string') return auth;
  if ('accessToken' in auth) return auth.accessToken;
  return '';
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
      'AUTH_EXPIRED: Su sesión o permiso de Google Drive expiró. Haga clic en "Sign in with Google" o utilice la sincronización directa de la carpeta compartida.'
    );
  }

  throw new Error(apiMessage || `Error de Google Drive (${res.status})`);
};

const handlePublicProxyError = async (res: Response): Promise<never> => {
  let msg = `No se pudo leer la carpeta compartida de Google Drive (${res.status}).`;
  try {
    const errJson = await res.json();
    if (errJson?.error) msg = errJson.error;
  } catch {
    // ignore
  }
  throw new Error(msg);
};

export interface DriveFileWithFolder {
  file: DriveFileItem;
  folderName: string;
  folderPath: string;
}

/**
 * Lists folders and spreadsheet/Excel files in Google Drive.
 * Supports both direct shared-folder proxy (zero login) and authenticated OAuth tokens.
 */
export const listDriveSpreadsheetsAndFolders = async (
  auth: DriveAuthCredentials,
  options?: { folderId?: string; searchText?: string }
): Promise<DriveFileItem[]> => {
  if (isPublicProxyAuth(auth)) {
    const folderId = options?.folderId;
    if (!folderId || folderId === 'ROOT') {
      return [];
    }

    const res = await fetch(`/api/drive/public/folder/${encodeURIComponent(folderId)}`);
    if (!res.ok) {
      await handlePublicProxyError(res);
    }

    const data = await res.json();
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
  if (isPublicProxyAuth(auth)) {
    const res = await fetch(`/api/drive/public/folder/${encodeURIComponent(fileId)}`);
    if (!res.ok) {
      await handlePublicProxyError(res);
    }
    const data = await res.json();
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
  if (isPublicProxyAuth(auth)) {
    const params = new URLSearchParams({ mimeType: file.mimeType || '' });
    const res = await fetch(
      `/api/drive/public/download/${encodeURIComponent(file.id)}?${params.toString()}`
    );
    if (!res.ok) {
      await handlePublicProxyError(res);
    }
    return await res.arrayBuffer();
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
