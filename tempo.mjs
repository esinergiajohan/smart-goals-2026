import { appendFile, readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';

const { JIRA_EMAIL, JIRA_API_TOKEN, TEMPO_API_TOKEN } = process.env;
const JIRA_BASE_URL = process.env.JIRA_BASE_URL?.replace(/\/+$/, '');
const TEMPO_BASE_URL = (process.env.TEMPO_BASE_URL || 'https://api.tempo.io/4').replace(/\/+$/, '');

const { values: opts, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    file: { type: 'string' },
    description: { type: 'string', short: 'm' },
    time: { type: 'string' },
    date: { type: 'string' },
    start: { type: 'string' },
    attr: { type: 'string', multiple: true, default: [] },
    edit: { type: 'string' },
    list: { type: 'boolean', default: false },
    mine: { type: 'boolean', default: false },
    from: { type: 'string' },
    to: { type: 'string' },
    attributes: { type: 'boolean', default: false },
    yes: { type: 'boolean', default: false },
  },
});
const key = positionals[0];
const hasText = opts.file || opts.description;

const usage = `Uso:
  npm run tempo -- --attributes                                          lista los atributos de trabajo (marca los obligatorios)
  npm run tempo -- --mine [--from 2026-10-15] [--to 2026-10-15]          tus registros en todos los tickets, por día (por defecto hoy)
  npm run tempo -- ESNEVO-2406 --list [--from 2026-10-01] [--to 2026-10-31]   lista los registros de horas con su id
  npm run tempo -- ESNEVO-2406 --time 2h30m --file desc.txt [--date 2026-10-16] [--start 09:00] [--attr _Clave_=valor] [--yes]
  npm run tempo -- ESNEVO-2406 --time 1h -m "Texto corto" [--yes]        descripción en línea en vez de archivo
  npm run tempo -- ESNEVO-2406 --edit 12345 [--file desc.txt | -m "..."] [--time 1h] [--date ...] [--start ...] [--yes]
--time acepta 2h, 1h30m, 45m o 1.5h. --date por defecto es hoy. Sin --yes solo muestra la vista previa.`;

if (!TEMPO_API_TOKEN || !JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
  console.error('Faltan variables en .env: JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN y TEMPO_API_TOKEN (Tempo → Settings → API integration).');
  process.exit(1);
}
if (!opts.attributes && !opts.mine && (!key || (!opts.list && !opts.edit && !(hasText && opts.time)) || (opts.edit && !hasText && !opts.time && !opts.date && !opts.start))) {
  console.error(usage);
  process.exit(1);
}

