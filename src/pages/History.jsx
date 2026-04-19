import { useState } from 'react'
import { useApp } from '../contexts/AppContext'
import LogDishModal from '../components/logging/LogDishModal'
import { format, isToday, isYesterday } from 'date-fns'
import { Plus, Search } from 'lucide-react'

const SLOT_EMOJI = { breakfast: '🌅', lunch: '☀️', dinner: '🌙' }
const HEALTH_BADGE = { light: 'bg-green-100 text-green-700', balanced: 'bg-blue-100 text-blue-700', heavy: 'bg-orange-100 text-orange-700' }

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'EEE, d MMM')
}

function currentSlot() {
  const h = new Date().getHours()
  return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : 'dinner'
}

export default function History() {
  const { recentLogs, dishes } = useApp()
  const [logModalOpen, setLogModalOpen] = useState(false)
  const [selectedDish, setSelectedDish] = useState(null)

  const grouped = recentLogs.reduce((acc, log) => {
    const key = log.meal_date
    if (!acc[key]) acc[key] = []
    acc[key].push(log)
    return acc
  }, {})
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  // Weekly health summary — use first dish of each log
  const thisWeek = recentLogs.filter(l =>
    (Date.now() - new Date(l.meal_date + 'T00:00:00').getTime()) < 7 * 86400000
  )
  const healthCounts = { light: 0, balanced: 0, heavy: 0 }
  thisWeek.forEach(log => {
    const dish = log.dish_ids?.[0] && dishes.find(d => d.id === log.dish_ids[0])
    if (dish?.health_tag) healthCounts[dish.health_tag]++
  })
  const totalWeek = thisWeek.length

  return (
    <div className="flex flex-col min-h-full">
      <div className="px-4 pt-10 pb-4 bg-white border-b border-stone-100">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-stone-900">History</h1>
          <button
            onClick={() => setLogModalOpen(true)}
            className="flex items-center gap-1.5 bg-orange-500 text-white text-sm font-medium px-3 py-1.5 rounded-lg"
          >
            <Plus size={15} /> Log meal
          </button>
        </div>

        {totalWeek > 0 && (
          <div className="bg-stone-50 rounded-xl p-3">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">This week</p>
            <div className="flex gap-3 text-sm">
              {[
                { key: 'light',    label: 'Light',    color: 'text-green-600' },
                { key: 'balanced', label: 'Balanced', color: 'text-blue-600' },
                { key: 'heavy',    label: 'Heavy',    color: 'text-orange-600' },
              ].map(({ key, label, color }) => (
                <div key={key} className="flex items-center gap-1">
                  <span className={`font-bold ${color}`}>{healthCounts[key]}</span>
                  <span className="text-stone-500">{label}</span>
                </div>
              ))}
              <span className="text-stone-400 text-xs self-end ml-auto">{totalWeek} meal{totalWeek !== 1 ? 's' : ''}</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 divide-y divide-stone-100">
        {sortedDates.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <p className="text-3xl mb-2">📅</p>
            <p className="font-medium">No meals logged yet</p>
            <p className="text-sm mt-1">Start cooking and log your meals!</p>
          </div>
        ) : (
          sortedDates.map(date => (
            <div key={date} className="px-4 py-3">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">
                {formatDate(date)}
              </p>
              <div className="space-y-2">
                {grouped[date]
                  .sort((a, b) => ({ breakfast: 0, lunch: 1, dinner: 2 }[a.meal_slot] - { breakfast: 0, lunch: 1, dinner: 2 }[b.meal_slot]))
                  .map(log => {
                    const logDishes = log.dish_ids?.map(did => dishes.find(d => d.id === did)).filter(Boolean) || []
                    const primaryDish = logDishes[0]

                    return (
                      <div key={log.id} className="flex items-start gap-3 bg-stone-50 rounded-xl p-3">
                        <span className="text-lg mt-0.5">{SLOT_EMOJI[log.meal_slot]}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-stone-800 text-sm">
                            {logDishes.length > 0 ? logDishes.map(d => d.name).join(', ') : 'Custom meal'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-stone-400 capitalize">{log.meal_slot}</span>
                            {primaryDish?.health_tag && (
                              <span className={`text-xs px-1.5 py-0.5 rounded-full capitalize ${HEALTH_BADGE[primaryDish.health_tag]}`}>
                                {primaryDish.health_tag}
                              </span>
                            )}
                          </div>
                        </div>
                        {primaryDish && (
                          <button
                            onClick={() => setSelectedDish(primaryDish)}
                            className="text-xs text-orange-500 font-medium shrink-0"
                          >
                            Cook again
                          </button>
                        )}
                      </div>
                    )
                  })}
              </div>
            </div>
          ))
        )}
      </div>

      {logModalOpen && !selectedDish && (
        <QuickLogPicker dishes={dishes} onSelect={setSelectedDish} onClose={() => setLogModalOpen(false)} />
      )}

      {selectedDish && (
        <LogDishModal
          dish={selectedDish}
          mealSlot={currentSlot()}
          mode="record"
          onClose={() => { setSelectedDish(null); setLogModalOpen(false) }}
        />
      )}
    </div>
  )
}

function QuickLogPicker({ dishes, onSelect, onClose }) {
  const [search, setSearch] = useState('')
  const filtered = dishes.filter(d => d.name.toLowerCase().includes(search.toLowerCase())).slice(0, 25)

  return (
    <div className="fixed inset-0 z-[60] flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white rounded-t-2xl w-full max-w-lg mx-auto max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-4 pt-4 pb-2 border-b border-stone-100">
          <p className="font-semibold text-stone-900 mb-3">What did you cook?</p>
          <div className="flex items-center gap-2 bg-stone-100 rounded-xl px-3 py-2">
            <Search size={15} className="text-stone-400" />
            <input
              autoFocus
              className="flex-1 bg-transparent text-sm focus:outline-none"
              placeholder="Search dishes…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-y-auto divide-y divide-stone-100 pb-8">
          {filtered.map(dish => (
            <button key={dish.id} onClick={() => onSelect(dish)}
              className="w-full text-left px-4 py-3 hover:bg-stone-50">
              <p className="font-medium text-stone-800 text-sm">{dish.name}</p>
              {dish.description && (
                <p className="text-xs text-stone-400 mt-0.5 truncate">{dish.description}</p>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
