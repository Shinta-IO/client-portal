"use client";

import React, { useRef, useEffect } from 'react';
import { cn } from '@/utils/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  
  // Video background options
  videoSrc?: string;
  videoOpacity?: string;
  videoBlendMode?: string;
  randomStartTime?: boolean;
  
  // Background options with better defaults
  bgColor?: string;
  
  // Border and other styling  
  borderColor?: string;
  
  // Performance options
  hybridMode?: boolean;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = "",
  videoSrc,
  videoOpacity = "opacity-50", // Reverted to more visible video
  videoBlendMode = "mix-blend-multiply dark:mix-blend-lighten",
  randomStartTime = true,
  bgColor = "bg-white dark:bg-gray-900/90", // Clean white background for black text
  borderColor = "border-gray-200 dark:border-gray-700",
  hybridMode = false
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && randomStartTime) {
      const video = videoRef.current;
      
      const setRandomStartTime = () => {
        const duration = video.duration || 10;
        const randomTime = Math.random() * duration;
        video.currentTime = randomTime;
      };

      if (video.readyState >= 1) {
        setRandomStartTime();
      } else {
        video.addEventListener('loadedmetadata', setRandomStartTime);
        return () => video.removeEventListener('loadedmetadata', setRandomStartTime);
      }
    }
  }, [videoSrc, randomStartTime]);

  // Improved mobile opacity but still more visible than before
  const mobileVideoOpacity = "opacity-30"; // More visible for mobile

  return (
    <div className={cn(`${bgColor} border ${borderColor} rounded-xl shadow-lg backdrop-blur-sm relative overflow-hidden transition-all duration-300`, className)}>
      {videoSrc && !hybridMode && (
        <>
          {/* Mobile video - more visible than before */}
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            className={`absolute inset-0 w-full h-full object-cover rounded-xl z-0 ${mobileVideoOpacity} ${videoBlendMode} sm:hidden`}
          >
            <source src={videoSrc} type="video/mp4" />
          </video>
          
          {/* Desktop video - more prominent */}
          <video
            autoPlay
            muted
            loop
            playsInline
            className={`absolute inset-0 w-full h-full object-cover rounded-xl z-0 ${videoOpacity} ${videoBlendMode} hidden sm:block`}
          >
            <source src={videoSrc} type="video/mp4" />
          </video>
        </>
      )}
      {videoSrc && hybridMode && (
        <>
          {/* Desktop only video for hybrid mode */}
          <video
            autoPlay
            muted
            loop
            playsInline
            className={`absolute inset-0 w-full h-full object-cover rounded-xl z-0 ${videoOpacity} ${videoBlendMode} hidden sm:block`}
          >
            <source src={videoSrc} type="video/mp4" />
          </video>
        </>
      )}
      <div className={videoSrc ? "relative z-10" : ""}>
        {children}
      </div>
    </div>
  );
};

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-2 p-5 sm:p-7", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-xl sm:text-2xl font-semibold leading-tight tracking-tight text-black dark:text-white", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-gray-600 dark:text-gray-300", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-5 pt-0 sm:p-7 sm:pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-5 pt-0 sm:p-7 sm:pt-0 mt-2", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter"; 