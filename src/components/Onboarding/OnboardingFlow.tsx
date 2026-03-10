import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IntroSlider } from './IntroSlider';
import { SignupForm } from './SignupForm';
import { LoginForm } from './LoginForm';
import { TelegramAuth } from './TelegramAuth';

interface OnboardingFlowProps {
  onFinish: (userData: any) => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onFinish }) => {
  const [stage, setStage] = useState<'intro' | 'signup' | 'login' | 'telegram'>('intro');
  const [userData, setUserData] = useState<any>(null);

  const handleIntroComplete = () => {
    setStage('signup');
  };

  const handleSignupComplete = (data: any) => {
    setUserData(data);
    setStage('telegram');
  };

  const handleLoginComplete = (data: any) => {
    onFinish(data);
  };

  const handleTelegramComplete = () => {
    onFinish(userData);
  };

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-hidden">
      <AnimatePresence mode="wait">
        {stage === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="h-full"
          >
            <IntroSlider onComplete={handleIntroComplete} />
          </motion.div>
        )}

        {stage === 'signup' && (
          <motion.div
            key="signup"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="h-full flex justify-center"
          >
            <SignupForm onComplete={handleSignupComplete} onSwitchToLogin={() => setStage('login')} />
          </motion.div>
        )}

        {stage === 'login' && (
          <motion.div
            key="login"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="h-full flex justify-center"
          >
            <LoginForm onComplete={handleLoginComplete} onSwitchToSignup={() => setStage('signup')} />
          </motion.div>
        )}

        {stage === 'telegram' && (
          <motion.div
            key="telegram"
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="h-full flex justify-center"
          >
            <TelegramAuth 
              onComplete={handleTelegramComplete} 
              initialCode={userData?.telegramAuthCode}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
