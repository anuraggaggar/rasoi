/**
 * Generates a ranked, filtered list of dish suggestions.
 */
export function generateSuggestions({
  dishes,
  mealSlot,
  checkedMemberIds,
  familyMembers,
  dietaryProfile,
  preferences,   // { dish_id: { member_id: 'like'|'dislike'|'neutral' } }
  frequencies,   // { item_id: 'never'|'rarely'|'sometimes'|'often' }
  deletedItems,  // Set<item_id>
  recentLogs,    // [{ dish_ids, meal_date }]
}) {
  const checkedMembers = familyMembers.filter(m => checkedMemberIds.includes(m.id))

  // --- Hard filter ---
  const filtered = dishes.filter(dish => {
    if (deletedItems.has(dish.id)) return false
    if ((frequencies[dish.id] || 'sometimes') === 'never') return false
    if (!dish.meal_suitability?.includes(mealSlot)) return false

    // Household dietary profile
    if (!dietaryProfile.eggs && dish.contains_eggs) return false
    if (!dietaryProfile.chicken_mutton_fish && dish.contains_chicken_mutton_fish) return false
    if (!dietaryProfile.beef_pork && dish.contains_beef_pork) return false

    // Per-member dietary tag constraints
    for (const member of checkedMembers) {
      const tags = member.dietary_tags || []
      if (tags.includes('lactose-free') && !dish.is_lactose_free) return false
      if (tags.includes('gluten-free') && !dish.is_gluten_free) return false
      if (tags.includes('nut_allergy') && !dish.is_nut_free) return false
    }

    return true
  })

  const now = new Date()

  // --- Score each dish ---
  const scored = filtered.map(dish => {
    // Preference score
    let prefScore = 0
    const dislikedBy = []
    for (const member of checkedMembers) {
      const rating = preferences[dish.id]?.[member.id] || 'neutral'
      if (rating === 'like') prefScore += 1
      if (rating === 'dislike') {
        prefScore -= 3
        const displayName = member.name.slice(0, 5)
        if (!dislikedBy.includes(displayName)) dislikedBy.push(displayName)
      }
    }

    // Recency score — how long since this dish was last cooked
    const dishLogs = recentLogs.filter(l => l.dish_ids?.includes(dish.id))
    let daysSince = 30
    if (dishLogs.length > 0) {
      const latest = dishLogs.reduce((a, b) =>
        new Date(a.meal_date) > new Date(b.meal_date) ? a : b)
      daysSince = Math.floor((now - new Date(latest.meal_date)) / 86400000)
    }
    const recencyScore = Math.min(daysSince, 30) / 30 // 0→1, higher = cooked less recently

    // Last cooked note
    let lastCookedDays = null
    if (dishLogs.length > 0) {
      const latest = dishLogs.reduce((a, b) =>
        new Date(a.meal_date) > new Date(b.meal_date) ? a : b)
      lastCookedDays = Math.floor((now - new Date(latest.meal_date)) / 86400000)
    }

    // Frequency affinity
    const freq = frequencies[dish.id] || 'sometimes'
    const freqScore = { often: 1, sometimes: 0.5, rarely: 0 }[freq] ?? 0.5

    const totalScore = prefScore * 5 + recencyScore * 30 + freqScore * 10

    return {
      ...dish,
      prefScore,
      dislikedBy,
      hasDislike: dislikedBy.length > 0,
      lastCookedDays,
      totalScore,
    }
  })

  // Clean dishes first (no dislikes), sorted by score desc; disliked at bottom
  const clean = scored.filter(d => !d.hasDislike).sort((a, b) => b.totalScore - a.totalScore)
  const disliked = scored.filter(d => d.hasDislike).sort((a, b) => b.totalScore - a.totalScore)

  return [...clean, ...disliked]
}
