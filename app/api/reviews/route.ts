import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

// Use service role for reviews operations
function createServiceSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET - Fetch reviews with aggregate statistics
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    const supabase = createServiceSupabaseClient();

    // Fetch reviews with user and project information
    let query = supabase
      .from('reviews')
      .select(`
        *,
        user:user_id (
          id,
          first_name,
          last_name,
          email,
          avatar_url
        ),
        project:project_id (
          id,
          title
        )
      `)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data: reviews, error: reviewsError } = await query;

    if (reviewsError) {
      console.error('Error fetching reviews:', reviewsError);
      return NextResponse.json(
        { error: 'Failed to fetch reviews' },
        { status: 500 }
      );
    }

    // Calculate aggregate statistics
    const { data: allReviews, error: statsError } = await supabase
      .from('reviews')
      .select('star_rating, created_at');

    if (statsError) {
      console.error('Error fetching review stats:', statsError);
      return NextResponse.json(
        { error: 'Failed to fetch review statistics' },
        { status: 500 }
      );
    }

    // Calculate overall statistics
    const totalReviews = allReviews.length;
    const averageRating = totalReviews > 0 
      ? allReviews.reduce((sum, review) => sum + review.star_rating, 0) / totalReviews 
      : 0;

    // Calculate rating distribution
    const ratingCounts = [1, 2, 3, 4, 5].map(rating => 
      allReviews.filter(review => review.star_rating === rating).length
    );

    const ratingDistribution = ratingCounts.map(count => 
      totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0
    );

    // Calculate last month's average
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    const lastMonthReviews = allReviews.filter(review => 
      new Date(review.created_at) >= lastMonth
    );
    
    const lastMonthAverage = lastMonthReviews.length > 0
      ? lastMonthReviews.reduce((sum, review) => sum + review.star_rating, 0) / lastMonthReviews.length
      : 0;

    const response = {
      reviews,
      statistics: {
        totalReviews,
        averageRating: Math.round(averageRating * 10) / 10,
        lastMonthAverage: Math.round(lastMonthAverage * 10) / 10,
        ratingDistribution: {
          5: ratingDistribution[4],
          4: ratingDistribution[3],
          3: ratingDistribution[2],
          2: ratingDistribution[1],
          1: ratingDistribution[0]
        }
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in GET /api/reviews:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new review (for completed projects only)
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { project_id, star_rating, content, would_recommend } = body;

    if (!project_id || !star_rating || would_recommend === undefined) {
      return NextResponse.json(
        { error: 'Project ID, star rating, and recommendation are required' },
        { status: 400 }
      );
    }

    if (star_rating < 1 || star_rating > 5) {
      return NextResponse.json(
        { error: 'Star rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    const supabase = createServiceSupabaseClient();

    // Verify the project exists and belongs to the user and is completed
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, user_id, status')
      .eq('id', project_id)
      .eq('user_id', userId)
      .eq('status', 'completed')
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found or not completed' },
        { status: 404 }
      );
    }

    // Check if review already exists for this project
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('project_id', project_id)
      .eq('user_id', userId)
      .single();

    if (existingReview) {
      return NextResponse.json(
        { error: 'Review already exists for this project' },
        { status: 409 }
      );
    }

    // Create the review
    const { data: review, error } = await supabase
      .from('reviews')
      .insert({
        project_id,
        user_id: userId,
        star_rating,
        content: content?.trim() || null,
        would_recommend
      })
      .select(`
        *,
        user:user_id (
          id,
          first_name,
          last_name,
          email,
          avatar_url
        ),
        project:project_id (
          id,
          title
        )
      `)
      .single();

    if (error) {
      console.error('Error creating review:', error);
      return NextResponse.json(
        { error: 'Failed to create review' },
        { status: 500 }
      );
    }

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/reviews:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 