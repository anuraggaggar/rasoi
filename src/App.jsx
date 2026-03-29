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

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-orange-50">
      <div className="text-center">
        <div className="text-4xl mb-3">🍽️</div>
        <div className="text-orange-600 font-medium">Loading Rasoi…</div>
      </div>
    </div>
  )
}

function RetryScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-orange-50 px-6">
      <div className="text-4xl mb-4">🍽️</div>
      <p className="text-stone-700 font-medium mb-2">Slow connection</p>
      <p className="text-stone-400 text-sm mb-6 text-center">
        Couldn't load your data. This usually resolves on retry.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="bg-orange-500 text-white px-8 py-3 rounded-xl font-semibold"
      >
        Retry
      </button>
    </div>
  )
}

function AppRoutes() {
  const { user, household, householdChecked, loading } = useApp()

  if (loading) return <LoadingScreen />

  if (!user) return <Routes><Route path="*" element={<Landing />} /></Routes>

  // User is logged in but household status unknown (init timed out before loadHousehold finished)
  // Show retry instead of Onboarding to prevent accidental re-onboarding and data loss
  if (!householdChecked) return <RetryScreen />

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
