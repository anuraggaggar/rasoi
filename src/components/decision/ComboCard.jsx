import { useNavigate } from 'react-router-dom'
import { Clock, Leaf, AlertTriangle } from 'lucide-react'

const HEALTH_COLORS = {
  light:    'bg-green-100 text-green-700',
  balanced: 'bg-blue-100 text-blue-700',
  heavy:    'bg-orange-100 text-orange-700',
}

const PREP_COLORS = {
  quick:     'bg-stone-100 text-stone-600',
  medium:    'bg-stone-100 text-stone-600',
  elaborate: 'bg-stone-100 text-stone-600',
}

export default function ComboCard({ combo, onSelect }) {
  const navigate = useNavigate()

  return (
    <div
      className="bg-white rounded-xl p-4 shadow-sm border border-stone-100 active:scale-98 transition-transform cursor-pointer"
      onClick={() => navigate(`/library/combo/${combo.id}`)}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-stone-900 text-base leading-tight">{combo.name}</h3>
        <div className="flex items-center gap-1 shrink-0">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${HEALTH_COLORS[combo.health_tag]}`}>
            {combo.health_tag}
          </span>
        </div>
      </div>

      <p className="text-stone-500 text-sm mb-3 leading-relaxed">
        {combo.dishes?.map(d => d.name).join(' · ')}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${PREP_COLORS[combo.prep_time]}`}>
            <Clock size={11} /> {combo.prep_time}
          </span>
          <span className="text-xs text-stone-400 capitalize">{combo.cuisine?.replace('_', ' ')}</span>
        </div>

        <div className="flex flex-col items-end gap-1">
          {combo.lastCookedDays != null && (
            <span className="text-xs text-stone-400 flex items-center gap-1">
              <Clock size={11} /> {combo.lastCookedDays}d ago
            </span>
          )}
          {combo.hasDislike && (
            <span className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle size={11} />
              {combo.dislikedBy.slice(0, 2).join(', ')} {combo.dislikedBy.length > 2 ? '+more' : ''} dislike{combo.dislikedBy.length === 1 ? 's' : ''} this
            </span>
          )}
        </div>
      </div>

      {onSelect && (
        <button
          onClick={e => { e.stopPropagation(); onSelect(combo) }}
          className="mt-3 w-full bg-orange-500 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-orange-600 active:bg-orange-700 transition-colors"
        >
          We're cooking this tonight 🎉
        </button>
      )}
    </div>
  )
}
