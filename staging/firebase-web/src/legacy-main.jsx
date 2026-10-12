import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { LanguageProvider } from './i18n/LanguageContext.jsx'
import { ThemeProvider } from './theme/ThemeContext.jsx'
import { ComplaintsProvider } from './store/ComplaintsContext.jsx'
import { IssueReportsProvider } from './store/IssueReportsContext.jsx'
import { RegistrationsProvider } from './store/RegistrationsContext.jsx'
import { ToastProvider } from './components/ToastContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <ToastProvider>
          <ComplaintsProvider>
            <IssueReportsProvider>
              <RegistrationsProvider>
                <App />
              </RegistrationsProvider>
            </IssueReportsProvider>
          </ComplaintsProvider>
        </ToastProvider>
      </LanguageProvider>
    </ThemeProvider>
  </StrictMode>,
)
