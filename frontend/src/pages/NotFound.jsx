import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion as Motion } from 'framer-motion';
import './orders/orders.css';

export default function NotFound() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const tr = (en, ar) => (isRTL ? ar : en);

  return (
    <section
      className="orders-page"
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Motion.div
        style={{ textAlign: 'center', maxWidth: '480px', width: '100%' }}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Eyebrow */}
        <div
          style={{
            fontSize: '10px',
            color: 'var(--accent)',
            letterSpacing: '2.5px',
            textTransform: 'uppercase',
            fontWeight: 800,
            marginBottom: '24px',
          }}
        >
          ✦ {tr('Error', 'خطأ')}
        </div>

        {/* Giant 404 */}
        <div
          style={{
            fontFamily: 'var(--font-display, "Bebas Neue", sans-serif)',
            fontSize: 'clamp(96px, 22vw, 160px)',
            lineHeight: 1,
            letterSpacing: '0.04em',
            color: 'transparent',
            WebkitTextStroke: '1px rgba(216,210,194,0.18)',
            background:
              'linear-gradient(180deg, rgba(216,210,194,0.15) 0%, rgba(216,210,194,0.03) 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            userSelect: 'none',
            marginBottom: '8px',
          }}
          aria-hidden="true"
        >
          404
        </div>

        {/* Title */}
        <h1
          style={{
            fontFamily: 'var(--font-display, "Bebas Neue", sans-serif)',
            fontSize: 'clamp(22px, 5vw, 32px)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--text-primary)',
            margin: '0 0 12px',
          }}
        >
          {tr('Page Not Found', 'الصفحة غير موجودة')}
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: '0.88rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.65,
            margin: '0 auto 32px',
            maxWidth: '340px',
          }}
        >
          {tr(
            'The page you re looking for doesn t exist or has been moved.',
            'الصفحة التي تبحث عنها غير موجودة أو تم نقلها.'
          )}
        </p>

        {/* Divider */}
        <div
          style={{
            width: '40px',
            height: '1px',
            background: 'var(--border-strong, rgba(216,210,194,0.2))',
            margin: '0 auto 32px',
          }}
        />

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/" className="orders-btn orders-btn--primary">
            {tr('Go Home', 'الصفحة الرئيسية')}
          </Link>
          <Link to="/dashboard" className="orders-btn orders-btn--secondary">
            {tr('Dashboard', 'الداشبورد')}
          </Link>
        </div>
      </Motion.div>
    </section>
  );
}