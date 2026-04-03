import { useApp } from '../contexts/AppContext'
import { Home, Plus, LogOut } from 'lucide-react'

export default function HouseholdPicker({ onCreateNew }) {
  const { households, selectHousehold, signOut } = useApp()

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-lg mx-auto">
      <div className="px-6 pt-14 pb-6">
        <h1 className="text-2xl font-bold text-stone-900 mb-1">
          Welcome back!
        </h1>
        <p className="text-stone-500 text-sm">Pick a household to continue.</p>
      </div>

      <div className="flex-1 px-6 space-y-3">
        {households.map(hh => (
          <button
            key={hh.id}
            onClick={() => selectHousehold(hh)}
            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-stone-200 bg-white hover:border-orange-400 hover:bg-orange-50 text-left transition-all"
          >
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
              <Home size={20} className="text-orange-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-stone-800 truncate">{hh.name}</p>
              <p className="text-xs text-stone-400 mt-0.5">
                Created {new Date(hh.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </button>
        ))}

        <button
          onClick={onCreateNew}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed border-stone-200 text-stone-500 text-sm hover:border-orange-300 hover:text-orange-500 transition-colors"
        >
          <Plus size={16} /> Create new household
        </button>
      </div>

      <div className="px-6 py-6">
        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-200 text-red-500 font-medium text-sm"
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </div>
  )
}
