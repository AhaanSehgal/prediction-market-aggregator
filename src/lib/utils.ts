export function formatProbability(p: number): string {
  return `${(p * 100).toFixed(1)}%`;
}

export function formatCents(p: number): string {
  return `${Math.round(p * 100)}¢`;
}

export function formatDollars(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(2)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(1)}K`;
  }
  if (amount >= 1) {
    return `$${amount.toFixed(2)}`;
  }
  return `$${amount.toFixed(4)}`;
}

export function formatNumber(n: number, decimals = 2): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatSpread(spread: number): string {
  const bps = spread * 10000;
  if (bps < 10) {
    return `${bps.toFixed(1)} bps`;
  }
  return `${Math.round(bps)} bps`;
}

export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 1000) return 'just now';
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3_600_000)}h ago`;
}
