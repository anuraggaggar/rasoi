import { useState } from 'react'
import { useApp } from '../contexts/AppContext'
import { supabase } from '../lib/supabase'
import { ChevronRight, LogOut, RotateCcw, User, Home, Utensils, ArrowLeftRight, Mail } from 'lucide-react'

export default function Settings() {
  const { household, households, familyMembers, signOut, deletedItems, setDeletedItems, refreshHouseholdData, setHousehold, setFamilyMembers } = useApp()
  const [section, setSection] = useState(null) // 'household' | 'dietary' | 'members' | 'deleted' | 'email'
  const [saving, setSaving] = useState(false)
  const [editName, setEditName] = useState(household?.name || '')
  const [editEmail, setEditEmail] = useState(household?.registered_email || '')
  const [dietaryProfile, setDietaryProfile] = useState(household?.dietary_profile || {})

  if (section === 'dietary') {
    return (
      <DietarySection
        profile={dietaryProfile}
        household={household}
        onSave={async (profile) => {
          setSaving(true)
          const { data } = await supabase.from('households').update({ dietary_profile: profile }).eq('id', household.id).select().single()
          if (data) { setHousehold(data); setDietaryProfile(data.dietary_profile) }
          setSaving(false)
          setSection(null)
        }}
        onBack={() => setSection(null)}
      />
    )
  }

  if (section === 'deleted') {
    return (
      <DeletedSection
        deletedItems={deletedItems}
        setDeletedItems={setDeletedItems}
        household={household}
        onBack={() => setSection(null)}
      />
    )
  }

  if (section === 'members') {
    return (
      <MembersSection
        familyMembers={familyMembers}
        household={household}
        setFamilyMembers={setFamilyMembers}
        onBack={() => setSection(null)}
      />
    )
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="px-4 pt-10 pb-4">
        <h1 className="text-2xl font-bold text-stone-900 mb-1">Settings</h1>
        <p className="text-stone-400 text-sm">{household?.name}</p>
      </div>

      <div className="divide-y divide-stone-100">
        <SettingsRow icon={Home} label="Household name" value={household?.name} onClick={() => setSection('household')} />
        <SettingsRow icon={Utensils} label="Dietary profile" value="What your household eats" onClick={() => setSection('dietary')} />
        <SettingsRow icon={User} label="Family members" value={`${familyMembers.length} member${familyMembers.length !== 1 ? 's' : ''}`} onClick={() => setSection('members')} />
        <SettingsRow icon={RotateCcw} label="Manage deleted dishes" value={`${deletedItems.size} hidden`} onClick={() => setSection('deleted')} />
        <SettingsRow
          icon={Mail}
          label="Email for dish import"
          value={household?.registered_email || 'Not set'}
          onClick={() => { setEditEmail(household?.registered_email || ''); setSection('email') }}
        />
      </div>

      {section === 'household' && (
        <div className="fixed inset-0 z-[60] flex items-end" onClick={() => setSection(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-t-2xl w-full max-w-lg mx-auto p-6 pb-10" onClick={e => e.stopPropagation()}>
            <p className="font-semibold text-stone-900 mb-3">Household name</p>
            <input
              className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 mb-4"
              value={editName}
              onChange={e => setEditName(e.target.value)}
            />
            <button
              onClick={async () => {
                setSaving(true)
                const { data } = await supabase.from('households').update({ name: editName.trim() }).eq('id', household.id).select().single()
                if (data) setHousehold(data)
                setSaving(false)
                setSection(null)
              }}
              disabled={!editName.trim() || saving}
              className="w-full bg-orange-500 disabled:bg-stone-200 text-white font-semibold py-3 rounded-xl"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {section === 'email' && (
        <div className="fixed inset-0 z-[60] flex items-end" onClick={() => setSection(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-t-2xl w-full max-w-lg mx-auto p-6 pb-10" onClick={e => e.stopPropagation()}>
            <p className="font-semibold text-stone-900 mb-1">Email for dish import</p>
            <p className="text-xs text-stone-400 mb-4">
              Forward any recipe link (YouTube, Instagram, website) from this email to{' '}
              <span className="font-medium text-orange-500">rasoi.recipes@gmail.com</span> — it'll be added to your library automatically.
            </p>
            <input
              type="email"
              className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 mb-4"
              placeholder="your@email.com"
              value={editEmail}
              onChange={e => setEditEmail(e.target.value)}
            />
            <button
              onClick={async () => {
                setSaving(true)
                const { data } = await supabase.from('households').update({ registered_email: editEmail.trim() || null }).eq('id', household.id).select().single()
                if (data) setHousehold(data)
                setSaving(false)
                setSection(null)
              }}
              disabled={saving}
              className="w-full bg-orange-500 disabled:bg-stone-200 text-white font-semibold py-3 rounded-xl"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      <div className="px-4 py-6 mt-auto space-y-3">
        {households.length > 1 && (
          <button
            onClick={() => setHousehold(null)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-orange-200 text-orange-500 font-medium"
          >
            <ArrowLeftRight size={16} /> Switch household
          </button>
        )}
        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-200 text-red-500 font-medium"
        >
          <LogOut size={16} /> Sign out
        </button>
        <p className="text-center text-xs text-stone-300 mt-4">Rasoi v1.0 · Made with ❤️ for Indian households</p>
      </div>
    </div>
  )
}

function SettingsRow({ icon: Icon, label, value, onClick }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-4 hover:bg-stone-50 text-left">
      <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center">
        <Icon size={18} className="text-orange-500" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-stone-800">{label}</p>
        {value && <p className="text-xs text-stone-400 mt-0.5">{value}</p>}
      </div>
      <ChevronRight size={16} className="text-stone-300" />
    </button>
  )
}

function DietarySection({ profile, household, onSave, onBack }) {
  const [p, setP] = useState({ ...profile })
  const options = [
    { key: 'vegetarian', label: 'Vegetarian dishes', emoji: '🥦' },
    { key: 'eggs', label: 'Eggs', emoji: '🥚' },
    { key: 'chicken_mutton_fish', label: 'Chicken, Mutton & Fish', emoji: '🍗' },
    { key: 'beef_pork', label: 'Beef & Pork', emoji: '🥩' },
  ]
  return (
    <div className="min-h-full bg-white px-4 pt-10">
      <button onClick={onBack} className="text-orange-500 text-sm mb-4 flex items-center gap-1">← Back</button>
      <h2 className="text-xl font-bold text-stone-900 mb-1">Dietary profile</h2>
      <p className="text-stone-400 text-sm mb-5">Dishes with unchecked ingredients are hidden everywhere.</p>
      <div className="space-y-3 mb-6">
        {options.map(({ key, label, emoji }) => (
          <button key={key} onClick={() => setP(prev => ({ ...prev, [key]: !prev[key] }))}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
              p[key] ? 'border-orange-400 bg-orange-50' : 'border-stone-200 bg-white'
            }`}>
            <span className="text-2xl">{emoji}</span>
            <div className="flex-1"><div className="font-medium text-stone-800 text-sm">{label}</div></div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${p[key] ? 'border-orange-500 bg-orange-500' : 'border-stone-300'}`}>
              {p[key] && <div className="w-2 h-2 bg-white rounded-full" />}
            </div>
          </button>
        ))}
      </div>
      <button onClick={() => onSave(p)} className="w-full bg-orange-500 text-white font-semibold py-4 rounded-xl">Save changes</button>
    </div>
  )
}

function DeletedSection({ deletedItems, setDeletedItems, household, onBack }) {
  const { dishes } = useApp()
  const deletedDishes = dishes.filter(d => deletedItems.has(d.id))

  const restore = async (dishId) => {
    await supabase.from('deleted_items').delete().eq('household_id', household.id).eq('item_id', dishId)
    setDeletedItems(prev => { const s = new Set(prev); s.delete(dishId); return s })
  }

  return (
    <div className="min-h-full bg-white px-4 pt-10">
      <button onClick={onBack} className="text-orange-500 text-sm mb-4">← Back</button>
      <h2 className="text-xl font-bold text-stone-900 mb-1">Deleted dishes</h2>
      <p className="text-stone-400 text-sm mb-4">Restore dishes to add them back to your library.</p>
      {deletedDishes.length === 0 ? (
        <p className="text-stone-400 text-sm py-8 text-center">No deleted dishes.</p>
      ) : (
        <div className="divide-y divide-stone-100">
          {deletedDishes.map(dish => (
            <div key={dish.id} className="flex items-center justify-between py-3">
              <p className="text-sm font-medium text-stone-700">{dish.name}</p>
              <button onClick={() => restore(dish.id)} className="text-orange-500 text-sm font-medium">Restore</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const DIETARY_TAGS = ['Vegetarian', 'Lactose-free', 'Gluten-free', 'Nut allergy']

function MembersSection({ familyMembers, household, setFamilyMembers, onBack }) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAge, setNewAge] = useState('')
  const [newTags, setNewTags] = useState([])

  function ageGroup(age) {
    if (age <= 12) return 'child'
    if (age <= 17) return 'teen'
    if (age <= 59) return 'adult'
    return 'senior'
  }

  const toggleTag = (tag) => setNewTags(prev =>
    prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
  )

  const addMember = async () => {
    const age = parseInt(newAge)
    const { data } = await supabase.from('family_members').insert({
      household_id: household.id,
      name: newName.trim(),
      age,
      age_group: ageGroup(age),
      dietary_tags: newTags.map(t => t.toLowerCase().replace(' ', '_')),
    }).select().single()
    if (data) {
      setFamilyMembers(prev => [...prev, data])
      setNewName(''); setNewAge(''); setNewTags([]); setAdding(false)
    }
  }

  return (
    <div className="min-h-full bg-white px-4 pt-10">
      <button onClick={onBack} className="text-orange-500 text-sm mb-4">← Back</button>
      <h2 className="text-xl font-bold text-stone-900 mb-4">Family members</h2>
      <div className="divide-y divide-stone-100 mb-4">
        {familyMembers.map(m => (
          <div key={m.id} className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-stone-800">{m.name}</p>
              <p className="text-xs text-stone-400 capitalize">{m.age_group} · {m.age} yrs</p>
            </div>
          </div>
        ))}
      </div>
      {adding ? (
        <div className="space-y-3 bg-stone-50 rounded-xl p-4">
          <input className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
            placeholder="Name" value={newName} onChange={e => setNewName(e.target.value)} />
          <input type="number" className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
            placeholder="Age" value={newAge} onChange={e => setNewAge(e.target.value)} />
          <div>
            <p className="text-xs font-medium text-stone-600 mb-1.5">Dietary needs</p>
            <div className="flex flex-wrap gap-2">
              {DIETARY_TAGS.map(tag => (
                <button key={tag} type="button" onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    newTags.includes(tag)
                      ? 'bg-orange-100 border-orange-300 text-orange-700'
                      : 'bg-white border-stone-200 text-stone-500'
                  }`}>
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setAdding(false); setNewTags([]) }} className="flex-1 py-2 border border-stone-200 rounded-lg text-sm text-stone-500">Cancel</button>
            <button onClick={addMember} disabled={!newName.trim() || !newAge}
              className="flex-1 py-2 bg-orange-500 disabled:bg-stone-200 text-white rounded-lg text-sm font-medium">Add</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="w-full py-3 rounded-xl border-2 border-dashed border-stone-200 text-stone-500 text-sm">
          + Add family member
        </button>
      )}
    </div>
  )
}
