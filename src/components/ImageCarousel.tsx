import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface ImageCarouselProps {
  images: string[];
  onDoubleTap?: () => void;
}

export const ImageCarousel: React.FC<ImageCarouselProps> = ({ images, onDoubleTap }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [lastTap, setLastTap] = useState(0);

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

  const handleImageClick = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTap < DOUBLE_TAP_DELAY) {
      onDoubleTap?.();
    }
    setLastTap(now);
  };

  if (images.length === 0) return null;

  if (images.length === 1) {
    return (
      <div className="relative group w-full" onClick={handleImageClick}>
        <img
          src={images[0]}
          alt="Post"
          className="w-full aspect-square object-cover"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? '-100%' : '100%',
      opacity: 0,
    }),
  };

  return (
    <div className="relative group w-full aspect-square overflow-hidden bg-muted">
      <AnimatePresence initial={false} custom={direction}>
        <motion.img
          key={currentIndex}
          src={images[currentIndex]}
          alt={`Post ${currentIndex + 1}`}
          className="absolute inset-0 w-full h-full object-cover"
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: 'spring', stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 },
          }}
          referrerPolicy="no-referrer"
          onClick={handleImageClick}
        />
      </AnimatePresence>

      {/* Navigation Buttons */}
      {currentIndex > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
          aria-label="Previous image"
        >
          <ChevronLeft size={20} />
        </button>
      )}

      {currentIndex < images.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
          aria-label="Next image"
        >
          <ChevronRight size={20} />
        </button>
      )}

      {/* Dots Indicator */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              setDirection(index > currentIndex ? 1 : -1);
              setCurrentIndex(index);
            }}
            className={cn(
              'w-1.5 h-1.5 rounded-full transition-all',
              index === currentIndex
                ? 'bg-white w-6'
                : 'bg-white/50 hover:bg-white/75'
            )}
            aria-label={`Go to image ${index + 1}`}
          />
        ))}
      </div>

      {/* Image Counter */}
      <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full z-10">
        {currentIndex + 1}/{images.length}
      </div>
    </div>
  );
};
