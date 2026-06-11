import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language?.startsWith('ar');

  const t = (key) => {
    const messages = {
      'footer.line1': isRTL
        ? 'تم إنشاء وتطوير متجر 2Roots بواسطة شركة كريتيفيتي كود'
        : '2Roots Store was created and developed by Creativity Code Company',
      'footer.line2': isRTL ? 'وبواسطة المهندس أحمد إبراهيم' : 'and by Engineer Ahmed Ibrahim',
    };
    return messages[key] ?? key;
  };

  return (
    <footer
      style={{
        borderTop: '1px solid var(--border)',
        padding: '14px 5%',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '0.85rem',
        lineHeight: 1.6,
        background: 'var(--bg-secondary)',
      }}
    >
      <p style={{ margin: 0 }}>{t('footer.line1')}</p>
      <p style={{ margin: 0 }}>{t('footer.line2')}</p>
    </footer>
  );
}