import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer style={{
      background:   'var(--bg-secondary)',
      borderTop:    '1px solid var(--border)',
      padding:      '48px 5% 24px',
      marginTop:    'auto',
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '40px',
          marginBottom: '40px',
        }}>

          {/* Brand */}
          <div>
            <div style={{
              fontSize: '24px', fontWeight: 800,
              background: 'linear-gradient(135deg, #6C63FF, #A78BFA)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '12px',
            }}>
              🦈 SHARK
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.7 }}>
              {t('home.hero_subtitle')}
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 style={{ color: 'var(--text-primary)', fontWeight: 700, marginBottom: '16px' }}>
              {t('nav.products')}
            </h4>
            {['/', '/products', '/cart'].map((path, i) => (
              <Link key={i} to={path} style={{
                display: 'block', color: 'var(--text-muted)',
                textDecoration: 'none', marginBottom: '10px',
                fontSize: '14px', transition: 'color 0.2s',
              }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                {[t('nav.home'), t('nav.products'), t('nav.cart')][i]}
              </Link>
            ))}
          </div>
        </div>

        <div style={{
          borderTop: '1px solid var(--border)',
          paddingTop: '24px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '13px',
        }}>
          © 2025 SHARK Platform. All rights reserved.
        </div>
      </div>
    </footer>
  );
}