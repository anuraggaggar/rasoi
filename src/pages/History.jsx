import { useState } from 'react'
import { useApp } from '../contexts/AppContext'
import { supabase } from '../lib/supabase'
import LogMealModal from '../components/logging/LogMealModal'
import { format, isToday, isYesterday } from 'date-fns'
import { Plus } from 'lucide-react'

const SLOT_EMOJI = { breakfast: '🌅', lunch: '☀️', dinner: '🌙' }
const HEALTH_BADGE = { light: 'bg-green-100 text-green-700', balanced: 'bg-blue-100 text-blue-700', heavy: 'bg-orange-100 text-orange-700' }

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'EEE, d MMM')
}

export default function History() {
  const { recentLogs, combos, dishes, household } = useApp()
  const [logModalOpen, setLogModalOpen] = useState(false)
  const [selectedCombo, setSelectedCombo] = useState(null)

  // Group logs by date
  const grouped = recentLogs.reduce((acc, log) => {
    const key = log.meal_date
    if (!acc[key]) acc[key] = []
    acc[key].push(log)
    return acc
  }, {})

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  // Count health tags for weekly summary
  const thisWeek = recentLogs.filter(l => {
    const d = new Date(l.meal_date + 'T00:00:00')
    return (Date.now() - d.getTime()) < 7 * 86400000
  })

  const healthCounts = { light: 0, balanced: 0, heavy: 0 }
  thisWeek.forEach(log => {
    const combo = combos.find(c => c.id === log.combo_id)
    if (combo?.health_tag) healthCounts[combo.health_tag]++
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

        {/* Weekly health summary */}
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
                  .sort((a, b) => {
                    const order = { breakfast: 0, lunch: 1, dinner: 2 }
                    return order[a.meal_slot] - order[b.meal_slot]
                  })
                  .map(log => {
                    const combo = combos.find(c => c.id === log.combo_id)
                    const logDishes = log.dish_ids?.map(did => dishes.find(d => d.id === did)).filter(Boolean)

                    return (
                      <div key={log.id} className="flex items-start gap-3 bg-stone-50 rounded-xl p-3">
                        <span className="text-lg mt-0.5">{SLOT_EMOJI[log.meal_slot]}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-stone-800 text-sm">
                            {combo?.name || logDishes?.map(d => d.name).join(', ') || 'Custom meal'}
                          </p>
                          {combo && logDishes?.length > 0 && (
                            <p className="text-xs text-stone-400 mt-0.5 truncate">
                              {logDishes.map(d => d.name).join(' · ')}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-stone-400 capitalize">{log.meal_slot}</span>
                            {combo?.health_tag && (
                              <span className={`text-xs px-1.5 py-0.5 rounded-full capitalize ${HEALTH_BADGE[combo.health_tag]}`}>
                                {combo.health_tag}
                              </span>
                            )}
                            {log.mode === 'plan' && (
                              <span className="text-xs text-stone-400">planned</span>
                            )}
                          </div>
                        </div>
                        {combo && (
                          <button
                            onClick={() => setSelectedCombo(combo)}
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

      {/* Quick log modal — pick a combo */}
      {logModalOpen && !selectedCombo && (
        <QuickLogPicker combos={combos} onSelect={setSelectedCombo} onClose={() => setLogModalOpen(false)} />
      )}

      {selectedCombo && (
        <LogMealModal
          combo={selectedCombo}
          mealSlot={(() => { const h = new Date().getHours(); return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : 'dinner' })()}
          mode="record"
          onClose={() => { setSelectedCombo(null); setLogModalOpen(false) }}
        />
      )}
    </div>
  )
}

function QuickLogPicker({ combos, onSelect, onClose }) {
  const [search, setSearch] = useState('')
  const filtered = combos.filter(c => c.name.toLowerCase().includes(search.toLowerCase())).slice(0, 20)

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white rounded-t-2xl w-full max-w-lg mx-auto max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-4 pt-4 pb-2 border-b border-stone-100">
          <p className="font-semibold text-stone-900 mb-3">What did you cook?</p>
          <input
            autoFocus
            className="w-full bg-stone-100 rounded-xl px-3 py-2 text-sm focus:outline-none"
            placeholder="Search meals…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="overflow-y-auto divide-y divide-stone-100">
          {filtered.map(combo => (
            <button key={combo.id} onClick={() => onSelect(combo)}
              className="w-full text-left px-4 py-3 hover:bg-stone-50">
              <p className="font-medium text-stone-800 text-sm">{combo.name}</p>
              <p className="text-xs text-stone-400 mt-0.5 truncate">{combo.dishes?.map(d => d.name).join(' · ')}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
