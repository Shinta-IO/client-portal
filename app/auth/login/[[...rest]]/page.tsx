'use client';

import { useSignIn } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
  const { signIn, isLoaded, setActive } = useSignIn();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const result = await signIn.create({
        identifier: email,
        password: password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        // Redirect to dashboard after successful login
        router.push('/dashboard');
      } else {
        // Handle additional verification steps if needed
        console.log('Additional verification required:', result);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.errors?.[0]?.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialSignIn = async (provider: 'oauth_google') => {
    if (!isLoaded) return;
    
    setIsLoading(true);
    try {
      await signIn.authenticateWithRedirect({
        strategy: provider,
        redirectUrl: '/dashboard',
        redirectUrlComplete: '/dashboard',
      });
    } catch (err: any) {
      console.error('Social login error:', err);
      setError(err.errors?.[0]?.message || 'Social login failed');
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-700/50 p-4 sm:p-6 w-full relative overflow-hidden">
      {/* Video Background */}
      <video
        autoPlay
        muted
        loop
        className="absolute inset-0 w-full h-full object-cover opacity-100 z-0"
        playsInline
      >
        <source src=".\hero.mp4" type="video/mp4" />
      </video>
      
      {/* Content overlay */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex flex-col items-center mb-4 sm:mb-5">
          <div className="w-10 h-10 sm:w-12 sm:h-12 mb-2">
            <img 
              src="/logo.png" 
              alt="Pixel-Pro Logo" 
              className="w-full h-full object-contain" 
            />
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-white mb-1">
            Pixel-Pro Portal
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm text-center px-2">
            Sign in to access your projects and team dashboard
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleEmailSubmit} className="space-y-3 sm:space-y-4">
          <div>
            <label htmlFor="email" className="block text-gray-300 text-xs sm:text-sm font-medium mb-1">
              Email address or username
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email or username"
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-gray-300 text-xs sm:text-sm font-medium mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
              required
            />
          </div>

          {error && (
            <div className="text-red-400 text-xs sm:text-sm mt-1">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 text-sm mt-4 disabled:opacity-50"
          >
            {isLoading ? 'Signing in...' : 'Continue →'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center my-4">
          <div className="flex-1 border-t border-gray-600"></div>
          <span className="px-3 text-gray-400 text-xs">or</span>
          <div className="flex-1 border-t border-gray-600"></div>
        </div>

        {/* Google Login Button */}
        <button
          onClick={() => handleSocialSignIn('oauth_google')}
          disabled={isLoading}
          className="w-full bg-gray-800 border border-gray-600 hover:bg-gray-700 text-white font-medium py-2.5 px-4 rounded-lg transition-all duration-200 text-sm flex items-center justify-center gap-2 disabled:opacity-50 mb-4"
        >
          <div className="w-4 h-4 flex-shrink-0">
            <svg viewBox="0 0 24 24" className="w-full h-full">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          </div>
          <span className="truncate">Continue with Google</span>
        </button>

        {/* Footer */}
        <div className="text-center">
          <span className="text-gray-400 text-xs">Don't have an account? </span>
          <a href="/auth/register" className="text-purple-400 hover:text-purple-300 font-medium text-xs">
            Sign up
          </a>
        </div>
      </div>
    </div>
  );
} 