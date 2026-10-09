export interface ParsedApifyToken {
  key: string
  label?: string
}

/**
 * Robustly parses multi-line or message text containing Apify tokens.
 * Handles formats like:
 * - "T1: apify_api_..."
 * - "t2 - apify_api_..."
 * - "t3: apify_api_..."
 * - raw "apify_api_..."
 * Cleans up invisible unicode spaces, line breaks, and colons.
 */
export function parseApifyTokens(rawText: string): ParsedApifyToken[] {
  if (!rawText || !rawText.trim()) return []

  const results: ParsedApifyToken[] = []
  const seenKeys = new Set<string>()
  // Normalize unicode line separators (\u2028, \u2029) and standard newlines
  const lines = rawText.replace(/[\u2028\u2029]/g, '\n').split(/\r?\n/)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Pattern 1: Explicit Label followed by token, e.g. "T1: apify_api_...", "t2 - apify_api_...", "Key 3: apify_api_..."
    const labeledMatch = line.match(/^([a-zA-Z0-9_\-\s]+?)[\s:=-]+(apify_api_[a-zA-Z0-9_-]+)/i)
    if (labeledMatch) {
      const label = labeledMatch[1].trim()
      const key = labeledMatch[2].trim()
      if (!seenKeys.has(key)) {
        seenKeys.add(key)
        results.push({ key, label: label || `Key ${results.length + 1}` })
      }
      continue
    }

    // Pattern 2: Any apify_api_ tokens present on the line
    const tokenMatches = line.matchAll(/(apify_api_[a-zA-Z0-9_-]+)/gi)
    for (const match of tokenMatches) {
      const key = match[1].trim()
      if (!seenKeys.has(key)) {
        seenKeys.add(key)
        const prefix = line.substring(0, match.index || 0).replace(/[:=-]+$/, '').trim()
        const label = prefix && prefix.length <= 30 ? prefix : `Key ${results.length + 1}`
        results.push({ key, label })
      }
    }
  }

  return results
}
