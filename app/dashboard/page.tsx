import React, { Suspense } from 'react';
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import { Button } from "@/components/ui/button"
import { Plus, Calendar, Layers } from "lucide-react"
import Link from "next/link"
import { Card } from '@/components/ui/card';
import ProjectTracker from "@/components/dashboard/project-tracker"
import RecentActivityWidget from "@/components/dashboard/recent-activity-widget"
import ReviewsWidget from "@/components/dashboard/ReviewsWidget"
import AnnouncementsWidget from "@/components/dashboard/AnnouncementsWidget"
import { AdminOnly } from "@/utils/auth"
// import { RecentActivityWidget } from "@/components/dashboard/recent-activity-widget"

// Temporary placeholder components until we create the actual UI components
const CardHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="p-6 pb-4">{children}</div>
);

const CardContent = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`p-6 pt-0 ${className}`}>{children}</div>
);

const CardTitle = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <h3 className={`text-xl font-bold tracking-tight font-heading text-gray-900 dark:text-white ${className}`}>{children}</h3>
);

const CardDescription = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">{children}</p>
);

const Button = ({ children, variant = "default", className = "", asChild = false, ...props }: any) => {
  const baseClasses = "inline-flex items-center justify-center rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none px-4 py-2 shadow-sm btn-hover-effect";
  const variantClasses = {
    default: "bg-gradient-to-r from-brand-primary to-brand-accent text-white hover:from-brand-primary/90 hover:to-brand-accent/90 glow-effect hover:glow-effect-bright",
    outline: "border gradient-border bg-card hover:bg-muted text-foreground hover:glow-effect",
    yellow: "bg-gradient-to-r from-brand-yellow to-brand-orange text-white hover:from-brand-yellow/90 hover:to-brand-orange/90 glow-effect-yellow hover:glow-effect-yellow-bright"
  };
  
  if (asChild) {
    return React.cloneElement(children, {
      className: `${baseClasses} ${variantClasses[variant as keyof typeof variantClasses]} ${className}`
    });
  }
  
  return (
    <button className={`${baseClasses} ${variantClasses[variant as keyof typeof variantClasses]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default function Dashboard() {
  return (
    <div className="space-y-6 md:space-y-8 max-w-[1600px] mx-auto animate-in px-4 sm:px-6 lg:px-8">
      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between fade-in">
        <div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight font-heading gradient-text">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-2 text-base md:text-lg">
            Welcome back! Here's what's happening today.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <AdminOnly>
            <Button asChild className="w-full sm:w-auto">
              <Link href="/projects/create">
                <Plus className="mr-2 h-4 w-4" />
                Create Project
              </Link>
            </Button>
          </AdminOnly>
          <Button variant="outline" className="hidden sm:flex">
            <Calendar className="mr-2 h-4 w-4" />
            {new Date().toLocaleDateString('en-US', { 
              month: 'numeric', 
              day: 'numeric', 
              year: 'numeric' 
            })}
          </Button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <Card 
          className="lg:col-span-2 glass-card card-3d has-video scale-in glow-effect hover:glow-effect-bright"
          videoSrc="/card.mp4"
          videoOpacity="opacity-60" 
          videoBlendMode="mix-blend-lighten dark:mix-blend-normal"
          bgColor="bg-white/95 dark:bg-gray-900/95"
          borderColor="border-gray-300 dark:border-gray-600"
        >
          <CardHeader>
            <CardTitle className="font-bold text-lg md:text-xl gradient-text">Project Tracker</CardTitle>
            <CardDescription>Keep track of your current projects and milestones</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={
              <div className="flex h-32 md:h-40 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-primary border-t-transparent"></div>
              </div>
            }>
              <ProjectTracker />
            </Suspense>
          </CardContent>
        </Card>

        <Card 
          className="lg:col-span-1 glass-card card-3d has-video slide-in-from-right glow-effect-accent hover:glow-effect-accent-bright"
          videoSrc="/card.mp4"
          videoOpacity="opacity-50" 
          videoBlendMode="mix-blend-multiply dark:mix-blend-lighten"
          bgColor="bg-white/95 dark:bg-gray-900/95"
          borderColor="border-gray-300 dark:border-gray-600"
        >
          <CardHeader>
            <CardTitle className="font-bold text-lg md:text-xl gradient-text">Recent Activity</CardTitle>
            <CardDescription>Latest updates from the community</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={
              <div className="flex h-32 md:h-40 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-accent border-t-transparent"></div>
              </div>
            }>
              <RecentActivityWidget />
            </Suspense>
          </CardContent>
        </Card>
      </div>
      
      {/* Announcements Section */}
      <Card 
        className="glass-card card-3d has-video slide-in-from-bottom glow-effect-secondary hover:glow-effect-secondary-bright"
        videoSrc="/card.mp4"
        videoOpacity="opacity-50" 
        videoBlendMode="mix-blend-multiply dark:mix-blend-lighten"
        bgColor="bg-white/95 dark:bg-blue-900/30"
        borderColor="border-blue-300 dark:border-blue-600"
      >
        <CardHeader>
          <CardTitle className="font-bold text-lg md:text-xl gradient-text">Announcements</CardTitle>
          <CardDescription>Important updates and news from the team</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={
            <div className="flex h-24 md:h-32 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-secondary border-t-transparent"></div>
            </div>
          }>
            <AnnouncementsWidget />
          </Suspense>
        </CardContent>
      </Card>
      
      {/* Reviews Section */}
      <div>
        <Suspense fallback={
          <div className="flex h-24 md:h-32 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-yellow border-t-transparent"></div>
          </div>
        }>
          <ReviewsWidget />
        </Suspense>
      </div>
    </div>
  );
} 