import { humanizeStatus, statusClasses } from './orderUtils';

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses[status] || 'border-white/20 text-white/80'}`}>
      {humanizeStatus(status || 'pending')}
    </span>
  );
}