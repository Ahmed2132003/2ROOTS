import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';

// ─── Floating Background Orbs ──────────────────────────────────────────────────
function BgOrbs() {
  return (
    <>
      {[
        { w: 500, h: 500, top: '-20%', left: '-10%', color: 'rgba(108,99,255,0.08)', dur: 8 },
        { w: 350, h: 350, top: '60%',  right: '-8%', color: 'rgba(167,139,250,0.07)', dur: 10 },
        { w: 250, h: 250, top: '30%',  left: '50%',  color: 'rgba(108,99,255,0.05)', dur: 6 },
      ].map((orb, i) => (
        <motion.div key={i}
          animate={{ y: [0, -20, 0], rotate: [0, 8, 0] }}
          transition={{ duration: orb.dur, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'fixed',
            width: orb.w, height: orb.h,
            top: orb.top, left: orb.left, right: orb.right,
            borderRadius: '50%',
            background: orb.color,
            filter: 'blur(70px)',
            pointerEvents: 'none', zIndex: 0,
          }}
        />
      ))}
    </>
  );
}

// ─── Input Field ───────────────────────────────────────────────────────────────
function InputField({ label, type = 'text', value, onChange, placeholder, error, icon, isRTL }) {
  const [focused,  setFocused]  = useState(false);
  const [showPass, setShowPass] = useState(false);

  const isPassword = type === 'password';

  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={{
        display: 'block', fontSize: '12px',
        fontWeight: 700, color: 'var(--text-secondary)',
        marginBottom: '8px', letterSpacing: '1px',
        textTransform: 'uppercase',
      }}>
        {label}
      </label>

      <div style={{ position: 'relative' }}>
        {/* Icon */}
        <span style={{
          position: 'absolute', top: '50%',
          transform: 'translateY(-50%)',
          [isRTL ? 'right' : 'left']: '16px',
          fontSize: '18px', pointerEvents: 'none',
          zIndex: 1,
        }}>
          {icon}
        </span>

        <input
          type={isPassword && showPass ? 'text' : type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={()  => setFocused(false)}
          style={{
            width: '100%',
            background: focused ? 'var(--bg-secondary)' : 'var(--bg-card)',
            border: `1.5px solid ${error
              ? 'var(--danger)'
              : focused
                ? 'var(--accent)'
                : 'var(--border)'}`,
            borderRadius: '14px',
            padding: isRTL
              ? `14px ${isPassword ? '48px' : '16px'} 14px 48px`
              : `14px ${isPassword ? '48px' : '16px'} 14px 48px`,
            color: 'var(--text-primary)',
            fontSize: '15px', outline: 'none',
            transition: 'all 0.25s',
            boxShadow: focused ? '0 0 0 4px var(--accent-glow)' : 'none',
          }}
        />

        {/* Show/Hide Password */}
        {isPassword && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowPass(!showPass)}
            type="button"
            style={{
              position: 'absolute', top: '50%',
              transform: 'translateY(-50%)',
              [isRTL ? 'left' : 'right']: '16px',
              background: 'transparent', border: 'none',
              cursor: 'pointer', fontSize: '18px',
              color: 'var(--text-muted)',
            }}
          >
            {showPass ? '🙈' : '👁️'}
          </motion.button>
        )}
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            style={{
              fontSize: '12px', color: 'var(--danger)',
              marginTop: '6px', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: '4px',
            }}
          >
            ⚠ {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Login() {
  const { t, i18n }   = useTranslation();
  const isRTL         = i18n.language === 'ar';
  const navigate      = useNavigate();
  const location      = useLocation();
  const { setUser }   = useAuthStore();
  const from          = location.state?.from?.pathname || '/';

  const [form, setForm]     = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  // Validate
  const validate = () => {
    const errs = {};
    if (!form.email)    errs.email    = isRTL ? 'البريد مطلوب'        : 'Email is required';
    if (!form.password) errs.password = isRTL ? 'كلمة المرور مطلوبة' : 'Password is required';
    if (form.email && !/\S+@\S+\.\S+/.test(form.email))
      errs.email = isRTL ? 'بريد إلكتروني غير صحيح' : 'Invalid email';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Login Mutation
  const loginMutation = useMutation({
    mutationFn: () => api.post('/auth/login/', {
      email:    form.email,
      password: form.password,
    }),
    onSuccess: (res) => {
      const { access, refresh } = res.data;
      localStorage.setItem('access',  access);
      localStorage.setItem('refresh', refresh);
      api.defaults.headers.common['Authorization'] = `Bearer ${access}`;

      // Fetch user profile
      api.get('/auth/profile/').then(r => {
        setUser(r.data);
        navigate(from, { replace: true });
      });
    },
    onError: (err) => {
      const msg = err.response?.data?.detail
        || (isRTL ? 'بيانات غير صحيحة' : 'Invalid credentials');
      setErrors({ general: msg });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) loginMutation.mutate();
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 5%', position: 'relative', overflow: 'hidden',
    }}>
      <BgOrbs />

      {/* Grid Pattern */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: `
          linear-gradient(rgba(108,99,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(108,99,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
        pointerEvents: 'none',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: '100%', maxWidth: '480px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '28px', padding: '48px',
          position: 'relative', zIndex: 1,
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ textAlign: 'center', marginBottom: '36px' }}
        >
          <Link to="/" style={{ textDecoration: 'none' }}>
            <div style={{
              fontSize: '32px', fontWeight: 800,
              background: 'linear-gradient(135deg, #6C63FF, #A78BFA)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              fontFamily: "'Syne', sans-serif", marginBottom: '8px',
            }}>
              🦈 SHARK
            </div>
          </Link>
          <h1 style={{
            fontSize: '26px', fontWeight: 800,
            color: 'var(--text-primary)', marginBottom: '8px',
            fontFamily: "'Syne', 'Cairo', sans-serif",
          }}>
            {t('auth.login_title')}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            {isRTL ? 'أهلاً بك مجدداً!' : 'Welcome back!'}
          </p>
        </motion.div>

        {/* General Error */}
        <AnimatePresence>
          {errors.general && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '14px', padding: '14px 18px',
                color: 'var(--danger)', fontSize: '14px',
                fontWeight: 600, marginBottom: '24px',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}
            >
              ⚠️ {errors.general}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <InputField
            label={t('auth.email')}
            type="email"
            value={form.email}
            onChange={set('email')}
            placeholder="you@example.com"
            error={errors.email}
            icon="📧"
            isRTL={isRTL}
          />
          <InputField
            label={t('auth.password')}
            type="password"
            value={form.password}
            onChange={set('password')}
            placeholder="••••••••"
            error={errors.password}
            icon="🔒"
            isRTL={isRTL}
          />

          {/* Submit */}
          <motion.button
            whileHover={{ scale: 1.02, boxShadow: '0 0 40px rgba(108,99,255,0.35)' }}
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={loginMutation.isLoading}
            style={{
              width: '100%', marginTop: '8px',
              background: 'linear-gradient(135deg, #6C63FF, #A78BFA)',
              border: 'none', borderRadius: '16px',
              padding: '16px',
              color: 'white', fontSize: '16px', fontWeight: 700,
              cursor: loginMutation.isLoading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '8px',
              opacity: loginMutation.isLoading ? 0.8 : 1,
            }}
          >
            {loginMutation.isLoading ? (
              <>
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                >⟳</motion.span>
                {isRTL ? 'جاري الدخول...' : 'Signing in...'}
              </>
            ) : (
              <>{t('auth.login_btn')} →</>
            )}
          </motion.button>
        </form>

        {/* Divider */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '16px',
          margin: '28px 0',
        }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            {isRTL ? 'أو' : 'or'}
          </span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>

        {/* Register Link */}
        <div style={{ textAlign: 'center' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            {t('auth.no_account')}{' '}
          </span>
          <Link to="/register" style={{
            color: 'var(--accent)', fontWeight: 700,
            textDecoration: 'none', fontSize: '14px',
          }}
            onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
            onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
          >
            {t('auth.register_btn')}
          </Link>
        </div>
      </motion.div>
    </div>
  );
}