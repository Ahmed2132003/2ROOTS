/* eslint-disable no-unused-vars */
// frontend/src/components/layout/Navbar.jsx — UPDATED (Phase 5)
// Changes: Logo replaced with shark-logo.png image
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useQuery } from '@tanstack/react-query';
import api, { getAccessToken } from '../../services/api';

export default function Navbar() {
  const { i18n } = useTranslation();
  const { theme, toggleTheme } = useThemeStore();
  const { isAuthenticated, isAuthReady, user, logout } = useAuthStore();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const location = useLocation();
  const isRTL = i18n.language === 'ar';

  const t = (key) => ({
    'nav.home': isRTL ? 'الرئيسية' : 'Home',
    'nav.products': isRTL ? 'المنتجات' : 'Products',
    'nav.profile': isRTL ? 'الملف الشخصي' : 'Profile',
    'nav.orders': isRTL ? 'طلباتي' : 'Orders',
    'nav.dashboard': isRTL ? 'لوحة التحكم' : 'Dashboard',
    'customers.title': isRTL ? 'العملاء' : 'Customers',
    'nav.logout': isRTL ? 'تسجيل الخروج' : 'Logout',
    'nav.login': isRTL ? 'تسجيل الدخول' : 'Login',
    'nav.menu': isRTL ? 'القائمة' : 'Menu',
  }[key] ?? key);

  const token = getAccessToken();
  const { data: cart } = useQuery({
    queryKey: ['cart'],
    queryFn: () => api.get('/cart/').then((r) => r.data),
    enabled: isAuthReady && isAuthenticated && Boolean(token),
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

  const closeMenus = () => { setMenuOpen(false); setUserMenu(false); };

  const navLinks = [
    { to: '/', label: t('nav.home') },
    { to: '/products', label: t('nav.products') },
  ];

  const accountLinks = [
    { to: '/profile', icon: '👤', label: t('nav.profile') },
    { to: '/orders', icon: '📦', label: t('nav.orders') },
    ...(String(user?.role || '').trim().toLowerCase() !== 'customer'
      ? [
          { to: '/dashboard', icon: '📊', label: t('nav.dashboard') },
          { to: '/dashboard/customers', icon: '👥', label: t('customers.title') },
        ]
      : []),
  ];

  return (
    <>
      <motion.nav className="nav-shell" style={{
        background: scrolled ? 'rgba(10,10,15,0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--border)' : 'none',
      }}>
        <div className="nav-inner">
          {/* Logo text-only for cleaner header alignment */}
          <Link
            to="/"
            className="nav-logo"
            onClick={closeMenus}
            aria-label={isRTL ? 'شارك - الرئيسية' : 'Shark - Home'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              lineHeight: 1,
              fontWeight: 800,
              letterSpacing: '-0.2px',
              textDecoration: 'none',
              color: 'var(--text-primary)',
              marginInlineEnd: '6px',
              minHeight: '40px',
            }}
          >
            <span style={{ fontFamily: "'Cairo', 'Syne', sans-serif" }}>{isRTL ? 'شارك' : 'Shark'}</span>
          </Link>

          <div className="desktop-nav">
            {navLinks.map((link) => (
              <Link key={link.to} to={link.to} onClick={closeMenus}
                className={`nav-link ${location.pathname === link.to ? 'is-active' : ''}`}>
                {link.label}
              </Link>
            ))}
          </div>

          <div className="nav-actions">
            <button className="nav-icon-btn" onClick={() => i18n.changeLanguage(isRTL ? 'en' : 'ar')}>
              {isRTL ? 'EN' : 'ع'}
            </button>
            <button className="nav-icon-btn" onClick={toggleTheme}>
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <Link to="/cart" onClick={closeMenus} className="nav-cart-btn">
              🛒{cart?.total_items > 0 && <span className="nav-cart-count">{cart.total_items}</span>}
            </Link>
            {isAuthenticated
              ? <button className="nav-user-btn" onClick={() => setUserMenu((s) => !s)}>
                  👤 {user?.username?.slice(0, 8)}
                </button>
              : <Link to="/login" onClick={closeMenus} className="nav-user-btn">{t('nav.login')}</Link>
            }
            <button className="nav-menu-btn" aria-label={t('nav.menu')} onClick={() => setMenuOpen((s) => !s)}>☰</button>
          </div>

          <AnimatePresence>
            {userMenu && isAuthenticated && (
              <motion.div className="nav-dropdown"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
                {accountLinks.map((item) => (
                  <Link key={item.to} to={item.to} className="nav-dropdown-item" onClick={closeMenus}>
                    {item.icon} {item.label}
                  </Link>
                ))}
                <button className="nav-dropdown-item nav-danger" onClick={() => { logout(); closeMenus(); }}>
                  🚪 {t('nav.logout')}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div className="mobile-menu"
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
              {navLinks.map((link) => (
                <Link key={link.to} to={link.to} className="mobile-menu-link" onClick={closeMenus}>
                  {link.label}
                </Link>
              ))}
              {isAuthenticated && accountLinks.map((item) => (
                <Link key={item.to} to={item.to} className="mobile-menu-link" onClick={closeMenus}>
                  {item.icon} {item.label}
                </Link>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
      <div style={{ height: '72px' }} />
    </>
  );
}