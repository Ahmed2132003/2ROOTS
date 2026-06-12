import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

// ─── Password Strength ─────────────────────────────────────────────────────────
function PasswordStrength({ password, isRTL }) {
  const checks = [
    { test: password.length >= 8,          label: isRTL ? '8 أحرف على الأقل' : 'At least 8 chars' },
    { test: /[A-Z]/.test(password),        label: isRTL ? 'حرف كبير'          : 'Uppercase letter' },
    { test: /[0-9]/.test(password),        label: isRTL ? 'رقم'               : 'Number' },
    { test: /[^A-Za-z0-9]/.test(password), label: isRTL ? 'رمز خاص'           : 'Special char' },
  ];

  const passed   = checks.filter(c => c.test).length;
  const strength = passed === 0 ? 0 : passed <= 2 ? 1 : passed === 3 ? 2 : 3;
  const colors   = ['var(--border)', 'var(--danger)', 'var(--warning)', 'var(--success)'];
  const labels   = [
    '',
    isRTL ? 'ضعيفة' : 'Weak',
    isRTL ? 'متوسطة' : 'Medium',
    isRTL ? 'قوية' : 'Strong',
  ];

  if (!password) return null;

  return (
    <Motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ marginTop: '12px' }}
    >
      {/* Strength Bar */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
        {[1, 2, 3].map(level => (
          <div key={level} style={{
            flex: 1, height: '3px', borderRadius: '0px',
            background: strength >= level ? colors[strength] : 'var(--bg-hover)',
            transition: 'background 0.3s',
          }} />
        ))}
        <span style={{
          fontSize: '11px', fontWeight: 700,
          color: colors[strength],
          minWidth: '50px',
          textAlign: isRTL ? 'left' : 'right',
          letterSpacing: '1px', textTransform: 'uppercase',
        }}>
          {labels[strength]}
        </span>
      </div>

      {/* Checks */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: '6px',
      }}>
        {checks.map((check, i) => (
          <Motion.div key={i}
            animate={{ color: check.test ? 'var(--success)' : 'var(--text-muted)' }}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              fontSize: '11px', fontWeight: 600,
            }}
          >
            <Motion.span
              animate={{ scale: check.test ? [1, 1.3, 1] : 1 }}
              transition={{ duration: 0.3 }}
            >
              {check.test ? '✓' : '○'}
            </Motion.span>
            {check.label}
          </Motion.div>
        ))}
      </div>
    </Motion.div>
  );
}

