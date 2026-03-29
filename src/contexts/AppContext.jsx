import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)
  const [household, setHousehold] = useState(null)
  const [familyMembers, setFamilyMembers] = useState([])
  const [dishes, setDishes] = useState([])
  const [combos, setCombos] = useState([])
  const [preferences, setPreferences] = useState({}) // { dish_id: { member_id: rating } }
  const [frequencies, setFrequencies] = useState({}) // { item_id: frequency }
  const [deletedItems, setDeletedItems] = useState(new Set())
  const [recentLogs, setRecentLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [householdChecked, setHouseholdChecked] = useState(false)

  // Load library (dishes + combos) — runs once, no auth needed after
  const loadLibrary = useCallback(async () => {
    const [dishResult, comboResult] = await Promise.all([
      supabase.from('dishes').select('*').order('name'),
      supabase.from('meal_combos').select(`
        *,
        combo_dishes(dish_id, position, dishes(*))
      `).order('name'),
    ])
    if (dishResult.data) setDishes(dishResult.data)
    if (dishResult.error) console.error('loadLibrary dishes error:', dishResult.error)
    if (comboResult.data) {
      setCombos(comboResult.data.map(c => ({
        ...c,
        dishes: (c.combo_dishes || [])
          .sort((a, b) => a.position - b.position)
          .map(cd => cd.dishes)
          .filter(Boolean),
      })))
    }
    if (comboResult.error) console.error('loadLibrary combos error:', comboResult.error)
  }, [])

  // Load household-specific data
  const loadHouseholdData = useCallback(async (householdId) => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [
      { data: members },
      { data: prefs },
      { data: freqs },
      { data: deleted },
      { data: logs },
    ] = await Promise.all([
      supabase.from('family_members').select('*').eq('household_id', householdId).order('created_at'),
      supabase.from('dish_preferences').select('*').eq('household_id', householdId),
      supabase.from('item_frequencies').select('*').eq('household_id', householdId),
      supabase.from('deleted_items').select('*').eq('household_id', householdId),
      supabase.from('meal_logs').select(`
        *, meal_log_dishes(dish_id)
      `).eq('household_id', householdId)
        .gte('meal_date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('meal_date', { ascending: false }),
    ])

    if (members) setFamilyMembers(members)

    if (prefs) {
      const prefMap = {}
      prefs.forEach(p => {
        if (!prefMap[p.dish_id]) prefMap[p.dish_id] = {}
        prefMap[p.dish_id][p.family_member_id] = p.rating
      })
      setPreferences(prefMap)
    }

    if (freqs) {
      const freqMap = {}
      freqs.forEach(f => { freqMap[f.item_id] = f.frequency })
      setFrequencies(freqMap)
    }

    if (deleted) {
      setDeletedItems(new Set(deleted.map(d => d.item_id)))
    }

    if (logs) {
      setRecentLogs(logs.map(log => ({
        ...log,
        dish_ids: (log.meal_log_dishes || []).map(d => d.dish_id),
      })))
    }
  }, [])

  // Load household for user
  const loadHousehold = useCallback(async (userId) => {
    const { data } = await supabase
      .from('households')
      .select('*')
      .eq('user_id', userId)
      .single()
    setHousehold(data || null)
    setHouseholdChecked(true)
    if (data) await loadHouseholdData(data.id)
  }, [loadHouseholdData])

  useEffect(() => {
    let initialized = false

    const loadData = async (userId) => {
      try {
        await Promise.allSettled([
          loadLibrary(),
          userId ? loadHousehold(userId) : Promise.resolve(),
        ])
      } catch (err) {
        console.error('Rasoi data load error:', err)
      }
      if (!userId) setHouseholdChecked(true)
    }

    // Use onAuthStateChange as the single source of truth.
    // INITIAL_SESSION fires instantly from localStorage cache — no network wait.
    // getSession() blocks on token refresh and hangs on slow connections.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const u = session?.user ?? null
      setUser(u)

      if (event === 'INITIAL_SESSION' || (event === 'SIGNED_IN' && !initialized)) {
        initialized = true
        await loadData(u?.id)
        setLoading(false)
      } else if (event === 'SIGNED_OUT') {
        setHousehold(null)
        setHouseholdChecked(true)
        setFamilyMembers([])
        setPreferences({})
        setFrequencies({})
        setDeletedItems(new Set())
        setRecentLogs([])
      }
    })

    return () => subscription.unsubscribe()
  }, [loadLibrary, loadHousehold])

  const signIn = () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const refreshHouseholdData = useCallback(async () => {
    if (household) await loadHouseholdData(household.id)
  }, [household, loadHouseholdData])

  const refreshHousehold = useCallback(async () => {
    if (user) await loadHousehold(user.id)
  }, [user, loadHousehold])

  // Compute combo health_tag and meal_suitability dynamically from dishes
  const enrichedCombos = combos.map(combo => {
    if (!combo.dishes?.length) return combo
    const healthOrder = { light: 0, balanced: 1, heavy: 2 }
    const prepOrder = { quick: 0, medium: 1, elaborate: 2 }
    const maxHealth = combo.dishes.reduce((max, d) =>
      healthOrder[d.health_tag] > healthOrder[max] ? d.health_tag : max,
      'light')
    const maxPrep = combo.dishes.reduce((max, d) =>
      prepOrder[d.prep_time] > prepOrder[max] ? d.prep_time : max,
      'quick')
    // meal_suitability = slots where ALL dishes qualify
    const allSlots = ['breakfast', 'lunch', 'dinner']
    const suitability = allSlots.filter(slot =>
      combo.dishes.every(d => d.meal_suitability?.includes(slot))
    )
    return { ...combo, health_tag: maxHealth, prep_time: maxPrep, meal_suitability: suitability }
  })

  const value = {
    user, household, householdChecked, setHouseholdChecked, familyMembers, loading,
    dishes, combos: enrichedCombos,
    preferences, frequencies, deletedItems, recentLogs,
    signIn, signOut,
    refreshHouseholdData, refreshHousehold,
    setHousehold, setFamilyMembers,
    setPreferences, setFrequencies, setDeletedItems, setRecentLogs,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = () => useContext(AppContext)
