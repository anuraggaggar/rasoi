import { useState } from 'react'
import { X, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useApp } from '../../contexts/AppContext'

export default function LogMealModal({ combo, mealSlot, onClose, mode = 'plan' }) {
  const { household, refreshHouseholdData } = useApp()
  const [logging, setLogging] = useState(false)
  const [done, setDone] = useState(false)

  const handleLog = async () => {
    setLogging(true)
    try {
      const { data: log, error: logErr } = await supabase
        .from('meal_logs')
        .insert({
          household_id: household.id,
          meal_date: new Date().toISOString().split('T')[0],
          meal_slot: mealSlot,
          combo_id: combo.id,
          mode,
        })
        .select().single()
      if (logErr) throw logErr

      if (combo.dishes?.length) {
        await supabase.from('meal_log_dishes').insert(
          combo.dishes.map(d => ({ meal_log_id: log.id, dish_id: d.id }))
        )
      }

      await refreshHouseholdData()
      setDone(true)
      setTimeout(onClose, 1200)
    } catch (e) {
      console.error(e)
      setLogging(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-t-2xl w-full max-w-lg mx-auto p-6 pb-10"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-stone-400">
          <X size={20} />
        </button>

        {done ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Check size={28} className="text-green-600" />
            </div>
            <p className="font-semibold text-stone-800">Logged!</p>
            <p className="text-stone-500 text-sm">{combo.name} added to today's history</p>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-bold text-stone-900 mb-1">{combo.name}</h2>
            <p className="text-stone-500 text-sm mb-4">
              {combo.dishes?.map(d => d.name).join(' · ')}
            </p>

            <div className="flex items-center gap-3 text-sm text-stone-500 mb-6">
              <span className="capitalize">🕐 {combo.prep_time}</span>
              <span className="capitalize">🥗 {combo.health_tag}</span>
              <span className="capitalize">🍴 {combo.cuisine?.replace('_', ' ')}</span>
            </div>

            <button
              onClick={handleLog}
              disabled={logging}
              className="w-full bg-orange-500 disabled:bg-orange-300 text-white font-semibold py-4 rounded-xl transition-colors"
            >
              {logging ? 'Logging…' : "We're cooking this tonight 🎉"}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
