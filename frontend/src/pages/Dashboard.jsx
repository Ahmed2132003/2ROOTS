import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion as Motion } from 'framer-motion';
import './orders/orders.css';

const fadeUp = {
  hidden:  { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] },
  }),
};

const NAV_CARDS = [
  {
    key: 'orders',
    icon: '📦',
    labelEn: 'Orders',
    labelAr: 'الطلبات',
    descEn: 'View, manage, and update all customer orders.',
    descAr: 'عرض وإدارة وتحديث جميع طلبات العملاء.',
    to: '/dashboard/orders',
  },
  {
    key: 'customers',
    icon: '👤',
    labelEn: 'Customers',
    labelAr: 'العملاء',
    descEn: 'Browse customer profiles and order history.',
    descAr: 'تصفح ملفات العملاء وتاريخ طلباتهم.',
    to: '/dashboard/customers',
  },
  {
    key: 'invoices',
    icon: '🧾',
    labelEn: 'Invoices',
    labelAr: 'الفواتير',
    descEn: 'Track payments, statuses, and invoice records.',
    descAr: 'تتبع المدفوعات والحالات وسجلات الفواتير.',
    to: '/dashboard/invoices',
  },
  {
    key: 'products',
    icon: '🛍️',
    labelEn: 'Products',
    labelAr: 'المنتجات',
    descEn: 'Manage your catalog, pricing, and stock.',
    descAr: 'إدارة الكتالوج والأسعار والمخزون.',
    to: '/products',
  },
  {
    key: 'shipping',
    icon: '🚚',
    labelEn: 'Shipping',
    labelAr: 'الشحن',
    descEn: 'Configure governorates and delivery prices.',
    descAr: 'إعداد المحافظات وأسعار التوصيل.',
    to: '/dashboard/shipping',
  },
  {
    key: 'new-order',
    icon: '✚',
    labelEn: 'New Order',
    labelAr: 'طلب جديد',
    descEn: 'Create a manual order for a customer.',
    descAr: 'إنشاء طلب يدوي لأحد العملاء.',
    to: '/dashboard/orders/new',
    accent: true,
  },
];

export default function Dashboard() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const tr = (en, ar) => (isRTL ? ar : en);

  return (
    <section className="orders-page" dir={isRTL ? 'rtl' : 'ltr'}>

      {/* ── Header ── */}
      <header className="orders-page__header" style={{ marginBottom: '40px' }}>
        <Motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
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
            ✦ 2ROOTS ADMIN
          </div>
          <h1 className="orders-page__title">
            {tr('Dashboard', 'لوحة التحكم')}
          </h1>
          <p className="orders-page__subtitle" style={{ marginTop: '6px' }}>
            {tr(
              'Manage orders, customers, products, and more.',
              'إدارة الطلبات والعملاء والمنتجات والمزيد.'
            )}
          </p>
        </Motion.div>
      </header>

      {/* ── Nav Grid ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1px',
          background: 'var(--border, rgba(216,210,194,0.08))',
          border: '1px solid var(--border, rgba(216,210,194,0.08))',
          borderRadius: '4px',
          overflow: 'hidden',
        }}
      >
        {NAV_CARDS.map((card, i) => (
          <Motion.div
            key={card.key}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={i}
          >
            <Link
              to={card.to}
              style={{ textDecoration: 'none' }}
            >
              <Motion.div
                whileHover={{ backgroundColor: 'rgba(216,210,194,0.05)' }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '24px 20px',
                  background: 'var(--surface, #111111)',
                  borderLeft: card.accent
                    ? '2px solid var(--accent, #D8D2C2)'
                    : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  height: '100%',
                }}
              >
                {/* Icon */}
                <span
                  style={{ fontSize: '1.4rem', flexShrink: 0, width: '2rem', textAlign: 'center' }}
                  aria-hidden="true"
                >
                  {card.icon}
                </span>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-display, "Bebas Neue", sans-serif)',
                      fontSize: '1rem',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: 'var(--text-primary, #FFFFFF)',
                      marginBottom: '4px',
                    }}
                  >
                    {tr(card.labelEn, card.labelAr)}
                  </div>
                  <div
                    style={{
                      fontSize: '0.78rem',
                      color: 'var(--text-secondary, #D9D9D9)',
                      lineHeight: 1.5,
                    }}
                  >
                    {tr(card.descEn, card.descAr)}
                  </div>
                </div>

                {/* Arrow */}
                <Motion.span
                  whileHover={{ x: 3 }}
                  style={{
                    fontSize: '1rem',
                    color: 'var(--border-strong, rgba(216,210,194,0.3))',
                    flexShrink: 0,
                    transition: 'color 0.2s',
                  }}
                  aria-hidden="true"
                >
                  →
                </Motion.span>
              </Motion.div>
            </Link>
          </Motion.div>
        ))}
      </div>
    </section>
  );
}