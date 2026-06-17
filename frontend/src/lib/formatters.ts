export function formatPercentDecimal(value: number): string {
  if (value == null || isNaN(value)) return "0%"
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`
}

export function formatPercentNumber(value: number): string {
  if (value == null || isNaN(value)) return "0%"
  return `${Math.round(value)}%`
}

export function formatRisk(value: number): string {
  if (value == null || isNaN(value)) return "0%"
  // Assumes risk is a decimal 0.0 - 1.0
  const clamped = Math.max(0, Math.min(1, value))
  return `${Math.round(clamped * 100)}%`
}

export function formatCtr(value: number): string {
  if (value == null || isNaN(value)) return "0.0%"
  return `${value.toFixed(1)}%`
}

export function formatCurrency(value: number): string {
  if (value == null || isNaN(value)) return "$0.00"
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

export function formatCompactCurrency(value: number): string {
  if (value == null || isNaN(value)) return "$0"
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value)
}

export function formatDateTime(value: Date | string | number | null): string {
  if (!value) return "Unknown time"
  try {
    const d = new Date(value)
    if (isNaN(d.getTime())) return "Unknown time"
    
    // Custom format: MMM d, yyyy h:mm a
    const dateOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
    const timeOptions: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true }
    
    return `${d.toLocaleDateString('en-US', dateOptions)} ${d.toLocaleTimeString('en-US', timeOptions)}`
  } catch (e) {
    return "Unknown time"
  }
}
