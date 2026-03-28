export default function RatingToggle({ value, onChange }) {
  const options = [
    { val: 'like',    label: '👍 Like',    active: 'bg-green-100 text-green-700 border-green-300' },
    { val: 'neutral', label: '😐 OK',      active: 'bg-stone-100 text-stone-600 border-stone-300' },
    { val: 'dislike', label: '👎 Dislike', active: 'bg-red-100 text-red-600 border-red-300' },
  ]

  return (
    <div className="flex gap-1">
      {options.map(({ val, label, active }) => (
        <button key={val}
          onClick={() => onChange(val === value ? 'neutral' : val)}
          className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
            value === val ? active : 'bg-white text-stone-400 border-stone-200'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
