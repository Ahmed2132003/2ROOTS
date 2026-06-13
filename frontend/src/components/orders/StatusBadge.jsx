import { humanizeStatus, statusClasses } from './orderUtils';

export default function StatusBadge({ status }) {
  return (
    <span className={`status-badge ${statusClasses[status] || 'status-badge--default'}`}>
      {humanizeStatus(status || 'pending')}
    </span>
  );
}