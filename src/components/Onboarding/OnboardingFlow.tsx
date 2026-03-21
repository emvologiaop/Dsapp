import React, { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Camera, CheckCircle2, KeyRound, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { FriendlyCard } from '../FriendlyCard';
import { ThemeSwitch } from '../ui/ThemeSwitch';
import { cn } from '../../lib/utils';
import { getTelegramDeepLink, getTelegramHandle, getTelegramProfileUrl } from '../../utils/telegram';
import {
  getPasswordValidationMessage,
  getSignupValidationErrors,
  normalizeSignupInput,
  SIGNUP_YEAR_OPTIONS,
  validateAvatarFile,
} from '../../utils/validation';

type Tab = 'login' | 'signup' | 'forgot';
type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

interface OnboardingFlowProps {
  onFinish: (user: any) => void;
}

const panelMotion = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

function AuthField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        {hint ? <span className="text-[11px] text-muted-foreground">{hint}</span> : null}
      </div>
      {children}
    </label>
  );
}

function AuthInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'w-full rounded-2xl border border-border bg-background/80 px-4 py-3.5 text-sm outline-none transition-colors',
        'placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/15',
        props.className
      )}
    />
  );
}

function AuthSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        'w-full rounded-2xl border border-border bg-background/80 px-4 py-3.5 text-sm outline-none transition-colors',
        'focus:border-primary focus:ring-2 focus:ring-primary/15',
        props.className
      )}
    />
  );
}

function AuthTabButton({
  active,
  label,
  onClick,
  disabled,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex-1 rounded-2xl px-4 py-3 text-sm font-semibold transition-all',
        active ? 'bg-background text-foreground shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {label}
    </button>
  );
}

