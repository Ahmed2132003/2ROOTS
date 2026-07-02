/* eslint-disable no-unused-vars */
// frontend/src/components/layout/Navbar.jsx
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
  const [scrolled, setScrolled]     = useState(false);
  const [menuOpen, setMenuOpen]     = useState(false);
  const [userMenu, setUserMenu]     = useState(false);
  const [logoError, setLogoError]   = useState(false);
  const location  = useLocation();
  const isRTL     = i18n.language === 'ar';

  const t = (key) => ({
    'nav.home':           isRTL ? 'الرئيسية'         : 'Home',
    'nav.products':       isRTL ? 'المنتجات'          : 'Products',
    'nav.profile':        isRTL ? 'الملف الشخصي'     : 'Profile',
    'nav.orders':         isRTL ? 'طلباتي'            : 'My Orders',
    'nav.dashboard':      isRTL ? 'لوحة التحكم'      : 'Dashboard',
    'customers.title':    isRTL ? 'العملاء'           : 'Customers',
    'nav.logout':         isRTL ? 'تسجيل الخروج'     : 'Logout',
    'nav.login':          isRTL ? 'تسجيل الدخول'     : 'Login',
    'nav.menu':           isRTL ? 'القائمة'           : 'Menu',
    'nav.marketer':       isRTL ? 'داشبورد المسوق'   : 'Marketer Dashboard',
    'nav.teamLeader':     isRTL ? 'داشبورد القائد'   : 'Team Leader Dashboard',
    'nav.marketers':      isRTL ? 'المسوقون'          : 'Marketers',
    'nav.marketerOrders': isRTL ? 'أوردرات المسوقين' : 'Marketer Orders',
    'nav.withdrawals':    isRTL ? 'طلبات السحب'       : 'Withdrawals',
    'nav.rewardTiers':    isRTL ? 'درجات المكافآت'   : 'Reward Tiers',
    'nav.teamRewards':    isRTL ? 'مكافآت القادة'    : 'Team Rewards',
  }[key] ?? key);

  const token = getAccessToken();
  const { data: cart } = useQuery({
    queryKey: ['cart'],
    queryFn:  () => api.get('/cart/').then((r) => r.data),
    enabled:  isAuthReady && isAuthenticated && Boolean(token),
  });

  // Fetch marketer profile to know if team_leader (only for marketer role users)
  const userRole = String(user?.role || '').trim().toLowerCase();
  const isMarketerUser = userRole === 'marketer';
  const isAdminUser = userRole === 'admin' || userRole === 'staff';

  const { data: marketerProfile } = useQuery({
    queryKey: ['marketer-profile-nav'],
    queryFn: () => api.get('/marketers/me/').then((r) => r.data),
    enabled: isAuthReady && isAuthenticated && isMarketerUser,
    staleTime: 5 * 60 * 1000, // 5 min cache — nav doesn't need fresh data constantly
  });

  const isTeamLeader = marketerProfile?.role === 'team_leader';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.documentElement.dir  = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
    localStorage.setItem('lang', i18n.language);
  }, [i18n.language, isRTL]);

  const closeMenus = () => { setMenuOpen(false); setUserMenu(false); };

  const navLinks = [
    { to: '/',         label: t('nav.home') },
    { to: '/products', label: t('nav.products') },
  ];

  // Build account links based on role
  const accountLinks = [
    { to: '/profile', icon: '👤', label: t('nav.profile') },
    { to: '/orders',  icon: '📦', label: t('nav.orders') },

    // Admin/Staff links
    ...(isAdminUser ? [
      { to: '/dashboard',                    icon: '📊', label: t('nav.dashboard') },
      { to: '/dashboard/customers',          icon: '👥', label: t('customers.title') },
      { to: '/dashboard/marketers',          icon: '🧑‍💼', label: t('nav.marketers') },
      { to: '/dashboard/marketer-orders',    icon: '📋', label: t('nav.marketerOrders') },
      { to: '/dashboard/withdrawals',        icon: '💰', label: t('nav.withdrawals') },
      { to: '/dashboard/reward-tiers',       icon: '🏆', label: t('nav.rewardTiers') },
      { to: '/dashboard/team-rewards',       icon: '🎁', label: t('nav.teamRewards') },
    ] : []),

    // Marketer links
    ...(isMarketerUser ? [
      { to: '/marketer', icon: '📊', label: t('nav.marketer') },
      ...(isTeamLeader ? [{ to: '/marketer/team-leader', icon: '👑', label: t('nav.teamLeader') }] : []),
    ] : []),
  ];

  return (
    <>
      <motion.nav
        className={`nav-shell${scrolled ? ' scrolled' : ''}`}
        style={{
          background: scrolled
            ? 'rgba(10,10,10,0.95)'
            : 'rgba(10,10,10,0.6)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: scrolled
            ? '1px solid rgba(216,210,194,0.12)'
            : '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <div className="nav-inner">

          {/* ── Logo ─────────────────────────────────── */}
          <Link
            to="/"
            className="nav-logo"
            onClick={closeMenus}
            aria-label="2ROOTS – Home"
          >
            {!logoError ? (
              <img
                src="/2roots.png"
                alt="2ROOTS"
                className="nav-logo-img"
                onError={() => setLogoError(true)}
                style={{
                  height: '36px',
                  width: 'auto',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            ) : (
              <span className="nav-logo-text">2ROOTS</span>
            )}
          </Link>

          {/* ── Desktop Nav ───────────────────────────── */}
          <div className="desktop-nav">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={closeMenus}
                className={`nav-link${location.pathname === link.to ? ' is-active' : ''}`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* ── Actions ───────────────────────────────── */}
          <div className="nav-actions">

            {/* Language toggle */}
            <button
              className="nav-icon-btn"
              onClick={() => i18n.changeLanguage(isRTL ? 'en' : 'ar')}
              style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em' }}
              title={isRTL ? 'Switch to English' : 'التبديل للعربية'}
            >
              {isRTL ? 'EN' : 'ع'}
            </button>

            {/* Theme toggle */}
            <button
              className="nav-icon-btn"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? '☀' : '☾'}
            </button>

            {/* Cart */}
            <Link to="/cart" onClick={closeMenus} className="nav-cart-btn" title="Cart">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 01-8 0"/>
              </svg>
              {cart?.total_items > 0 && (
                <span className="nav-cart-count">{cart.total_items}</span>
              )}
            </Link>

            {/* User */}
            {isAuthenticated ? (
              <button
                className="nav-user-btn"
                onClick={() => setUserMenu((s) => !s)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                {user?.username?.slice(0, 10)}
              </button>
            ) : (
              <Link to="/login" onClick={closeMenus} className="nav-user-btn">
                {t('nav.login')}
              </Link>
            )}

            {/* Hamburger */}
            <button
              className="nav-menu-btn"
              aria-label={t('nav.menu')}
              onClick={() => setMenuOpen((s) => !s)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {menuOpen
                  ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                  : <><line x1="3" y1="6"  x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
                }
              </svg>
            </button>
          </div>

          {/* ── User Dropdown ─────────────────────────── */}
          <AnimatePresence>
            {userMenu && isAuthenticated && (
              <motion.div
                className="nav-dropdown"
                initial={{ opacity: 0, y: 6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                style={{ maxHeight: '80vh', overflowY: 'auto' }}
              >
                {/* Admin section divider */}
                {isAdminUser && (
                  <div style={{ padding: '4px 12px', fontSize: '10px', color: 'var(--accent)', fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: '4px' }}>
                    لوحة التحكم
                  </div>
                )}

                {/* Marketer section divider */}
                {isMarketerUser && (
                  <div style={{ padding: '4px 12px', fontSize: '10px', color: 'var(--accent)', fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: '4px' }}>
                    {isTeamLeader ? '👑 قائد الفريق' : '🧑‍💼 المسوق'}
                  </div>
                )}

                {accountLinks.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="nav-dropdown-item"
                    onClick={closeMenus}
                  >
                    {item.icon}&nbsp; {item.label}
                  </Link>
                ))}
                <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />
                <button
                  className="nav-dropdown-item nav-danger"
                  onClick={() => { logout(); closeMenus(); }}
                >
                  ✕&nbsp; {t('nav.logout')}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Mobile Menu ──────────────────────────────── */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              className="mobile-menu"
              style={{ display: 'grid' }}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="mobile-menu-link"
                  onClick={closeMenus}
                >
                  {link.label}
                </Link>
              ))}
              {isAuthenticated && accountLinks.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="mobile-menu-link"
                  onClick={closeMenus}
                >
                  {item.icon}&nbsp; {item.label}
                </Link>
              ))}
              {isAuthenticated && (
                <button
                  className="mobile-menu-link nav-danger"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'start' }}
                  onClick={() => { logout(); closeMenus(); }}
                >
                  ✕&nbsp; {t('nav.logout')}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Spacer so content doesn't hide under fixed navbar */}
      <div style={{ height: '70px' }} />
    </>
  );
}