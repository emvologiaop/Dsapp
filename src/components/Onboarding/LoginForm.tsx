import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { Input } from '../ui/Input';

interface LoginFormProps {
  onComplete: (data: any) => void;
  onSwitchToSignup?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onComplete, onSwitchToSignup }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      const newErrors = { ...errors };
      delete newErrors[e.target.name];
      setErrors(newErrors);
    }
  };

  const handleLogin = async () => {
    const newErrors: Record<string, string> = {};
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.password) newErrors.password = 'Password is required';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        throw new Error('Server returned non-JSON response');
      }

      if (response.ok) {
        onComplete(data.user);
      } else {
        setErrors({ email: data.error || 'Invalid credentials' });
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrors({ email: 'An error occurred. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md px-6 py-12 flex flex-col h-full">
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tighter text-primary">Welcome Back</h2>
        <p className="text-muted-foreground">Sign in to your DDU Social account</p>
        <p className="mt-3 text-xs text-muted-foreground">
          Accounts must stay linked to Telegram for authentication, recovery, and optional bot notifications.
        </p>
      </div>

      <div className="flex-1 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="space-y-2">
            <Input
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              icon={<Mail className="w-5 h-5" />}
            />
            {errors.email && <p className="text-red-400 text-xs ml-1">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Input
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              icon={<Lock className="w-5 h-5" />}
            />
            {errors.password && <p className="text-red-400 text-xs ml-1">{errors.password}</p>}
          </div>
        </motion.div>
      </div>

      <div className="mt-8 space-y-4">
        <button
          onClick={handleLogin}
          disabled={isLoading}
          className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
          {!isLoading && <ArrowRight className="w-5 h-5" />}
        </button>

        {onSwitchToSignup && (
          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <button onClick={onSwitchToSignup} className="text-primary font-semibold hover:underline">
              Create Account
            </button>
          </p>
        )}
      </div>
    </div>
  );
};
