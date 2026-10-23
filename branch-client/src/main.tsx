import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './components/00-base/02-global/global.scss'
import App from './App.tsx'
import { DocsPage } from './components/05-pages/docs/DocsPage.tsx'
import { ReportPage } from './components/05-pages/report/ReportPage.tsx'

const pages: Record<string, () => React.JSX.Element> = {
  '/informe': ReportPage,
  '/documentacion': DocsPage,
}
const Page = pages[window.location.pathname.replace(/\/+$/, '')] ?? App

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Page />
  </StrictMode>,
)
