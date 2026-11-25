export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
  webViewLink?: string;
  parents?: string[];
}

export const DRIVE_MIME_TYPES = {
  FOLDER: 'application/vnd.google-apps.folder',
  GOOGLE_SHEET: 'application/vnd.google-apps.spreadsheet',
  XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  XLS: 'application/vnd.ms-excel',
  CSV: 'text/csv'
};

export const isFolder = (mimeType: string) => mimeType === DRIVE_MIME_TYPES.FOLDER;
export const isGoogleSheet = (mimeType: string) => mimeType === DRIVE_MIME_TYPES.GOOGLE_SHEET;

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

const handleDriveResponseError = async (res: Response): Promise<never> => {
  if (res.status === 401 || res.status === 403) {
    throw new Error('AUTH_EXPIRED: Su sesión o permiso de Google Drive expiró. Haga clic en "Conectar con Google" para renovar el acceso.');
  }
  let msg = `Error de Google Drive (${res.status})`;
  try {
    const errJson = await res.json();
    if (errJson?.error?.message) msg = errJson.error.message;
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
 */
export const listDriveSpreadsheetsAndFolders = async (
  accessToken: string,
  options?: { folderId?: string; searchText?: string }
): Promise<DriveFileItem[]> => {
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
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    await handleDriveResponseError(res);
  }

  const data = await res.json();
  return (data.files || []) as DriveFileItem[];
};

/**
 * Recursively lists all Excel/CSV/Google Sheets files inside a linked Google Drive folder (and its subfolders).
 */
export const listAllSpreadsheetsInFolderRecursive = async (
  accessToken: string,
  rootFolderId: string,
  rootFolderName = 'Carpeta Municipal',
  maxDepth = 2
): Promise<DriveFileWithFolder[]> => {
  const collected: DriveFileWithFolder[] = [];
  const visitedFolders = new Set<string>();

  const walk = async (folderId: string, folderName: string, folderPath: string, depth: number) => {
    if (visitedFolders.has(folderId)) return;
    visitedFolders.add(folderId);

    const items = await listDriveSpreadsheetsAndFolders(accessToken, { folderId });
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
 * Fetches metadata for a single file in Google Drive.
 */
export const getDriveFileMetadata = async (
  accessToken: string,
  fileId: string
): Promise<DriveFileItem> => {
  const params = new URLSearchParams({
    fields: 'id,name,mimeType,modifiedTime,size,webViewLink,parents',
    supportsAllDrives: 'true'
  });

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    await handleDriveResponseError(res);
  }

  return (await res.json()) as DriveFileItem;
};

/**
 * Downloads an Excel/CSV file directly or exports a Google Sheet as .xlsx ArrayBuffer.
 */
export const downloadDriveSpreadsheetBuffer = async (
  accessToken: string,
  file: Pick<DriveFileItem, 'id' | 'name' | 'mimeType'>
): Promise<ArrayBuffer> => {
  let url = '';
  if (file.mimeType === DRIVE_MIME_TYPES.GOOGLE_SHEET) {
    // Export native Google Sheet as .xlsx
    url = `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=${encodeURIComponent(DRIVE_MIME_TYPES.XLSX)}`;
  } else {
    // Download raw uploaded Excel (.xlsx/.xls) or CSV
    url = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&supportsAllDrives=true`;
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    await handleDriveResponseError(res);
  }

  return await res.arrayBuffer();
};