function StatusMessage({ tone, children }: { tone: 'error' | 'success'; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      <FriendlyCard
        className={cn(
          'border text-sm',
          tone === 'error' && 'border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300',
          tone === 'success' && 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
        )}
      >
        {children}
      </FriendlyCard>
    </motion.div>
  );
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onFinish }) => {
  const [tab, setTab] = useState<Tab>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingTelegramUser, setPendingTelegramUser] = useState<any | null>(null);
  const [pendingTelegramSource, setPendingTelegramSource] = useState<'signup' | 'login' | null>(null);
  const [pendingTelegramStatus, setPendingTelegramStatus] = useState<string | null>(null);
  const [pendingTelegramVerifying, setPendingTelegramVerifying] = useState(false);
  const [pendingTelegramRefreshing, setPendingTelegramRefreshing] = useState(false);
  const [pendingTelegramCopied, setPendingTelegramCopied] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [signupName, setSignupName] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupDepartment, setSignupDepartment] = useState('');
  const [signupYear, setSignupYear] = useState('1');
  const [signupAvatarFile, setSignupAvatarFile] = useState<File | null>(null);
  const [signupAvatarPreview, setSignupAvatarPreview] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');

  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [forgotStep, setForgotStep] = useState<'request' | 'reset'>('request');

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const years = useMemo(() => [...SIGNUP_YEAR_OPTIONS], []);
  const avatarError = validateAvatarFile(signupAvatarFile);
  const passwordHint = getPasswordValidationMessage();
  const pendingTelegramHandle = getTelegramHandle(import.meta.env.VITE_TELEGRAM_BOT_USERNAME);
  const pendingTelegramBotUrl = getTelegramProfileUrl(import.meta.env.VITE_TELEGRAM_BOT_USERNAME);

  const signupErrors = getSignupValidationErrors({
    name: signupName,
    username: signupUsername,
    email: signupEmail,
    password: signupPassword,
    confirmPassword: signupConfirmPassword,
    department: signupDepartment,
    year: signupYear,
  });

  const resetFeedback = () => {
    setError(null);
    setSuccess(null);
  };

  const clearPendingTelegramState = () => {
    setPendingTelegramUser(null);
    setPendingTelegramSource(null);
    setPendingTelegramStatus(null);
    setPendingTelegramCopied(false);
    setPendingTelegramRefreshing(false);
    setPendingTelegramVerifying(false);
  };

  const beginTelegramGate = (user: any, source: 'signup' | 'login') => {
    setPendingTelegramUser(user);
    setPendingTelegramSource(source);
    setPendingTelegramStatus(
      source === 'signup'
        ? `Telegram linking is required before your account can open. Send the code to ${pendingTelegramHandle}.`
        : `This account must finish Telegram linking before access is allowed. Send the code to ${pendingTelegramHandle}.`
    );
    setSuccess(null);
    setError(null);
  };

  const finishAuth = (user: any) => {
    clearPendingTelegramState();
    onFinish(user);
  };

  const switchTab = (nextTab: Tab) => {
    clearPendingTelegramState();
    setTab(nextTab);
    resetFeedback();
  };

  const handleLogin = async () => {
    setLoading(true);
    resetFeedback();
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Login failed');
      const authenticatedUser = data?.token ? { ...data.user, authToken: data.token } : data.user;
      if (data?.user?.telegramChatId) {
        finishAuth(authenticatedUser);
      } else {
        beginTelegramGate(authenticatedUser, 'login');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const checkUsernameAvailability = async (usernameInput?: string): Promise<boolean> => {
    const normalized = normalizeSignupInput({ username: usernameInput ?? signupUsername }).username;
    if (!normalized) {
      setUsernameStatus('idle');
      return false;
    }
    if (!/^[a-z0-9_.]{3,20}$/.test(normalized)) {
      setUsernameStatus('invalid');
      return false;
    }
    setUsernameStatus('checking');
    try {
      const response = await fetch(`/api/auth/check-username?username=${encodeURIComponent(normalized)}`);
      const data = await response.json().catch(() => null);
      const available = Boolean(response.ok && data?.available);
      setUsernameStatus(available ? 'available' : 'taken');
      return available;
    } catch {
      setUsernameStatus('idle');
      return true;
    }
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    resetFeedback();
    const validationError = validateAvatarFile(file);
    if (validationError) {
      setSignupAvatarFile(null);
      setSignupAvatarPreview(null);
      setError(validationError);
      return;
    }
    setSignupAvatarFile(file);
    if (!file) {
      setSignupAvatarPreview(null);
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setSignupAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSignup = async () => {
    const normalized = normalizeSignupInput({
      name: signupName,
      username: signupUsername,
      email: signupEmail,
      password: signupPassword,
      confirmPassword: signupConfirmPassword,
      department: signupDepartment,
      year: signupYear,
    });
    const validationErrors = getSignupValidationErrors({ ...normalized, confirmPassword: signupConfirmPassword });
    if (avatarError) {
      setError(avatarError);
      return;
    }
    if (validationErrors.length > 0) {
      setError(validationErrors[0]);
      return;
    }
    const usernameAvailable = await checkUsernameAvailability(normalized.username);
    if (!usernameAvailable) {
      setError('That username is already taken.');
      return;
    }
    setLoading(true);
    resetFeedback();
    try {
      const form = new FormData();
      form.append('name', normalized.name);
      form.append('username', normalized.username);
      form.append('email', normalized.email);
      form.append('password', normalized.password);
      form.append('department', normalized.department);
      form.append('year', normalized.year);
      if (signupAvatarFile) form.append('avatar', signupAvatarFile);
      const res = await fetch('/api/auth/signup', { method: 'POST', body: form });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Signup failed');
      const signedUpUser = data?.token ? { ...data.user, authToken: data.token } : data.user;
      beginTelegramGate(signedUpUser, 'signup');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const requestReset = async () => {
    setLoading(true);
    resetFeedback();
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: forgotIdentifier.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Failed to request reset');
      setForgotStep('reset');
      setSuccess(
        data?.delivery === 'telegram'
          ? 'Reset code sent to your linked Telegram account.'
          : 'If that account is linked to Telegram, a reset code has been sent there.'
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to request reset');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    setLoading(true);
    resetFeedback();
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: forgotIdentifier.trim(),
          code: resetCode.trim(),
          newPassword,
          confirmPassword: confirmNewPassword,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Failed to reset password');
      setTab('login');
      if (forgotIdentifier.includes('@')) {
        setLoginEmail(forgotIdentifier);
      }
      setLoginPassword('');
      setForgotStep('request');
      setResetCode('');
      setNewPassword('');
      setConfirmNewPassword('');
      setSuccess('Password updated. You can sign in now.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const refreshPendingTelegramCode = async () => {
    if (!pendingTelegramUser?.id) return;
    setPendingTelegramRefreshing(true);
    setPendingTelegramStatus(null);
    try {
      const response = await fetch('/api/auth/telegram-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: pendingTelegramUser.id }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Unable to refresh Telegram code.');
      }
      setPendingTelegramUser((prev: any) => prev ? { ...prev, telegramAuthCode: data.telegramAuthCode, telegramChatId: undefined } : prev);
      setPendingTelegramStatus(`New code generated. Send it to ${pendingTelegramHandle} now.`);
    } catch (e) {
      setPendingTelegramStatus(e instanceof Error ? e.message : 'Unable to refresh Telegram code.');
    } finally {
      setPendingTelegramRefreshing(false);
    }
  };

  const verifyPendingTelegramLink = async () => {
    if (!pendingTelegramUser?.telegramAuthCode) return;
    setPendingTelegramVerifying(true);
    setPendingTelegramStatus(null);
    try {
      const response = await fetch(`/api/auth/verify-telegram/${pendingTelegramUser.telegramAuthCode}`);
      const data = await response.json().catch(() => null);
      if (data?.verified && data?.user?.telegramChatId) {
        finishAuth(data.user);
        return;
      }
      setPendingTelegramStatus(`Still waiting for verification. Send the code to ${pendingTelegramHandle}, then try again.`);
    } catch (e) {
      setPendingTelegramStatus(e instanceof Error ? e.message : 'Unable to verify Telegram right now.');
    } finally {
      setPendingTelegramVerifying(false);
    }
  };

  const copyPendingTelegramCode = async () => {
    if (!pendingTelegramUser?.telegramAuthCode) return;
    try {
      await navigator.clipboard.writeText(pendingTelegramUser.telegramAuthCode);
      setPendingTelegramCopied(true);
      setPendingTelegramStatus('Telegram code copied.');
      setTimeout(() => setPendingTelegramCopied(false), 2000);
    } catch {
      setPendingTelegramStatus('Unable to copy the Telegram code right now.');
    }
  };

  const usernameMessage =
    usernameStatus === 'checking'
      ? 'Checking availability...'
      : usernameStatus === 'available'
        ? 'Username is available.'
        : usernameStatus === 'taken'
          ? 'That username is already taken.'
          : usernameStatus === 'invalid'
            ? 'Use 3-20 lowercase letters, numbers, underscores, or periods.'
            : 'Your public handle inside the app.';

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_26%),linear-gradient(180deg,rgba(248,250,252,0.98),rgba(241,245,249,0.94))] text-foreground dark:bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.18),transparent_30%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.16),transparent_28%),linear-gradient(180deg,rgba(2,6,23,1),rgba(15,23,42,0.96))]">
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute left-[-8%] top-[-6%] h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl"
        animate={{ x: [0, 18, 0], y: [0, 22, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[-10%] right-[-8%] h-80 w-80 rounded-full bg-sky-400/20 blur-3xl"
        animate={{ x: [0, -20, 0], y: [0, -16, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-6 sm:px-6 lg:px-8">
        <motion.div
          className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.08, delayChildren: 0.04 },
            },
          }}
        >
          <motion.div variants={panelMotion} className="hidden lg:flex">
            <FriendlyCard className="relative flex min-h-[720px] flex-col justify-between overflow-hidden border border-border/70 bg-background/75 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur">
              <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-br from-primary/15 via-emerald-400/10 to-transparent" />
              <motion.div
                aria-hidden="true"
                className="absolute right-12 top-24 h-32 w-32 rounded-full border border-white/15 bg-white/5"
                animate={{ rotate: 360 }}
                transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
              />
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">DDU Social</p>
                  <h1 className="mt-3 max-w-md text-4xl font-bold tracking-tight text-foreground">Structured access for campus communication.</h1>
                </div>
                <ThemeSwitch />
              </div>
              <div className="relative z-10 mt-10 grid gap-4">
                <motion.div whileHover={{ y: -4, scale: 1.01 }} transition={{ duration: 0.18 }}>
                <FriendlyCard className="border border-border/70 bg-background/70 p-5">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-primary/12 p-3 text-primary"><ShieldCheck size={20} /></div>
                    <div>
                      <p className="font-semibold">Verified onboarding</p>
                      <p className="mt-1 text-sm text-muted-foreground">Signup enforces cleaner account requirements, avatar validation, and Telegram-ready linking from the start.</p>
                    </div>
                  </div>
                </FriendlyCard>
                </motion.div>
                <motion.div whileHover={{ y: -4, scale: 1.01 }} transition={{ duration: 0.18 }}>
                <FriendlyCard className="border border-border/70 bg-background/70 p-5">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-emerald-500/12 p-3 text-emerald-600 dark:text-emerald-400"><Sparkles size={20} /></div>
                    <div>
                      <p className="font-semibold">Persistent identity</p>
                      <p className="mt-1 text-sm text-muted-foreground">Avatar, verification status, department, year, and Telegram connection stay attached to the auth session.</p>
                    </div>
                  </div>
                </FriendlyCard>
                </motion.div>
                <motion.div whileHover={{ y: -4, scale: 1.01 }} transition={{ duration: 0.18 }}>
                <FriendlyCard className="border border-border/70 bg-slate-950 p-5 text-slate-50 dark:bg-background dark:text-foreground">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400 dark:text-muted-foreground">Access Flow</p>
                      <div className="mt-4 space-y-3 text-sm">
                        <div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-bold dark:bg-muted">01</span><span>Create or verify your account details</span></div>
                        <div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-bold dark:bg-muted">02</span><span>Get your Telegram verification code after signup</span></div>
                        <div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-bold dark:bg-muted">03</span><span>Manage recovery and notification access from settings</span></div>
                      </div>
                    </div>
                    <ArrowRight size={22} className="shrink-0 text-slate-400 dark:text-muted-foreground" />
                  </div>
                </FriendlyCard>
                </motion.div>
              </div>
              <div className="relative z-10 mt-8 text-sm text-muted-foreground">Professional auth starts with consistent validation, clear recovery, and predictable account state.</div>
            </FriendlyCard>
          </motion.div>
          <motion.div variants={panelMotion} className="flex items-center justify-center">
            <div className="w-full max-w-xl">
              <div className="mb-4 flex items-center justify-between lg:hidden">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">DDU Social</p>
                  <h1 className="mt-1 text-2xl font-bold tracking-tight">Secure campus access</h1>
                </div>
                <ThemeSwitch />
              </div>
              <FriendlyCard className="relative overflow-hidden border border-border/70 bg-background/80 p-4 shadow-[0_20px_70px_rgba(15,23,42,0.12)] backdrop-blur sm:p-6">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-primary/10 via-transparent to-sky-400/10" />
                <div className="space-y-5">
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-[0.26em] text-primary">
                      {pendingTelegramUser ? 'Telegram Required' : tab === 'login' ? 'Sign In' : tab === 'signup' ? 'Create Account' : 'Recovery'}
                    </p>
                    <h2 className="text-2xl font-bold tracking-tight">
                      {pendingTelegramUser
                        ? 'Link Telegram to continue'
                        : tab === 'login'
                          ? 'Welcome back'
                          : tab === 'signup'
                            ? 'Set up your account'
                            : forgotStep === 'request'
                              ? 'Reset your password'
                              : 'Enter your reset code'}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {pendingTelegramUser
                        ? 'Telegram linking is mandatory. Your account will not be allowed into the app until the bot confirms the link.'
                        : tab === 'login'
                          ? 'Use your institutional account details to continue.'
                          : tab === 'signup'
                            ? 'Fill in the required fields carefully. This setup becomes your long-term profile identity.'
                            : forgotStep === 'request'
                              ? 'Request a 6-digit reset code through your linked Telegram account.'
                              : 'Confirm the reset code and choose a new password.'}
                    </p>
                  </div>
                  {!pendingTelegramUser && (
                    <div className="rounded-2xl bg-muted/70 p-1.5">
                      <div className="flex gap-1.5">
                        <AuthTabButton active={tab === 'login'} label="Login" onClick={() => switchTab('login')} disabled={loading} />
                        <AuthTabButton active={tab === 'signup'} label="Sign up" onClick={() => switchTab('signup')} disabled={loading} />
                        <AuthTabButton active={tab === 'forgot'} label="Forgot" onClick={() => switchTab('forgot')} disabled={loading} />
                      </div>
                    </div>
                  )}
                  <AnimatePresence mode="popLayout">
                    {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
                    {success ? <StatusMessage tone="success">{success}</StatusMessage> : null}
                    {pendingTelegramStatus ? <StatusMessage tone="success">{pendingTelegramStatus}</StatusMessage> : null}
                  </AnimatePresence>
                  <AnimatePresence mode="wait">
                  {pendingTelegramUser ? (
                    <motion.div
                      key="telegram-gate"
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.22 }}
                      className="space-y-4"
                    >
                      <div className="rounded-2xl border border-border bg-muted/35 p-4">
                        <div className="flex items-start gap-3">
                          <div className="rounded-2xl bg-primary/12 p-2.5 text-primary"><ShieldCheck size={16} /></div>
                          <div>
                            <p className="text-sm font-semibold">
                              {pendingTelegramSource === 'signup' ? 'Finish signup with Telegram' : 'Finish login with Telegram'}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Send the code below to {pendingTelegramHandle}. No Telegram link, no account access.
                            </p>
                          </div>
                        </div>
                      </div>
                      <FriendlyCard className="border border-border bg-background/60 p-4">
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Telegram Code</p>
                            <div className="mt-2 rounded-2xl border border-dashed border-border bg-background/70 px-4 py-4 text-center font-mono text-2xl font-bold tracking-[0.35em] text-primary">
                              {pendingTelegramUser.telegramAuthCode || '------'}
                            </div>
                          </div>
                          <div className="flex flex-col gap-3 sm:flex-row">
                            <button
                              type="button"
                              onClick={copyPendingTelegramCode}
                              disabled={!pendingTelegramUser.telegramAuthCode}
                              className="w-full rounded-2xl border border-border bg-background/70 px-4 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted/60 disabled:opacity-60"
                            >
                              {pendingTelegramCopied ? 'Copied' : 'Copy code'}
                            </button>
                            <a
                              href={pendingTelegramUser.telegramAuthCode ? getTelegramDeepLink(pendingTelegramUser.telegramAuthCode, import.meta.env.VITE_TELEGRAM_BOT_USERNAME) : pendingTelegramBotUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full rounded-2xl bg-primary px-4 py-3.5 text-center text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-95"
                            >
                              Open Telegram bot
                            </a>
                          </div>
                        </div>
                      </FriendlyCard>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <motion.button
                          type="button"
                          onClick={refreshPendingTelegramCode}
                          disabled={pendingTelegramRefreshing || pendingTelegramVerifying}
                          whileHover={pendingTelegramRefreshing || pendingTelegramVerifying ? undefined : { scale: 1.01 }}
                          whileTap={pendingTelegramRefreshing || pendingTelegramVerifying ? undefined : { scale: 0.99 }}
                          className="w-full rounded-2xl border border-border bg-background/70 px-4 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted/60 disabled:opacity-60"
                        >
                          {pendingTelegramRefreshing ? 'Generating code...' : 'Generate new code'}
                        </motion.button>
                        <motion.button
                          type="button"
                          onClick={verifyPendingTelegramLink}
                          disabled={pendingTelegramVerifying || pendingTelegramRefreshing}
                          whileHover={pendingTelegramVerifying || pendingTelegramRefreshing ? undefined : { scale: 1.01 }}
                          whileTap={pendingTelegramVerifying || pendingTelegramRefreshing ? undefined : { scale: 0.99 }}
                          className="w-full rounded-2xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-95 disabled:opacity-60"
                        >
                          {pendingTelegramVerifying ? 'Checking Telegram...' : "I've linked Telegram"}
                        </motion.button>
                      </div>
                      <div className="rounded-2xl border border-border bg-muted/35 px-4 py-3 text-xs text-muted-foreground">
                        If you close this step or switch accounts before linking Telegram, access will remain blocked.
                      </div>
                    </motion.div>
                  ) : (
                  <>
                  {tab === 'login' && (
                    <motion.div
                      key="login"
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.22 }}
                      className="space-y-4"
                    >
                      <AuthField label="Email address" hint="Required">
                        <AuthInput value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="you@example.com" type="email" autoComplete="email" disabled={loading} />
                      </AuthField>
                      <AuthField label="Password" hint="Required">
                        <AuthInput value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Enter your password" type="password" autoComplete="current-password" disabled={loading} />
                      </AuthField>
                      <div className="rounded-2xl border border-border bg-muted/35 px-4 py-3 text-xs text-muted-foreground">
                        Use the same account you connected to Telegram if you want recovery codes and notifications routed there.
                      </div>
                      <motion.button
                        type="button"
                        onClick={handleLogin}
                        disabled={loading || !loginEmail.trim() || !loginPassword.trim()}
                        whileHover={loading ? undefined : { scale: 1.01 }}
                        whileTap={loading ? undefined : { scale: 0.99 }}
                        className="w-full rounded-2xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-95 disabled:opacity-60"
                      >
                        {loading ? 'Signing in...' : 'Sign in'}
                      </motion.button>
                    </motion.div>
                  )}
                  {tab === 'signup' && (
                    <motion.div
                      key="signup"
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.22 }}
                      className="space-y-5"
                    >
                      <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
                        <div className="flex flex-col items-center gap-3">
                          <motion.button
                            type="button"
                            onClick={() => avatarInputRef.current?.click()}
                            className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[28px] border border-dashed border-border bg-muted/50 transition-colors hover:border-primary/40"
                            disabled={loading}
                            whileHover={loading ? undefined : { scale: 1.04, rotate: -2 }}
                            whileTap={loading ? undefined : { scale: 0.98 }}
                          >
                            {signupAvatarPreview ? <img src={signupAvatarPreview} alt="Avatar preview" className="h-full w-full object-cover" /> : <Camera size={24} className="text-muted-foreground" />}
                          </motion.button>
                          <button type="button" onClick={() => avatarInputRef.current?.click()} className="text-xs font-medium text-primary hover:underline" disabled={loading}>
                            {signupAvatarPreview ? 'Change avatar' : 'Upload avatar'}
                          </button>
                          <input ref={avatarInputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp,image/gif" onChange={handleAvatarSelect} className="hidden" />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <AuthField label="Full name" hint="Required">
                            <AuthInput value={signupName} onChange={(e) => setSignupName(e.target.value)} placeholder="First and last name" autoComplete="name" disabled={loading} />
                          </AuthField>
                          <AuthField label="Username" hint="Public handle">
                            <AuthInput
                              value={signupUsername}
                              onChange={(e) => {
                                setSignupUsername(e.target.value.toLowerCase());
                                setUsernameStatus('idle');
                              }}
                              onBlur={() => {
                                void checkUsernameAvailability();
                              }}
                              placeholder="e.g. ddu_student"
                              autoComplete="username"
                              disabled={loading}
                            />
                          </AuthField>
                          <div className="sm:col-span-2 -mt-1 text-[11px] text-muted-foreground">{usernameMessage}</div>
                          <AuthField label="Email address" hint="Required">
                            <AuthInput value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} placeholder="you@example.com" type="email" autoComplete="email" disabled={loading} />
                          </AuthField>
                          <AuthField label="Department" hint="Required">
                            <AuthInput value={signupDepartment} onChange={(e) => setSignupDepartment(e.target.value)} placeholder="Department or program" disabled={loading} />
                          </AuthField>
                          <AuthField label="Password" hint="Required">
                            <AuthInput value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} placeholder="Create a secure password" type="password" autoComplete="new-password" disabled={loading} />
                          </AuthField>
                          <AuthField label="Confirm password" hint="Required">
                            <AuthInput value={signupConfirmPassword} onChange={(e) => setSignupConfirmPassword(e.target.value)} placeholder="Repeat your password" type="password" autoComplete="new-password" disabled={loading} />
                          </AuthField>
                          <AuthField label="Academic year" hint="Required">
                            <AuthSelect value={signupYear} onChange={(e) => setSignupYear(e.target.value)} disabled={loading}>
                              {years.map((year) => (
                                <option key={year} value={year}>
                                  {year === 'remedial' ? 'Remedial' : `Year ${year}`}
                                </option>
                              ))}
                            </AuthSelect>
                          </AuthField>
                          <div className="sm:col-span-2 rounded-2xl border border-border bg-muted/35 px-4 py-3 text-xs text-muted-foreground">{passwordHint}</div>
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.18 }}>
                        <FriendlyCard className="border border-border bg-background/60 p-4">
                          <div className="flex items-start gap-3">
                            <div className="rounded-2xl bg-primary/12 p-2.5 text-primary"><ShieldCheck size={16} /></div>
                            <div>
                              <p className="text-sm font-semibold">Structured signup</p>
                              <p className="mt-1 text-xs text-muted-foreground">Validation runs before account creation so broken profiles do not enter the system.</p>
                            </div>
                          </div>
                        </FriendlyCard>
                        </motion.div>
                        <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.18 }}>
                        <FriendlyCard className="border border-border bg-background/60 p-4">
                          <div className="flex items-start gap-3">
                            <div className="rounded-2xl bg-emerald-500/12 p-2.5 text-emerald-600 dark:text-emerald-400"><CheckCircle2 size={16} /></div>
                            <div>
                              <p className="text-sm font-semibold">Telegram ready</p>
                              <p className="mt-1 text-xs text-muted-foreground">New accounts receive a verification code immediately so linking can happen without rework.</p>
                            </div>
                          </div>
                        </FriendlyCard>
                        </motion.div>
                      </div>
                      <motion.button
                        type="button"
                        onClick={handleSignup}
                        disabled={loading || signupErrors.length > 0 || Boolean(avatarError)}
                        whileHover={loading ? undefined : { scale: 1.01 }}
                        whileTap={loading ? undefined : { scale: 0.99 }}
                        className="w-full rounded-2xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-95 disabled:opacity-60"
                      >
                        {loading ? 'Creating account...' : 'Create account'}
                      </motion.button>
                    </motion.div>
                  )}
                  {tab === 'forgot' && (
                    <motion.div
                      key="forgot"
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.22 }}
                      className="space-y-4"
                    >
                      {forgotStep === 'request' ? (
                        <>
                          <div className="rounded-2xl border border-border bg-muted/35 p-4">
                            <div className="flex items-start gap-3">
                              <div className="rounded-2xl bg-primary/12 p-2.5 text-primary"><Mail size={16} /></div>
                              <div>
                                <p className="text-sm font-semibold">Request a reset code</p>
                                <p className="mt-1 text-xs text-muted-foreground">Enter your email or username. If that account is linked to Telegram, the reset code will be delivered there.</p>
                              </div>
                            </div>
                          </div>
                          <AuthField label="Email or username" hint="Required">
                            <AuthInput value={forgotIdentifier} onChange={(e) => setForgotIdentifier(e.target.value)} placeholder="you@example.com or username" autoComplete="username" disabled={loading} />
                          </AuthField>
                          <motion.button
                            type="button"
                            onClick={requestReset}
                            disabled={loading || !forgotIdentifier.trim()}
                            whileHover={loading ? undefined : { scale: 1.01 }}
                            whileTap={loading ? undefined : { scale: 0.99 }}
                            className="w-full rounded-2xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-95 disabled:opacity-60"
                          >
                            {loading ? 'Sending reset code...' : 'Send reset code'}
                          </motion.button>
                        </>
                      ) : (
                        <>
                          <div className="rounded-2xl border border-border bg-muted/35 p-4">
                            <div className="flex items-start gap-3">
                              <div className="rounded-2xl bg-emerald-500/12 p-2.5 text-emerald-600 dark:text-emerald-400"><KeyRound size={16} /></div>
                              <div>
                                <p className="text-sm font-semibold">Complete password reset</p>
                                <p className="mt-1 text-xs text-muted-foreground">Enter the 6-digit code from Telegram, then choose a new password that meets the policy.</p>
                              </div>
                            </div>
                          </div>
                          <AuthField label="6-digit code" hint="Required">
                            <AuthInput value={resetCode} onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" inputMode="numeric" disabled={loading} />
                          </AuthField>
                          <AuthField label="New password" hint="Required">
                            <AuthInput value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Create a new secure password" type="password" autoComplete="new-password" disabled={loading} />
                          </AuthField>
                          <AuthField label="Confirm new password" hint="Required">
                            <AuthInput value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} placeholder="Repeat the new password" type="password" autoComplete="new-password" disabled={loading} />
                          </AuthField>
                          <div className="text-xs text-muted-foreground">{passwordHint}</div>
                          <div className="flex flex-col gap-3 sm:flex-row">
                            <motion.button
                              type="button"
                              onClick={() => {
                                setForgotStep('request');
                                setResetCode('');
                                setNewPassword('');
                                setConfirmNewPassword('');
                                resetFeedback();
                              }}
                              disabled={loading}
                              whileHover={loading ? undefined : { scale: 1.01 }}
                              whileTap={loading ? undefined : { scale: 0.99 }}
                              className="w-full rounded-2xl border border-border bg-background/70 px-4 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted/60 disabled:opacity-60"
                            >
                              Back
                            </motion.button>
                            <motion.button
                              type="button"
                              onClick={requestReset}
                              disabled={loading || !forgotIdentifier.trim()}
                              whileHover={loading ? undefined : { scale: 1.01 }}
                              whileTap={loading ? undefined : { scale: 0.99 }}
                              className="w-full rounded-2xl border border-border bg-background/70 px-4 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted/60 disabled:opacity-60"
                            >
                              Resend code
                            </motion.button>
                          </div>
                          <motion.button
                            type="button"
                            onClick={resetPassword}
                            disabled={loading || resetCode.trim().length !== 6 || !newPassword.trim() || !confirmNewPassword.trim()}
                            whileHover={loading ? undefined : { scale: 1.01 }}
                            whileTap={loading ? undefined : { scale: 0.99 }}
                            className="w-full rounded-2xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-95 disabled:opacity-60"
                          >
                            {loading ? 'Resetting password...' : 'Reset password'}
                          </motion.button>
                        </>
                      )}
                    </motion.div>
                  )}
                  </>
                  )}
                  </AnimatePresence>
                </div>
              </FriendlyCard>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};
