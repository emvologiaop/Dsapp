import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface ImageCarouselProps {
  images: string[];
  onLike?: () => void;
  dataSaverEnabled?: boolean;
}

export const ImageCarousel: React.FC<ImageCarouselProps> = ({ images, onLike, dataSaverEnabled = false }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      setDirection(1);
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (images.length === 0) return null;

  if (images.length === 1) {
    return (
      <div className="relative group w-full bg-black flex items-center justify-center overflow-hidden">
        <img
          src={images[0]}
          alt="Post"
          className="w-full h-auto max-h-[85vh] object-contain"
          referrerPolicy="no-referrer"
          loading={dataSaverEnabled ? 'lazy' : 'eager'}
          decoding="async"
        />
      </div>
    );
  }

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
    }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({
      x: direction > 0 ? '-100%' : '100%',
      opacity: 0,
    }),
  };

  return (
    <div className="relative group w-full bg-black overflow-hidden" style={{ minHeight: '240px' }}>
      <div className="relative w-full flex items-center justify-center">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.img
            key={currentIndex}
            src={images[currentIndex]}
            alt={`Post ${currentIndex + 1}`}
            className="w-full h-auto max-h-[85vh] object-contain"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ x: { type: 'tween', duration: 0.25 }, opacity: { duration: 0.2 } }}
            referrerPolicy="no-referrer"
            loading={dataSaverEnabled ? 'lazy' : 'eager'}
            decoding="async"
          />
        </AnimatePresence>
      </div>

      {/* Navigation Buttons */}
      {currentIndex > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); handlePrev(); }}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-black/80 z-10"
          aria-label="Previous image"
        >
          <ChevronLeft size={20} />
        </button>
      )}

      {currentIndex < images.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); handleNext(); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-black/80 z-10"
          aria-label="Next image"
        >
          <ChevronRight size={20} />
        </button>
      )}

      {/* Dot indicators */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={(e) => { e.stopPropagation(); setDirection(index > currentIndex ? 1 : -1); setCurrentIndex(index); }}
            className={cn(
              'rounded-full transition-all duration-200',
              index === currentIndex ? 'w-4 h-2 bg-white shadow-md' : 'w-2 h-2 bg-white/50 hover:bg-white/80'
            )}
            aria-label={`Go to image ${index + 1}`}
          />
        ))}
      </div>

      {/* Counter badge */}
      <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full font-semibold z-10">
        <span>{currentIndex + 1}</span>
        <span className="opacity-50">/</span>
        <span className="opacity-80">{images.length}</span>
      </div>
    </div>
  );
};
