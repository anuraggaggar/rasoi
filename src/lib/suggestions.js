/**
 * Generates a ranked, filtered list of meal combo suggestions.
 */
export function generateSuggestions({
  combos,
  mealSlot,
  checkedMemberIds,
  familyMembers,
  dietaryProfile,
  preferences,   // { dish_id: { member_id: 'like'|'dislike'|'neutral' } }
  frequencies,   // { item_id: 'never'|'rarely'|'sometimes'|'often' }
  deletedItems,  // Set<item_id>
  recentLogs,    // [{ combo_id, meal_date, dish_ids }]
}) {
  const checkedMembers = familyMembers.filter(m => checkedMemberIds.includes(m.id))

  // --- Hard filter ---
  const filtered = combos.filter(combo => {
    if (deletedItems.has(combo.id)) return false
    if ((frequencies[combo.id] || 'sometimes') === 'never') return false
    if (!combo.meal_suitability?.includes(mealSlot)) return false

    // All dishes must pass dietary profile
    for (const dish of combo.dishes || []) {
      if (deletedItems.has(dish.id)) return false
      if (!dietaryProfile.eggs && dish.contains_eggs) return false
      if (!dietaryProfile.chicken_mutton_fish && dish.contains_chicken_mutton_fish) return false
      if (!dietaryProfile.beef_pork && dish.contains_beef_pork) return false
    }

    // Per-member dietary tag constraints
    for (const member of checkedMembers) {
      const tags = member.dietary_tags || []
      for (const dish of combo.dishes || []) {
        if (tags.includes('lactose-free') && !dish.is_lactose_free) return false
        if (tags.includes('gluten-free') && !dish.is_gluten_free) return false
        if (tags.includes('nut_allergy') && !dish.is_nut_free) return false
      }
    }

    return true
  })

  const now = new Date()

  // --- Score each combo ---
  const scored = filtered.map(combo => {
    // Preference score
    let prefScore = 0
    const dislikedBy = []
    for (const member of checkedMembers) {
      for (const dish of combo.dishes || []) {
        const rating = preferences[dish.id]?.[member.id] || 'neutral'
        if (rating === 'like') prefScore += 1
        if (rating === 'dislike') {
          prefScore -= 3
          const displayName = member.name.slice(0, 5)
          if (!dislikedBy.includes(displayName)) dislikedBy.push(displayName)
        }
      }
    }

    // Recency score — based on dish-level cooking history
    let minDaysSince = 30
    for (const dish of combo.dishes || []) {
      const dishLogs = recentLogs.filter(l => l.dish_ids?.includes(dish.id))
      if (dishLogs.length > 0) {
        const latest = dishLogs.reduce((a, b) =>
          new Date(a.meal_date) > new Date(b.meal_date) ? a : b)
        const days = Math.floor((now - new Date(latest.meal_date)) / 86400000)
        if (days < minDaysSince) minDaysSince = days
      }
    }
    const recencyScore = minDaysSince / 30 // 0→1, higher = cooked less recently = better

    // Last cooked note (combo-level)
    const comboLogs = recentLogs.filter(l => l.combo_id === combo.id)
    let lastCookedDays = null
    if (comboLogs.length > 0) {
      const latest = comboLogs.reduce((a, b) =>
        new Date(a.meal_date) > new Date(b.meal_date) ? a : b)
      lastCookedDays = Math.floor((now - new Date(latest.meal_date)) / 86400000)
    }

    // Frequency affinity
    const freq = frequencies[combo.id] || 'sometimes'
    const freqScore = { often: 1, sometimes: 0.5, rarely: 0 }[freq] ?? 0.5

    const totalScore = prefScore * 5 + recencyScore * 30 + freqScore * 10

    return {
      ...combo,
      prefScore,
      dislikedBy,
      hasDislike: dislikedBy.length > 0,
      lastCookedDays,
      totalScore,
    }
  })

  // Clean combos first (no dislikes), sorted by score desc; disliked at bottom
  const clean = scored.filter(c => !c.hasDislike).sort((a, b) => b.totalScore - a.totalScore)
  const disliked = scored.filter(c => c.hasDislike).sort((a, b) => b.totalScore - a.totalScore)

  return [...clean, ...disliked]
}
