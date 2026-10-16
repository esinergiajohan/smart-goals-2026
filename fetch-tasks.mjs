import { writeFile } from 'node:fs/promises';

const { JIRA_EMAIL, JIRA_API_TOKEN } = process.env;
const JIRA_BASE_URL = process.env.JIRA_BASE_URL?.replace(/\/+$/, '');

if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
  console.error('Faltan JIRA_BASE_URL, JIRA_EMAIL o JIRA_API_TOKEN en .env');
  process.exit(1);
}

const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
const jql = process.argv[2] ?? 'assignee = currentUser() ORDER BY updated DESC';
const fields = ['summary', 'status', 'priority', 'issuetype', 'project', 'duedate', 'created', 'updated'];

const issues = [];
let nextPageToken;

do {
  const res = await fetch(`${JIRA_BASE_URL}/rest/api/3/search/jql`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ jql, fields, maxResults: 100, nextPageToken }),
  });

  if (!res.ok) {
    console.error(`Jira respondió ${res.status}: ${await res.text()}`);
    process.exit(1);
  }

  const page = await res.json();
  issues.push(...page.issues);
  nextPageToken = page.nextPageToken;
} while (nextPageToken);

const tasks = issues.map(({ key, fields: f }) => ({
  key,
  summary: f.summary,
  status: f.status?.name,
  priority: f.priority?.name,
  type: f.issuetype?.name,
  project: f.project?.key,
  dueDate: f.duedate,
  created: f.created,
  updated: f.updated,
  url: `${JIRA_BASE_URL}/browse/${key}`,
}));

await writeFile('tasks.json', JSON.stringify(tasks, null, 2));

console.table(tasks.map(({ key, status, type, summary }) => ({ key, status, type, summary })));
console.log(`${tasks.length} tareas → tasks.json`);
