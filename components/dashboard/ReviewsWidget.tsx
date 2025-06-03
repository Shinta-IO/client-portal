'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, Eye, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface Review {
  id: string;
  star_rating: number;
  content: string;
  would_recommend: boolean;
  created_at: string;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
  };
  project: {
    id: string;
    title: string;
  };
}

interface ReviewStatistics {
  totalReviews: number;
  averageRating: number;
  lastMonthAverage: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

interface ReviewsData {
  reviews: Review[];
  statistics: ReviewStatistics;
}

const StarRating = ({ rating, className = "" }: { rating: number; className?: string }) => {
  return (
    <div className={`flex items-center ${className}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= rating 
              ? 'fill-brand-yellow text-brand-yellow' 
              : 'fill-muted-foreground/30 text-muted-foreground/30'
          }`}
        />
      ))}
    </div>
  );
};

const UserAvatar = ({ user }: { user: Review['user'] }) => {
  const initials = `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
  
  if (user.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={`${user.first_name} ${user.last_name}`}
        className="w-12 h-12 rounded-full object-cover shadow-md"
      />
    );
  }

  return (
    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center shadow-md">
      <span className="text-white text-sm font-semibold">{initials}</span>
    </div>
  );
};

export default function ReviewsWidget() {
  const [reviewsData, setReviewsData] = useState<ReviewsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const response = await fetch('/api/reviews?limit=3');
      if (response.ok) {
        const data = await response.json();
        setReviewsData(data);
      } else {
        console.error('Failed to fetch reviews:', response.status);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card 
        className="glass-card card-3d glow-effect hover:glow-effect-bright animate-pulse has-video"
        videoSrc="/card.mp4"
        videoOpacity="opacity-50" 
        videoBlendMode="mix-blend-multiply dark:mix-blend-lighten"
        bgColor="bg-slate-500/75 dark:bg-purple-900/20"
        borderColor="border-purple-200 dark:border-purple-700/50"
      >
        <CardHeader>
          <CardTitle className="font-bold text-xl gradient-text-yellow">Client Reviews</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="h-6 bg-muted/30 rounded w-1/3"></div>
            <div className="h-32 bg-muted/30 rounded"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-muted/30 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!reviewsData || reviewsData.reviews.length === 0) {
    return (
      <Card 
        className="glass-card card-3d glow-effect hover:glow-effect-bright has-video"
        videoSrc="/card.mp4"
        videoOpacity="opacity-50" 
        videoBlendMode="mix-blend-multiply dark:mix-blend-lighten"
        bgColor="bg-slate-500/75 dark:bg-purple-900/20"
        borderColor="border-purple-200 dark:border-purple-700/50"
      >
        <CardHeader>
          <CardTitle className="font-bold text-xl gradient-text-yellow flex items-center justify-between">
            Client Reviews
            <Link href="/reviews">
              <Button variant="outline" size="sm" className="hover:glow-effect">
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-brand-yellow/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-8 h-8 text-brand-yellow" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No Reviews Yet</h3>
            <p className="text-muted-foreground">Reviews from completed projects will appear here.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { reviews, statistics } = reviewsData;

  return (
    <Card 
      className="glass-card card-3d glow-effect hover:glow-effect-bright scale-in has-video"
      videoSrc="/card.mp4"
      videoOpacity="opacity-50" 
      videoBlendMode="mix-blend-multiply dark:mix-blend-lighten"
      bgColor="bg-slate-500/75 dark:bg-purple-900/20"
      borderColor="border-purple-200 dark:border-purple-700/50"
    >
      <CardHeader>
        <CardTitle className="font-bold text-xl gradient-text-yellow flex items-center justify-between">
          Client Reviews
          <Link href="/reviews">
            <Button variant="outline" size="sm" className="hover:glow-effect btn-hover-effect">
              View All <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Aggregate Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Rating Distribution */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Distribution</h4>
            {[5, 4, 3, 2, 1].map((rating) => (
              <div key={rating} className="flex items-center gap-3 text-sm">
                <span className="w-6 text-foreground">{rating}★</span>
                <div className="flex-1 bg-muted/30 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-brand-yellow to-brand-orange h-2 rounded-full transition-all duration-500"
                    style={{ width: `${statistics.ratingDistribution[rating as keyof typeof statistics.ratingDistribution]}%` }}
                  />
                </div>
                <span className="w-10 text-muted-foreground text-xs">{statistics.ratingDistribution[rating as keyof typeof statistics.ratingDistribution]}%</span>
              </div>
            ))}
          </div>

          {/* Overall Rating */}
          <div className="text-center">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Overall</h4>
            <div className="text-3xl font-bold text-foreground mb-2 dark:neon-text-yellow">
              {statistics.averageRating.toFixed(1)}
            </div>
            <StarRating rating={Math.round(statistics.averageRating)} className="justify-center mb-2" />
            <div className="text-sm text-muted-foreground">
              {statistics.totalReviews} Review{statistics.totalReviews !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Last Month Rating */}
          <div className="text-center">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">This Month</h4>
            <div className="text-3xl font-bold text-foreground mb-2 dark:neon-text-yellow">
              {statistics.lastMonthAverage > 0 ? statistics.lastMonthAverage.toFixed(1) : '-'}
            </div>
            {statistics.lastMonthAverage > 0 && (
              <StarRating rating={Math.round(statistics.lastMonthAverage)} className="justify-center mb-2" />
            )}
            <div className="text-sm text-muted-foreground">Recent</div>
          </div>
        </div>

        {/* Individual Reviews */}
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Recent Reviews</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger-animate">
            {reviews.slice(0, 3).map((review) => (
              <div 
                key={review.id}
                className="glass-card p-4 hover:glow-effect-bright transition-all duration-300 fade-in"
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  <UserAvatar user={review.user} />
                  <StarRating rating={review.star_rating} className="justify-center" />
                  <p className="text-sm text-foreground leading-relaxed line-clamp-3">
                    {review.content || "Great work! Highly recommended."}
                  </p>
                  <div className="text-sm font-medium text-foreground">
                    {review.user.first_name} {review.user.last_name}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Show placeholder cards if less than 3 reviews */}
            {reviews.length < 3 && (
              <>
                {[...Array(3 - reviews.length)].map((_, index) => (
                  <div 
                    key={`placeholder-${index}`}
                    className="glass-card p-4 opacity-50"
                  >
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-muted/30"></div>
                      <div className="flex justify-center">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-muted/30 text-muted/30" />
                        ))}
                      </div>
                      <div className="h-12 w-full bg-muted/30 rounded"></div>
                      <div className="h-4 w-20 bg-muted/30 rounded"></div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 