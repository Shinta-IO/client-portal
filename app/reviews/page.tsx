'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, Filter, Plus } from 'lucide-react';
import Link from 'next/link';
import CreateReviewForm from '@/components/reviews/CreateReviewForm';

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
              ? 'fill-yellow-400 text-yellow-400' 
              : 'fill-gray-200 text-gray-200 dark:fill-gray-600 dark:text-gray-600'
          }`}
        />
      ))}
    </div>
  );
};

const RatingBar = ({ rating, percentage }: { rating: number; percentage: number }) => {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-6 text-white/80">{rating}★</span>
      <div className="flex-1 bg-white/20 rounded-full h-2">
        <div 
          className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="w-10 text-white/80 text-xs">{percentage}%</span>
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
        className="w-12 h-12 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
      <span className="text-white text-sm font-semibold">{initials}</span>
    </div>
  );
};

export default function ReviewsPage() {
  const [reviewsData, setReviewsData] = useState<ReviewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const response = await fetch('/api/reviews');
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

  const handleReviewCreated = () => {
    // Refresh the reviews data after a new review is created
    fetchReviews();
  };

  const filteredReviews = reviewsData?.reviews.filter(review => 
    filterRating === null || review.star_rating === filterRating
  ) || [];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!reviewsData) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Unable to Load Reviews
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          There was an error loading the reviews. Please try again later.
        </p>
      </div>
    );
  }

  const { reviews, statistics } = reviewsData;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Client Reviews
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            What our clients are saying about our work
          </p>
        </div>
        <Button
          onClick={() => setIsCreateFormOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Review
        </Button>
      </div>

      {/* Statistics Overview */}
      <Card 
        className="hover:shadow-xl transition-all duration-300"
        videoSrc="/card.mp4"
        videoOpacity="opacity-50" 
        videoBlendMode="mix-blend-multiply dark:mix-blend-lighten"
        bgColor="bg-slate-500/75 dark:bg-blue-900/20"
        borderColor="border-blue-200 dark:border-blue-700/50"
      >
        <CardHeader>
          <CardTitle className="text-white">Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Rating Distribution */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Rating Distribution</h3>
              <div className="space-y-3">
                {[5, 4, 3, 2, 1].map((rating) => (
                  <RatingBar 
                    key={rating}
                    rating={rating} 
                    percentage={statistics.ratingDistribution[rating as keyof typeof statistics.ratingDistribution]} 
                  />
                ))}
              </div>
            </div>

            {/* Overall Rating */}
            <div className="text-center">
              <h3 className="text-lg font-semibold text-white mb-4">Overall Rating</h3>
              <div className="text-4xl font-bold text-white mb-3">
                {statistics.averageRating.toFixed(1)}
              </div>
              <StarRating rating={Math.round(statistics.averageRating)} className="justify-center mb-3" />
              <div className="text-sm text-white/80">
                Based on {statistics.totalReviews} review{statistics.totalReviews !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Recent Performance */}
            <div className="text-center">
              <h3 className="text-lg font-semibold text-white mb-4">Last Month</h3>
              <div className="text-4xl font-bold text-white mb-3">
                {statistics.lastMonthAverage > 0 ? statistics.lastMonthAverage.toFixed(1) : '-'}
              </div>
              {statistics.lastMonthAverage > 0 && (
                <StarRating rating={Math.round(statistics.lastMonthAverage)} className="justify-center mb-3" />
              )}
              <div className="text-sm text-white/80">
                {statistics.lastMonthAverage > 0 ? 'Recent rating' : 'No recent reviews'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card 
        className="hover:shadow-xl transition-all duration-300"
        videoSrc="/card.mp4"
        videoOpacity="opacity-40" 
        videoBlendMode="mix-blend-multiply dark:mix-blend-lighten"
        bgColor="bg-slate-500/75 dark:bg-gray-900/20"
        borderColor="border-gray-200 dark:border-gray-700/50"
      >
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-white/60" />
              <span className="text-sm font-medium text-white">Filter by rating:</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterRating === null ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterRating(null)}
                className={filterRating === null 
                  ? "bg-white text-gray-900 hover:bg-white/90" 
                  : "border-white/30 text-white hover:bg-white/10"
                }
              >
                All
              </Button>
              {[5, 4, 3, 2, 1].map((rating) => (
                <Button
                  key={rating}
                  variant={filterRating === rating ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterRating(rating)}
                  className={filterRating === rating 
                    ? "bg-white text-gray-900 hover:bg-white/90" 
                    : "border-white/30 text-white hover:bg-white/10"
                  }
                >
                  {rating}★
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reviews Grid */}
      {filteredReviews.length === 0 ? (
        <Card 
          className="hover:shadow-xl transition-all duration-300"
          videoSrc="/card.mp4"
          videoOpacity="opacity-50" 
          videoBlendMode="mix-blend-multiply dark:mix-blend-lighten"
          bgColor="bg-slate-500/75 dark:bg-purple-900/20"
          borderColor="border-purple-200 dark:border-purple-700/50"
        >
          <CardContent className="py-12">
            <div className="text-center">
              <Star className="w-16 h-16 text-white/60 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                {filterRating ? `No ${filterRating}-star reviews` : 'No Reviews Yet'}
              </h3>
              <p className="text-white/80">
                {filterRating 
                  ? `Try selecting a different rating filter.`
                  : 'Reviews from completed projects will appear here.'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReviews.map((review) => (
            <Card key={review.id} className="bg-white border border-gray-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <UserAvatar user={review.user} />
                  <div className="space-y-2">
                    <StarRating rating={review.star_rating} className="justify-center" />
                    <div className="text-sm font-medium text-gray-900">
                      {review.user.first_name} {review.user.last_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(review.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                  {review.content && (
                    <p className="text-sm text-gray-700 leading-relaxed">
                      "{review.content}"
                    </p>
                  )}
                  <div className="text-xs text-gray-500">
                    Project: {review.project.title}
                  </div>
                  {review.would_recommend && (
                    <div className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                      Would recommend
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary Footer */}
      <Card 
        className="hover:shadow-xl transition-all duration-300"
        videoSrc="/card.mp4"
        videoOpacity="opacity-30" 
        videoBlendMode="mix-blend-multiply dark:mix-blend-lighten"
        bgColor="bg-slate-500/75 dark:bg-gray-900/20"
        borderColor="border-gray-200 dark:border-gray-700/50"
      >
        <CardContent className="py-8">
          <div className="text-center">
            <p className="text-white/80">
              Showing {filteredReviews.length} of {reviews.length} review{reviews.length !== 1 ? 's' : ''}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Create Review Form Modal */}
      <CreateReviewForm
        isOpen={isCreateFormOpen}
        onClose={() => setIsCreateFormOpen(false)}
        onSuccess={handleReviewCreated}
      />
    </div>
  );
} 