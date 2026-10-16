import { appendFile, readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';

const { JIRA_EMAIL, JIRA_API_TOKEN } = process.env;
const JIRA_BASE_URL = process.env.JIRA_BASE_URL?.replace(/\/+$/, '');

const { values: opts, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    file: { type: 'string' },
    edit: { type: 'string' },
    list: { type: 'boolean', default: false },
    internal: { type: 'boolean', default: false },
    yes: { type: 'boolean', default: false },
  },
});
const key = positionals[0];

if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN || !key || (!opts.list && !opts.file)) {
  console.error(`Uso:
  npm run comment -- ESNEVO-2406 --list                              lista los comentarios con su id
  npm run comment -- ESNEVO-2406 --file comentario.txt [--yes]       publica un comentario nuevo
  npm run comment -- ESNEVO-2406 --edit 12345 --file comentario.txt [--yes]   edita un comentario propio
  --internal   publica como nota interna (Jira Service Management)
El archivo va en wiki markup de Jira (h3., *, [texto|url], !imagen.png|thumbnail!). Sin --yes solo muestra la vista previa.`);
  process.exit(1);
}

const headers = {
  Authorization: `Basic ${Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64')}`,
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

const call = async (method, path, body) => {
  const res = await fetch(`${JIRA_BASE_URL}/rest/api/2${path}`, { method, headers, body: body && JSON.stringify(body) });
  if (!res.ok) {
    console.error(`Jira respondió ${res.status} en ${method} ${path}: ${await res.text()}`);
    process.exit(1);
  }
  return res.json();
};

const normalize = (text) => text.replace(/\r\n/g, '\n').trim();
const commentUrl = (id) => `${JIRA_BASE_URL}/browse/${key}?focusedCommentId=${id}`;

const me = await call('GET', '/myself');
const issue = await call('GET', `/issue/${key}?fields=summary,attachment`);

const comments = [];
for (let startAt = 0; ; ) {
  const page = await call('GET', `/issue/${key}/comment?startAt=${startAt}&maxResults=100&orderBy=created`);
  comments.push(...page.comments);
  startAt += page.comments.length;
  if (!page.comments.length || startAt >= page.total) break;
}

console.log(`${issue.key} — ${issue.fields.summary}`);
console.log(`${JIRA_BASE_URL}/browse/${issue.key}\n`);

if (opts.list) {
  if (!comments.length) console.log('(sin comentarios)');
  comments.forEach((c) => {
    const mine = c.author?.accountId === me.accountId ? ' (tuyo)' : '';
    const first = normalize(c.body ?? '').split('\n')[0].slice(0, 80);
    console.log(`- id ${c.id} · ${c.author?.displayName}${mine} · ${c.created}\n    ${first}`);
  });
  process.exit(0);
}

const body = normalize(await readFile(opts.file, 'utf8'));
if (!body) {
  console.error(`El archivo ${opts.file} está vacío.`);
  process.exit(1);
}

const attached = new Set((issue.fields.attachment ?? []).map((a) => a.filename));
const images = [...body.matchAll(/!([^!|\n]+?)(?:\|[^!\n]*)?!/g)].map((m) => m[1].trim());
const missing = images.filter((name) => !/^https?:/.test(name) && !attached.has(name));

let target;
if (opts.edit) {
  target = comments.find((c) => c.id === opts.edit);
  if (!target) {
    console.error(`No existe el comentario ${opts.edit} en ${key}. Usa --list para ver los id.`);
    process.exit(1);
  }
  if (target.author?.accountId !== me.accountId) {
    console.error(`El comentario ${opts.edit} es de ${target.author?.displayName}: solo se editan comentarios propios.`);
    process.exit(1);
  }
  if (normalize(target.body ?? '') === body) {
    console.log('El comentario ya tiene exactamente ese texto. No hay nada que editar.');
    process.exit(0);
  }
  console.log(`Editar comentario ${target.id} (${target.created})\n`);
  console.log('--- Texto actual ---');
  console.log(normalize(target.body ?? ''));
  console.log('\n--- Texto nuevo ---');
} else {
  const duplicate = comments.find((c) => c.author?.accountId === me.accountId && normalize(c.body ?? '') === body);
  if (duplicate) {
    console.error(`Ya publicaste ese mismo texto (comentario ${duplicate.id}): ${commentUrl(duplicate.id)}`);
    process.exit(1);
  }
  console.log(opts.internal ? 'Nota interna nueva\n' : 'Comentario nuevo\n');
  console.log('--- Texto ---');
}
console.log(body);

if (images.length) {
  console.log('\n--- Imágenes ---');
  images.forEach((name) => console.log(`- ${name} ${missing.includes(name) ? '→ FALTA: súbela antes con npm run attach' : '→ adjunta'}`));
}

if (missing.length) {
  console.error(`\nNo se publica: faltan ${missing.length} imagen(es) por adjuntar en ${key}.`);
  process.exit(1);
}

if (!opts.yes) {
  console.log('\nVista previa: no se publicó nada. Para publicar, repite el comando con --yes.');
  process.exit(0);
}

const payload = opts.internal
  ? { body, properties: [{ key: 'sd.public.comment', value: { internal: true } }] }
  : { body };

const saved = opts.edit
  ? await call('PUT', `/issue/${key}/comment/${target.id}`, payload)
  : await call('POST', `/issue/${key}/comment`, payload);

console.log(`\n${opts.edit ? 'Editado' : 'Publicado'}: ${commentUrl(saved.id)}`);

await appendFile(
  'publish-log.jsonl',
  `${JSON.stringify({ date: new Date().toISOString(), action: opts.edit ? 'edit-comment' : 'comment', internal: opts.internal, key, commentId: saved.id, file: opts.file })}\n`,
);
