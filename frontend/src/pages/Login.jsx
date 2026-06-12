import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import api, { persistTokens } from '../services/api';

// ─── Background Texture ────────────────────────────────────────────────────────
function BgTexture() {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 0,
      backgroundImage: `
        linear-gradient(rgba(216,210,194,0.025) 1px, transparent 1px),
        linear-gradient(90deg, rgba(216,210,194,0.025) 1px, transparent 1px)
      `,
      backgroundSize: '60px 60px',
      pointerEvents: 'none',
    }} />
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
        display: 'block', fontSize: '11px',
        fontWeight: 700, color: 'var(--text-secondary)',
        marginBottom: '8px', letterSpacing: '2px',
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
          fontSize: '16px', pointerEvents: 'none',
          zIndex: 1, opacity: 0.6,
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
            background: 'var(--bg-primary)',
            border: `1px solid ${error
              ? 'var(--danger)'
              : focused
                ? 'var(--accent)'
                : 'var(--border)'}`,
            borderRadius: '2px',
            padding: isRTL
              ? `14px ${isPassword ? '48px' : '16px'} 14px 48px`
              : `14px ${isPassword ? '48px' : '16px'} 14px 48px`,
            color: 'var(--text-primary)',
            fontSize: '14px', outline: 'none',
            fontFamily: "'Inter', sans-serif",
            transition: 'all 0.25s',
          }}
        />

        {/* Show/Hide Password */}
        {isPassword && (
          <Motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowPass(!showPass)}
            type="button"
            style={{
              position: 'absolute', top: '50%',
              transform: 'translateY(-50%)',
              [isRTL ? 'left' : 'right']: '16px',
              background: 'transparent', border: 'none',
              cursor: 'pointer', fontSize: '16px',
              color: 'var(--text-muted)', opacity: 0.7,
            }}
          >
            {showPass ? '🙈' : '👁️'}
          </Motion.button>
        )}
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <Motion.div
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
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Login() {
  const { i18n }   = useTranslation();

    const t = (key) => {
    const messages = {
      'auth.login_title': isRTL ? 'مرحبًا بعودتك' : 'Welcome Back',
      'auth.email': isRTL ? 'البريد الإلكتروني' : 'Email',
      'auth.password': isRTL ? 'كلمة المرور' : 'Password',
      'auth.login_btn': isRTL ? 'تسجيل الدخول' : 'Login',
      'auth.no_account': isRTL ? 'ليس لديك حساب؟' : 'Do not have an account?',
      'auth.register_btn': isRTL ? 'إنشاء حساب' : 'Create account',
    };
    return messages[key] ?? key;
  };
  const isRTL         = i18n.language === 'ar';
  const navigate      = useNavigate();
  const location      = useLocation();
  const { setUser }   = useAuthStore();
  const from          = location.state?.from?.pathname || '/';

  const [form, setForm]     = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [submitHover, setSubmitHover] = useState(false);
  const [registerHover, setRegisterHover] = useState(false);

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
    onSuccess: async (res) => {
      const { access, refresh } = res.data;
      persistTokens({ access, refresh });

      try {
        const profileResponse = await api.get('/auth/profile/');
        setUser(profileResponse.data);
        navigate(from, { replace: true });
      } catch (error) {
        const status = error?.response?.status;
        const fallback = isRTL
          ? 'تم تسجيل الدخول لكن تعذر تحميل الحساب حالياً. حاول مرة أخرى.'
          : 'Logged in, but failed to load your profile right now. Please try again.';
        const msg = status >= 500
          ? (isRTL ? 'الخادم غير متاح حالياً. حاول بعد قليل.' : 'Server is temporarily unavailable. Please try again shortly.')
          : (error?.response?.data?.detail || fallback);

        setErrors({ general: msg });
      }
    },
    onError: (err) => {
      const status = err?.response?.status;
      const msg = status >= 500
        ? (isRTL ? 'الخادم غير متاح حالياً. حاول بعد قليل.' : 'Server is temporarily unavailable. Please try again shortly.')
        : (err?.response?.data?.detail || (isRTL ? 'بيانات غير صحيحة' : 'Invalid credentials'));
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
      background: 'var(--bg-primary)',
    }}>
      <BgTexture />

      <Motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: '100%', maxWidth: '440px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '4px', padding: '48px',
          position: 'relative', zIndex: 1,
        }}
      >
        {/* Logo */}
        <Motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ textAlign: 'center', marginBottom: '36px' }}
        >
          <Link to="/" style={{ textDecoration: 'none' }}>
            <div style={{
              fontSize: '30px', fontWeight: 700,
              color: 'var(--text-primary)',
              fontFamily: "'Bebas Neue', sans-serif",
              letterSpacing: '4px',
              marginBottom: '14px',
            }}>
              2ROOTS
            </div>
          </Link>
          <h1 style={{
            fontSize: '24px', fontWeight: 700,
            color: 'var(--text-primary)', marginBottom: '8px',
            fontFamily: "'Bebas Neue', sans-serif",
            letterSpacing: '2px', textTransform: 'uppercase',
          }}>
            {t('auth.login_title')}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            {isRTL ? 'أهلاً بك مجدداً!' : 'Welcome back!'}
          </p>
        </Motion.div>

        {/* General Error */}
        <AnimatePresence>
          {errors.general && (
            <Motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '2px', padding: '14px 18px',
                color: 'var(--danger)', fontSize: '13px',
                fontWeight: 600, marginBottom: '24px',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}
            >
              ⚠️ {errors.general}
            </Motion.div>
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
          <button
            type="submit"
            disabled={loginMutation.isLoading}
            onMouseEnter={() => setSubmitHover(true)}
            onMouseLeave={() => setSubmitHover(false)}
            style={{
              width: '100%', marginTop: '8px',
              background: submitHover ? 'var(--gold)' : '#FFFFFF',
              border: `1px solid ${submitHover ? 'var(--gold)' : '#FFFFFF'}`,
              borderRadius: '2px',
              padding: '15px',
              color: '#0A0A0A', fontSize: '13px', fontWeight: 700,
              letterSpacing: '3px', textTransform: 'uppercase',
              cursor: loginMutation.isLoading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '8px',
              opacity: loginMutation.isLoading ? 0.7 : 1,
              transition: 'all 0.25s ease',
            }}
          >
            {loginMutation.isLoading ? (
              <>
                <Motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                >⟳</Motion.span>
                {isRTL ? 'جاري الدخول...' : 'Signing in...'}
              </>
            ) : (
              <>{t('auth.login_btn')}</>
            )}
          </button>
        </form>

        {/* Divider */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '16px',
          margin: '28px 0',
        }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          <span style={{ color: 'var(--text-muted)', fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase' }}>
            {isRTL ? 'أو' : 'or'}
          </span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>

        {/* Register Link */}
        <div style={{ textAlign: 'center' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            {t('auth.no_account')}{' '}
          </span>
          <Link
            to="/register"
            onMouseEnter={() => setRegisterHover(true)}
            onMouseLeave={() => setRegisterHover(false)}
            style={{
              color: registerHover ? 'var(--gold)' : 'var(--accent)',
              fontWeight: 700,
              textDecoration: 'none', fontSize: '13px',
              letterSpacing: '1px', textTransform: 'uppercase',
              borderBottom: `1px solid ${registerHover ? 'var(--gold)' : 'var(--accent)'}`,
              paddingBottom: '2px',
              transition: 'all 0.25s ease',
            }}
          >
            {t('auth.register_btn')}
          </Link>
        </div>
      </Motion.div>
    </div>
  );
}