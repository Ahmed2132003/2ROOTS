import { useTranslation } from 'react-i18next';

const CHECKPOINTS = ['pending', 'processing', 'shipped', 'delivered'];

const CHECKPOINT_META = {
  pending:    { en: 'Pending',    ar: 'قيد الانتظار', emoji: '🕒' },
  processing: { en: 'Processing', ar: 'قيد المعالجة', emoji: '⚙️' },
  shipped:    { en: 'Shipped',    ar: 'تم الشحن',     emoji: '🚚' },
  delivered:  { en: 'Delivered',  ar: 'تم التوصيل',   emoji: '📦' },
};

function stepClass(status, checkpoint, currentIndex, index) {
  if (status === 'cancelled') return 'orders-timeline-step--cancelled';
  if (currentIndex >= index)  return 'orders-timeline-step--done';
  return 'orders-timeline-step--waiting';
}

export default function OrderTimeline({ status }) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const tr = (en, ar) => (isRTL ? ar : en);

  const currentIndex = CHECKPOINTS.indexOf(status);
  const isCancelled = status === 'cancelled';

  return (
    <div style={{ marginTop: '20px' }}>
      <h3 className="orders-section-title" style={{ marginBottom: '14px' }}>
        {tr('Fulfillment Timeline', 'مراحل التنفيذ')}
      </h3>
      <div className="orders-timeline-grid">
        {CHECKPOINTS.map((checkpoint, index) => {
          const meta = CHECKPOINT_META[checkpoint];
          const cls = stepClass(status, checkpoint, currentIndex, index);
          const done = !isCancelled && currentIndex >= index;

          return (
            <article key={checkpoint} className={`orders-timeline-step ${cls}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{ fontSize: '14px' }}>{meta.emoji}</span>
                <p className="orders-timeline-step__title">
                  {tr(meta.en, meta.ar)}
                </p>
              </div>
              <p className="orders-timeline-step__hint">
                {isCancelled
                  ? tr('Cancelled', 'ملغي')
                  : done
                  ? tr('✓ Completed', '✓ مكتمل')
                  : tr('Waiting…', 'في الانتظار…')}
              </p>
            </article>
          );
        })}
      </div>
    </div>
  );
}