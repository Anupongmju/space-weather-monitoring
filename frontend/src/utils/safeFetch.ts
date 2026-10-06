export const safeJson = async <T = any>(r: Response, fallback: T = [] as any): Promise<T> => {
  if (!r.ok) {
    const text = await r.text().catch(() => '')
    throw new Error(`HTTP ${r.status}: ${text || r.statusText}`)
  }
  const text = await r.text()
  if (!text || !text.trim()) return fallback
  try {
    return JSON.parse(text)
  } catch (e) {
    console.warn('[safeJson] Failed to parse JSON, returning fallback:', e)
    return fallback
  }
}
