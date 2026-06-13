import { useTranslation } from 'react-i18next';

const STATUS_CONFIG = {
  draft:      { className: 'status-badge--pending',    en: 'Draft',      ar: 'مسودة' },
  processing: { className: 'status-badge--processing', en: 'Processing', ar: 'قيد المعالجة' },
  sent:       { className: 'status-badge--processing', en: 'Sent',       ar: 'مرسلة' },
  paid:       { className: 'status-badge--delivered',  en: 'Paid',       ar: 'مدفوعة' },
  cancelled:  { className: 'status-badge--cancelled',  en: 'Cancelled',  ar: 'ملغاة' },
};

export default function InvoiceStatusBadge({ status }) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const normalized = (status || 'draft').toLowerCase();
  const config = STATUS_CONFIG[normalized] || STATUS_CONFIG.draft;

  return (
    <span className={`status-badge ${config.className}`}>
      {isRTL ? config.ar : config.en}
    </span>
  );
}