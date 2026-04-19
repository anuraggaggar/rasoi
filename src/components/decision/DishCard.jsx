import { useNavigate } from 'react-router-dom'
import { Clock, AlertTriangle } from 'lucide-react'

const HEALTH_COLORS = {
  light:    'bg-green-100 text-green-700',
  balanced: 'bg-blue-100 text-blue-700',
  heavy:    'bg-orange-100 text-orange-700',
}

const SLOT_LABEL = {
  breakfast: "Cook this for breakfast 🌅",
  lunch:     "Cook this for lunch ☀️",
  dinner:    "Cook this tonight 🌙",
}

export default function DishCard({ dish, onSelect, mealSlot = 'dinner' }) {
  const navigate = useNavigate()

  return (
    <div
      className="bg-white rounded-xl p-4 shadow-sm border border-stone-100 active:scale-[0.98] transition-transform cursor-pointer"
      onClick={() => navigate(`/library/dish/${dish.id}`)}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <h3 className="font-semibold text-stone-900 text-base leading-tight">{dish.name}</h3>
          {dish.is_custom && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-100 text-purple-600 shrink-0">Custom</span>
          )}
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize shrink-0 ${HEALTH_COLORS[dish.health_tag]}`}>
          {dish.health_tag}
        </span>
      </div>

      {dish.description && (
        <p className="text-stone-400 text-xs mb-2 leading-relaxed line-clamp-1">{dish.description}</p>
      )}

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 capitalize">
            <Clock size={11} /> {dish.prep_time}
          </span>
          <span className="text-xs text-stone-400 capitalize">{dish.cuisine?.replace(/_/g, ' ')}</span>
        </div>

        <div className="flex flex-col items-end gap-1">
          {dish.lastCookedDays != null && (
            <span className="text-xs text-stone-400 flex items-center gap-1">
              <Clock size={11} /> {dish.lastCookedDays}d ago
            </span>
          )}
          {dish.hasDislike && (
            <span className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle size={11} />
              {dish.dislikedBy.slice(0, 2).join(', ')} dislike{dish.dislikedBy.length === 1 ? 's' : ''} this
            </span>
          )}
        </div>
      </div>

      {onSelect && (
        <button
          onClick={e => { e.stopPropagation(); onSelect(dish) }}
          className="mt-3 w-full bg-orange-500 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-orange-600 active:bg-orange-700 transition-colors"
        >
          {SLOT_LABEL[mealSlot]}
        </button>
      )}
    </div>
  )
}
