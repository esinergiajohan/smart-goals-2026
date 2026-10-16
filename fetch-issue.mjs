const { JIRA_EMAIL, JIRA_API_TOKEN } = process.env;
const JIRA_BASE_URL = process.env.JIRA_BASE_URL?.replace(/\/+$/, '');
const key = process.argv[2];

if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN || !key) {
  console.error('Uso: npm run issue -- ESNEVO-1140 (requiere .env con JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN)');
  process.exit(1);
}

const headers = {
  Authorization: `Basic ${Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64')}`,
  Accept: 'application/json',
};

const get = async (path) => {
  const res = await fetch(`${JIRA_BASE_URL}/rest/api/3${path}`, { headers });
  if (!res.ok) {
    console.error(`Jira respondió ${res.status} en ${path}: ${await res.text()}`);
    process.exit(1);
  }
  return res.json();
};

const adfToText = (node, depth = 0) => {
  if (!node) return '';
  switch (node.type) {
    case 'text':
      return node.text;
    case 'hardBreak':
      return '\n';
    case 'mention':
      return node.attrs?.text ?? '@usuario';
    case 'inlineCard':
      return node.attrs?.url ?? '';
    case 'emoji':
      return node.attrs?.text ?? '';
    case 'media':
    case 'mediaInline':
      return `[adjunto ${node.attrs?.alt ?? node.attrs?.id ?? ''}]`;
    case 'listItem':
      return `${'  '.repeat(depth)}- ${(node.content ?? []).map((c) => adfToText(c, depth + 1)).join('').trim()}\n`;
    case 'bulletList':
    case 'orderedList':
      return (node.content ?? []).map((c) => adfToText(c, depth)).join('');
    case 'codeBlock':
      return `\n${(node.content ?? []).map((c) => adfToText(c)).join('')}\n`;
    case 'tableCell':
    case 'tableHeader':
      return `${(node.content ?? []).map((c) => adfToText(c)).join('').trim()} | `;
    case 'tableRow':
      return `${(node.content ?? []).map((c) => adfToText(c)).join('')}\n`;
    case 'paragraph':
    case 'heading':
      return `${(node.content ?? []).map((c) => adfToText(c, depth)).join('')}\n`;
    default:
      return (node.content ?? []).map((c) => adfToText(c, depth)).join('');
  }
};

const issue = await get(`/issue/${key}?fields=*all&expand=changelog`);
const f = issue.fields;

const comments = [];
for (let startAt = 0; ; ) {
  const page = await get(`/issue/${key}/comment?startAt=${startAt}&maxResults=100&orderBy=created`);
  comments.push(...page.comments);
  startAt += page.comments.length;
  if (!page.comments.length || startAt >= page.total) break;
}

const line = (label, value) => value && console.log(`${label}: ${value}`);

console.log(`${issue.key} — ${f.summary}`);
console.log(`${JIRA_BASE_URL}/browse/${issue.key}\n`);
line('Tipo', f.issuetype?.name);
line('Estado', f.status?.name);
line('Prioridad', f.priority?.name);
line('Proyecto', `${f.project?.name} (${f.project?.key})`);
line('Asignado', f.assignee?.displayName);
line('Reportado por', f.reporter?.displayName);
line('Creado', f.created);
line('Actualizado', f.updated);
line('Fecha límite', f.duedate);
line('Etiquetas', f.labels?.join(', '));
line('Componentes', f.components?.map((c) => c.name).join(', '));
line('Sprint', f.customfield_10020?.map((s) => s.name).join(', '));
line('Padre', f.parent && `${f.parent.key} — ${f.parent.fields?.summary}`);

console.log('\n## Descripción');
console.log(adfToText(f.description).trim() || '(vacía)');

if (f.subtasks?.length) {
  console.log('\n## Subtareas');
  f.subtasks.forEach((s) => console.log(`- ${s.key} [${s.fields.status.name}] ${s.fields.summary}`));
}

if (f.issuelinks?.length) {
  console.log('\n## Enlaces');
  f.issuelinks.forEach((l) => {
    const other = l.outwardIssue ?? l.inwardIssue;
    const rel = l.outwardIssue ? l.type.outward : l.type.inward;
    console.log(`- ${rel} ${other.key} [${other.fields.status.name}] ${other.fields.summary}`);
  });
}

if (f.attachment?.length) {
  console.log('\n## Adjuntos');
  f.attachment.forEach((a) => console.log(`- ${a.filename} (${a.mimeType}) ${a.content}`));
}

console.log(`\n## Comentarios (${comments.length})`);
comments.forEach((c) => {
  console.log(`\n--- ${c.author?.displayName} · ${c.created}`);
  console.log(adfToText(c.body).trim());
});

const transitions = (issue.changelog?.histories ?? [])
  .flatMap((h) => h.items.filter((i) => i.field === 'status').map((i) => `${h.created} · ${h.author?.displayName}: ${i.fromString} → ${i.toString}`));

if (transitions.length) {
  console.log('\n## Historial de estados');
  transitions.forEach((t) => console.log(`- ${t}`));
}
