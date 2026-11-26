import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DRIVE_ID_REGEX = /^[a-zA-Z0-9_-]{10,120}$/;

const DRIVE_MIME_TYPES = {
  FOLDER: 'application/vnd.google-apps.folder',
  GOOGLE_SHEET: 'application/vnd.google-apps.spreadsheet',
  XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  XLS: 'application/vnd.ms-excel',
  CSV: 'text/csv'
};

const decodeHtmlEntities = (str: string): string =>
  str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .trim();

const inferMimeType = (name: string, href: string): string | null => {
  if (href.includes('/folders/')) return DRIVE_MIME_TYPES.FOLDER;
  if (href.includes('docs.google.com/spreadsheets')) return DRIVE_MIME_TYPES.GOOGLE_SHEET;
  const lower = name.toLowerCase();
  if (lower.endsWith('.xlsx') || lower.endsWith('.xlsm')) return DRIVE_MIME_TYPES.XLSX;
  if (lower.endsWith('.xls')) return DRIVE_MIME_TYPES.XLS;
  if (lower.endsWith('.csv')) return DRIVE_MIME_TYPES.CSV;
  return null;
};

interface PublicDriveEntry {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink: string;
}

const parseEmbeddedFolderHtml = (html: string): { folderName: string; files: PublicDriveEntry[] } => {
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  const folderName = titleMatch ? decodeHtmlEntities(titleMatch[1]) : 'Carpeta de Google Drive';

  const files: PublicDriveEntry[] = [];
  const entryRegex =
    /<div class="flip-entry" id="entry-([^"]+)"[\s\S]*?<a href="([^"]+)"[\s\S]*?<div class="flip-entry-title">([\s\S]*?)<\/div><\/a><\/div><div class="flip-entry-last-modified"><div>([^<]*)<\/div>/g;

  let match: RegExpExecArray | null;
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

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Public shared Google Drive folder listing proxy (read-only, strict ID validation)
  app.get('/api/drive/public/folder/:folderId', async (req, res) => {
    const folderId = String(req.params.folderId || '').trim();
    if (!DRIVE_ID_REGEX.test(folderId)) {
      return res.status(400).json({ error: 'ID de carpeta de Google Drive inválido.' });
    }

    try {
      const targetUrl = `https://drive.google.com/embeddedfolderview?id=${encodeURIComponent(folderId)}#list`;
      const upstream = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SIMM-ItaIbate/1.0)',
          'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8'
        },
        redirect: 'follow'
      });

      const finalUrl = upstream.url || '';
      const html = await upstream.text();

      if (
        !upstream.ok ||
        finalUrl.includes('accounts.google.com') ||
        html.includes('accounts.google.com/ServiceLogin') ||
        (!html.includes('flip-entries') && !html.includes('flip-embedded'))
      ) {
        return res.status(403).json({
          error:
            'PUBLIC_ACCESS_DENIED: No se pudo leer la carpeta directamente. Verifique que la carpeta esté compartida como "Cualquier persona con el enlace: Lector" o inicie sesión con Google.'
        });
      }

      const parsed = parseEmbeddedFolderHtml(html);
      return res.json({
        folderId,
        folderName: parsed.folderName,
        files: parsed.files
      });
    } catch (err: any) {
      return res.status(502).json({
        error: `Error al consultar la carpeta compartida en Google Drive: ${err?.message || 'Error de red'}`
      });
    }
  });

  // Public shared Google Drive Excel / Google Sheet binary download proxy
  app.get('/api/drive/public/download/:fileId', async (req, res) => {
    const fileId = String(req.params.fileId || '').trim();
    if (!DRIVE_ID_REGEX.test(fileId)) {
      return res.status(400).json({ error: 'ID de archivo de Google Drive inválido.' });
    }

    const mimeType = String(req.query.mimeType || '').trim();
    const isGoogleSheet = mimeType === DRIVE_MIME_TYPES.GOOGLE_SHEET;

    try {
      const downloadUrl = isGoogleSheet
        ? `https://docs.google.com/spreadsheets/d/${encodeURIComponent(fileId)}/export?format=xlsx`
        : `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;

      let upstream = await fetch(downloadUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SIMM-ItaIbate/1.0)' },
        redirect: 'follow'
      });

      const contentType = upstream.headers.get('content-type') || '';

      // Handle Google Drive large-file confirmation page if returned
      if (upstream.ok && contentType.includes('text/html') && !isGoogleSheet) {
        const htmlText = await upstream.text();
        if (htmlText.includes('accounts.google.com/ServiceLogin')) {
          return res.status(403).json({
            error:
              'PUBLIC_ACCESS_DENIED: El archivo no está compartido de forma pública. Configure "Cualquier persona con el enlace: Lector" o inicie sesión con Google.'
          });
        }
        const confirmMatch = htmlText.match(/name="confirm"\s+value="([^"]+)"/i);
        const uuidMatch = htmlText.match(/name="uuid"\s+value="([^"]+)"/i);
        if (confirmMatch) {
          const confirmUrl = `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=${encodeURIComponent(confirmMatch[1])}${uuidMatch ? `&uuid=${encodeURIComponent(uuidMatch[1])}` : ''}`;
          upstream = await fetch(confirmUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SIMM-ItaIbate/1.0)' },
            redirect: 'follow'
          });
        } else {
          return res.status(403).json({
            error:
              'PUBLIC_ACCESS_DENIED: Google Drive devolvió una pantalla de acceso en lugar del archivo Excel. Verifique los permisos compartidos del archivo.'
          });
        }
      }

      const finalContentType = upstream.headers.get('content-type') || '';
      if (!upstream.ok || finalContentType.includes('text/html')) {
        return res.status(403).json({
          error:
            'PUBLIC_ACCESS_DENIED: No se pudo descargar el archivo desde el enlace compartido. Verifique que tenga permiso "Cualquier persona con el enlace: Lector".'
        });
      }

      const arrayBuf = await upstream.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Cache-Control', 'no-store');
      return res.send(buffer);
    } catch (err: any) {
      return res.status(502).json({
        error: `Error al descargar archivo desde Google Drive: ${err?.message || 'Error de red'}`
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SIMM Itá Ibaté server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
