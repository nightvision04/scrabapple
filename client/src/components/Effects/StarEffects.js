import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';

const randomRange = (min, max) => Math.random() * (max - min) + min;
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

const starColors = [
  'text-yellow-300', 'text-yellow-400', 'text-amber-400', 
  'text-orange-400'
];

const starSizes = ['h-4 w-4', 'h-6 w-6', 'h-8 w-8'];

// Constants for physics simulation
const GRAVITY = 1200; // pixels per second squared
const TOTAL_DURATION = 1.5; // seconds

// Easing function for gravity ramp-up
const easeInQuad = t => t * t;

const StarParticle = ({ onComplete }) => {
  const [style, setStyle] = useState({});
  
  useEffect(() => {
    // Random angle for the burst direction (in radians)
    const angle = randomRange(-Math.PI/3, Math.PI/3);
    
    // Initial velocity components
    const initialVelocity = randomRange(250, 350);
    const vx = Math.sin(angle) * initialVelocity;
    const vy = -Math.cos(angle) * initialVelocity;
    
    const animationName = `burst-${Math.random().toString(36).substr(2, 9)}`;
    const color = randomChoice(starColors);
    const size = randomChoice(starSizes);
    const rotation = randomRange(-720, 720);
    
    // Generate keyframes with smooth gravity ramp-up
    let keyframes = `@keyframes ${animationName} {`;
    
    // Generate more keyframes for smoother motion
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * TOTAL_DURATION;
      const progress = i / steps;
      
      // Calculate position with ramped gravity
      const gravityEffect = easeInQuad(progress) * GRAVITY;
      const x = vx * t;
      const y = (vy * t) + (0.5 * gravityEffect * t * t);
      
      // Calculate opacity
      const opacity = progress > 0.8 ? 
        1 - ((progress - 0.8) / 0.2) : // Fade out in last 20%
        1;
      
      keyframes += `
        ${(progress * 100).toFixed(1)}% {
          transform: translate(${x}px, ${y}px) rotate(${rotation * progress}deg);
          opacity: ${opacity};
        }
      `;
    }
    
    keyframes += '}';
    
    setStyle({
      className: `absolute ${color} ${size}`,
      style: {
        animation: `${animationName} ${TOTAL_DURATION}s cubic-bezier(0.22, 1, 0.36, 1) 1 forwards`
      }
    });

    const styleSheet = document.createElement('style');
    styleSheet.textContent = keyframes;
    document.head.appendChild(styleSheet);

    const timer = setTimeout(() => {
      onComplete();
      styleSheet.remove();
    }, TOTAL_DURATION * 1000);

    return () => {
      clearTimeout(timer);
      styleSheet.remove();
    };
  }, [onComplete]);

  return (
    <div {...style}>
      <Star className="animate-pulse" fill="currentColor" />
    </div>
  );
};

const StarEffects = ({ isComplete, setIsComplete }) => {
  const [burst, setBurst] = useState(null);
  
  useEffect(() => {
    if (isComplete && !burst) {
      // Create a single burst when isComplete becomes true
      const newBurst = {
        id: Math.random().toString(36).substr(2, 9),
        stars: Array.from({ length: randomRange(8, 12) }, () => ({
          id: Math.random().toString(36).substr(2, 9)
        }))
      };
      setBurst(newBurst);
      
      // Set isComplete to false after the animation duration
      const timer = setTimeout(() => {
        setIsComplete(false);
        setBurst(null);
      }, TOTAL_DURATION * 1000); // Match the animation duration
      
      return () => clearTimeout(timer);
    }
  }, [isComplete, setIsComplete]);

  // Prevent re-rendering during animation
  if (!burst || !isComplete) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden pointer-events-none">
      <div className="absolute">
        {burst.stars.map(star => (
          <StarParticle
            key={star.id}
            onComplete={() => {}}
          />
        ))}
      </div>
    </div>
  );
};

export default StarEffects;