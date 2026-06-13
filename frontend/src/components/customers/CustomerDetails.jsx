import { useTranslation } from 'react-i18next';
import { formatDate } from '../orders/orderUtils';

export default function CustomerDetails({ customer }) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const tr = (en, ar) => (isRTL ? ar : en);

  const fields = [
    { label: tr('Full Name', 'الاسم الكامل'),         value: customer.fullName },
    { label: tr('Email', 'البريد الإلكتروني'),         value: customer.email },
    { label: tr('Phone', 'رقم الهاتف'),               value: customer.phone },
    { label: tr('Address', 'العنوان'),                 value: customer.address },
    { label: tr('Member Since', 'عضو منذ'),            value: formatDate(customer.createdAt) },
  ];

  return (
    <article className="orders-card">
      <div
        style={{
          fontSize: '10px',
          color: 'var(--accent)',
          letterSpacing: '2.5px',
          textTransform: 'uppercase',
          fontWeight: 800,
          marginBottom: '6px',
        }}
      >
        ✦ {tr('Profile', 'الملف')}
      </div>
      <h2 className="orders-section-title">{tr('Customer Information', 'معلومات العميل')}</h2>

      <div style={{ marginTop: '14px', borderTop: '1px solid var(--border)' }}>
        {fields.map(({ label, value }) => (
          <div
            key={label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '16px',
              padding: '11px 0',
              borderBottom: '1px solid var(--border)',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                color: 'var(--text-secondary)',
                flexShrink: 0,
              }}
            >
              {label}
            </span>
            <span
              style={{
                color: value ? 'var(--text-primary)' : 'var(--text-muted)',
                fontSize: '0.88rem',
                textAlign: isRTL ? 'left' : 'right',
                wordBreak: 'break-word',
                maxWidth: '60%',
              }}
            >
              {value || '—'}
            </span>
          </div>
        ))}
      </div>
    </article>
  );
}