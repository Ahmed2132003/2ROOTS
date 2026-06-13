import { useTranslation } from 'react-i18next';

export default function OrdersPagination({ page, total, pageSize, onPageChange }) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const tr = (en, ar) => (isRTL ? ar : en);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="orders-pagination">
      <p className="orders-pagination__summary">
        {tr(
          `Page ${page} of ${totalPages} — ${total} orders`,
          `صفحة ${page} من ${totalPages} — ${total} طلب`
        )}
      </p>

      <div className="orders-pagination__actions">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="orders-btn"
        >
          {isRTL ? '→ السابق' : '← Prev'}
        </button>

        {/* page indicator pill */}
        <span
          style={{
            border: '1px solid var(--border)',
            borderRadius: '2px',
            padding: '10px 14px',
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '1px',
            color: 'var(--text-secondary)',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          {page} / {totalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="orders-btn"
        >
          {isRTL ? '← التالي' : 'Next →'}
        </button>
      </div>
    </div>
  );
}