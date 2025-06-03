"use client";

import React, { useRef, useEffect } from 'react';
import { cn } from '@/utils/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  
  // Video background options
  videoSrc?: string;
  videoOpacity?: string; // Tailwind opacity class like "opacity-75"
  videoBlendMode?: string; // Tailwind mix-blend class like "mix-blend-lighten dark:mix-blend-normal"
  randomStartTime?: boolean; // Whether to start video at random time
  
  // Background options
  bgColor?: string; // Tailwind bg class like "bg-white dark:bg-gray-900/80"
  
  // Border and other styling
  borderColor?: string; // Tailwind border class like "border-gray-200 dark:border-gray-700/50"
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = "",
  videoSrc,
  videoOpacity = "opacity-75",
  videoBlendMode = "mix-blend-normal dark:mix-blend-lighten",
  randomStartTime = true, // Default to true for variety
  bgColor = "bg-slate/90 dark:bg-gray-900/80",
  borderColor = "border-gray-200 dark:border-gray-700/50"
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && randomStartTime) {
      const video = videoRef.current;
      
      const setRandomStartTime = () => {
        // Generate a random start time between 0 and the video duration
        // If duration isn't available yet, use a reasonable estimate (e.g., 10 seconds)
        const duration = video.duration || 10;
        const randomTime = Math.random() * duration;
        video.currentTime = randomTime;
      };

      // If video metadata is already loaded, set random time immediately
      if (video.readyState >= 1) {
        setRandomStartTime();
      } else {
        // Otherwise, wait for metadata to load
        video.addEventListener('loadedmetadata', setRandomStartTime);
        return () => video.removeEventListener('loadedmetadata', setRandomStartTime);
      }
    }
  }, [videoSrc, randomStartTime]);

  return (
    <div className={cn(`${bgColor} border ${borderColor} rounded-xl shadow-lg backdrop-blur-sm relative overflow-hidden`, className)}>
      {videoSrc && (
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          className={`absolute inset-0 w-full h-full object-cover z-0 ${videoOpacity} ${videoBlendMode}`}
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
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
    className={cn("flex flex-col space-y-1.5 p-6", className)}
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
    className={cn("text-2xl font-semibold leading-none tracking-tight", className)}
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
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter"; 