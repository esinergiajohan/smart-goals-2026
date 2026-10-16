import { parseArgs } from 'node:util';

const { JIRA_EMAIL, JIRA_API_TOKEN } = process.env;
const JIRA_BASE_URL = process.env.JIRA_BASE_URL?.replace(/\/+$/, '');
const WIKI = `${JIRA_BASE_URL}/wiki`;

const { values: opts, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    space: { type: 'string' },
    cql: { type: 'string' },
    limit: { type: 'string', default: '25' },
    all: { type: 'boolean', default: false },
    'no-comments': { type: 'boolean', default: false },
  },
});
const [command, arg] = positionals;

const usage = `Uso:
  npm run confluence -- page <id | URL>                    página completa: metadatos, ruta, cuerpo, adjuntos, hijas y comentarios
  npm run confluence -- page <id | URL> --no-comments
  npm run confluence -- search "texto" [--space EPI] [--limit 25]
  npm run confluence -- search --cql 'space = EPI AND title ~ "EAN-78"'
  npm run confluence -- spaces [filtro] [--all]            espacios globales (--all incluye personales)`;

if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN || !command) {
  console.error(usage);
  process.exit(1);
}

const headers = {
  Authorization: `Basic ${Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64')}`,
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

const call = async (path, { method = 'GET', body } = {}) => {
  const res = await fetch(path.startsWith('http') ? path : `${WIKI}${path}`, {
    method,
    headers,
    body: body && JSON.stringify(body),
  });
  if (!res.ok) {
    console.error(`Confluence respondió ${res.status} en ${method} ${path}: ${await res.text()}`);
    process.exit(1);
  }
  return res.json();
};

const all = async (path) => {
  const items = [];
  for (let next = path; next; ) {
    const page = await call(next);
    items.push(...page.results);
    next = page._links?.next;
  }
  return items;
};

const resolvePageId = async (ref) => {
  if (/^\d+$/.test(ref)) return ref;
  let url;
  try {
    url = new URL(ref);
  } catch {
    console.error(`No reconozco "${ref}" como id ni URL de Confluence.`);
    process.exit(1);
  }
  if (url.pathname.includes('/wiki/x/')) {
    const res = await fetch(url, { headers, redirect: 'follow' });
    url = new URL(res.url);
  }
  const id = url.searchParams.get('pageId') ?? url.pathname.match(/\/pages\/(?:edit-v2\/)?(\d+)/)?.[1];
  if (!id) {
    console.error(`La URL no contiene un id de página: ${ref}`);
    process.exit(1);
  }
  return id;
};

const fmtDate = (iso) => iso?.replace('T', ' ').slice(0, 16);

const inline = (nodes = [], ctx) => nodes.map((n) => inlineNode(n, ctx)).join('');

const inlineNode = (node, ctx) => {
  switch (node.type) {
    case 'text': {
      let t = node.text;
      for (const m of node.marks ?? []) {
        if (m.type === 'code') t = `\`${t}\``;
        else if (m.type === 'strong') t = `**${t}**`;
        else if (m.type === 'em') t = `_${t}_`;
        else if (m.type === 'strike') t = `~~${t}~~`;
        else if (m.type === 'link') t = `[${t}](${m.attrs?.href})`;
      }
      return t;
    }
    case 'hardBreak':
      return '\n';
    case 'mention':
      return node.attrs?.text ?? '@usuario';
    case 'emoji':
      return node.attrs?.text ?? node.attrs?.shortName ?? '';
    case 'date':
      return new Date(Number(node.attrs?.timestamp)).toISOString().slice(0, 10);
    case 'status':
      return `[${node.attrs?.text}]`;
    case 'inlineCard':
      return node.attrs?.url ?? '';
    case 'placeholder':
      return '';
    case 'mediaInline':
    case 'media':
      return `[adjunto: ${ctx.files.get(node.attrs?.id) ?? node.attrs?.alt ?? node.attrs?.id ?? '?'}]`;
    case 'inlineExtension':
      return macro(node);
    default:
      return inline(node.content, ctx);
  }
};

const macro = (node) => {
  const key = node.attrs?.extensionKey ?? 'macro';
  const params = node.attrs?.parameters?.macroParams ?? {};
  const issue = params.key?.value;
  const jql = params.jqlQuery?.value;
  if (issue) return `[Jira ${issue}]`;
  if (jql) return `[Jira JQL: ${jql}]`;
  return `[macro: ${key}]`;
};

const indentLines = (text, indent) => text.split('\n').map((l) => (l ? indent + l : l)).join('\n');

const blocks = (nodes = [], ctx) =>
  nodes
    .map((n) => block(n, ctx))
    .filter((s) => s.trim())
    .join('\n\n');

const list = (node, ctx, indent = '') =>
  (node.content ?? [])
    .map((item, i) => {
      if (item.type === 'taskList') return list(item, ctx, `${indent}  `);
      if (item.type === 'taskItem') return `${indent}- [${item.attrs?.state === 'DONE' ? 'x' : ' '}] ${inline(item.content, ctx)}`;
      if (item.type === 'decisionItem') return `${indent}- ◆ ${inline(item.content, ctx)}`;
      const marker = node.type === 'orderedList' ? `${(node.attrs?.order ?? 1) + i}.` : '-';
      const [first, ...rest] = item.content ?? [];
      const head = first?.type === 'paragraph' ? inline(first.content, ctx) : block(first ?? {}, ctx);
      const tail = rest.map((c) =>
        ['bulletList', 'orderedList', 'taskList'].includes(c.type) ? list(c, ctx, `${indent}  `) : indentLines(block(c, ctx), `${indent}  `),
      );
      return [`${indent}${marker} ${head}`, ...tail].join('\n');
    })
    .join('\n');

const table = (node, ctx) => {
  const rows = (node.content ?? []).map((row) =>
    (row.content ?? []).map((cell) => blocks(cell.content, ctx).replace(/\n+/g, '<br>').replace(/\|/g, '\\|')),
  );
  if (!rows.length) return '';
  const width = Math.max(...rows.map((r) => r.length));
  const line = (r) => `| ${Array.from({ length: width }, (_, i) => r[i] ?? '').join(' | ')} |`;
  return [line(rows[0]), `|${' --- |'.repeat(width)}`, ...rows.slice(1).map(line)].join('\n');
};

const block = (node, ctx) => {
  switch (node.type) {
    case 'paragraph':
      return inline(node.content, ctx);
    case 'heading':
      return `${'#'.repeat(node.attrs?.level ?? 2)} ${inline(node.content, ctx)}`;
    case 'bulletList':
    case 'orderedList':
    case 'taskList':
    case 'decisionList':
      return list(node, ctx);
    case 'codeBlock':
      return `\`\`\`${node.attrs?.language ?? ''}\n${inline(node.content, ctx)}\n\`\`\``;
    case 'blockquote':
      return indentLines(blocks(node.content, ctx), '> ');
    case 'panel':
      return indentLines(`[${(node.attrs?.panelType ?? 'panel').toUpperCase()}]\n${blocks(node.content, ctx)}`, '> ');
    case 'expand':
    case 'nestedExpand':
      return `▸ ${node.attrs?.title || 'Desplegable'}\n\n${blocks(node.content, ctx)}`;
    case 'rule':
      return '---';
    case 'table':
      return table(node, ctx);
    case 'mediaSingle':
    case 'mediaGroup':
      return (node.content ?? []).map((n) => inlineNode(n, ctx)).join('\n');
    case 'blockCard':
    case 'embedCard':
      return node.attrs?.url ?? '';
    case 'extension':
      return macro(node);
    case 'bodiedExtension':
      return `${macro(node)}\n\n${blocks(node.content, ctx)}`;
    case 'layoutSection':
    case 'layoutColumn':
    case 'doc':
      return blocks(node.content, ctx);
    default:
      return node.content ? blocks(node.content, ctx) : inlineNode(node, ctx);
  }
};

const adfToMarkdown = (value, ctx) => {
  if (!value) return '';
  return block(typeof value === 'string' ? JSON.parse(value) : value, ctx)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const userNames = async (ids) => {
  const unique = [...new Set(ids.filter(Boolean))];
  const names = new Map();
  for (let i = 0; i < unique.length; i += 100) {
    const { results } = await call('/api/v2/users-bulk', { method: 'POST', body: { accountIds: unique.slice(i, i + 100) } });
    results.forEach((u) => names.set(u.accountId, u.displayName ?? u.publicName));
  }
  return names;
};

const showPage = async (ref) => {
  const id = await resolvePageId(ref);
  const page = await call(`/api/v2/pages/${id}?body-format=atlas_doc_format&include-labels=true`);
  const meta = await call(`/rest/api/content/${id}?expand=ancestors,space`);
  const [attachments, children, footer, inlineComments] = await Promise.all([
    all(`/api/v2/pages/${id}/attachments?limit=250`),
    all(`/api/v2/pages/${id}/direct-children?limit=250`),
    opts['no-comments'] ? [] : all(`/api/v2/pages/${id}/footer-comments?body-format=atlas_doc_format&limit=100`),
    opts['no-comments'] ? [] : all(`/api/v2/pages/${id}/inline-comments?body-format=atlas_doc_format&limit=100`),
  ]);
  const comments = [...footer, ...inlineComments].sort((a, b) => a.version.createdAt.localeCompare(b.version.createdAt));
  const names = await userNames([page.authorId, page.version?.authorId, ...comments.map((c) => c.version?.authorId)]);
  const ctx = { files: new Map(attachments.map((a) => [a.fileId, a.title])) };
  const line = (label, value) => value && console.log(`${label}: ${value}`);

  console.log(`${page.title}`);
  console.log(`${WIKI}${page._links.webui}\n`);
  line('Id', page.id);
  line('Espacio', `${meta.space?.name} (${meta.space?.key})`);
  line('Ruta', meta.ancestors?.map((a) => a.title).join(' › '));
  line('Creada', `${fmtDate(page.createdAt)} · ${names.get(page.authorId) ?? page.authorId}`);
  line('Versión', `${page.version?.number} · ${fmtDate(page.version?.createdAt)} · ${names.get(page.version?.authorId) ?? ''}${page.version?.message ? ` — ${page.version.message}` : ''}`);
  line('Etiquetas', page.labels?.results?.map((l) => l.name).join(', '));

  console.log('\n## Contenido\n');
  console.log(adfToMarkdown(page.body?.atlas_doc_format?.value, ctx) || '(vacía)');

  if (attachments.length) {
    console.log('\n## Adjuntos');
    attachments.forEach((a) => console.log(`- ${a.title} (${a.mediaType}, ${Math.round((a.fileSize ?? 0) / 1024)} KB) ${WIKI}${a.downloadLink}`));
  }

  if (children.length) {
    console.log('\n## Páginas hijas');
    children.forEach((c) => console.log(`- ${c.id} [${c.type}] ${c.title}`));
  }

  if (!opts['no-comments']) {
    console.log(`\n## Comentarios (${comments.length})`);
    comments.forEach((c) => {
      const selection = c.properties?.inlineOriginalSelection ?? c.properties?.['inline-original-selection'];
      const kind = inlineComments.includes(c) ? `en línea${c.resolutionStatus ? ` · ${c.resolutionStatus}` : ''}` : 'pie';
      console.log(`\n--- ${names.get(c.version?.authorId) ?? c.version?.authorId} · ${fmtDate(c.version?.createdAt)} · ${kind}`);
      if (selection) console.log(`> ${selection}`);
      console.log(adfToMarkdown(c.body?.atlas_doc_format?.value, ctx));
    });
  }
};

const search = async (text) => {
  const quote = (s) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  const cql =
    opts.cql ??
    [`type = page`, text && `text ~ ${quote(text)}`, opts.space && `space = ${quote(opts.space)}`].filter(Boolean).join(' AND ') +
      (text ? '' : ' ORDER BY lastmodified DESC');
  const params = new URLSearchParams({ cql, limit: opts.limit, excerpt: 'highlight' });
  const { results, totalSize } = await call(`/rest/api/search?${params}`);
  console.log(`CQL: ${cql}`);
  console.log(`${results.length} de ${totalSize} resultados\n`);
  results.forEach((r) => {
    const excerpt = r.excerpt?.replace(/@@@(end)?hl@@@/g, '').replace(/\s+/g, ' ').trim().slice(0, 240);
    console.log(`- ${r.content?.id} · ${r.title} [${r.resultGlobalContainer?.title ?? ''}] · ${fmtDate(r.lastModified)}`);
    console.log(`  ${WIKI}${r.url}`);
    if (excerpt) console.log(`  ${excerpt}`);
  });
};

const spaces = async (filter) => {
  const list = await all(`/api/v2/spaces?limit=250${opts.all ? '' : '&type=global'}`);
  const needle = filter?.toLowerCase();
  const rows = list
    .filter((s) => !needle || s.key.toLowerCase().includes(needle) || s.name.toLowerCase().includes(needle))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((s) => ({ key: s.key, name: s.name, type: s.type, status: s.status }));
  console.table(rows);
  console.log(`${rows.length} espacios`);
};

const commands = { page: showPage, search, spaces };

if (!commands[command] || (command === 'page' && !arg) || (command === 'search' && !arg && !opts.cql && !opts.space)) {
  console.error(usage);
  process.exit(1);
}

await commands[command](arg);
