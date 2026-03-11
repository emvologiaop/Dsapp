import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, AtSign, Calendar, Users, Mail, Lock, GraduationCap, ArrowLeft, ArrowRight, CheckCircle2, Camera, Loader2, Plus } from 'lucide-react';
import { FriendlyCard } from '../FriendlyCard';
import { Input } from '../ui/Input';
import { cn } from '../../lib/utils';

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
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const checkUsernameAvailability = useCallback(async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    setCheckingUsername(true);
    try {
      const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(username.toLowerCase())}`);
      if (res.ok) {
        const data = await res.json();
        setUsernameAvailable(data.available);
      }
    } catch {
      setUsernameAvailable(null);
    } finally {
      setCheckingUsername(false);
    }
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, avatar: 'Image must be under 5MB' }));
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
      setErrors(prev => { const { avatar, ...rest } = prev; return rest; });
    }
  };

  const validateStep = () => {
    const newErrors: Record<string, string> = {};
    if (step === 1) {
      if (!formData.name) newErrors.name = "Name is required";
      if (!formData.username) {
        newErrors.username = "Username is required";
      } else {
        const usernameRegex = /^[a-zA-Z0-9_.]{3,20}$/;
        if (!usernameRegex.test(formData.username)) {
          newErrors.username = "3-20 chars: letters, numbers, _ and . only";
        } else if (usernameAvailable === false) {
          newErrors.username = "Username is already taken";
        }
      }
      if (!avatarFile) newErrors.avatar = "Profile picture is required";
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
          const submitData = new FormData();
          submitData.append('name', formData.name);
          submitData.append('username', formData.username.toLowerCase());
          submitData.append('email', formData.email);
          submitData.append('password', formData.password);
          if (formData.age) submitData.append('age', formData.age);
          if (formData.gender) submitData.append('gender', formData.gender);
          if (formData.department) submitData.append('department', formData.department);
          if (avatarFile) submitData.append('avatar', avatarFile);

          const response = await fetch('/api/auth/signup', {
            method: 'POST',
            body: submitData
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
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      const newErrors = { ...errors };
      delete newErrors[name];
      setErrors(newErrors);
    }
    if (name === 'username') {
      const normalized = value.toLowerCase();
      setFormData(prev => ({ ...prev, username: normalized }));
      checkUsernameAvailability(normalized);
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
            {/* Profile Picture Upload */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-muted border-2 border-dashed border-primary/30 flex items-center justify-center overflow-hidden">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <label className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer shadow-lg">
                  <Plus className="w-4 h-4 text-primary-foreground" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-xs text-muted-foreground">Add profile photo *</p>
              {errors.avatar && <p className="text-red-400 text-xs">{errors.avatar}</p>}
            </div>

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
              {formData.username.length >= 3 && (
                <div className="flex items-center gap-1 ml-1">
                  {checkingUsername ? (
                    <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                  ) : usernameAvailable === true ? (
                    <p className="text-green-500 text-xs flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Username available
                    </p>
                  ) : usernameAvailable === false ? (
                    <p className="text-red-400 text-xs">Username is already taken</p>
                  ) : null}
                </div>
              )}
              <p className="text-xs text-muted-foreground ml-1">
                Lowercase letters, numbers, underscores & periods only
              </p>
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
              <p className="text-xs text-muted-foreground">
                By completing this, you agree to the DDU Social community guidelines and privacy policy.
              </p>
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
    </div>
  );
};
