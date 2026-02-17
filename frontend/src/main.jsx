import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext'
import { MemoriesProvider } from './contexts/MemoriesContext'
import { ChatProvider } from './contexts/ChatContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <MemoriesProvider>
          <ChatProvider>
            <App />
          </ChatProvider>
        </MemoriesProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
