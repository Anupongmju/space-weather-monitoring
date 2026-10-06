/**
 * Formats numeric values into scientific notation / powers of 10 with Unicode superscripts.
 * Examples:
 *   0.001   -> 10⁻³
 *   0.01    -> 10⁻²
 *   0.1     -> 10⁻¹
 *   1       -> 10⁰
 *   10      -> 10¹
 *   100     -> 10²
 *   1000    -> 10³
 *   10000   -> 10⁴
 *   100000  -> 10⁵
 *   1500    -> 1.5×10³
 */
export const toSuperscript = (numStr: string | number): string => {
  const supMap: Record<string, string> = {
    '0': '⁰',
    '1': '¹',
    '2': '²',
    '3': '³',
    '4': '⁴',
    '5': '⁵',
    '6': '⁶',
    '7': '⁷',
    '8': '⁸',
    '9': '⁹',
    '-': '⁻',
    '+': '',
  }
  return String(numStr)
    .split('')
    .map(c => supMap[c] || c)
    .join('')
}

export const formatPowerOf10 = (value: number): string => {
  if (value === 0) return '0'
  if (isNaN(value) || !isFinite(value)) return ''

  const absVal = Math.abs(value)
  const exp = Math.log10(absVal)
  const roundedExp = Math.round(exp)

  // Check if value is near an exact integer power of 10 (within floating point precision margin)
  if (Math.abs(absVal - Math.pow(10, roundedExp)) / Math.pow(10, roundedExp) < 1e-3) {
    const prefix = value < 0 ? '-' : ''
    return `${prefix}10${toSuperscript(roundedExp)}`
  }

  // Fallback for non-integer powers of 10 (e.g., 1.5e3)
  const expStr = value.toExponential(1)
  const [mantissa, exponent] = expStr.split('e')
  const p = parseInt(exponent, 10)
  const m = parseFloat(mantissa)
  const prefix = value < 0 ? '-' : ''
  if (Math.abs(m - 1) < 1e-2) {
    return `${prefix}10${toSuperscript(p)}`
  }
  return `${prefix}${m}×10${toSuperscript(p)}`
}

/**
 * Robustly formats any timestamp into standard UTC representation (YYYY-MM-DD HH:mm:ss UTC).
 * Handles timestamps with or without 'Z' / 'T' safely so local timezone offset is never applied.
 */
export const formatUTCTime = (val: string | number | Date | null | undefined, includeSeconds = true): string => {
  if (val === null || val === undefined || val === '') return ''
  let d: Date
  if (val instanceof Date) {
    d = val
  } else if (typeof val === 'number') {
    d = new Date(val)
  } else {
    let str = String(val).trim()
    if (/^\d{10,13}$/.test(str)) {
      d = new Date(Number(str))
    } else {
      if (!str.includes('Z') && !str.includes('+') && !str.match(/[+-]\d{2}:?\d{2}$/)) {
        str = str.replace(' ', 'T') + 'Z'
      }
      d = new Date(str)
    }
  }
  if (isNaN(d.getTime())) return String(val)
  return d.toISOString().replace('T', ' ').slice(0, includeSeconds ? 19 : 16) + ' UTC'
}

