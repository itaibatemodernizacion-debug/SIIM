const DRIVE_ID_REGEX = /^[a-zA-Z0-9_-]{10,120}$/;

const DRIVE_MIME_TYPES = {
  FOLDER: 'application/vnd.google-apps.folder',
  GOOGLE_SHEET: 'application/vnd.google-apps.spreadsheet',
  XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  XLS: 'application/vnd.ms-excel',
  CSV: 'text/csv'
};

const decodeHtmlEntities = (str) =>
  str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .trim();

const inferMimeType = (name, href) => {
  if (href.includes('/folders/')) return DRIVE_MIME_TYPES.FOLDER;
  if (href.includes('docs.google.com/spreadsheets')) return DRIVE_MIME_TYPES.GOOGLE_SHEET;
  const lower = name.toLowerCase();
  if (lower.endsWith('.xlsx') || lower.endsWith('.xlsm')) return DRIVE_MIME_TYPES.XLSX;
  if (lower.endsWith('.xls')) return DRIVE_MIME_TYPES.XLS;
  if (lower.endsWith('.csv')) return DRIVE_MIME_TYPES.CSV;
  return null;
};

const parseEmbeddedFolderHtml = (html) => {
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  const folderName = titleMatch ? decodeHtmlEntities(titleMatch[1]) : 'Carpeta de Google Drive';

  const files = [];
  const entryRegex =
    /<div class="flip-entry" id="entry-([^"]+)"[\s\S]*?<a href="([^"]+)"[\s\S]*?<div class="flip-entry-title">([\s\S]*?)<\/div><\/a><\/div><div class="flip-entry-last-modified"><div>([^<]*)<\/div>/g;

  let match;
  while ((match = entryRegex.exec(html)) !== null) {
    const id = match[1].trim();
    const href = decodeHtmlEntities(match[2]);
    const name = decodeHtmlEntities(match[3]);
    const modifiedTime = decodeHtmlEntities(match[4]);

    if (!DRIVE_ID_REGEX.test(id)) continue;
    const mimeType = inferMimeType(name, href);
    if (!mimeType) continue;

    files.push({
      id,
      name,
      mimeType,
      modifiedTime: modifiedTime || undefined,
      webViewLink: href
    });
  }

  return { folderName, files };
};

export async function handler(event) {
  const rawPath = event.path || '';
  const qs = event.queryStringParameters || {};

  const folderPathMatch = rawPath.match(/\/folder\/([^/?#]+)/);
  const downloadPathMatch = rawPath.match(/\/download\/([^/?#]+)/);

  const isFolderAction = Boolean(folderPathMatch) || qs.action === 'folder';
  const isDownloadAction = Boolean(downloadPathMatch) || qs.action === 'download';

  if (isFolderAction) {
    const folderId = decodeURIComponent(
      (folderPathMatch ? folderPathMatch[1] : qs.id || '')
    ).trim();

    if (!DRIVE_ID_REGEX.test(folderId)) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'ID de carpeta de Google Drive inválido.' })
      };
    }

    try {
      const upstream = await fetch(
        `https://drive.google.com/embeddedfolderview?id=${encodeURIComponent(folderId)}#list`,
        {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SIMM-ItaIbate/1.0)' },
          redirect: 'follow'
        }
      );
      const html = await upstream.text();
      if (
        !upstream.ok ||
        html.includes('accounts.google.com/ServiceLogin') ||
        (!html.includes('flip-entries') && !html.includes('flip-embedded'))
      ) {
        return {
          statusCode: 403,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error:
              'PUBLIC_ACCESS_DENIED: Verifique que la carpeta esté compartida como "Cualquier persona con el enlace: Lector".'
          })
        };
      }

      const parsed = parseEmbeddedFolderHtml(html);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        body: JSON.stringify({
          folderId,
          folderName: parsed.folderName,
          files: parsed.files
        })
      };
    } catch (err) {
      return {
        statusCode: 502,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: err?.message || 'Error al consultar Google Drive.' })
      };
    }
  }

  if (isDownloadAction) {
    const fileId = decodeURIComponent(
      (downloadPathMatch ? downloadPathMatch[1] : qs.id || '')
    ).trim();

    if (!DRIVE_ID_REGEX.test(fileId)) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'ID de archivo de Google Drive inválido.' })
      };
    }

    const mimeType = String(qs.mimeType || '').trim();
    const isGoogleSheet = mimeType === DRIVE_MIME_TYPES.GOOGLE_SHEET;

    try {
      const downloadUrl = isGoogleSheet
        ? `https://docs.google.com/spreadsheets/d/${encodeURIComponent(fileId)}/export?format=xlsx`
        : `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;

      const upstream = await fetch(downloadUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SIMM-ItaIbate/1.0)' },
        redirect: 'follow'
      });
      const contentType = upstream.headers.get('content-type') || '';

      if (!upstream.ok || contentType.includes('text/html')) {
        return {
          statusCode: 403,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error:
              'PUBLIC_ACCESS_DENIED: No se pudo descargar el archivo desde el enlace compartido.'
          })
        };
      }

      const buf = Buffer.from(await upstream.arrayBuffer());
      return {
        statusCode: 200,
        isBase64Encoded: true,
        headers: {
          'Content-Type': 'application/octet-stream',
          'Cache-Control': 'no-store'
        },
        body: buf.toString('base64')
      };
    } catch (err) {
      return {
        statusCode: 502,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: err?.message || 'Error al descargar archivo de Drive.' })
      };
    }
  }

  return {
    statusCode: 404,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: 'Ruta de Google Drive no encontrada.' })
  };
}
