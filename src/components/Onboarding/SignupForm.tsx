import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, AtSign, Calendar, Users, Mail, Lock, GraduationCap, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { FriendlyCard } from '../FriendlyCard';
import { Input } from '../ui/Input';
import { cn } from '../../lib/utils';
import { TermsOfServiceModal } from '../TermsOfServiceModal';

interface SignupFormProps {
  onComplete: (data: any) => void;
  onSwitchToLogin?: () => void;
}

export const SignupForm: React.FC<SignupFormProps> = ({ onComplete, onSwitchToLogin }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    age: '',
    gender: '',
    email: '',
    password: '',
    department: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showTerms, setShowTerms] = useState(false);

  const validateStep = () => {
    const newErrors: Record<string, string> = {};
    if (step === 1) {
      if (!formData.name) newErrors.name = "Name is required";
      if (!formData.username) newErrors.username = "Username is required";
    } else if (step === 2) {
      if (!formData.age) newErrors.age = "Age is required";
      if (!formData.gender) newErrors.gender = "Gender is required";
    } else if (step === 3) {
      if (!formData.email) newErrors.email = "Email is required";
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!formData.password) {
        newErrors.password = "Password is required";
      } else if (!passwordRegex.test(formData.password)) {
        newErrors.password = "8+ chars, Upper, Lower, Num, Symbol";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = async () => {
    if (validateStep()) {
      if (step < 4) {
        setStep(step + 1);
      } else {
        try {
          const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
          });
          
          let data;
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.indexOf("application/json") !== -1) {
            data = await response.json();
          } else {
            const text = await response.text();
            throw new Error(text || "Server returned non-JSON response");
          }

          if (response.ok) {
            onComplete(data.user);
          } else {
            alert(data.error || "Signup failed");
          }
        } catch (error) {
          console.error("Signup error:", error);
          alert("An error occurred during signup.");
        }
      }
    }
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      const newErrors = { ...errors };
      delete newErrors[e.target.name];
      setErrors(newErrors);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Input
                label="Full Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                icon={<User className="w-5 h-5" />}
              />
              {errors.name && <p className="text-red-400 text-xs ml-1">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Input
                label="Username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                icon={<AtSign className="w-5 h-5" />}
              />
              {errors.username && <p className="text-red-400 text-xs ml-1">{errors.username}</p>}
            </div>
          </motion.div>
        );
      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Input
                label="Age"
                name="age"
                type="number"
                value={formData.age}
                onChange={handleChange}
                icon={<Calendar className="w-5 h-5" />}
              />
              {errors.age && <p className="text-red-400 text-xs ml-1">{errors.age}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Gender</label>
              <div className="relative">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full bg-muted border border-border rounded-xl py-4 pl-12 pr-4 focus:border-primary outline-none transition-all appearance-none text-foreground"
                >
                  <option value="" className="bg-background">Select Gender</option>
                  <option value="male" className="bg-background">Male</option>
                  <option value="female" className="bg-background">Female</option>
                </select>
              </div>
              {errors.gender && <p className="text-red-400 text-xs ml-1">{errors.gender}</p>}
            </div>
          </motion.div>
        );
      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
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
        );
      case 4:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Input
                label="Department (Optional)"
                name="department"
                value={formData.department}
                onChange={handleChange}
                icon={<GraduationCap className="w-5 h-5" />}
              />
            </div>
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="text-xs text-muted-foreground space-y-2">
                  <p>By completing this, you agree to the DDU Social Terms and community guidelines.</p>
                  <button
                    type="button"
                    onClick={() => setShowTerms(true)}
                    className="text-primary font-semibold hover:underline"
                  >
                    Read the Terms of Service
                  </button>
                  <ul className="space-y-1 list-disc pl-4">
                    <li>Ghost posts stay anonymous to other users, but moderators can review them if reported.</li>
                    <li>Ghost mode unlocks after 7 days.</li>
                    <li>Comments are never anonymous.</li>
                  </ul>
                </div>
              </div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-md px-6 py-12 flex flex-col h-full">
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tighter text-primary">Create Profile</h2>
        <p className="text-muted-foreground">Step {step} of 4</p>
        <div className="flex gap-1 mt-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-all",
                i <= step ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>
      </div>

      <div className="flex-1">
        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>
      </div>

      <div className="mt-8 flex gap-4">
        {step > 1 && (
          <button
            onClick={prevStep}
            className="flex-1 py-4 bg-muted text-foreground font-bold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
        )}
        <button
          onClick={nextStep}
          className="flex-[2] py-4 bg-primary text-primary-foreground font-bold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          {step === 4 ? "Complete" : "Continue"}
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
      {onSwitchToLogin && step === 1 && (
        <p className="text-center mt-4 text-sm text-muted-foreground">
          Already have an account?{' '}
          <button onClick={onSwitchToLogin} className="text-primary font-semibold hover:underline">
            Sign In
          </button>
        </p>
      )}
      {showTerms && <TermsOfServiceModal onClose={() => setShowTerms(false)} />}
    </div>
  );
};