// ─── Progress Steps ────────────────────────────────────────────────────────────
function StepIndicator({ current, total }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', gap: '8px',
      marginBottom: '32px',
    }}>
      {[...Array(total)].map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '30px', height: '30px',
              borderRadius: '2px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', fontWeight: 700,
              fontFamily: "'Bebas Neue', sans-serif",
              border: `1px solid ${i <= current ? 'var(--accent)' : 'var(--border)'}`,
              background: i < current
                ? 'var(--accent)'
                : i === current
                  ? '#FFFFFF'
                  : 'transparent',
              color: (i <= current && i <= current) ? '#0A0A0A' : 'var(--text-muted)',
              transition: 'all 0.3s ease',
            }}
          >
            {i < current ? '✓' : i + 1}
          </div>
          {i < total - 1 && (
            <div style={{
              width: '40px', height: '1px',
              background: i < current ? 'var(--accent)' : 'var(--border)',
              transition: 'background 0.3s',
            }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Input Field (reuse same as Login) ────────────────────────────────────────
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
        <span style={{
          position: 'absolute', top: '50%',
          transform: 'translateY(-50%)',
          [isRTL ? 'right' : 'left']: '16px',
          fontSize: '16px', pointerEvents: 'none', zIndex: 1, opacity: 0.6,
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
            border: `1px solid ${error ? 'var(--danger)' : focused ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: '2px',
            padding: `14px ${isPassword ? '48px' : '16px'} 14px 48px`,
            color: 'var(--text-primary)', fontSize: '14px',
            fontFamily: "'Inter', sans-serif",
            outline: 'none', transition: 'all 0.25s',
          }}
        />
        {isPassword && (
          <Motion.button whileTap={{ scale: 0.9 }}
            onClick={() => setShowPass(!showPass)} type="button"
            style={{
              position: 'absolute', top: '50%',
              transform: 'translateY(-50%)',
              [isRTL ? 'left' : 'right']: '16px',
              background: 'transparent', border: 'none',
              cursor: 'pointer', fontSize: '16px', color: 'var(--text-muted)',
              opacity: 0.7,
            }}
          >
            {showPass ? '🙈' : '👁️'}
          </Motion.button>
        )}
      </div>
      <AnimatePresence>
        {error && (
          <Motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            style={{
              fontSize: '12px', color: 'var(--danger)',
              marginTop: '6px', fontWeight: 600,
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
export default function Register() {
  const { i18n } = useTranslation();

  const t = (key) => {
    const messages = {
      'auth.register_title': isRTL ? 'إنشاء حساب جديد' : 'Create Your Account',
      'auth.email': isRTL ? 'البريد الإلكتروني' : 'Email',
      'auth.username': isRTL ? 'اسم المستخدم' : 'Username',
      'auth.phone': isRTL ? 'رقم الهاتف' : 'Phone',
      'auth.password': isRTL ? 'كلمة المرور' : 'Password',
      'auth.confirm_password': isRTL ? 'تأكيد كلمة المرور' : 'Confirm password',
      'auth.register_btn': isRTL ? 'تسجيل' : 'Register',
      'auth.have_account': isRTL ? 'لديك حساب بالفعل؟' : 'Already have an account?',
      'auth.login_btn': isRTL ? 'تسجيل الدخول' : 'Login',
    };
    return messages[key] ?? key;
  };
  const isRTL       = i18n.language === 'ar';
  const navigate    = useNavigate();
  const { setUser } = useAuthStore();

  const [step,   setStep]   = useState(0);
  const [errors, setErrors] = useState({});
  const [form,   setForm]   = useState({
    email: '', username: '', phone: '',
    password: '', password2: '',
  });
  const [backHover, setBackHover] = useState(false);
  const [nextHover, setNextHover] = useState(false);

  const set = (key) => (e) => {
    setForm(f => ({ ...f, [key]: e.target.value }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: '' }));
  };

  // Step Validation
  const validateStep = () => {
    const errs = {};

    if (step === 0) {
      if (!form.email)
        errs.email = isRTL ? 'البريد مطلوب' : 'Email is required';
      else if (!/\S+@\S+\.\S+/.test(form.email))
        errs.email = isRTL ? 'بريد غير صحيح' : 'Invalid email';
      if (!form.username)
        errs.username = isRTL ? 'الاسم مطلوب' : 'Username is required';
      if (form.phone && !/^[0-9+\-\s]{7,15}$/.test(form.phone))
        errs.phone = isRTL ? 'رقم هاتف غير صحيح' : 'Invalid phone';
    }

    if (step === 1) {
      if (!form.password)
        errs.password = isRTL ? 'كلمة المرور مطلوبة' : 'Password is required';
      else if (form.password.length < 8)
        errs.password = isRTL ? 'على الأقل 8 أحرف' : 'At least 8 characters';
      if (!form.password2)
        errs.password2 = isRTL ? 'تأكيد كلمة المرور مطلوب' : 'Please confirm your password';
      else if (form.password !== form.password2)
        errs.password2 = isRTL ? 'كلمتا المرور غير متطابقتين' : "Passwords don't match";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Register Mutation
  const registerMutation = useMutation({
    mutationFn: () => api.post('/auth/register/', form),
    onSuccess: (res) => {
      const { access, refresh, user } = res.data;
      persistTokens({ access, refresh });
      setUser(user);
      navigate('/', { replace: true });
    },
    onError: (err) => {
      const data = err.response?.data || {};
      const errs = {};
      if (data.email)    errs.email    = data.email[0];
      if (data.username) errs.username = data.username[0];
      if (data.detail)   errs.general  = data.detail;
      setErrors(errs);
      if (errs.email || errs.username) setStep(0);
    },
  });

  const handleNext = () => {
    if (validateStep()) {
      if (step < 1) setStep(s => s + 1);
      else registerMutation.mutate();
    }
  };

  const steps = [
    isRTL ? 'معلوماتك' : 'Your Info',
    isRTL ? 'كلمة المرور' : 'Password',
  ];

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
          width: '100%', maxWidth: '480px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '4px', padding: '48px',
          position: 'relative', zIndex: 1,
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
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
            {t('auth.register_title')}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            {isRTL ? 'انضم لعائلة 2ROOTS اليوم' : 'Join the 2ROOTS family today'}
          </p>
        </div>

        {/* Step Indicator */}
        <StepIndicator current={step} total={2} isRTL={isRTL} />

        {/* Step Label */}
        <div style={{
          textAlign: 'center', marginBottom: '28px',
          fontSize: '12px', fontWeight: 700,
          color: 'var(--accent)', letterSpacing: '2px',
          textTransform: 'uppercase',
        }}>
          {isRTL ? `الخطوة ${step + 1} من 2` : `Step ${step + 1} of 2`} — {steps[step]}
        </div>

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
              }}
            >
              ⚠️ {errors.general}
            </Motion.div>
          )}
        </AnimatePresence>

        {/* Steps */}
        <AnimatePresence mode="wait">
          {step === 0 && (
            <Motion.div key="step0"
              initial={{ opacity: 0, x: isRTL ? -30 : 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRTL ? 30 : -30 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <InputField
                label={t('auth.email')}    type="email"
                value={form.email}         onChange={set('email')}
                placeholder="you@example.com"
                error={errors.email}       icon="📧" isRTL={isRTL}
              />
              <InputField
                label={t('auth.username')} type="text"
                value={form.username}      onChange={set('username')}
                placeholder={isRTL ? 'اسم المستخدم' : 'username'}
                error={errors.username}    icon="👤" isRTL={isRTL}
              />
              <InputField
                label={t('auth.phone')}    type="tel"
                value={form.phone}         onChange={set('phone')}
                placeholder="+20 1xx xxx xxxx"
                error={errors.phone}       icon="📱" isRTL={isRTL}
              />
            </Motion.div>
          )}

          {step === 1 && (
            <Motion.div key="step1"
              initial={{ opacity: 0, x: isRTL ? -30 : 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRTL ? 30 : -30 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <InputField
                label={t('auth.password')}         type="password"
                value={form.password}              onChange={set('password')}
                placeholder="••••••••"
                error={errors.password}            icon="🔒" isRTL={isRTL}
              />
              <PasswordStrength password={form.password} isRTL={isRTL} />

              <div style={{ marginTop: '20px' }}>
                <InputField
                  label={t('auth.confirm_password')} type="password"
                  value={form.password2}             onChange={set('password2')}
                  placeholder="••••••••"
                  error={errors.password2}           icon="🔐" isRTL={isRTL}
                />
              </div>
            </Motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              onMouseEnter={() => setBackHover(true)}
              onMouseLeave={() => setBackHover(false)}
              style={{
                flex: 1, background: 'transparent',
                border: `1px solid ${backHover ? 'var(--gold)' : 'var(--border)'}`,
                borderRadius: '2px', padding: '15px',
                color: backHover ? 'var(--gold)' : 'var(--text-secondary)',
                fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                letterSpacing: '2px', textTransform: 'uppercase',
                transition: 'all 0.25s ease',
              }}
            >
              {isRTL ? '→ رجوع' : '← Back'}
            </button>
          )}

          <button
            onClick={handleNext}
            disabled={registerMutation.isLoading}
            onMouseEnter={() => setNextHover(true)}
            onMouseLeave={() => setNextHover(false)}
            style={{
              flex: 2,
              background: nextHover ? 'var(--gold)' : '#FFFFFF',
              border: `1px solid ${nextHover ? 'var(--gold)' : '#FFFFFF'}`,
              borderRadius: '2px', padding: '15px',
              color: '#0A0A0A', fontSize: '13px', fontWeight: 700,
              letterSpacing: '3px', textTransform: 'uppercase',
              cursor: registerMutation.isLoading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '8px',
              opacity: registerMutation.isLoading ? 0.7 : 1,
              transition: 'all 0.25s ease',
            }}
          >
            {registerMutation.isLoading ? (
              <>
                <Motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                >⟳</Motion.span>
                {isRTL ? 'جاري الإنشاء...' : 'Creating...'}
              </>
            ) : step < 1 ? (
              <>{isRTL ? 'التالي' : 'Next'}</>
            ) : (
              <>{t('auth.register_btn')}</>
            )}
          </button>
        </div>

        {/* Login Link */}
        <div style={{ textAlign: 'center', marginTop: '28px' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            {t('auth.have_account')}{' '}
          </span>
          <Link to="/login" style={{
            color: 'var(--accent)', fontWeight: 700,
            textDecoration: 'none', fontSize: '13px',
            letterSpacing: '1px', textTransform: 'uppercase',
            borderBottom: '1px solid var(--accent)',
            paddingBottom: '2px',
          }}>
            {t('auth.login_btn')}
          </Link>
        </div>
      </Motion.div>
    </div>
  );
}