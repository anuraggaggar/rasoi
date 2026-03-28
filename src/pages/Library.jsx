import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import { Search, ChevronRight } from 'lucide-react'

const CUISINES = ['all', 'north_indian', 'south_indian', 'maharashtrian', 'pan_indian']
const CUISINE_LABELS = {
  all: 'All', north_indian: 'North Indian', south_indian: 'South Indian',
  maharashtrian: 'Maharashtrian', pan_indian: 'Pan-Indian',
}

const HEALTH_BADGE = {
  light:    'bg-green-100 text-green-700',
  balanced: 'bg-blue-100 text-blue-700',
  heavy:    'bg-orange-100 text-orange-700',
}

export default function Library() {
  const { dishes, combos, deletedItems, household } = useApp()
  const navigate = useNavigate()
  const [tab, setTab] = useState('combos')
  const [search, setSearch] = useState('')
  const [cuisine, setCuisine] = useState('all')

  const profile = household?.dietary_profile || {}

  const visibleDishes = useMemo(() =>
    dishes.filter(d => {
      if (deletedItems.has(d.id)) return false
      if (!profile.eggs && d.contains_eggs) return false
      if (!profile.chicken_mutton_fish && d.contains_chicken_mutton_fish) return false
      if (!profile.beef_pork && d.contains_beef_pork) return false
      if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false
      if (cuisine !== 'all' && d.cuisine !== cuisine) return false
      return true
    }),
    [dishes, deletedItems, profile, search, cuisine]
  )

  const visibleCombos = useMemo(() =>
    combos.filter(c => {
      if (deletedItems.has(c.id)) return false
      if (c.dishes?.some(d => deletedItems.has(d.id))) return false
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false
      if (cuisine !== 'all' && c.cuisine !== cuisine) return false
      return true
    }),
    [combos, deletedItems, search, cuisine]
  )

  const items = tab === 'combos' ? visibleCombos : visibleDishes

  return (
    <div className="flex flex-col min-h-full">
      <div className="px-4 pt-10 pb-3 bg-white border-b border-stone-100">
        <h1 className="text-2xl font-bold text-stone-900 mb-4">Meal Library</h1>

        {/* Search */}
        <div className="flex items-center gap-2 bg-stone-100 rounded-xl px-3 py-2 mb-3">
          <Search size={16} className="text-stone-400" />
          <input
            className="flex-1 bg-transparent text-sm focus:outline-none text-stone-800 placeholder:text-stone-400"
            placeholder="Search dishes or combos…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-0 bg-stone-100 rounded-lg p-0.5 mb-3">
          {['combos', 'dishes'].map(t => (
            <button key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                tab === t ? 'bg-white shadow-sm text-stone-800' : 'text-stone-400'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Cuisine filter */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {CUISINES.map(c => (
            <button key={c}
              onClick={() => setCuisine(c)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                cuisine === c
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white text-stone-500 border-stone-200'
              }`}
            >
              {CUISINE_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 divide-y divide-stone-100">
        {items.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <p className="text-3xl mb-2">🔍</p>
            <p>No results found</p>
          </div>
        ) : (
          items.map(item => (
            <button
              key={item.id}
              onClick={() => navigate(`/library/${tab === 'combos' ? 'combo' : 'dish'}/${item.id}`)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-stone-50 text-left"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-stone-800 text-sm truncate">{item.name}</p>
                {tab === 'combos' && item.dishes?.length > 0 && (
                  <p className="text-xs text-stone-400 truncate mt-0.5">
                    {item.dishes.map(d => d.name).join(' · ')}
                  </p>
                )}
                {tab === 'dishes' && item.description && (
                  <p className="text-xs text-stone-400 truncate mt-0.5">{item.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${HEALTH_BADGE[item.health_tag]}`}>
                  {item.health_tag}
                </span>
                <ChevronRight size={16} className="text-stone-300" />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
