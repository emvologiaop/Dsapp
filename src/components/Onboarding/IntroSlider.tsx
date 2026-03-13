import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DoorOpen, Smartphone, SignalHigh, Network, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ThemeSwitch } from '../ui/ThemeSwitch';

interface Slide {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  accent: string;
  badge: string;
}

const slides: Slide[] = [
  {
    title: "Welcome to the Hub.",
    description: "The heart of Dire Dawa University, now in the palm of your hand.",
    icon: <DoorOpen className="w-16 h-16" />,
    color: "text-primary",
    accent: "from-sky-500/30 via-blue-500/10 to-violet-500/20",
    badge: "The Gateway"
  },
  {
    title: "Share Your Campus Life.",
    description: "From dorm to the Toni—post your best moments on Feed and Reels.",
    icon: <Smartphone className="w-16 h-16" />,
    color: "text-primary",
    accent: "from-amber-500/25 via-orange-400/10 to-rose-500/20",
    badge: "The Action"
  },
  {
    title: "Smart Data. Zero Waste.",
    description: "High-speed streaming that sips your MBs. More scrolling, less spending.",
    icon: <SignalHigh className="w-16 h-16" />,
    color: "text-primary",
    accent: "from-emerald-500/25 via-teal-400/10 to-cyan-500/20",
    badge: "The Technology"
  },
  {
    title: "Connect & Stay Updated.",
    description: "Real-time campus news, built-in chat, and anonymous confessions.",
    icon: <Network className="w-16 h-16" />,
    color: "text-primary",
    accent: "from-fuchsia-500/20 via-indigo-500/15 to-sky-500/20",
    badge: "The Core"
  }
];

interface IntroSliderProps {
  onComplete: () => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 200, damping: 15 } },
};

export const IntroSlider: React.FC<IntroSliderProps> = ({ onComplete }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="relative h-full flex flex-col items-center justify-center p-6 text-center">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <AnimatePresence mode="wait">
          <motion.div
            key={`glow-${currentSlide}`}
            className={cn(
              "absolute -top-24 -left-10 w-80 h-80 rounded-full blur-3xl bg-gradient-to-br",
              slides[currentSlide].accent
            )}
            initial={{ opacity: 0, scale: 0.9, rotate: -6 }}
            animate={{ opacity: 0.45, scale: 1.05, rotate: 6 }}
            exit={{ opacity: 0, scale: 0.9, rotate: -6 }}
            transition={{ duration: 0.8 }}
          />
        </AnimatePresence>
        <motion.div
          className="absolute -bottom-16 right-0 w-72 h-72 rounded-full bg-primary/10 blur-3xl"
          animate={{ scale: [1, 1.08, 1], rotate: [0, 4, -4, 0], opacity: [0.25, 0.35, 0.25] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Theme Toggle Button - Top Right */}
      <div className="absolute top-6 right-6 z-10">
        <ThemeSwitch />
      </div>

      <motion.div
        className="absolute top-10 left-6 z-10"
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="px-4 py-2 rounded-full bg-background/80 border border-border shadow-lg text-sm font-semibold">
          {slides[currentSlide].badge}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="flex flex-col items-center space-y-6"
        >
          <motion.div
            variants={itemVariants}
            animate={{ y: [0, -15, 0], rotate: [0, 3, -3, 0] }}
            transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
            className={cn("p-8 rounded-full bg-muted border border-border", slides[currentSlide].color)}
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
          >
            {slides[currentSlide].icon}
          </motion.div>
          <motion.h2 variants={itemVariants} className={cn("text-4xl font-bold tracking-tighter", slides[currentSlide].color)}>
            {slides[currentSlide].title}
          </motion.h2>
          <motion.p variants={itemVariants} className="text-muted-foreground text-lg max-w-md px-4">
            {slides[currentSlide].description}
          </motion.p>
        </motion.div>
      </AnimatePresence>

      <div className="absolute bottom-12 flex flex-col items-center space-y-8 w-full px-6">
        <div className="flex space-x-2">
          {slides.map((_, index) => (
            <motion.div
              key={index}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                index === currentSlide ? "w-10 bg-primary" : "w-2 bg-muted"
              )}
            />
          ))}
        </div>

        <button
          onClick={nextSlide}
          className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-2xl flex items-center justify-center gap-2 group transition-all active:scale-95"
        >
          {currentSlide === slides.length - 1 ? "Get Started →" : "Next"}
          <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};
