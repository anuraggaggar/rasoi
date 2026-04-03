import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)
  const [households, setHouseholds] = useState([]) // all households for user
  const [household, setHousehold] = useState(null) // currently selected
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

  // Load all households for user; auto-select if exactly one
  const loadHouseholds = useCallback(async (userId) => {
    const { data } = await supabase
      .from('households')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    const list = data || []
    setHouseholds(list)
    setHouseholdChecked(true)
    if (list.length === 1) {
      setHousehold(list[0])
      await loadHouseholdData(list[0].id)
    }
  }, [loadHouseholdData])

  // Select a specific household and load its data
  const selectHousehold = useCallback(async (hh) => {
    setHousehold(hh)
    setFamilyMembers([])
    setPreferences({})
    setFrequencies({})
    setDeletedItems(new Set())
    setRecentLogs([])
    await loadHouseholdData(hh.id)
  }, [loadHouseholdData])

  useEffect(() => {
    let initialized = false

    // Wrap loadData with a timeout so Supabase slow responses can't hang the app
    const loadData = (userId) => {
      const dataPromise = Promise.allSettled([
        loadLibrary(),
        userId ? loadHouseholds(userId) : Promise.resolve(),
      ]).catch(err => console.error('Rasoi data load error:', err))

      const timeout = new Promise(resolve =>
        setTimeout(() => {
          console.warn('Rasoi: data load timeout (8s) — showing app with available data')
          resolve()
        }, 8000)
      )

      return Promise.race([dataPromise, timeout]).then(() => {
        if (!userId) setHouseholdChecked(true)
      })
    }

    // Safety net: if onAuthStateChange never fires at all (corrupted state),
    // force loading=false after 5s so the app doesn't hang forever.
    const safetyTimer = setTimeout(() => {
      if (!initialized) {
        console.warn('Rasoi: auth init safety timeout — forcing load complete')
        initialized = true
        setHouseholdChecked(true)
        setLoading(false)
      }
    }, 5000)

    // Use onAuthStateChange as the single source of truth.
    // INITIAL_SESSION fires instantly from localStorage cache — no network wait.
    // getSession() blocks on token refresh and hangs on slow connections.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const u = session?.user ?? null
      setUser(u)

      if (event === 'INITIAL_SESSION' || (event === 'SIGNED_IN' && !initialized)) {
        initialized = true
        // Don't clear safetyTimer here — loadData has its own 8s timeout
        await loadData(u?.id)
        clearTimeout(safetyTimer)
        setLoading(false)
      } else if (event === 'SIGNED_OUT') {
        setHouseholds([])
        setHousehold(null)
        setHouseholdChecked(true)
        setFamilyMembers([])
        setPreferences({})
        setFrequencies({})
        setDeletedItems(new Set())
        setRecentLogs([])
      }
    })

    return () => {
      clearTimeout(safetyTimer)
      subscription.unsubscribe()
    }
  }, [loadLibrary, loadHouseholds])

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

  const refreshHouseholds = useCallback(async () => {
    if (user) await loadHouseholds(user.id)
  }, [user, loadHouseholds])

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
    user, households, household, householdChecked, setHouseholdChecked, familyMembers, loading,
    dishes, combos: enrichedCombos,
    preferences, frequencies, deletedItems, recentLogs,
    signIn, signOut,
    selectHousehold, refreshHouseholdData, refreshHouseholds,
    setHousehold, setHouseholds, setFamilyMembers, setDishes, setCombos,
    setPreferences, setFrequencies, setDeletedItems, setRecentLogs,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = () => useContext(AppContext)
