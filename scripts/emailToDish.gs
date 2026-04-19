/**
 * Rasoi — Email-to-Dish Google Apps Script
 *
 * HOW IT WORKS:
 *   1. A time-based trigger runs processRecipeEmails() every N minutes.
 *   2. It searches Gmail for unread emails sent to this account.
 *   3. For each email, it looks up the sender's address in the Supabase
 *      `households` table (matched against `registered_email`).
 *   4. It extracts the first URL found in the email body.
 *   5. It calls the Supabase REST API to create a new dish in that household's library.
 *   6. The email is marked read so it isn't processed again.
 *
 * SETUP:
 *   1. Open https://script.google.com → New project.
 *   2. Paste this file.
 *   3. Go to Project Settings → Script Properties and add:
 *        SUPABASE_URL   = https://uvlglymfpgowgtcxrhwr.supabase.co
 *        SUPABASE_KEY   = <your service_role key>   ← NOT the anon key
 *   4. Run installTrigger() once manually to register the time trigger.
 *   5. Authorise the Gmail and UrlFetchApp permissions when prompted.
 *
 * NOTES:
 *   - Use the service_role key (kept secret inside Script Properties) so the
 *     script can bypass RLS and read all households / insert dishes freely.
 *   - The script sets is_custom = true and household_id on the new dish, so
 *     it only appears in the correct household's library.
 *   - Dish name defaults to the email subject; if the subject is empty or a
 *     generic "Fwd:" line, it falls back to the domain of the URL.
 */

// ─── Configuration ────────────────────────────────────────────────────────────

const SUPABASE_URL = PropertiesService.getScriptProperties().getProperty('SUPABASE_URL')
const SUPABASE_KEY = PropertiesService.getScriptProperties().getProperty('SUPABASE_KEY')

// Label applied to processed emails so we can skip them on next run
const PROCESSED_LABEL = 'rasoi-processed'

// ─── Trigger installer ────────────────────────────────────────────────────────

/**
 * Run this function once manually from the Apps Script editor to register
 * a time-based trigger (every 10 minutes).
 */
function installTrigger() {
  // Remove any existing triggers first to avoid duplicates
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'processRecipeEmails')
    .forEach(t => ScriptApp.deleteTrigger(t))

  ScriptApp.newTrigger('processRecipeEmails')
    .timeBased()
    .everyMinutes(10)
    .create()

  Logger.log('Trigger installed: processRecipeEmails every 10 minutes.')
}

// ─── Main handler ─────────────────────────────────────────────────────────────

function processRecipeEmails() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    Logger.log('ERROR: Missing SUPABASE_URL or SUPABASE_KEY in Script Properties.')
    return
  }

  // Ensure our tracking label exists
  let label = GmailApp.getUserLabelByName(PROCESSED_LABEL)
  if (!label) label = GmailApp.createLabel(PROCESSED_LABEL)

  // Find unread threads that haven't been labelled yet
  const threads = GmailApp.search(`is:unread -label:${PROCESSED_LABEL}`)
  Logger.log(`Found ${threads.length} unread thread(s) to process.`)

  threads.forEach(thread => {
    const messages = thread.getMessages()
    messages.forEach(message => {
      if (message.isUnread()) {
        processMessage(message)
      }
    })
    // Mark thread as processed regardless of outcome so we don't retry endlessly
    thread.addLabel(label)
    thread.markRead()
  })
}

// ─── Per-message logic ────────────────────────────────────────────────────────

