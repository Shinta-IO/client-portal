'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, X, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
}

interface CreateReviewFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const StarRating = ({ 
  rating, 
  onRatingChange, 
  size = "w-8 h-8" 
}: { 
  rating: number; 
  onRatingChange: (rating: number) => void;
  size?: string;
}) => {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`${size} transition-colors ${
            star <= (hoverRating || rating)
              ? 'text-yellow-400 fill-yellow-400' 
              : 'text-gray-300 fill-gray-300'
          } hover:text-yellow-400 hover:fill-yellow-400`}
          onMouseEnter={() => setHoverRating(star)}
          onMouseLeave={() => setHoverRating(0)}
          onClick={() => onRatingChange(star)}
        >
          <Star className="w-full h-full" />
        </button>
      ))}
    </div>
  );
};

export default function CreateReviewForm({ isOpen, onClose, onSuccess }: CreateReviewFormProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [starRating, setStarRating] = useState(0);
  const [content, setContent] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchCompletedProjects();
    }
  }, [isOpen]);

  const fetchCompletedProjects = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/user/projects');
      if (response.ok) {
        const allProjects = await response.json();
        // Filter for completed projects only
        const completedProjects = allProjects.filter(
          (project: Project) => project.status === 'completed'
        );
        setProjects(completedProjects);
      } else {
        toast.error('Failed to load projects');
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Error loading projects');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProjectId) {
      toast.error('Please select a project');
      return;
    }
    
    if (starRating === 0) {
      toast.error('Please provide a star rating');
      return;
    }

    setSubmitting(true);
    
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: selectedProjectId,
          star_rating: starRating,
          content: content.trim() || null,
          would_recommend: wouldRecommend,
        }),
      });

      if (response.ok) {
        toast.success('Review created successfully!');
        handleClose();
        onSuccess?.();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create review');
      }
    } catch (error) {
      console.error('Error creating review:', error);
      toast.error('Error creating review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedProjectId('');
    setStarRating(0);
    setContent('');
    setWouldRecommend(true);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-gray-900">Create Review</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Project Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">
                Select Completed Project *
              </label>
              {loading ? (
                <div className="p-3 border border-gray-200 rounded-lg">
                  <div className="animate-pulse h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ) : projects.length === 0 ? (
                <div className="p-4 border border-gray-200 rounded-lg text-center text-gray-500">
                  No completed projects available for review
                </div>
              ) : (
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  required
                >
                  <option value="">Choose a project...</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Star Rating */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">
                Rating *
              </label>
              <div className="flex items-center gap-4">
                <StarRating 
                  rating={starRating} 
                  onRatingChange={setStarRating}
                />
                <span className="text-sm text-gray-600">
                  {starRating > 0 ? `${starRating} star${starRating !== 1 ? 's' : ''}` : 'Select rating'}
                </span>
              </div>
            </div>

            {/* Review Content */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">
                Review (Optional)
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share your experience with this project..."
                rows={4}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 resize-none"
                maxLength={500}
              />
              <div className="text-xs text-gray-500 text-right">
                {content.length}/500 characters
              </div>
            </div>

            {/* Would Recommend */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">
                Would you recommend our services? *
              </label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setWouldRecommend(true)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                    wouldRecommend
                      ? 'bg-green-50 border-green-200 text-green-700'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  Yes, I would recommend
                </button>
                <button
                  type="button"
                  onClick={() => setWouldRecommend(false)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                    !wouldRecommend
                      ? 'bg-red-50 border-red-200 text-red-700'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <X className="w-4 h-4" />
                  No, I would not recommend
                </button>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={submitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || starRating === 0 || !selectedProjectId}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {submitting ? 'Creating...' : 'Create Review'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 