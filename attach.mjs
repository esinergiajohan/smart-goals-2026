import { openAsBlob } from 'node:fs';
import { appendFile, stat } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';

const { JIRA_EMAIL, JIRA_API_TOKEN } = process.env;
const JIRA_BASE_URL = process.env.JIRA_BASE_URL?.replace(/\/+$/, '');
const args = process.argv.slice(2);
const confirmed = args.includes('--yes');
const [key, ...paths] = args.filter((a) => a !== '--yes');

if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN || !key || !paths.length) {
  console.error('Uso: npm run attach -- ESNEVO-2406 captura1.png captura2.png [--yes] (sin --yes solo muestra la vista previa)');
  process.exit(1);
}

const auth = `Basic ${Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64')}`;
const mimeTypes = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.txt': 'text/plain',
};

const res = await fetch(`${JIRA_BASE_URL}/rest/api/3/issue/${key}?fields=summary,attachment`, {
  headers: { Authorization: auth, Accept: 'application/json' },
});
if (!res.ok) {
  console.error(`Jira respondió ${res.status} al leer ${key}: ${await res.text()}`);
  process.exit(1);
}
const issue = await res.json();
const existing = new Set((issue.fields.attachment ?? []).map((a) => a.filename));

console.log(`${issue.key} — ${issue.fields.summary}`);
console.log(`${JIRA_BASE_URL}/browse/${issue.key}\n`);

const files = [];
for (const path of paths) {
  const full = resolve(path);
  const name = basename(full);
  const info = await stat(full).catch(() => null);
  if (!info?.isFile()) {
    console.error(`No existe o no es un archivo: ${full}`);
    process.exit(1);
  }
  if (existing.has(name)) {
    console.log(`- ${name} → ya está adjunto en ${key}, se omite`);
    continue;
  }
  files.push({ full, name, size: info.size });
  console.log(`- ${name} (${(info.size / 1024).toFixed(0)} KB) → se subirá`);
}

if (!files.length) {
  console.log('\nNo hay archivos nuevos que subir.');
  process.exit(0);
}

if (!confirmed) {
  console.log(`\nVista previa: no se subió nada. Para subir, repite el comando con --yes.`);
  process.exit(0);
}

const form = new FormData();
for (const file of files) {
  const type = mimeTypes[extname(file.name).toLowerCase()] ?? 'application/octet-stream';
  form.append('file', await openAsBlob(file.full, { type }), file.name);
}

const upload = await fetch(`${JIRA_BASE_URL}/rest/api/3/issue/${key}/attachments`, {
  method: 'POST',
  headers: { Authorization: auth, Accept: 'application/json', 'X-Atlassian-Token': 'no-check' },
  body: form,
});
if (!upload.ok) {
  console.error(`Jira respondió ${upload.status} al subir los adjuntos: ${await upload.text()}`);
  process.exit(1);
}

const uploaded = await upload.json();
console.log(`\nSubidos a ${key}:`);
uploaded.forEach((a) => console.log(`- ${a.filename} (id ${a.id})`));

await appendFile(
  'publish-log.jsonl',
  `${JSON.stringify({ date: new Date().toISOString(), action: 'attach', key, attachments: uploaded.map((a) => ({ id: a.id, filename: a.filename })) })}\n`,
);
