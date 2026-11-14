/** Number and phrase helpers for player-facing text. Pure, no locale surprises. */

/** 1234.5 → "1,235"; 3.3 → "3.3"; keeps one decimal only for small numbers. */
export function num(value: number, decimals?: number): string {
  if (!Number.isFinite(value)) return '∞'
  const d = decimals ?? (Math.abs(value) < 100 && Math.abs(value % 1) > 0.049 ? 1 : 0)
  const fixed = Math.abs(value).toFixed(d)
  const [whole, frac] = fixed.split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const sign = value < 0 && Number(fixed) !== 0 ? '−' : ''
  return sign + grouped + (frac ? '.' + frac : '')
}

export function pct(fraction: number): string {
  return `${Math.round(fraction * 100)}`
}

/** 0.5 → "half", 0.33 → "a third"… falls back to "62%". */
export function fractionWords(fraction: number): string {
  const f = Math.max(0, Math.min(1, fraction))
  const named: [number, string][] = [
    [0, 'none'],
    [0.1, 'a tenth'],
    [0.2, 'a fifth'],
    [0.25, 'a quarter'],
    [1 / 3, 'a third'],
    [0.5, 'half'],
    [2 / 3, 'two thirds'],
    [0.75, 'three quarters'],
    [1, 'all'],
  ]
  for (const [value, word] of named) {
    if (Math.abs(f - value) <= 0.035) return word
  }
  return `${Math.round(f * 100)}%`
}

/** 1.5 → "1.5 years", 0.5 → "6 months". */
export function yearsWords(years: number): string {
  if (years < 0.95) {
    const months = Math.max(1, Math.round(years * 12))
    return `${months} month${months === 1 ? '' : 's'}`
  }
  const rounded = Math.round(years * 10) / 10
  return `${num(rounded)} year${rounded === 1 ? '' : 's'}`
}

export function monthsWords(months: number): string {
  const m = Math.round(months * 10) / 10
  return `${num(m)} month${m === 1 ? '' : 's'}`
}

/** Fill {placeholders} in a template. Unknown keys are left visible so mistakes show up in tests. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => (key in values ? String(values[key]) : whole))
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/** Round to avoid floating-point fuzz in displayed and compared numbers. */
export function round(value: number, decimals = 2): number {
  const k = Math.pow(10, decimals)
  return Math.round((value + Number.EPSILON) * k) / k
}
