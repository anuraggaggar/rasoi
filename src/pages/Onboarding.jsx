import { useState } from 'react'
import { useApp } from '../contexts/AppContext'
import { supabase } from '../lib/supabase'
import { ChevronRight, Plus, X } from 'lucide-react'

const DIETARY_TAGS = ['Vegetarian', 'Lactose-free', 'Gluten-free', 'Nut allergy']

function ageGroup(age) {
  if (age <= 12) return 'child'
  if (age <= 17) return 'teen'
  if (age <= 59) return 'adult'
  return 'senior'
}

function MemberForm({ member, onChange, onRemove, canRemove }) {
  return (
    <div className="bg-stone-50 rounded-xl p-4 space-y-3 relative">
      {canRemove && (
        <button onClick={onRemove} className="absolute top-3 right-3 text-stone-400 hover:text-stone-600">
          <X size={16} />
        </button>
      )}
      <div>
        <label className="text-sm font-medium text-stone-700 block mb-1">Name *</label>
        <input
          className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
          placeholder="e.g. Priya"
          value={member.name}
          onChange={e => onChange({ ...member, name: e.target.value })}
        />
      </div>
      <div>
        <label className="text-sm font-medium text-stone-700 block mb-1">Age *</label>
        <input
          type="number" min="1" max="120"
          className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
          placeholder="e.g. 38"
          value={member.age}
          onChange={e => onChange({ ...member, age: e.target.value })}
        />
        {member.age && (
          <p className="text-xs text-stone-400 mt-1 capitalize">
            {ageGroup(parseInt(member.age))}
          </p>
        )}
      </div>
      <div>
        <label className="text-sm font-medium text-stone-700 block mb-1">Dietary needs</label>
        <div className="flex flex-wrap gap-2">
          {DIETARY_TAGS.map(tag => (
            <button key={tag}
              onClick={() => {
                const tags = member.dietary_tags.includes(tag)
                  ? member.dietary_tags.filter(t => t !== tag)
                  : [...member.dietary_tags, tag]
                onChange({ ...member, dietary_tags: tags })
              }}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                member.dietary_tags.includes(tag)
                  ? 'bg-orange-100 border-orange-300 text-orange-700'
                  : 'bg-white border-stone-200 text-stone-500'
              }`}
            >
              {tag}
            </button>
          ))}
          <button
            onClick={() => onChange({ ...member, dietary_tags: member.dietary_tags.length === DIETARY_TAGS.length ? [] : member.dietary_tags })}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              member.dietary_tags.length === 0
                ? 'bg-stone-100 border-stone-300 text-stone-700'
                : 'bg-white border-stone-200 text-stone-400'
            }`}
          >
            None
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Onboarding() {
  const { user, setHousehold, setHouseholdChecked, setFamilyMembers } = useApp()
  const [step, setStep] = useState(1)
  const [householdName, setHouseholdName] = useState('')
  const [members, setMembers] = useState([
    { name: '', age: '', dietary_tags: [] }
  ])
  const [dietaryProfile, setDietaryProfile] = useState({
    vegetarian: true, eggs: false, chicken_mutton_fish: false, beef_pork: false
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const membersValid = members.every(m => m.name.trim() && m.age && parseInt(m.age) > 0)

  const updateMember = (i, val) => setMembers(ms => ms.map((m, idx) => idx === i ? val : m))
  const addMember = () => setMembers(ms => [...ms, { name: '', age: '', dietary_tags: [] }])
  const removeMember = (i) => setMembers(ms => ms.filter((_, idx) => idx !== i))

  const toggleDiet = (key) => setDietaryProfile(p => ({ ...p, [key]: !p[key] }))

  const finish = async () => {
    setSaving(true)
    setError('')
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out. Please check your connection and try again.')), 10000)
    )
    try {
      const { data: hh, error: hhErr } = await Promise.race([
        supabase.from('households')
          .insert({ user_id: user.id, name: householdName.trim(), dietary_profile: dietaryProfile })
          .select().single(),
        timeout,
      ])
      if (hhErr) throw hhErr

      const memberRows = members.map(m => ({
        household_id: hh.id,
        name: m.name.trim(),
        age: parseInt(m.age),
        age_group: ageGroup(parseInt(m.age)),
        dietary_tags: m.dietary_tags.map(t => t.toLowerCase().replace(' ', '_')),
      }))
      const { data: savedMembers, error: mErr } = await Promise.race([
        supabase.from('family_members').insert(memberRows).select(),
        timeout,
      ])
      if (mErr) throw mErr

      setHousehold(hh)
      setHouseholdChecked(true)
      setFamilyMembers(savedMembers)
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-lg mx-auto">
      {/* Progress */}
      <div className="px-6 pt-12 pb-4">
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map(s => (
            <div key={s} className={`flex-1 h-1 rounded-full transition-colors ${s <= step ? 'bg-orange-500' : 'bg-stone-200'}`} />
          ))}
        </div>
        <p className="text-xs text-stone-400 mb-1">Step {step} of 3</p>
        <h1 className="text-2xl font-bold text-stone-900">
          {step === 1 && "What's your household called?"}
          {step === 2 && "Who's in your household?"}
          {step === 3 && "What does your household eat?"}
        </h1>
        {step === 3 && (
          <p className="text-stone-500 text-sm mt-1">
            We'll hide dishes with ingredients you don't cook with.
          </p>
        )}
      </div>

      <div className="flex-1 px-6 pb-6 overflow-y-auto">
        {/* Step 1: Household name */}
        {step === 1 && (
          <input
            autoFocus
            className="w-full border border-stone-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-orange-400 mt-4"
            placeholder="e.g. The Sharma Family"
            value={householdName}
            onChange={e => setHouseholdName(e.target.value)}
          />
        )}

        {/* Step 2: Family members */}
        {step === 2 && (
          <div className="space-y-3 mt-4">
            {members.map((m, i) => (
              <MemberForm
                key={i}
                member={m}
                onChange={val => updateMember(i, val)}
                onRemove={() => removeMember(i)}
                canRemove={members.length > 1}
              />
            ))}
            <button
              onClick={addMember}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-stone-200 text-stone-500 text-sm hover:border-orange-300 hover:text-orange-500 transition-colors"
            >
              <Plus size={16} /> Add another person
            </button>
          </div>
        )}

        {/* Step 3: Dietary profile */}
        {step === 3 && (
          <div className="mt-4 space-y-3">
            {[
              { key: 'vegetarian', label: 'Vegetarian dishes', emoji: '🥦', desc: 'No meat, chicken, or fish' },
              { key: 'eggs', label: 'Eggs', emoji: '🥚', desc: 'Egg-based dishes' },
              { key: 'chicken_mutton_fish', label: 'Chicken, Mutton & Fish', emoji: '🍗', desc: 'Non-veg (no beef/pork)' },
              { key: 'beef_pork', label: 'Beef & Pork', emoji: '🥩', desc: 'All meats' },
            ].map(({ key, label, emoji, desc }) => (
              <button
                key={key}
                onClick={() => toggleDiet(key)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                  dietaryProfile[key]
                    ? 'border-orange-400 bg-orange-50'
                    : 'border-stone-200 bg-white'
                }`}
              >
                <span className="text-2xl">{emoji}</span>
                <div className="flex-1">
                  <div className="font-medium text-stone-800 text-sm">{label}</div>
                  <div className="text-xs text-stone-400">{desc}</div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  dietaryProfile[key] ? 'border-orange-500 bg-orange-500' : 'border-stone-300'
                }`}>
                  {dietaryProfile[key] && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              </button>
            ))}
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="px-6 pb-10 pt-4 border-t border-stone-100">
        {step < 3 ? (
          <button
            disabled={step === 1 ? !householdName.trim() : !membersValid}
            onClick={() => setStep(s => s + 1)}
            className="w-full bg-orange-500 disabled:bg-stone-200 disabled:text-stone-400 text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            Next <ChevronRight size={18} />
          </button>
        ) : (
          <button
            onClick={finish}
            disabled={saving}
            className="w-full bg-orange-500 disabled:bg-orange-300 text-white font-semibold py-4 rounded-xl transition-colors"
          >
            {saving ? 'Setting up…' : "Let's go 🎉"}
          </button>
        )}
      </div>
    </div>
  )
}
