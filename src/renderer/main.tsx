import './i18n'
import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { EditionProvider } from './hooks/useEdition'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EditionProvider>
      <App />
    </EditionProvider>
  </StrictMode>
)
