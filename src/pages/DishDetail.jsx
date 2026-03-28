import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import { supabase } from '../lib/supabase'
import RatingToggle from '../components/shared/RatingToggle'
import { ArrowLeft, Trash2 } from 'lucide-react'

const FREQ_OPTIONS = ['never', 'rarely', 'sometimes', 'often']
const HEALTH_BADGE = { light: 'bg-green-100 text-green-700', balanced: 'bg-blue-100 text-blue-700', heavy: 'bg-orange-100 text-orange-700' }
const PREP_BADGE = { quick: 'bg-stone-100 text-stone-600', medium: 'bg-stone-100 text-stone-600', elaborate: 'bg-amber-100 text-amber-700' }

export default function DishDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { dishes, familyMembers, household, preferences, frequencies, deletedItems, setPreferences, setFrequencies, setDeletedItems } = useApp()

  const dish = dishes.find(d => d.id === id)
  if (!dish) return <div className="p-6 text-stone-400">Dish not found.</div>

  const isDeleted = deletedItems.has(id)
  const freq = frequencies[id] || 'sometimes'

  const setRating = async (memberId, rating) => {
    const { error } = await supabase.from('dish_preferences').upsert({
      household_id: household.id,
      family_member_id: memberId,
      dish_id: id,
      rating,
    }, { onConflict: 'household_id,family_member_id,dish_id' })
    if (!error) {
      setPreferences(prev => ({
        ...prev,
        [id]: { ...(prev[id] || {}), [memberId]: rating },
      }))
    }
  }

  const setFreq = async (f) => {
    await supabase.from('item_frequencies').upsert({
      household_id: household.id,
      item_id: id,
      item_type: 'dish',
      frequency: f,
    }, { onConflict: 'household_id,item_id,item_type' })
    setFrequencies(prev => ({ ...prev, [id]: f }))
  }

  const toggleDelete = async () => {
    if (isDeleted) {
      await supabase.from('deleted_items').delete()
        .eq('household_id', household.id).eq('item_id', id)
      setDeletedItems(prev => { const s = new Set(prev); s.delete(id); return s })
    } else {
      await supabase.from('deleted_items').insert({ household_id: household.id, item_id: id, item_type: 'dish' })
      setDeletedItems(prev => new Set([...prev, id]))
    }
  }

  const dietaryFlags = [
    dish.is_vegetarian && { label: 'Vegetarian', color: 'bg-green-100 text-green-700' },
    dish.is_gluten_free && { label: 'Gluten-free', color: 'bg-purple-100 text-purple-700' },
    dish.is_lactose_free && { label: 'Dairy-free', color: 'bg-blue-100 text-blue-700' },
    dish.is_nut_free && { label: 'Nut-free', color: 'bg-yellow-100 text-yellow-700' },
  ].filter(Boolean)

  return (
    <div className="min-h-full bg-white">
      <div className="px-4 pt-10 pb-4 border-b border-stone-100">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-orange-500 text-sm mb-4">
          <ArrowLeft size={16} /> Back
        </button>
        <h1 className="text-2xl font-bold text-stone-900 mb-2">{dish.name}</h1>
        {dish.description && <p className="text-stone-500 text-sm mb-3">{dish.description}</p>}

        <div className="flex flex-wrap gap-2 mb-3">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${HEALTH_BADGE[dish.health_tag]}`}>
            {dish.health_tag}
          </span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${PREP_BADGE[dish.prep_time]}`}>
            {dish.prep_time}
          </span>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 capitalize">
            {dish.cuisine?.replace('_', ' ')}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {dietaryFlags.map(({ label, color }) => (
            <span key={label} className={`text-xs px-2 py-0.5 rounded-full ${color}`}>{label}</span>
          ))}
        </div>
      </div>

      <div className="px-4 py-5 space-y-6">
        {/* Meal suitability */}
        <div>
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Suitable for</p>
          <div className="flex gap-2">
            {['breakfast', 'lunch', 'dinner'].map(s => (
              <span key={s}
                className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                  dish.meal_suitability?.includes(s) ? 'bg-orange-100 text-orange-700' : 'bg-stone-100 text-stone-400'
                }`}
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* Cooking frequency */}
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

        {/* Family preferences */}
        <div>
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Family preferences</p>
          <div className="space-y-3">
            {familyMembers.map(member => (
              <div key={member.id}>
                <p className="text-sm font-medium text-stone-700 mb-1.5">{member.name}</p>
                <RatingToggle
                  value={preferences[id]?.[member.id] || 'neutral'}
                  onChange={rating => setRating(member.id, rating)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Delete/restore */}
        <div className="pt-2 border-t border-stone-100">
          <button
            onClick={toggleDelete}
            className={`flex items-center gap-2 text-sm font-medium py-2 ${
              isDeleted ? 'text-green-600' : 'text-red-500'
            }`}
          >
            <Trash2 size={15} />
            {isDeleted ? 'Restore to library' : 'Remove from my library'}
          </button>
          {isDeleted && (
            <p className="text-xs text-stone-400 mt-1">
              This dish is hidden from suggestions and the library.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
