import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import { supabase } from '../lib/supabase'
import LogMealModal from '../components/logging/LogMealModal'
import { ArrowLeft, Utensils, ThumbsUp, ThumbsDown } from 'lucide-react'

const HEALTH_BADGE = { light: 'bg-green-100 text-green-700', balanced: 'bg-blue-100 text-blue-700', heavy: 'bg-orange-100 text-orange-700' }
const FREQ_OPTIONS = ['never', 'rarely', 'sometimes', 'often']

function detectSlot() {
  const h = new Date().getHours()
  if (h < 11) return 'breakfast'
  if (h < 16) return 'lunch'
  return 'dinner'
}

export default function ComboDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { combos, familyMembers, household, preferences, frequencies, recentLogs, setFrequencies } = useApp()
  const [logging, setLogging] = useState(false)

  const combo = combos.find(c => c.id === id)
  if (!combo) return <div className="p-6 text-stone-400">Combo not found.</div>

  const freq = frequencies[id] || 'sometimes'

  const setFreq = async (f) => {
    await supabase.from('item_frequencies').upsert({
      household_id: household.id,
      item_id: id,
      item_type: 'combo',
      frequency: f,
    }, { onConflict: 'household_id,item_id,item_type' })
    setFrequencies(prev => ({ ...prev, [id]: f }))
  }

  // Last cooked
  const comboLogs = recentLogs.filter(l => l.combo_id === id)
  let lastCookedDays = null
  if (comboLogs.length > 0) {
    const latest = comboLogs.reduce((a, b) =>
      new Date(a.meal_date) > new Date(b.meal_date) ? a : b)
    lastCookedDays = Math.floor((Date.now() - new Date(latest.meal_date)) / 86400000)
  }

  return (
    <div className="min-h-full bg-white">
      <div className="px-4 pt-10 pb-4 border-b border-stone-100">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-orange-500 text-sm mb-4">
          <ArrowLeft size={16} /> Back
        </button>

        <div className="flex items-start justify-between gap-2 mb-2">
          <h1 className="text-2xl font-bold text-stone-900">{combo.name}</h1>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize shrink-0 mt-1 ${HEALTH_BADGE[combo.health_tag]}`}>
            {combo.health_tag}
          </span>
        </div>

        <div className="flex items-center gap-3 text-sm text-stone-500 mb-3">
          <span className="capitalize">🕐 {combo.prep_time}</span>
          <span className="capitalize">🍴 {combo.cuisine?.replace('_', ' ')}</span>
          {lastCookedDays != null && <span>🔄 {lastCookedDays}d ago</span>}
        </div>
      </div>

      <div className="px-4 py-5 space-y-6">
        {/* Dishes */}
        <div>
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Dishes</p>
          <div className="space-y-3">
            {combo.dishes?.map(dish => {
              const dislikedBy = familyMembers
                .filter(m => preferences[dish.id]?.[m.id] === 'dislike')
                .map(m => m.name.slice(0, 5))
              const likedBy = familyMembers
                .filter(m => preferences[dish.id]?.[m.id] === 'like')
                .map(m => m.name.slice(0, 5))

              return (
                <button
                  key={dish.id}
                  onClick={() => navigate(`/library/dish/${dish.id}`)}
                  className="w-full flex items-start justify-between text-left p-3 bg-stone-50 rounded-xl"
                >
                  <div>
                    <p className="font-medium text-stone-800 text-sm">{dish.name}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {likedBy.length > 0 && (
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <ThumbsUp size={10} /> {likedBy.join(', ')}
                        </span>
                      )}
                      {dislikedBy.length > 0 && (
                        <span className="flex items-center gap-1 text-xs text-red-500">
                          <ThumbsDown size={10} /> {dislikedBy.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs mt-0.5 px-2 py-0.5 rounded-full capitalize ${HEALTH_BADGE[dish.health_tag]}`}>
                    {dish.health_tag}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Frequency */}
        <div>
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Cooking frequency</p>
          <div className="flex gap-2">
            {FREQ_OPTIONS.map(f => (
              <button key={f}
                onClick={() => setFreq(f)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize border transition-colors ${
                  freq === f ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-stone-500 border-stone-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Log meal */}
        <button
          onClick={() => setLogging(true)}
          className="w-full bg-orange-500 text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-orange-600 transition-colors"
        >
          <Utensils size={18} /> We're cooking this tonight 🎉
        </button>
      </div>

      {logging && (
        <LogMealModal
          combo={combo}
          mealSlot={detectSlot()}
          onClose={() => setLogging(false)}
        />
      )}
    </div>
  )
}
