import { useState, useMemo } from 'react'
import { useApp } from '../../contexts/AppContext'
import { supabase } from '../../lib/supabase'
import { X, Plus, GripVertical } from 'lucide-react'

const CUISINES = [
  { value: 'north_indian', label: 'North Indian' },
  { value: 'south_indian', label: 'South Indian' },
  { value: 'maharashtrian', label: 'Maharashtrian' },
  { value: 'pan_indian', label: 'Pan-Indian' },
]

export default function AddComboForm({ onClose, onAdded }) {
  const { household, dishes, deletedItems } = useApp()
  const [name, setName] = useState('')
  const [cuisine, setCuisine] = useState('north_indian')
  const [selectedDishIds, setSelectedDishIds] = useState([])
  const [searchDish, setSearchDish] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const profile = household?.dietary_profile || {}

  const availableDishes = useMemo(() =>
    dishes.filter(d => {
      if (deletedItems.has(d.id)) return false
      if (!profile.eggs && d.contains_eggs) return false
      if (!profile.chicken_mutton_fish && d.contains_chicken_mutton_fish) return false
      if (!profile.beef_pork && d.contains_beef_pork) return false
      if (selectedDishIds.includes(d.id)) return false
      if (searchDish && !d.name.toLowerCase().includes(searchDish.toLowerCase())) return false
      return true
    }),
    [dishes, deletedItems, profile, selectedDishIds, searchDish]
  )

  const selectedDishes = selectedDishIds.map(id => dishes.find(d => d.id === id)).filter(Boolean)

  const addDish = (id) => {
    setSelectedDishIds(prev => [...prev, id])
    setSearchDish('')
  }

  const removeDish = (id) => setSelectedDishIds(prev => prev.filter(i => i !== id))

  const handleSave = async () => {
    if (!name.trim()) return
    if (selectedDishIds.length < 2) { setError('A combo needs at least 2 dishes'); return }
    setSaving(true)
    setError('')

    const { data: combo, error: comboErr } = await supabase.from('meal_combos').insert({
      name: name.trim(),
      cuisine,
      is_custom: true,
      household_id: household.id,
    }).select().single()

    if (comboErr) {
      setError(comboErr.message)
      setSaving(false)
      return
    }

    const comboRows = selectedDishIds.map((dishId, i) => ({
      combo_id: combo.id,
      dish_id: dishId,
      position: i,
    }))
    const { error: linkErr } = await supabase.from('combo_dishes').insert(comboRows)

    if (linkErr) {
      setError(linkErr.message)
      setSaving(false)
      return
    }

    // Return combo with dishes attached
    onAdded({ ...combo, dishes: selectedDishes })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white px-5 pt-5 pb-3 border-b border-stone-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-stone-900">Add Combo</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><X size={20} /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Name */}
          <div>
            <label className="text-sm font-medium text-stone-700 block mb-1">Combo name *</label>
            <input
              autoFocus
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
              placeholder="e.g. Dal-Rice Thali"
              value={name}
              onChange={e => setName(e.target.value)}
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

          {/* Selected dishes */}
          <div>
            <label className="text-sm font-medium text-stone-700 block mb-1.5">
              Dishes in combo * <span className="text-stone-400 font-normal">({selectedDishIds.length} selected)</span>
            </label>
            {selectedDishes.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {selectedDishes.map((d, i) => (
                  <div key={d.id} className="flex items-center gap-2 bg-orange-50 rounded-lg px-3 py-2">
                    <GripVertical size={14} className="text-orange-300" />
                    <span className="text-sm text-stone-700 flex-1">{d.name}</span>
                    <button onClick={() => removeDish(d.id)} className="text-stone-400 hover:text-red-500">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Dish search */}
            <input
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400 mb-2"
              placeholder="Search dishes to add…"
              value={searchDish}
              onChange={e => setSearchDish(e.target.value)}
            />
            <div className="max-h-40 overflow-y-auto border border-stone-100 rounded-lg divide-y divide-stone-50">
              {availableDishes.slice(0, 20).map(d => (
                <button key={d.id} onClick={() => addDish(d.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-stone-50 text-left">
                  <Plus size={14} className="text-orange-400 shrink-0" />
                  <span className="text-sm text-stone-700 truncate">{d.name}</span>
                </button>
              ))}
              {availableDishes.length === 0 && (
                <p className="text-xs text-stone-400 text-center py-3">No matching dishes</p>
              )}
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>

        <div className="sticky bottom-0 bg-white px-5 py-4 border-t border-stone-100">
          <button
            onClick={handleSave}
            disabled={!name.trim() || selectedDishIds.length < 2 || saving}
            className="w-full bg-orange-500 disabled:bg-stone-200 disabled:text-stone-400 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {saving ? 'Creating…' : 'Create Combo'}
          </button>
        </div>
      </div>
    </div>
  )
}
