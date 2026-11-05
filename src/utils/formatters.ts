/**
 * Formats a number according to Indian/standard currency conventions
 * and splits integer and decimal parts for hero typography display.
 */
export function formatCurrencyParts(amount: number, currency = '₹'): { symbol: string; integer: string; decimal: string } {
  const safeAmount = isNaN(amount) ? 0 : amount;
  
  // Format with en-IN locale
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeAmount);

  const parts = formatted.split('.');
  return {
    symbol: currency,
    integer: parts[0],
    decimal: parts[1] ? `.${parts[1]}` : '.00'
  };
}

export function formatFullCurrency(amount: number, currency = '₹'): string {
  const { symbol, integer, decimal } = formatCurrencyParts(amount, currency);
  return `${symbol}${integer}${decimal}`;
}

/**
 * Returns user initials (e.g. "Hannah Jones" -> "HJ")
 */
export function getInitials(name: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Returns deterministic pastel color for contact avatars
 */
const AVATAR_COLORS = [
  { bg: 'bg-emerald-100 dark:bg-emerald-950/60', text: 'text-emerald-700 dark:text-emerald-300' },
  { bg: 'bg-indigo-100 dark:bg-indigo-950/60', text: 'text-indigo-700 dark:text-indigo-300' },
  { bg: 'bg-amber-100 dark:bg-amber-950/60', text: 'text-amber-700 dark:text-amber-300' },
  { bg: 'bg-rose-100 dark:bg-rose-950/60', text: 'text-rose-700 dark:text-rose-300' },
  { bg: 'bg-sky-100 dark:bg-sky-950/60', text: 'text-sky-700 dark:text-sky-300' },
  { bg: 'bg-purple-100 dark:bg-purple-950/60', text: 'text-purple-700 dark:text-purple-300' },
];

export function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

/**
 * Friendly relative date formatting
 */
export function formatFriendlyDate(dateStr: string, createdAt?: number): string {
  const date = new Date(dateStr);
  const today = new Date();
  
  const isToday = date.toDateString() === today.toDateString();
  
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (createdAt) {
    const timeStr = new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Today, ${timeStr}`;
    if (isYesterday) return `Yesterday, ${timeStr}`;
  }

  if (isToday) return 'Today';
  if (isYesterday) return 'Yesterday';

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short'
  });
}

