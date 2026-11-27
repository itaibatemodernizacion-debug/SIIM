const DRIVE_ID_REGEX = /^[a-zA-Z0-9_-]{10,120}$/;

const DRIVE_MIME_TYPES = {
  FOLDER: 'application/vnd.google-apps.folder',
  GOOGLE_SHEET: 'application/vnd.google-apps.spreadsheet',
  XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  XLS: 'application/vnd.ms-excel',
  CSV: 'text/csv'
};

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store'
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

export default async function handler(req) {
  const url = new URL(req.url);
  const pathname = url.pathname || '';
  const searchParams = url.searchParams;

  if (pathname.endsWith('/health') || searchParams.get('action') === 'health') {
    return new Response(
      JSON.stringify({ ok: true, runtime: 'netlify-functions-v2' }),
      { status: 200, headers: JSON_HEADERS }
    );
  }

  const folderPathMatch = pathname.match(/\/folder\/([^/?#]+)/);
  const downloadPathMatch = pathname.match(/\/download\/([^/?#]+)/);

  const action = searchParams.get('action') || '';
  const isFolderAction = Boolean(folderPathMatch) || action === 'folder';
  const isDownloadAction = Boolean(downloadPathMatch) || action === 'download';

  if (isFolderAction) {
    const folderId = decodeURIComponent(
      (folderPathMatch ? folderPathMatch[1] : searchParams.get('id') || '')
    ).trim();

    if (!DRIVE_ID_REGEX.test(folderId)) {
      return new Response(
        JSON.stringify({ error: 'ID de carpeta de Google Drive inválido.' }),
        { status: 400, headers: JSON_HEADERS }
      );
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
        return new Response(
          JSON.stringify({
            error:
              'PUBLIC_ACCESS_DENIED: Verifique que la carpeta esté compartida como "Cualquier persona con el enlace: Lector".'
          }),
          { status: 403, headers: JSON_HEADERS }
        );
      }

      const parsed = parseEmbeddedFolderHtml(html);
      return new Response(
        JSON.stringify({
          folderId,
          folderName: parsed.folderName,
          files: parsed.files
        }),
        { status: 200, headers: JSON_HEADERS }
      );
    } catch (err) {
      return new Response(
        JSON.stringify({ error: err?.message || 'Error al consultar Google Drive.' }),
        { status: 502, headers: JSON_HEADERS }
      );
    }
  }

  if (isDownloadAction) {
    const fileId = decodeURIComponent(
      (downloadPathMatch ? downloadPathMatch[1] : searchParams.get('id') || '')
    ).trim();

    if (!DRIVE_ID_REGEX.test(fileId)) {
      return new Response(
        JSON.stringify({ error: 'ID de archivo de Google Drive inválido.' }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    const mimeType = String(searchParams.get('mimeType') || '').trim();
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
        return new Response(
          JSON.stringify({
            error:
              'PUBLIC_ACCESS_DENIED: No se pudo descargar el archivo desde el enlace compartido.'
          }),
          { status: 403, headers: JSON_HEADERS }
        );
      }

      const arrayBuffer = await upstream.arrayBuffer();
      return new Response(arrayBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/octet-stream',
          'Cache-Control': 'no-store'
        }
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: err?.message || 'Error al descargar archivo de Drive.' }),
        { status: 502, headers: JSON_HEADERS }
      );
    }
  }

  return new Response(
    JSON.stringify({ error: 'Ruta de Google Drive no encontrada.' }),
    { status: 404, headers: JSON_HEADERS }
  );
}

export const config = {
  path: '/api/drive/public/*'
};
