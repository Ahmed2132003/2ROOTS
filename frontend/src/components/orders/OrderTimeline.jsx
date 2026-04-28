const CHECKPOINTS = ['pending', 'processing', 'shipped', 'delivered'];

function statusIndex(status) {
  return CHECKPOINTS.indexOf(status);
}

export default function OrderTimeline({ status }) {
  const currentIndex = statusIndex(status);

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold">Fulfillment Timeline</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {CHECKPOINTS.map((checkpoint, index) => {
          const done = currentIndex >= index;
          const cancelled = status === 'cancelled';

          return (
            <article
              key={checkpoint}
              className={`rounded-lg border p-3 text-sm ${cancelled ? 'border-rose-500/40 bg-rose-500/10 text-rose-200' : done ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-white/10 bg-white/[0.03] text-white/60'}`}
            >
              <p className="font-semibold capitalize">{checkpoint}</p>
              <p className="mt-1 text-xs">{cancelled ? 'Order has been cancelled.' : done ? 'Completed' : 'Waiting'}</p>
            </article>
          );
        })}
      </div>
    </div>
  );
}