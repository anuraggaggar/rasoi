import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import { Search, ChevronRight, Plus } from 'lucide-react'
import AddDishForm from '../components/library/AddDishForm'

const CUISINES = ['all', 'north_indian', 'south_indian', 'maharashtrian', 'pan_indian', 'asian', 'italian', 'other']
const CUISINE_LABELS = {
  all: 'All', north_indian: 'North Indian', south_indian: 'South Indian',
  maharashtrian: 'Maharashtrian', pan_indian: 'Pan-Indian',
  asian: 'Asian', italian: 'Italian', other: 'Other',
}

const HEALTH_BADGE = {
  light:    'bg-green-100 text-green-700',
  balanced: 'bg-blue-100 text-blue-700',
  heavy:    'bg-orange-100 text-orange-700',
}

export default function Library() {
  const { dishes, deletedItems, household, setDishes } = useApp()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [cuisine, setCuisine] = useState('all')
  const [showAddDish, setShowAddDish] = useState(false)

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

  return (
    <div className="flex flex-col min-h-full">
      <div className="px-4 pt-10 pb-3 bg-white border-b border-stone-100">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-stone-900">Meal Library</h1>
          <button
            onClick={() => setShowAddDish(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
          >
            <Plus size={16} /> Add dish
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-stone-100 rounded-xl px-3 py-2 mb-3">
          <Search size={16} className="text-stone-400" />
          <input
            className="flex-1 bg-transparent text-sm focus:outline-none text-stone-800 placeholder:text-stone-400"
            placeholder="Search dishes…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
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
        {visibleDishes.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <p className="text-3xl mb-2">🔍</p>
            <p>No dishes found</p>
          </div>
        ) : (
          visibleDishes.map(dish => (
            <button
              key={dish.id}
              onClick={() => navigate(`/library/dish/${dish.id}`)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-stone-50 text-left"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-medium text-stone-800 text-sm truncate">{dish.name}</p>
                  {dish.is_custom && (
                    <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-100 text-purple-600">Custom</span>
                  )}
                </div>
                {dish.description && (
                  <p className="text-xs text-stone-400 truncate mt-0.5">{dish.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {dish.health_tag && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${HEALTH_BADGE[dish.health_tag]}`}>
                    {dish.health_tag}
                  </span>
                )}
                <ChevronRight size={16} className="text-stone-300" />
              </div>
            </button>
          ))
        )}
      </div>

      {showAddDish && (
        <AddDishForm
          onClose={() => setShowAddDish(false)}
          onAdded={dish => setDishes(prev => [...prev, dish])}
        />
      )}
    </div>
  )
}
