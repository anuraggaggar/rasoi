import { useState, useMemo } from 'react'
import { useApp } from '../contexts/AppContext'
import { generateSuggestions } from '../lib/suggestions'
import ComboCard from '../components/decision/ComboCard'
import FilterBar from '../components/decision/FilterBar'
import LogMealModal from '../components/logging/LogMealModal'
import { ChevronDown, Utensils } from 'lucide-react'

function detectSlot() {
  const h = new Date().getHours()
  if (h < 11) return 'breakfast'
  if (h < 16) return 'lunch'
  return 'dinner'
}

const SLOT_EMOJI = { breakfast: '🌅', lunch: '☀️', dinner: '🌙' }
const CUISINE_LABELS = {
  north_indian: 'North Indian', south_indian: 'South Indian',
  maharashtrian: 'Maharashtrian', pan_indian: 'Pan-Indian',
}

export default function Home() {
  const {
    household, familyMembers,
    combos, dishes, preferences, frequencies, deletedItems, recentLogs,
  } = useApp()

  const [mealSlot, setMealSlot] = useState(detectSlot)
  const [checkedIds, setCheckedIds] = useState(() => familyMembers.map(m => m.id))
  const [showResults, setShowResults] = useState(false)
  const [prepFilter, setPrepFilter] = useState(['quick', 'medium', 'elaborate'])
  const [healthFilter, setHealthFilter] = useState(['light', 'balanced', 'heavy'])
  const [logCombo, setLogCombo] = useState(null)

  const toggleMember = (id) =>
    setCheckedIds(ids =>
      ids.includes(id)
        ? ids.length > 1 ? ids.filter(i => i !== id) : ids
        : [...ids, id]
    )

  const suggestions = useMemo(() => {
    if (!showResults) return []
    return generateSuggestions({
      combos, mealSlot,
      checkedMemberIds: checkedIds,
      familyMembers,
      dietaryProfile: household?.dietary_profile || { vegetarian: true, eggs: false, chicken_mutton_fish: false, beef_pork: false },
      preferences, frequencies, deletedItems, recentLogs,
    })
  }, [showResults, combos, mealSlot, checkedIds, familyMembers, household, preferences, frequencies, deletedItems, recentLogs])

  const filtered = useMemo(() =>
    suggestions.filter(c =>
      prepFilter.includes(c.prep_time) && healthFilter.includes(c.health_tag)
    ),
    [suggestions, prepFilter, healthFilter]
  )

  // Group by cuisine
  const grouped = useMemo(() => {
    const groups = {}
    filtered.forEach(c => {
      const key = c.cuisine || 'other'
      if (!groups[key]) groups[key] = []
      groups[key].push(c)
    })
    return groups
  }, [filtered])

  // Weekly health nudge
  const weekLogs = recentLogs.filter(l => {
    const d = new Date(l.meal_date)
    return (new Date() - d) < 7 * 86400000
  })

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="px-5 pt-10 pb-4 bg-white border-b border-stone-100">
        <p className="text-xs text-stone-400 font-medium uppercase tracking-wide mb-1">
          {household?.name}
        </p>

        {/* Meal slot selector */}
        <div className="flex items-center gap-2 mb-5">
          <span className="text-2xl">{SLOT_EMOJI[mealSlot]}</span>
          <div>
            <p className="text-xs text-stone-400">Deciding</p>
            <div className="flex items-center gap-1">
              <h1 className="text-2xl font-bold text-stone-900 capitalize">{mealSlot}</h1>
              <button className="text-stone-400">
                <ChevronDown size={16} />
              </button>
            </div>
          </div>
          <div className="ml-auto flex gap-1">
            {['breakfast', 'lunch', 'dinner'].map(s => (
              <button key={s}
                onClick={() => { setMealSlot(s); setShowResults(false) }}
                className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
                  mealSlot === s ? 'bg-orange-500 text-white' : 'bg-stone-100 text-stone-500'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Who's eating */}
        <div>
          <p className="text-sm font-medium text-stone-600 mb-2">Who's eating?</p>
          <div className="flex flex-wrap gap-2">
            {familyMembers.map(m => (
              <button key={m.id}
                onClick={() => { toggleMember(m.id); setShowResults(false) }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  checkedIds.includes(m.id)
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-white text-stone-400 border-stone-200'
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>

        {!showResults && (
          <button
            onClick={() => setShowResults(true)}
            className="mt-4 w-full bg-orange-500 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-orange-600 transition-colors"
          >
            <Utensils size={18} /> Show Meals
          </button>
        )}
      </div>

      {/* Results */}
      {showResults && (
        <>
          <FilterBar
            prepFilter={prepFilter} setPrepFilter={setPrepFilter}
            healthFilter={healthFilter} setHealthFilter={setHealthFilter}
          />

          <div className="flex-1 px-4 py-4 space-y-6 overflow-y-auto">
            {/* Health nudge */}
            {weekLogs.length >= 3 && (() => {
              const heavyCount = weekLogs.filter(l => {
                const combo = combos.find(c => c.id === l.combo_id)
                return combo?.health_tag === 'heavy'
              }).length
              if (heavyCount >= Math.ceil(weekLogs.length * 0.5)) {
                return (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
                    🥗 Your meals this week have been mostly heavy — lighter options are ranked higher.
                  </div>
                )
              }
              return null
            })()}

            {filtered.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">🤔</p>
                <p className="text-stone-500 font-medium">No meals match your filters</p>
                <p className="text-stone-400 text-sm mt-1">Try enabling more prep time or health options.</p>
              </div>
            ) : (
              Object.entries(grouped).map(([cuisine, items]) => (
                <div key={cuisine}>
                  <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">
                    {CUISINE_LABELS[cuisine] || cuisine}
                  </h2>
                  <div className="space-y-3">
                    {items.map(combo => (
                      <ComboCard
                        key={combo.id}
                        combo={combo}
                        onSelect={() => setLogCombo(combo)}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}

            <p className="text-center text-xs text-stone-300 pb-2">
              {filtered.length} meal{filtered.length !== 1 ? 's' : ''} shown
            </p>
          </div>
        </>
      )}

      {logCombo && (
        <LogMealModal
          combo={logCombo}
          mealSlot={mealSlot}
          onClose={() => setLogCombo(null)}
        />
      )}
    </div>
  )
}
