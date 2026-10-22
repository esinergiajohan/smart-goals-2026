import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './components/00-base/02-global/global.scss'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
