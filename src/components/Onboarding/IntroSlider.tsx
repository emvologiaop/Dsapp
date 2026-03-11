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
    title: "Welcome to the Chaos",
    description: "DDU Social: Where procrastination meets productivity, and your WiFi signal is stronger than your GPA. Share posts, create reels, stalk your crush, and pretend you're studying – all in one place. Because who needs sleep when you have infinite scroll?",
    icon: <Zap className="w-16 h-16" />,
    color: "text-primary"
  },
  {
    title: "Unleash Your Inner Demons",
    description: "Post anonymously like a coward or flex with your real name. Upload that blurry 2 AM cafeteria photo, create chaotic reels, get roasted in comments, and collect hollow internet validation. Fame is temporary, but digital footprints are forever.",
    icon: <Share2 className="w-16 h-16" />,
    color: "text-primary"
  },
  {
    title: "The Surveillance Hub",
    description: "Real-time notifications so you never miss drama, read receipts to haunt people who ignore you, and typing indicators to anxiously watch someone craft the perfect response. Plus Telegram integration, because one social platform isn't enough to ruin your attention span.",
    icon: <ShieldCheck className="w-16 h-16" />,
    color: "text-primary"
  },
  {
    title: "Your New Addiction",
    description: "Instant messaging faster than your response to actual responsibilities. Get notified about things that don't matter, vote on features nobody asked for, and stay connected to campus gossip 24/7. Welcome to your productivity's worst nightmare!",
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
