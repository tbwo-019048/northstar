import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/velobits/tooltip'
import { ConfigGate } from '@/components/ConfigGate'
import { ChangeNotificationHost } from '@/components/ChangeNotification'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <TooltipProvider delayDuration={200}>
        <ConfigGate>
          <App />
        </ConfigGate>
        <ChangeNotificationHost />
      </TooltipProvider>
    </BrowserRouter>
  </StrictMode>,
)
