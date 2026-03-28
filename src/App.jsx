import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './contexts/AppContext'
import Landing from './pages/Landing'
import Onboarding from './pages/Onboarding'
import Home from './pages/Home'
import Library from './pages/Library'
import DishDetail from './pages/DishDetail'
import ComboDetail from './pages/ComboDetail'
import History from './pages/History'
import Settings from './pages/Settings'
import Layout from './components/Layout'

function AppRoutes() {
  const { user, household, loading } = useApp()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-orange-50">
        <div className="text-center">
          <div className="text-4xl mb-3">🍽️</div>
          <div className="text-orange-600 font-medium">Loading Rasoi…</div>
        </div>
      </div>
    )
  }

  if (!user) return <Routes><Route path="*" element={<Landing />} /></Routes>
  if (!household) return <Routes><Route path="*" element={<Onboarding />} /></Routes>

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<Home />} />
        <Route path="/library" element={<Library />} />
        <Route path="/library/dish/:id" element={<DishDetail />} />
        <Route path="/library/combo/:id" element={<ComboDetail />} />
        <Route path="/history" element={<History />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  )
}
