import { ORDER_STATUSES } from '../../hooks/useOrders';

export default function OrderStatusSelect({ value, onChange, loading }) {
  return (
    <label className="flex w-full flex-col gap-2 text-sm text-white/80">
      Update Status
      <select
        className="h-11 rounded-lg border border-white/10 bg-black/30 px-3 text-sm outline-none transition focus:border-violet-400"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={loading}
      >
        {ORDER_STATUSES.map((status) => (
          <option key={status} value={status}>{status}</option>
        ))}
      </select>
    </label>
  );
}