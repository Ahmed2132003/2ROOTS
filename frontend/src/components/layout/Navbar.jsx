/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useThemeStore();
  const { isAuthenticated, user, logout } = useAuthStore();
  const [scrolled, setScrolled]   = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);
  const [userMenu, setUserMenu]   = useState(false);
  const location = useLocation();
  const isRTL = i18n.language === 'ar';

  // جيب عدد items الـ Cart
  const { data: cart } = useQuery({
    queryKey: ['cart'],
    queryFn:  () => api.get('/cart/').then(r => r.data),
    enabled:  true,
  });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
    localStorage.setItem('lang', i18n.language);
  }, [i18n.language, isRTL]);

  const switchLang = () => i18n.changeLanguage(isRTL ? 'en' : 'ar');

  const navLinks = [
    { to: '/',         label: t('nav.home') },
    { to: '/products', label: t('nav.products') },
  ];

  return (
    <>
      <motion.nav
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position:   'fixed', top: 0, left: 0, right: 0,
          zIndex:     1000,
          background: scrolled
            ? 'rgba(10,10,15,0.85)'
            : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: scrolled ? '1px solid var(--border)' : 'none',
          transition: 'all 0.4s ease',
          padding:    '0 5%',
        }}
      >
        <div style={{
          maxWidth: '1400px', margin: '0 auto',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          height: '72px',
        }}>

          {/* Logo */}
          <Link to="/" style={{ textDecoration: 'none' }}>
            <motion.div
              whileHover={{ scale: 1.05 }}
              style={{
                fontSize: '26px', fontWeight: 800,
                background: 'linear-gradient(135deg, #6C63FF, #A78BFA)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontFamily: "'Syne', sans-serif",
                letterSpacing: '-0.5px',
              }}
            >
              🦈 SHARK
            </motion.div>
          </Link>

          {/* Nav Links — Desktop */}
          <div style={{ display: 'flex', gap: '8px' }} className="desktop-nav">
            {navLinks.map((link) => (
              <Link key={link.to} to={link.to} style={{ textDecoration: 'none' }}>
                <motion.div
                  whileHover={{ y: -2 }}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '10px',
                    color: location.pathname === link.to
                      ? 'var(--accent)'
                      : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '15px',
                    background: location.pathname === link.to
                      ? 'var(--accent-glow)'
                      : 'transparent',
                    transition: 'all 0.2s',
                  }}
                >
                  {link.label}
                </motion.div>
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

            {/* Lang Toggle */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={switchLang}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '8px 14px',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 700,
              }}
            >
              {isRTL ? 'EN' : 'عر'}
            </motion.button>

            {/* Theme Toggle */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleTheme}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: '18px',
              }}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </motion.button>

            {/* Cart */}
            <Link to="/cart" style={{ textDecoration: 'none', position: 'relative' }}>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '8px 14px',
                  fontSize: '20px',
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                🛒
                {cart?.total_items > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    style={{
                      position: 'absolute', top: '-6px',
                      right: isRTL ? 'auto' : '-6px',
                      left: isRTL ? '-6px' : 'auto',
                      background: 'var(--accent)',
                      color: 'white',
                      borderRadius: '50%',
                      width: '20px', height: '20px',
                      fontSize: '11px', fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {cart.total_items}
                  </motion.span>
                )}
              </motion.div>
            </Link>

            {/* User Menu */}
            {isAuthenticated ? (
              <div style={{ position: 'relative' }}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setUserMenu(!userMenu)}
                  style={{
                    background: 'linear-gradient(135deg, #6C63FF, #A78BFA)',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '8px 16px',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '14px',
                  }}
                >
                  👤 {user?.username?.slice(0, 8)}
                </motion.button>

                <AnimatePresence>
                  {userMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      style={{
                        position: 'absolute',
                        top: '50px',
                        right: isRTL ? 'auto' : 0,
                        left: isRTL ? 0 : 'auto',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: '16px',
                        padding: '8px',
                        minWidth: '180px',
                        boxShadow: 'var(--shadow-lg)',
                        zIndex: 100,
                      }}
                    >
                      {[
                        { to: '/profile', icon: '👤', label: t('nav.profile') },
                        { to: '/orders',  icon: '📦', label: t('nav.orders') },
                        ...(user?.role !== 'customer'
                          ? [{ to: '/dashboard', icon: '📊', label: t('nav.dashboard') }]
                          : []),
                      ].map((item) => (
                        <Link key={item.to} to={item.to} style={{ textDecoration: 'none' }}
                          onClick={() => setUserMenu(false)}>
                          <div style={{
                            padding: '10px 14px', borderRadius: '10px',
                            color: 'var(--text-primary)', fontSize: '14px',
                            fontWeight: 600, cursor: 'pointer',
                            transition: 'background 0.2s',
                          }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            {item.icon} {item.label}
                          </div>
                        </Link>
                      ))}
                      <div style={{ borderTop: '1px solid var(--border)', margin: '8px 0' }} />
                      <div
                        onClick={() => { logout(); setUserMenu(false); }}
                        style={{
                          padding: '10px 14px', borderRadius: '10px',
                          color: 'var(--danger)', fontSize: '14px',
                          fontWeight: 600, cursor: 'pointer',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        🚪 {t('nav.logout')}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link to="/login" style={{ textDecoration: 'none' }}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    background: 'linear-gradient(135deg, #6C63FF, #A78BFA)',
                    border: 'none', borderRadius: '10px',
                    padding: '8px 20px', color: 'white',
                    cursor: 'pointer', fontWeight: 700, fontSize: '14px',
                  }}
                >
                  {t('nav.login')}
                </motion.button>
              </Link>
            )}

            {/* Mobile Menu Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setMenuOpen(!menuOpen)}
              className="mobile-menu-btn"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: '18px',
                display: 'none',
              }}
            >
              {menuOpen ? '✕' : '☰'}
            </motion.button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                background: 'var(--bg-secondary)',
                borderTop: '1px solid var(--border)',
                padding: '16px 5%',
                overflow: 'hidden',
              }}
            >
              {navLinks.map((link) => (
                <Link key={link.to} to={link.to}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: 'block', padding: '12px 0',
                    color: 'var(--text-primary)',
                    textDecoration: 'none', fontWeight: 600,
                    fontSize: '16px', borderBottom: '1px solid var(--border)',
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Spacer */}
      <div style={{ height: '72px' }} />

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </>
  );
}