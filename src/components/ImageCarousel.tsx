import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { cn } from '../lib/utils';

interface ImageCarouselProps {
  images: string[];
  onLike?: () => void;
}

export const ImageCarousel: React.FC<ImageCarouselProps> = ({ images, onLike }) => {
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
      <div className="relative group w-full">
        <div className="relative rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
          <img
            src={images[0]}
            alt="Post"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          {/* Gradient overlay for unique look */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
        </div>
      </div>
    );
  }

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      scale: 0.95,
      opacity: 0,
    }),
    center: {
      x: 0,
      scale: 1,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? '-100%' : '100%',
      scale: 0.95,
      opacity: 0,
    }),
  };

  return (
    <div className="relative group w-full rounded-lg overflow-hidden bg-muted" style={{ aspectRatio: '4/3' }}>
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
            x: { type: 'tween', duration: 0.3 },
            scale: { duration: 0.3 },
            opacity: { duration: 0.3 },
          }}
          referrerPolicy="no-referrer"
        />
      </AnimatePresence>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none z-5" />

      {/* Navigation Buttons with unique styling */}
      {currentIndex > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-gradient-to-br from-primary/90 to-primary/70 rounded-lg flex items-center justify-center text-white shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110 z-10"
          aria-label="Previous image"
        >
          <ChevronLeft size={22} />
        </button>
      )}

      {currentIndex < images.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-gradient-to-br from-primary/90 to-primary/70 rounded-lg flex items-center justify-center text-white shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110 z-10"
          aria-label="Next image"
        >
          <ChevronRight size={22} />
        </button>
      )}

      {/* Unique thumbnail strip indicator */}
      <div className="absolute bottom-3 left-3 right-3 flex gap-2 z-10">
        {images.map((img, index) => (
          <button
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              setDirection(index > currentIndex ? 1 : -1);
              setCurrentIndex(index);
            }}
            className={cn(
              'relative flex-1 h-12 rounded-md overflow-hidden transition-all border-2',
              index === currentIndex
                ? 'border-primary scale-105 shadow-lg'
                : 'border-transparent opacity-60 hover:opacity-90'
            )}
            aria-label={`Go to image ${index + 1}`}
          >
            <img
              src={img}
              alt={`Thumbnail ${index + 1}`}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </button>
        ))}
      </div>

      {/* Modern counter badge */}
      <div className="absolute top-3 right-3 flex items-center gap-2 bg-gradient-to-r from-primary/80 to-accent/80 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-lg z-10">
        <span>{currentIndex + 1}</span>
        <span className="opacity-60">/</span>
        <span className="opacity-90">{images.length}</span>
      </div>
    </div>
  );
};
