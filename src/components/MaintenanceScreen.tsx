import React from 'react';
import { motion } from 'framer-motion';
import { Wrench, Zap } from 'lucide-react';

interface MaintenanceScreenProps {
  message?: string;
}

const floatingGear = {
  animate: {
    rotate: 360,
    transition: { duration: 8, repeat: Infinity, ease: 'linear' },
  },
};

const floatingGearReverse = {
  animate: {
    rotate: -360,
    transition: { duration: 6, repeat: Infinity, ease: 'linear' },
  },
};

const pulse = {
  animate: {
    scale: [1, 1.08, 1],
    opacity: [0.6, 1, 0.6],
    transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
  },
};

const floatUpDown = {
  animate: {
    y: [-10, 10, -10],
    transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
  },
};

export const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({ message }) => {
  const displayMessage = message || "We're performing scheduled maintenance. We'll be back shortly!";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-background">
      {/* Animated gradient background */}
      <motion.div
        className="absolute inset-0 opacity-20"
        animate={{
          background: [
            'radial-gradient(ellipse at 20% 50%, hsl(var(--primary)) 0%, transparent 60%)',
            'radial-gradient(ellipse at 80% 50%, hsl(var(--primary)) 0%, transparent 60%)',
            'radial-gradient(ellipse at 20% 50%, hsl(var(--primary)) 0%, transparent 60%)',
          ],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Floating particles */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-primary/30"
          style={{
            left: `${10 + i * 12}%`,
            top: `${20 + (i % 3) * 20}%`,
          }}
          animate={{
            y: [-20, 20, -20],
            x: [-10, 10, -10],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: 3 + i * 0.4,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.3,
          }}
        />
      ))}

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="relative z-10 flex flex-col items-center text-center px-8 max-w-md"
      >
        {/* Icon cluster */}
        <div className="relative mb-8">
          {/* Large gear (slow) */}
          <motion.div
            className="absolute -top-6 -left-8 text-primary/40"
            variants={floatingGear}
            animate="animate"
          >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.92c.04-.33.07-.67.07-1.08s-.03-.75-.07-1.08l2.32-1.8c.21-.16.27-.46.13-.7l-2.2-3.81c-.13-.24-.42-.32-.66-.22l-2.73 1.1c-.57-.44-1.18-.79-1.86-1.06L14.97 2.1c-.04-.28-.28-.5-.57-.5h-4.4c-.29 0-.53.22-.57.5l-.42 2.84c-.68.27-1.29.62-1.86 1.06l-2.73-1.1c-.24-.1-.53-.02-.66.22L2.56 9.03c-.14.24-.08.54.13.7l2.32 1.8C4.97 11.85 4.94 12.18 4.94 12.5s.03.75.07 1.08l-2.32 1.8c-.21.16-.27.46-.13.7l2.2 3.81c.13.24.42.32.66.22l2.73-1.1c.57.44 1.18.79 1.86 1.06l.42 2.84c.04.28.28.5.57.5h4.4c.29 0 .53-.22.57-.5l.42-2.84c.68-.27 1.29-.62 1.86-1.06l2.73 1.1c.24.1.53.02.66-.22l2.2-3.81c.14-.24.08-.54-.13-.7l-2.32-1.8z"/>
            </svg>
          </motion.div>

          {/* Small gear (fast reverse) */}
          <motion.div
            className="absolute -top-2 -right-8 text-primary/25"
            variants={floatingGearReverse}
            animate="animate"
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.92c.04-.33.07-.67.07-1.08s-.03-.75-.07-1.08l2.32-1.8c.21-.16.27-.46.13-.7l-2.2-3.81c-.13-.24-.42-.32-.66-.22l-2.73 1.1c-.57-.44-1.18-.79-1.86-1.06L14.97 2.1c-.04-.28-.28-.5-.57-.5h-4.4c-.29 0-.53.22-.57.5l-.42 2.84c-.68.27-1.29.62-1.86 1.06l-2.73-1.1c-.24-.1-.53-.02-.66.22L2.56 9.03c-.14.24-.08.54.13.7l2.32 1.8C4.97 11.85 4.94 12.18 4.94 12.5s.03.75.07 1.08l-2.32 1.8c-.21.16-.27.46-.13.7l2.2 3.81c.13.24.42.32.66.22l2.73-1.1c.57.44 1.18.79 1.86 1.06l.42 2.84c.04.28.28.5.57.5h4.4c.29 0 .53-.22.57-.5l.42-2.84c.68-.27 1.29-.62 1.86-1.06l2.73 1.1c.24.1.53.02.66-.22l2.2-3.81c.14-.24.08-.54-.13-.7l-2.32-1.8z"/>
            </svg>
          </motion.div>

          {/* Main wrench icon */}
          <motion.div
            variants={floatUpDown}
            animate="animate"
            className="relative z-10 p-6 bg-primary/10 rounded-3xl border border-primary/20 shadow-lg"
          >
            <Wrench className="w-16 h-16 text-primary" strokeWidth={1.5} />
          </motion.div>
        </div>

        {/* Title */}
        <motion.div variants={pulse} animate="animate" className="mb-3">
          <Zap className="w-6 h-6 text-yellow-500 inline-block mr-2" fill="currentColor" />
          <span className="text-2xl font-extrabold tracking-tight">Maintenance Mode</span>
          <Zap className="w-6 h-6 text-yellow-500 inline-block ml-2" fill="currentColor" />
        </motion.div>

        {/* Message */}
        <p className="text-muted-foreground text-base leading-relaxed mb-8">
          {displayMessage}
        </p>

        {/* Animated progress bar */}
        <div className="w-full max-w-xs bg-muted rounded-full h-1.5 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary via-primary/60 to-primary rounded-full"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: '60%' }}
          />
        </div>

        <p className="text-xs text-muted-foreground mt-4">Please check back soon</p>
      </motion.div>
    </div>
  );
};
