import { ThemeProvider } from "@/components/theme-provider"
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import App from './App'
import './index.css'

// Application entry point - sets up React root and providers
createRoot(document.getElementById('root')!).render(
  <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
    {/* Router setup with future flags for React Router v7 compatibility */}
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
      basename={import.meta.env.MODE === "development" ? "/" : "/rcube-js/"}
    >
      <Routes>
        {/* Main application route */}
        <Route path="/" element={<App />} />
      </Routes>
    </BrowserRouter>
  </ThemeProvider>
)