function processMessage(message) {
  const senderEmail = extractEmail(message.getFrom())
  const subject     = message.getSubject().trim()
  const body        = message.getPlainBody()

  Logger.log(`Processing message from ${senderEmail}: "${subject}"`)

  // 1. Look up the household by registered_email
  const household = findHouseholdByEmail(senderEmail)
  if (!household) {
    Logger.log(`No household found for ${senderEmail}. Skipping.`)
    return
  }

  // 2. Extract the first URL from the email body
  const url = extractFirstUrl(body)
  if (!url) {
    Logger.log('No URL found in email body. Skipping.')
    return
  }

  // 3. Try to fetch the actual title from the URL; fall back to email subject
  const urlTitle = fetchDishTitle(url)
  const dishName = urlTitle || cleanSubject(subject) || domainFromUrl(url) || 'Imported recipe'
  Logger.log(`Dish name resolved to: "${dishName}" (urlTitle=${urlTitle})`)

  // 4. Create the dish via Supabase REST API
  const created = createDish({
    household_id: household.id,
    name:         dishName,
    recipe_url:   url,
    is_custom:    true,
    // Sensible defaults — user can edit in DishDetail
    cuisine:      'other',
    meal_suitability: ['lunch', 'dinner'],
    health_tag:   'balanced',
    prep_time:    'medium',
    is_vegetarian: true,
    contains_eggs: false,
    contains_chicken_mutton_fish: false,
    contains_beef_pork: false,
  })

  if (created) {
    Logger.log(`✓ Dish created: "${dishName}" (id: ${created.id}) for household "${household.name}"`)
  } else {
    Logger.log(`✗ Failed to create dish for "${dishName}"`)
  }
}

// ─── Supabase helpers ─────────────────────────────────────────────────────────

/**
 * Find a household row where registered_email matches the sender.
 * Returns the row object or null.
 */
function findHouseholdByEmail(email) {
  const url = `${SUPABASE_URL}/rest/v1/households?registered_email=eq.${encodeURIComponent(email)}&select=id,name&limit=1`
  const response = UrlFetchApp.fetch(url, {
    method: 'GET',
    headers: supabaseHeaders(),
    muteHttpExceptions: true,
  })

  if (response.getResponseCode() !== 200) {
    Logger.log(`Supabase lookup error: ${response.getContentText()}`)
    return null
  }

  const rows = JSON.parse(response.getContentText())
  return rows.length > 0 ? rows[0] : null
}

/**
 * Insert a new dish row via Supabase REST API.
 * Returns the created row or null on error.
 */
function createDish(dish) {
  const url = `${SUPABASE_URL}/rest/v1/dishes`
  const response = UrlFetchApp.fetch(url, {
    method:      'POST',
    contentType: 'application/json',
    payload:     JSON.stringify(dish),
    headers:     { ...supabaseHeaders(), 'Prefer': 'return=representation' },
    muteHttpExceptions: true,
  })

  if (response.getResponseCode() !== 201) {
    Logger.log(`Supabase insert error (${response.getResponseCode()}): ${response.getContentText()}`)
    return null
  }

  const rows = JSON.parse(response.getContentText())
  return rows.length > 0 ? rows[0] : null
}

function supabaseHeaders() {
  return {
    'apikey':        SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type':  'application/json',
  }
}

// ─── Utility helpers ──────────────────────────────────────────────────────────

/** Extract the email address from a From: header like "Alice <alice@example.com>" */
function extractEmail(from) {
  const match = from.match(/<([^>]+)>/)
  return match ? match[1].toLowerCase().trim() : from.toLowerCase().trim()
}

/** Return the first http/https URL found in text, or null. */
function extractFirstUrl(text) {
  const match = text.match(/https?:\/\/[^\s\])"']+/)
  return match ? match[0] : null
}

/** Strip common reply/forward prefixes and whitespace from email subjects. */
function cleanSubject(subject) {
  return subject
    .replace(/^(Re|Fwd|FW|RE|FWD):\s*/gi, '')
    .trim()
}

/** Extract the readable domain from a URL for use as a fallback dish name. */
function domainFromUrl(url) {
  try {
    const match = url.match(/^https?:\/\/(?:www\.)?([^/]+)/)
    return match ? match[1] : null
  } catch (_) {
    return null
  }
}

/**
 * Try to fetch a human-readable title from a recipe URL.
 *
 * Strategy:
 *   YouTube  → oEmbed API (free, no key needed) → returns exact video title
 *   Instagram → fetch page HTML → extract og:title → strip trailing " • Instagram"
 *   Other     → fetch page HTML → extract og:title, then <title> tag as fallback
 *
 * Returns a clean title string, or null if anything fails.
 */
