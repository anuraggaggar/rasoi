const PREP_OPTIONS   = ['quick', 'medium', 'elaborate']
const HEALTH_OPTIONS = ['light', 'balanced', 'heavy']

export default function FilterBar({ prepFilter, setPrepFilter, healthFilter, setHealthFilter }) {
  const toggle = (set, val, arr) =>
    set(prev => prev.includes(val) ? (prev.length > 1 ? prev.filter(v => v !== val) : prev) : [...prev, val])

  return (
    <div className="bg-white border-b border-stone-100 px-4 py-2.5 space-y-2">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        <span className="text-xs text-stone-400 shrink-0 font-medium">Prep</span>
        {PREP_OPTIONS.map(opt => (
          <button key={opt}
            onClick={() => toggle(setPrepFilter, opt, prepFilter)}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors capitalize ${
              prepFilter.includes(opt)
                ? 'bg-stone-800 text-white border-stone-800'
                : 'bg-white text-stone-400 border-stone-200'
            }`}
          >
            {opt}
          </button>
        ))}
        <div className="w-px h-4 bg-stone-200 mx-1 shrink-0" />
        <span className="text-xs text-stone-400 shrink-0 font-medium">Health</span>
        {HEALTH_OPTIONS.map(opt => (
          <button key={opt}
            onClick={() => toggle(setHealthFilter, opt, healthFilter)}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors capitalize ${
              healthFilter.includes(opt)
                ? 'bg-stone-800 text-white border-stone-800'
                : 'bg-white text-stone-400 border-stone-200'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}
