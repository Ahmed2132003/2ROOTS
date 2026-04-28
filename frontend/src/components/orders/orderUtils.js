export const statusClasses = {
  pending: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  processing: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  shipped: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
  delivered: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  cancelled: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
};

export function formatMoney(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0));
}

export function formatDate(value) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function humanizeStatus(status) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}