function fetchDishTitle(url) {
  try {
    if (isYouTubeUrl(url)) return fetchYouTubeTitle(url)
    return fetchPageTitle(url)  // handles Instagram + generic sites
  } catch (e) {
    Logger.log(`fetchDishTitle error for ${url}: ${e}`)
    return null
  }
}

function isYouTubeUrl(url) {
  return /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)/.test(url)
}

/**
 * YouTube oEmbed — completely free, no API key required.
 * Docs: https://oembed.com / https://www.youtube.com/oembed
 */
function fetchYouTubeTitle(url) {
  const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
  const response = UrlFetchApp.fetch(oEmbedUrl, { muteHttpExceptions: true })
  if (response.getResponseCode() !== 200) return null
  const json = JSON.parse(response.getContentText())
  return json.title ? json.title.trim() : null
}

function isInstagramUrl(url) {
  return /^https?:\/\/(www\.)?instagram\.com/.test(url)
}

/**
 * Generic page title fetch — works for Instagram, websites, etc.
 * Prefers og:title (usually the recipe/video name); falls back to <title>.
 */
function fetchPageTitle(url) {
  const response = UrlFetchApp.fetch(url, {
    muteHttpExceptions: true,
    followRedirects: true,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    },
  })
  if (response.getResponseCode() !== 200) return null

  const html = response.getContentText()

  // Try og:title first
  const ogMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)
  if (ogMatch) {
    const raw = decodeHtmlEntities(ogMatch[1])
    return isInstagramUrl(url) ? extractInstagramDishName(raw) : cleanPageTitle(raw)
  }

  // Fall back to <title> tag
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  if (titleMatch) {
    const raw = decodeHtmlEntities(titleMatch[1])
    return isInstagramUrl(url) ? extractInstagramDishName(raw) : cleanPageTitle(raw)
  }

  return null
}

/**
 * Instagram og:title looks like:
 *   "cookingwithyukta on Instagram: "Cafe Style Rice Bowl\nIn frame: Butter garlic Rice...""
 *
 * Strategy:
 *   1. Strip the "username on Instagram: " prefix
 *   2. Take only the first line of the caption
 *   3. Cut at common recipe-body separators ("In frame:", "Ingredients", etc.)
 *   4. Remove any hashtags that sneak in
 */
function extractInstagramDishName(raw) {
  // Strip "username on Instagram: " prefix (with optional opening quote/curly-quote)
  let text = raw.replace(/^.+?\bon\s+instagram:\s*/i, '').replace(/^["""']+/, '').trim()

  // Take only the first line
  text = text.split(/[\n\r]/)[0].trim()

  // Cut at common recipe-post section markers
  const cutPatterns = [
    /\s+in\s+frame[:\s]/i,
    /\s+ingredients?[:\s]/i,
    /\s+recipe[:\s]/i,
    /\s+method[:\s]/i,
    /\s+directions?[:\s]/i,
    /\s+how\s+to\s+make/i,
    /\s+for\s+the\s+(sauce|dressing|base|rice|pasta|gravy)/i,
    /\s+serves?\s+\d/i,
    /\s+makes?\s+\d/i,
  ]
  for (const pattern of cutPatterns) {
    const idx = text.search(pattern)
    if (idx > 8) text = text.substring(0, idx).trim()
  }

  // Remove hashtags
  text = text.replace(/#\w+/g, '').trim()

  // Remove trailing punctuation
  text = text.replace(/[.,!?:;\-–—""''']+$/, '').trim()

  // Sanity-check length — if still very long, it's probably not a clean title
  if (text.length > 70) text = text.substring(0, 70).trim()

  return text || null
}

/**
 * Remove common platform suffixes for non-Instagram pages.
 * e.g. "Paneer Butter Masala | Hebbar's Kitchen" → "Paneer Butter Masala"
 */
function cleanPageTitle(raw) {
  return raw
    .replace(/\s*[•·–—]\s*(Instagram|YouTube|Facebook|Twitter|TikTok|Pinterest)\b.*/i, '')
    .replace(/\s*\|\s*[^|]+$/, '')
    .replace(/\s*-\s*[^-]{3,}$/, '')  // strip " - Site Name" suffix
    .trim()
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
}
