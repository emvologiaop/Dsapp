import React, { useMemo, useState } from 'react';
import { FriendlyCard } from '../FriendlyCard';

type Tab = 'login' | 'signup' | 'forgot';

interface OnboardingFlowProps {
  onFinish: (user: any) => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onFinish }) => {
  const [tab, setTab] = useState<Tab>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [signupName, setSignupName] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupDepartment, setSignupDepartment] = useState('');
  const [signupYear, setSignupYear] = useState('1');

  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotStep, setForgotStep] = useState<'request' | 'reset'>('request');

  const years = useMemo(() => ['remedial', '1', '2', '3', '4', '5', '6', '7'], []);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Login failed');
      onFinish(data.user);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('name', signupName);
      form.append('username', signupUsername);
      form.append('email', signupEmail);
      form.append('password', signupPassword);
      form.append('department', signupDepartment);
      form.append('year', signupYear);

      const res = await fetch('/api/auth/signup', { method: 'POST', body: form });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Signup failed');
      onFinish(data.user);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const requestReset = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Failed to request reset');
      setForgotStep('reset');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to request reset');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, code: resetCode, newPassword }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Failed to reset password');
      setTab('login');
      setLoginEmail(forgotEmail);
      setLoginPassword('');
      setForgotStep('request');
      setResetCode('');
      setNewPassword('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-primary">DDU Social</h1>
          <p className="text-sm text-muted-foreground">Sign in to continue</p>
        </div>

        <div className="flex rounded-xl bg-muted p-1">
          {[
            { id: 'login', label: 'Login' },
            { id: 'signup', label: 'Sign up' },
            { id: 'forgot', label: 'Forgot' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id as Tab);
                setError(null);
              }}
              className={`flex-1 px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                tab === t.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
              disabled={loading}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && (
          <FriendlyCard className="border border-red-500/20 bg-red-500/10 text-sm text-red-600 dark:text-red-300">
            {error}
          </FriendlyCard>
        )}

        {tab === 'login' && (
          <FriendlyCard className="space-y-3">
            <input
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="Email"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
              disabled={loading}
            />
            <input
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="Password"
              type="password"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
              disabled={loading}
            />
            <button
              type="button"
              onClick={handleLogin}
              disabled={loading || !loginEmail.trim() || !loginPassword.trim()}
              className="w-full rounded-xl bg-primary text-primary-foreground px-4 py-3 font-semibold disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Login'}
            </button>
          </FriendlyCard>
        )}

        {tab === 'signup' && (
          <FriendlyCard className="space-y-3">
            <input
              value={signupName}
              onChange={(e) => setSignupName(e.target.value)}
              placeholder="Full name"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
              disabled={loading}
            />
            <input
              value={signupUsername}
              onChange={(e) => setSignupUsername(e.target.value)}
              placeholder="Username"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
              disabled={loading}
            />
            <input
              value={signupEmail}
              onChange={(e) => setSignupEmail(e.target.value)}
              placeholder="Email"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
              disabled={loading}
            />
            <input
              value={signupPassword}
              onChange={(e) => setSignupPassword(e.target.value)}
              placeholder="Password"
              type="password"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
              disabled={loading}
            />
            <input
              value={signupDepartment}
              onChange={(e) => setSignupDepartment(e.target.value)}
              placeholder="Department"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
              disabled={loading}
            />
            <select
              value={signupYear}
              onChange={(e) => setSignupYear(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
              disabled={loading}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y === 'remedial' ? 'Remedial' : `Year ${y}`}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleSignup}
              disabled={loading || !signupName.trim() || !signupUsername.trim() || !signupEmail.trim() || !signupPassword.trim() || !signupDepartment.trim()}
              className="w-full rounded-xl bg-primary text-primary-foreground px-4 py-3 font-semibold disabled:opacity-60"
            >
              {loading ? 'Creating…' : 'Create account'}
            </button>
          </FriendlyCard>
        )}

        {tab === 'forgot' && (
          <FriendlyCard className="space-y-3">
            {forgotStep === 'request' ? (
              <>
                <input
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={requestReset}
                  disabled={loading || !forgotEmail.trim()}
                  className="w-full rounded-xl bg-primary text-primary-foreground px-4 py-3 font-semibold disabled:opacity-60"
                >
                  {loading ? 'Requesting…' : 'Send reset code'}
                </button>
                <p className="text-xs text-muted-foreground">
                  If your Telegram is connected, you can receive the OTP there. Otherwise contact an admin.
                </p>
              </>
            ) : (
              <>
                <input
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  placeholder="6-digit code"
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                  disabled={loading}
                />
                <input
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  type="password"
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={resetPassword}
                  disabled={loading || resetCode.trim().length !== 6 || newPassword.trim().length < 6}
                  className="w-full rounded-xl bg-primary text-primary-foreground px-4 py-3 font-semibold disabled:opacity-60"
                >
                  {loading ? 'Resetting…' : 'Reset password'}
                </button>
              </>
            )}
          </FriendlyCard>
        )}
      </div>
    </div>
  );
};

