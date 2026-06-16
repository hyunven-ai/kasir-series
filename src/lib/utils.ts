// Format Rupiah
export function formatRupiah(amount: number): string {
  if (!amount && amount !== 0) return 'Rp 0';
  return 'Rp ' + amount.toLocaleString('id-ID');
}

// Format date to Indonesian
export function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  let cleanStr = dateStr;
  if (!dateStr.endsWith('Z') && !dateStr.includes('+') && !/-\d{2}:\d{2}$/.test(dateStr)) {
    cleanStr = dateStr.replace(' ', 'T');
    if (cleanStr.includes('T')) {
      cleanStr += 'Z';
    }
  }
  const date = new Date(cleanStr);
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '-';
  let cleanStr = dateStr;
  if (!dateStr.endsWith('Z') && !dateStr.includes('+') && !/-\d{2}:\d{2}$/.test(dateStr)) {
    cleanStr = dateStr.replace(' ', 'T');
    if (cleanStr.includes('T')) {
      cleanStr += 'Z';
    }
  }
  const date = new Date(cleanStr);
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Generate invoice number
export function generateInvoiceNo(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = String(Math.floor(Math.random() * 9999)).padStart(4, '0');
  return `INV/${y}${m}${d}/${rand}`;
}

// Shorten large numbers for chart labels
export function shortNumber(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'M';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(0) + 'Jt';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'Rb';
  return String(n);
}

// Format date for chart label (dd MMM)
export function formatChartDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
}

// Truncate text
export function truncate(str: string, max: number): string {
  if (!str) return '';
  return str.length > max ? str.substring(0, max) + '...' : str;
}

// Get today's date as YYYY-MM-DD
export function today(): string {
  return new Date().toISOString().substring(0, 10);
}

// Get date N days ago
export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().substring(0, 10);
}

// Calculate profit margin
export function profitMargin(modal: number, jual: number): string {
  if (!modal || modal === 0) return '0%';
  const margin = ((jual - modal) / modal) * 100;
  return margin.toFixed(1) + '%';
}

// Debounce
export function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }) as T;
}