const jiraHeaders = {
  Authorization: `Basic ${Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64')}`,
  Accept: 'application/json',
};
const tempoHeaders = {
  Authorization: `Bearer ${TEMPO_API_TOKEN}`,
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

const jira = async (path) => {
  const res = await fetch(`${JIRA_BASE_URL}/rest/api/3${path}`, { headers: jiraHeaders });
  if (!res.ok) {
    console.error(`Jira respondió ${res.status} en GET ${path}: ${await res.text()}`);
    process.exit(1);
  }
  return res.json();
};

const tempo = async (method, pathOrUrl, body) => {
  const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${TEMPO_BASE_URL}${pathOrUrl}`;
  const res = await fetch(url, { method, headers: tempoHeaders, body: body && JSON.stringify(body) });
  if (!res.ok) {
    console.error(`Tempo respondió ${res.status} en ${method} ${url}: ${await res.text()}`);
    process.exit(1);
  }
  return res.json();
};

const tempoAll = async (path) => {
  const items = [];
  for (let url = path; url; ) {
    const page = await tempo('GET', url);
    items.push(...page.results);
    url = page.metadata?.next;
  }
  return items;
};

const normalize = (text) => text.replace(/\r\n/g, '\n').trim();
const today = () => new Date().toLocaleDateString('en-CA');
const hours = (seconds) => `${+(seconds / 3600).toFixed(2)}h`;

const parseTime = (value) => {
  const match = value.trim().toLowerCase().match(/^(?:(\d+(?:[.,]\d+)?)h)?\s*(?:(\d+)m)?$/);
  if (!match || (!match[1] && !match[2])) return null;
  const seconds = Math.round(parseFloat((match[1] ?? '0').replace(',', '.')) * 3600) + Number(match[2] ?? 0) * 60;
  return seconds > 0 ? seconds : null;
};

const parseStart = (value) => {
  const match = value.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
  return match ? `${match[1].padStart(2, '0')}:${match[2]}:${match[3] ?? '00'}` : null;
};

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

const attributeDefs = await tempoAll('/work-attributes?limit=50');

const attrLabel = (a) => {
  const def = attributeDefs.find((d) => d.key === a.key);
  return `${def?.name ?? a.key} = ${def?.names?.[a.value] ?? a.value}`;
};

if (opts.attributes) {
  if (!attributeDefs.length) console.log('(no hay atributos de trabajo configurados)');
  attributeDefs.forEach((a) => {
    const values = a.type === 'STATIC_LIST' ? `\n    valores: ${(a.values ?? []).map((v) => `${v} (${a.names?.[v] ?? v})`).join(', ')}` : '';
    console.log(`- ${a.key} · ${a.name} · ${a.type}${a.required ? ' · OBLIGATORIO' : ''}${values}`);
  });
  process.exit(0);
}

const me = await jira('/myself');

if (opts.mine) {
  const from = opts.from ?? today();
  const to = opts.to ?? from;
  const mine = await tempoAll(`/worklogs/user/${me.accountId}?${new URLSearchParams({ from, to, limit: '50' })}`);
  const keys = new Map();
  for (const id of new Set(mine.map((w) => w.issue?.id))) {
    keys.set(id, (await jira(`/issue/${id}?fields=summary`)).key);
  }
  let day;
  let dayTotal = 0;
  const closeDay = () => day && console.log(`  Total ${day}: ${hours(dayTotal)}\n`);
  mine.forEach((w) => {
    if (w.startDate !== day) {
      closeDay();
      day = w.startDate;
      dayTotal = 0;
      console.log(day);
    }
    dayTotal += w.timeSpentSeconds;
    const end = w.startTime && new Date(Date.parse(`1970-01-01T${w.startTime}Z`) + w.timeSpentSeconds * 1000).toISOString().slice(11, 16);
    const first = normalize(w.description ?? '').split('\n')[0].slice(0, 70);
    console.log(`- id ${w.tempoWorklogId} · ${w.startTime?.slice(0, 5) ?? '--:--'}–${end ?? '--:--'} · ${hours(w.timeSpentSeconds)} · ${keys.get(w.issue?.id)} · ${first}`);
  });
  closeDay();
  if (!mine.length) console.log(`(sin registros entre ${from} y ${to})`);
  else console.log(`Total: ${hours(mine.reduce((s, w) => s + w.timeSpentSeconds, 0))}`);
  process.exit(0);
}

const issue = await jira(`/issue/${key}?fields=summary`);

console.log(`${issue.key} — ${issue.fields.summary}`);
console.log(`${JIRA_BASE_URL}/browse/${issue.key}\n`);

const range = new URLSearchParams({ limit: '50' });
if (opts.from) range.set('from', opts.from);
if (opts.to) range.set('to', opts.to);
const worklogs = await tempoAll(`/worklogs/issue/${issue.id}?${range}`);

if (opts.list) {
  if (!worklogs.length) console.log('(sin registros de horas en Tempo)');
  const names = new Map();
  for (const id of new Set(worklogs.map((w) => w.author?.accountId).filter(Boolean))) {
    const user = await jira(`/user?accountId=${encodeURIComponent(id)}`);
    names.set(id, user.displayName);
  }
  let mine = 0;
  worklogs.forEach((w) => {
    const own = w.author?.accountId === me.accountId;
    if (own) mine += w.timeSpentSeconds;
    const first = normalize(w.description ?? '').split('\n')[0].slice(0, 80);
    const attrs = (w.attributes?.values ?? []).map(attrLabel).join(' · ');
    console.log(`- id ${w.tempoWorklogId} · ${names.get(w.author?.accountId) ?? w.author?.accountId}${own ? ' (tuyo)' : ''} · ${w.startDate} ${w.startTime ?? ''} · ${hours(w.timeSpentSeconds)}\n    ${first}${attrs ? `\n    ${attrs}` : ''}`);
  });
  if (worklogs.length) console.log(`\nTotal: ${hours(worklogs.reduce((s, w) => s + w.timeSpentSeconds, 0))} · tuyas: ${hours(mine)}`);
  process.exit(0);
}

const description = opts.file ? normalize(await readFile(opts.file, 'utf8')) : opts.description !== undefined ? normalize(opts.description) : undefined;
if (description === '') fail('La descripción está vacía.');

const timeSpentSeconds = opts.time ? parseTime(opts.time) ?? fail(`Tiempo inválido: ${opts.time}. Usa 2h, 1h30m, 45m o 1.5h.`) : undefined;
const startDate = opts.date ? (/^\d{4}-\d{2}-\d{2}$/.test(opts.date) ? opts.date : fail(`Fecha inválida: ${opts.date}. Usa AAAA-MM-DD.`)) : undefined;
const startTime = opts.start ? parseStart(opts.start) ?? fail(`Hora inválida: ${opts.start}. Usa HH:MM.`) : undefined;

const attrInput = opts.attr.map((pair) => {
  const at = pair.indexOf('=');
  if (at < 1) fail(`Atributo inválido: ${pair}. Usa --attr _Clave_=valor.`);
  const attrKey = pair.slice(0, at);
  const def = attributeDefs.find((a) => a.key === attrKey) ?? fail(`No existe el atributo ${attrKey}. Usa --attributes para ver los disponibles.`);
  const raw = pair.slice(at + 1);
  if (def.type !== 'STATIC_LIST' || def.values?.includes(raw)) return { key: attrKey, value: raw };
  const value = def.values?.find((v) => def.names?.[v]?.toLowerCase() === raw.trim().toLowerCase());
  if (!value) fail(`"${raw}" no es un valor de ${def.name}. Usa --attributes para ver los valores válidos.`);
  return { key: attrKey, value };
});

let target;
let payload;
if (opts.edit) {
  target = worklogs.find((w) => String(w.tempoWorklogId) === opts.edit) ?? (await tempo('GET', `/worklogs/${opts.edit}`));
  if (target.issue?.id !== Number(issue.id)) fail(`El registro ${opts.edit} no pertenece a ${key}.`);
  if (target.author?.accountId !== me.accountId) fail(`El registro ${opts.edit} es de otra persona: solo se editan registros propios.`);

  const attributes = new Map((target.attributes?.values ?? []).map((a) => [a.key, a.value]));
  attrInput.forEach((a) => attributes.set(a.key, a.value));
  const newTime = timeSpentSeconds ?? target.timeSpentSeconds;

  payload = {
    authorAccountId: me.accountId,
    startDate: startDate ?? target.startDate,
    startTime: startTime ?? target.startTime,
    timeSpentSeconds: newTime,
    description: description ?? target.description ?? '',
    attributes: [...attributes].map(([k, value]) => ({ key: k, value })),
  };
  if (newTime === target.timeSpentSeconds && target.billableSeconds !== undefined) payload.billableSeconds = target.billableSeconds;

  const unchanged =
    payload.startDate === target.startDate &&
    payload.startTime === target.startTime &&
    payload.timeSpentSeconds === target.timeSpentSeconds &&
    payload.description === normalize(target.description ?? '') &&
    attrInput.every((a) => (target.attributes?.values ?? []).some((v) => v.key === a.key && v.value === a.value));
  if (unchanged) {
    console.log('El registro ya tiene exactamente esos datos. No hay nada que editar.');
    process.exit(0);
  }

  console.log(`Editar registro ${target.tempoWorklogId}\n`);
  console.log('--- Actual ---');
  console.log(`${target.startDate} ${target.startTime ?? ''} · ${hours(target.timeSpentSeconds)}`);
  console.log(normalize(target.description ?? ''));
  console.log('\n--- Nuevo ---');
} else {
  payload = {
    authorAccountId: me.accountId,
    issueId: Number(issue.id),
    startDate: startDate ?? today(),
    timeSpentSeconds,
    description,
    ...(startTime && { startTime }),
    ...(attrInput.length && { attributes: attrInput }),
  };

  const duplicate = worklogs.find(
    (w) => w.author?.accountId === me.accountId && w.startDate === payload.startDate && normalize(w.description ?? '') === description,
  );
  if (duplicate) fail(`Ya registraste ese mismo texto en ${key} el ${payload.startDate} (registro ${duplicate.tempoWorklogId}, ${hours(duplicate.timeSpentSeconds)}). Usa --edit ${duplicate.tempoWorklogId} para cambiarlo.`);

  console.log('Registro de horas nuevo\n');
  console.log('---');
}

console.log(`${payload.startDate} ${payload.startTime ?? ''} · ${hours(payload.timeSpentSeconds)}`);
console.log(payload.description);

const setAttrs = new Set((payload.attributes ?? []).map((a) => a.key));
const missing = attributeDefs.filter((a) => a.required && !setAttrs.has(a.key));
if (payload.attributes?.length) {
  console.log('\n--- Atributos ---');
  payload.attributes.forEach((a) => console.log(`- ${attrLabel(a)}`));
}
if (missing.length) {
  console.error(`\nNo se registra: faltan atributos obligatorios: ${missing.map((a) => `${a.key} (${a.name})`).join(', ')}. Agrégalos con --attr; --attributes muestra los valores válidos.`);
  process.exit(1);
}

const todayTotal = worklogs
  .filter((w) => w.author?.accountId === me.accountId && w.startDate === payload.startDate && String(w.tempoWorklogId) !== opts.edit)
  .reduce((s, w) => s + w.timeSpentSeconds, 0);
if (todayTotal) console.log(`\nYa tienes ${hours(todayTotal)} en ${key} el ${payload.startDate}; con este quedarían ${hours(todayTotal + payload.timeSpentSeconds)}.`);

if (!opts.yes) {
  console.log('\nVista previa: no se registró nada. Para registrar, repite el comando con --yes.');
  process.exit(0);
}

const saved = opts.edit
  ? await tempo('PUT', `/worklogs/${target.tempoWorklogId}`, payload)
  : await tempo('POST', '/worklogs', payload);

console.log(`\n${opts.edit ? 'Editado' : 'Registrado'} en Tempo: registro ${saved.tempoWorklogId} · ${saved.startDate} · ${hours(saved.timeSpentSeconds)}`);
console.log(`${JIRA_BASE_URL}/browse/${key}`);

await appendFile(
  'publish-log.jsonl',
  `${JSON.stringify({ date: new Date().toISOString(), action: opts.edit ? 'edit-worklog' : 'worklog', key, worklogId: saved.tempoWorklogId, startDate: saved.startDate, timeSpentSeconds: saved.timeSpentSeconds, file: opts.file })}\n`,
);
