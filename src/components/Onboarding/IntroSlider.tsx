import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Share2, ShieldCheck, Newspaper, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ThemeSwitch } from '../ui/ThemeSwitch';

interface Slide {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const slides: Slide[] = [
  {
    title: "Stay Connected",
    description: "Share updates, photos, and announcements with your campus community in one place.",
    icon: <Zap className="w-16 h-16" />,
    color: "text-primary"
  },
  {
    title: "Choose Your Presence",
    description: "Post with your name or switch to ghost mode when you need extra privacy.",
    icon: <Share2 className="w-16 h-16" />,
    color: "text-primary"
  },
  {
    title: "Real-Time Updates",
    description: "Messages, mentions, and announcements reach you instantly with in-app and Telegram notifications.",
    icon: <ShieldCheck className="w-16 h-16" />,
    color: "text-primary"
  },
  {
    title: "Ready to Start",
    description: "Create posts, chat with classmates, join groups, and keep up with events without the noise.",
    icon: <Newspaper className="w-16 h-16" />,
    color: "text-primary"
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
      {/* Theme Toggle Button - Top Right */}
      <div className="absolute top-6 right-6 z-10">
        <ThemeSwitch />
      </div>

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
            animate={{ y: [0, -15, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
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
          {currentSlide === slides.length - 1 ? "Get Started" : "Next"}
          <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};
