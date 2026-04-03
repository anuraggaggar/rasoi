import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './contexts/AppContext'
import Landing from './pages/Landing'
import Onboarding from './pages/Onboarding'
import HouseholdPicker from './pages/HouseholdPicker'
import Home from './pages/Home'
import Library from './pages/Library'
import DishDetail from './pages/DishDetail'
import ComboDetail from './pages/ComboDetail'
import History from './pages/History'
import Settings from './pages/Settings'
import Layout from './components/Layout'

function LoadingScreen({ showRetry }) {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 8000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-orange-50 px-6">
      <div className="text-4xl mb-3">🍽️</div>
      <div className="text-orange-600 font-medium mb-4">Loading <span style={{ fontFamily: 'Kalam, cursive' }}>Rasoi</span>…</div>
      {slow && showRetry && (
        <>
          <p className="text-stone-400 text-sm mb-4 text-center">Taking longer than usual</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-orange-500 text-white px-8 py-3 rounded-xl font-semibold"
          >
            Retry
          </button>
        </>
      )}
    </div>
  )
}

function AppRoutes() {
  const { user, household, households, householdChecked, loading } = useApp()
  const [creatingNew, setCreatingNew] = useState(false)

  // Still loading auth + data
  if (loading) return <LoadingScreen showRetry />

  if (!user) return <Routes><Route path="*" element={<Landing />} /></Routes>

  // User is logged in but household status unknown
  if (!householdChecked) return <LoadingScreen showRetry />

  // No household selected yet
  if (!household) {
    // User clicked "Create new household" from picker, or has no households at all
    if (creatingNew || households.length === 0) {
      return <Routes><Route path="*" element={<Onboarding onBack={households.length > 0 ? () => setCreatingNew(false) : null} />} /></Routes>
    }
    // Multiple households — show picker
    return <Routes><Route path="*" element={<HouseholdPicker onCreateNew={() => setCreatingNew(true)} />} /></Routes>
  }

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
