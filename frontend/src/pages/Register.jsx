import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import api, { persistTokens } from '../services/api';

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
            flex: 1, height: '4px', borderRadius: '2px',
            background: strength >= level ? colors[strength] : 'var(--bg-hover)',
            transition: 'background 0.3s',
          }} />
        ))}
        <span style={{
          fontSize: '11px', fontWeight: 700,
          color: colors[strength],
          minWidth: '50px',
          textAlign: isRTL ? 'left' : 'right',
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
          <Motion.div
            animate={{
              background: i < current
                ? 'var(--success)'
                : i === current
                  ? 'linear-gradient(135deg, #6C63FF, #A78BFA)'
                  : 'var(--bg-hover)',
              scale: i === current ? 1.15 : 1,
            }}
            style={{
              width: '32px', height: '32px',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', fontWeight: 800, color: 'white',
              background: i === current
                ? 'linear-gradient(135deg, #6C63FF, #A78BFA)'
                : i < current ? 'var(--success)' : 'var(--bg-hover)',
            }}
          >
            {i < current ? '✓' : i + 1}
          </Motion.div>
          {i < total - 1 && (
            <div style={{
              width: '40px', height: '2px',
              background: i < current ? 'var(--success)' : 'var(--border)',
              borderRadius: '1px', transition: 'background 0.3s',
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
        display: 'block', fontSize: '12px',
        fontWeight: 700, color: 'var(--text-secondary)',
        marginBottom: '8px', letterSpacing: '1px',
        textTransform: 'uppercase',
      }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <span style={{
          position: 'absolute', top: '50%',
          transform: 'translateY(-50%)',
          [isRTL ? 'right' : 'left']: '16px',
          fontSize: '18px', pointerEvents: 'none', zIndex: 1,
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
            border: `1.5px solid ${error ? 'var(--danger)' : focused ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: '14px',
            padding: `14px ${isPassword ? '48px' : '16px'} 14px 48px`,
            color: 'var(--text-primary)', fontSize: '15px',
            outline: 'none', transition: 'all 0.25s',
            boxShadow: focused ? '0 0 0 4px var(--accent-glow)' : 'none',
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
              cursor: 'pointer', fontSize: '18px', color: 'var(--text-muted)',
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
  const { t, i18n } = useTranslation();
  const isRTL       = i18n.language === 'ar';
  const navigate    = useNavigate();
  const { setUser } = useAuthStore();

  const [step,   setStep]   = useState(0);
  const [errors, setErrors] = useState({});
  const [form,   setForm]   = useState({
    email: '', username: '', phone: '',
    password: '', password2: '',
  });

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
    }}>
      {/* BG */}
      {[
        { w: 500, h: 500, top: '-20%', right: '-10%', color: 'rgba(108,99,255,0.07)', dur: 9 },
        { w: 350, h: 350, top: '70%',  left: '-8%',   color: 'rgba(167,139,250,0.06)', dur: 11 },
      ].map((orb, i) => (
        <Motion.div key={i}
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: orb.dur, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'fixed', width: orb.w, height: orb.h,
            top: orb.top, left: orb.left, right: orb.right,
            borderRadius: '50%', background: orb.color,
            filter: 'blur(70px)', pointerEvents: 'none', zIndex: 0,
          }}
        />
      ))}

      <Motion.div
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
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
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
            {t('auth.register_title')}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            {isRTL ? 'انضم لعائلة شارك اليوم' : 'Join the Shark family today'}
          </p>
        </div>

        {/* Step Indicator */}
        <StepIndicator current={step} total={2} isRTL={isRTL} />

        {/* Step Label */}
        <div style={{
          textAlign: 'center', marginBottom: '28px',
          fontSize: '13px', fontWeight: 700,
          color: 'var(--accent)', letterSpacing: '1px',
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
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '14px', padding: '14px 18px',
                color: 'var(--danger)', fontSize: '14px',
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
            <Motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => setStep(s => s - 1)}
              style={{
                flex: 1, background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '16px', padding: '16px',
                color: 'var(--text-secondary)',
                fontSize: '15px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              {isRTL ? '→ رجوع' : '← Back'}
            </Motion.button>
          )}

          <Motion.button
            whileHover={{ scale: 1.02, boxShadow: '0 0 40px rgba(108,99,255,0.35)' }}
            whileTap={{ scale: 0.97 }}
            onClick={handleNext}
            disabled={registerMutation.isLoading}
            style={{
              flex: 2,
              background: 'linear-gradient(135deg, #6C63FF, #A78BFA)',
              border: 'none', borderRadius: '16px', padding: '16px',
              color: 'white', fontSize: '16px', fontWeight: 700,
              cursor: registerMutation.isLoading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '8px',
              opacity: registerMutation.isLoading ? 0.8 : 1,
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
              <>{isRTL ? 'التالي' : 'Next'} {isRTL ? '←' : '→'}</>
            ) : (
              <>{t('auth.register_btn')} ✦</>
            )}
          </Motion.button>
        </div>

        {/* Login Link */}
        <div style={{ textAlign: 'center', marginTop: '28px' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            {t('auth.have_account')}{' '}
          </span>
          <Link to="/login" style={{
            color: 'var(--accent)', fontWeight: 700,
            textDecoration: 'none', fontSize: '14px',
          }}>
            {t('auth.login_btn')}
          </Link>
        </div>
      </Motion.div>
    </div>
  );
}