// frontend/src/components/Footer.jsx
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language?.startsWith('ar');

  const copy = {
    brand:   '2ROOTS',
    tagline: isRTL ? 'جذور في الكفاح. بُني للعظمة.' : 'ROOTED IN STRUGGLE. BUILT FOR GREATNESS.',
    line1:   isRTL
      ? 'تم إنشاء وتطوير متجر 2Roots بواسطة شركة كريتيفيتي كود'
      : '2Roots Store was created and developed by Creativity Code Company',
    line2:   isRTL ? 'وبواسطة المهندس أحمد إبراهيم' : 'and by Engineer Ahmed Ibrahim',
    rights:  isRTL ? '© 2025 2ROOTS. جميع الحقوق محفوظة.' : '© 2025 2ROOTS. All rights reserved.',
  };

  return (
    <footer style={{
      background:   'var(--black-soft)',
      borderTop:    '1px solid var(--border)',
      paddingBlock: '48px 28px',
    }}>
      <div style={{
        maxWidth:     '1400px',
        margin:       '0 auto',
        paddingInline:'clamp(16px,4vw,48px)',
      }}>

        {/* ── Top row: brand + tagline ── */}
        <div style={{
          display:       'flex',
          flexDirection: 'column',
          alignItems:    'center',
          gap:           '10px',
          marginBottom:  '32px',
          textAlign:     'center',
        }}>
          {/* Tree icon */}
          <span style={{ fontSize: '28px', lineHeight: 1, opacity: 0.7 }}>🌳</span>

          {/* Brand name */}
          <span style={{
            fontFamily:    'var(--font-display)',
            fontSize:      'clamp(28px, 5vw, 42px)',
            letterSpacing: '0.1em',
            color:         'var(--white)',
            lineHeight:    1,
          }}>
            {copy.brand}
          </span>

          {/* Tagline */}
          <span style={{
            fontFamily:    'var(--font-body)',
            fontSize:      '11px',
            letterSpacing: '0.18em',
            color:         'var(--stone-muted)',
            textTransform: 'uppercase',
            fontWeight:    500,
          }}>
            {copy.tagline}
          </span>
        </div>

        {/* ── Thin divider ── */}
        <div style={{
          height:     '1px',
          background: 'linear-gradient(90deg, transparent, var(--border-accent), transparent)',
          marginBottom:'28px',
        }} />

        {/* ── Bottom row: credits + rights ── */}
        <div style={{
          display:       'flex',
          flexDirection: 'column',
          alignItems:    'center',
          gap:           '4px',
          textAlign:     'center',
        }}>
          <p style={{
            fontSize:  '12px',
            color:     'var(--text-muted)',
            lineHeight: 1.6,
            margin:    0,
          }}>
            {copy.line1}
          </p>
          <p style={{
            fontSize:  '12px',
            color:     'var(--text-muted)',
            lineHeight: 1.6,
            margin:    0,
          }}>
            {copy.line2}
          </p>
          <p style={{
            fontSize:      '11px',
            color:         'var(--black-border)',
            marginTop:     '12px',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            {copy.rights}
          </p>
        </div>

      </div>
    </footer>
  );
}