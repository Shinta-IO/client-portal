import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/auth/login(.*)',
  '/auth/register(.*)',
  '/api/webhooks(.*)',
  '/api/invoices/webhook',
  '/api/webhook-test',
  '/api/manual-webhook-trigger',
]);

export default clerkMiddleware(async (auth, req) => {
  // Get auth data
  const { userId } = await auth();

  // Redirect root to dashboard if authenticated, otherwise to login
  if (req.nextUrl.pathname === '/') {
    if (userId) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    } else {
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }
  }

  // Protect all routes that are not public
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
  
  // Return a new response to avoid immutable headers issue
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}; 