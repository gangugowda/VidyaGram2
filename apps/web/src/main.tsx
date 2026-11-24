import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { I18nProvider } from './lib/i18n'
import { AppProvider } from './lib/store'
import { App } from './App'
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('VidyaGram could not find the #root element')

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <I18nProvider>
      <AppProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AppProvider>
    </I18nProvider>
  </React.StrictMode>,
)
