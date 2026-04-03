import { useState } from 'react'
import { useApp } from '../../contexts/AppContext'
import { supabase } from '../../lib/supabase'
import { X } from 'lucide-react'

const CUISINES = [
  { value: 'north_indian', label: 'North Indian' },
  { value: 'south_indian', label: 'South Indian' },
  { value: 'maharashtrian', label: 'Maharashtrian' },
  { value: 'pan_indian', label: 'Pan-Indian' },
]

const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner']
const HEALTH_TAGS = ['light', 'balanced', 'heavy']
const PREP_TIMES = ['quick', 'medium', 'elaborate']

export default function AddDishForm({ onClose, onAdded }) {
  const { household } = useApp()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [cuisine, setCuisine] = useState('north_indian')
  const [mealSlots, setMealSlots] = useState(['lunch', 'dinner'])
  const [healthTag, setHealthTag] = useState('balanced')
  const [prepTime, setPrepTime] = useState('medium')
  const [isVegetarian, setIsVegetarian] = useState(true)
  const [containsEggs, setContainsEggs] = useState(false)
  const [containsMeat, setContainsMeat] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const toggleSlot = (slot) =>
    setMealSlots(prev =>
      prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]
    )

  const handleSave = async () => {
    if (!name.trim()) return
    if (mealSlots.length === 0) { setError('Select at least one meal slot'); return }
    setSaving(true)
    setError('')

    const { data, error: err } = await supabase.from('dishes').insert({
      name: name.trim(),
      description: description.trim() || null,
      cuisine,
      meal_suitability: mealSlots,
      health_tag: healthTag,
      prep_time: prepTime,
      is_vegetarian: isVegetarian,
      contains_eggs: containsEggs,
      contains_chicken_mutton_fish: containsMeat,
      contains_beef_pork: false,
      is_custom: true,
      household_id: household.id,
    }).select().single()

    if (err) {
      setError(err.message)
      setSaving(false)
    } else {
      onAdded(data)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white px-5 pt-5 pb-3 border-b border-stone-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-stone-900">Add Dish</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><X size={20} /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Name */}
          <div>
            <label className="text-sm font-medium text-stone-700 block mb-1">Name *</label>
            <input
              autoFocus
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
              placeholder="e.g. Paneer Butter Masala"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-stone-700 block mb-1">Description</label>
            <input
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
              placeholder="Optional short description"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Cuisine */}
          <div>
            <label className="text-sm font-medium text-stone-700 block mb-1.5">Cuisine</label>
            <div className="flex flex-wrap gap-2">
              {CUISINES.map(c => (
                <button key={c.value} onClick={() => setCuisine(c.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    cuisine === c.value ? 'bg-orange-100 border-orange-300 text-orange-700' : 'bg-white border-stone-200 text-stone-500'
                  }`}>{c.label}</button>
              ))}
            </div>
          </div>

          {/* Meal slots */}
          <div>
            <label className="text-sm font-medium text-stone-700 block mb-1.5">Meal slots *</label>
            <div className="flex gap-2">
              {MEAL_SLOTS.map(slot => (
                <button key={slot} onClick={() => toggleSlot(slot)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border capitalize transition-colors ${
                    mealSlots.includes(slot) ? 'bg-orange-100 border-orange-300 text-orange-700' : 'bg-white border-stone-200 text-stone-500'
                  }`}>{slot}</button>
              ))}
            </div>
          </div>

          {/* Health tag + Prep time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-stone-700 block mb-1.5">Health</label>
              <div className="flex flex-col gap-1.5">
                {HEALTH_TAGS.map(h => (
                  <button key={h} onClick={() => setHealthTag(h)}
                    className={`py-1.5 rounded-lg text-xs font-medium border capitalize transition-colors ${
                      healthTag === h ? 'bg-orange-100 border-orange-300 text-orange-700' : 'bg-white border-stone-200 text-stone-500'
                    }`}>{h}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-stone-700 block mb-1.5">Prep time</label>
              <div className="flex flex-col gap-1.5">
                {PREP_TIMES.map(p => (
                  <button key={p} onClick={() => setPrepTime(p)}
                    className={`py-1.5 rounded-lg text-xs font-medium border capitalize transition-colors ${
                      prepTime === p ? 'bg-orange-100 border-orange-300 text-orange-700' : 'bg-white border-stone-200 text-stone-500'
                    }`}>{p}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Dietary flags */}
          <div>
            <label className="text-sm font-medium text-stone-700 block mb-1.5">Dietary</label>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => { setIsVegetarian(true); setContainsEggs(false); setContainsMeat(false) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  isVegetarian && !containsEggs && !containsMeat ? 'bg-green-100 border-green-300 text-green-700' : 'bg-white border-stone-200 text-stone-500'
                }`}>🥦 Veg</button>
              <button onClick={() => { setContainsEggs(!containsEggs); if (!containsEggs) setIsVegetarian(false) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  containsEggs ? 'bg-yellow-100 border-yellow-300 text-yellow-700' : 'bg-white border-stone-200 text-stone-500'
                }`}>🥚 Eggs</button>
              <button onClick={() => { setContainsMeat(!containsMeat); if (!containsMeat) setIsVegetarian(false) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  containsMeat ? 'bg-red-100 border-red-300 text-red-700' : 'bg-white border-stone-200 text-stone-500'
                }`}>🍗 Non-veg</button>
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>

        <div className="sticky bottom-0 bg-white px-5 py-4 border-t border-stone-100">
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="w-full bg-orange-500 disabled:bg-stone-200 disabled:text-stone-400 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {saving ? 'Adding…' : 'Add Dish'}
          </button>
        </div>
      </div>
    </div>
  )
}
