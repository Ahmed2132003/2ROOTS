export default function Footer() {
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
      <p style={{ margin: 0 }}>The store was created by Creativity Code</p>
      <p style={{ margin: 0 }}>By Eng. Ahmed Ibrahim</p>
    </footer>
  );
}