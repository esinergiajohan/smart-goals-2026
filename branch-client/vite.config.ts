import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { jiraApi } from './server/jira-api.ts'

const rootEnvDir = fileURLToPath(new URL('..', import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), jiraApi(loadEnv(mode, rootEnvDir, 'JIRA_'))],
}))
