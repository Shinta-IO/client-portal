'use client';

import { useSignUp } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function RegisterPage() {
  const { signUp, isLoaded, setActive } = useSignUp();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      // Create the sign up
      const result = await signUp.create({
        emailAddress: email,
        password: password,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      });

      console.log('Signup result:', result);

      // Check what verification is needed
      if (result.status === 'missing_requirements') {
        console.log('Missing requirements:', result.missingFields);
        console.log('Unverified fields:', result.unverifiedFields);
        
        // Check if email verification is needed
        if (result.unverifiedFields.includes('email_address')) {
          await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
          setPendingVerification(true);
        }
      } else if (result.status === 'complete') {
        console.log('Signup complete!');
        await setActive({ session: result.createdSessionId });
        
        // Send welcome email (async, don't wait)
        try {
          const userName = `${firstName} ${lastName}`.trim() || 'there';
          fetch('/api/user/send-welcome-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              email: email,
              userName: userName
            })
          }).catch(error => console.error('Welcome email sending failed:', error));
        } catch (emailError) {
          console.error('Welcome email error:', emailError);
        }

        // Redirect to dashboard after successful registration
        router.push('/dashboard');
      } else {
        console.log('Unexpected status:', result.status);
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      
      // Handle specific error types
      if (err.errors && err.errors.length > 0) {
        const errorMessages = err.errors.map((e: any) => {
          if (e.code === 'form_password_pwned') {
            return 'This password has been found in a data breach. Please use a different password.';
          }
          if (e.code === 'form_password_length_too_short') {
            return 'Password must be at least 8 characters long.';
          }
          if (e.code === 'form_identifier_exists') {
            return 'An account with this email already exists.';
          }
          return e.message || e.longMessage || 'An error occurred';
        });
        setError(errorMessages.join(' '));
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      });
      
      console.log('Verification result:', completeSignUp);
      
      if (completeSignUp.status === 'complete') {
        await setActive({ session: completeSignUp.createdSessionId });
        
        // Send welcome email (async, don't wait)
        try {
          const userName = `${firstName} ${lastName}`.trim() || 'there';
          fetch('/api/user/send-welcome-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              email: email,
              userName: userName
            })
          }).catch(error => console.error('Welcome email sending failed:', error));
        } catch (emailError) {
          console.error('Welcome email error:', emailError);
        }

        // Redirect to dashboard after successful email verification
        router.push('/dashboard');
      } else {
        console.log('Verification not complete:', completeSignUp.status);
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      if (err.errors && err.errors.length > 0) {
        setError(err.errors[0].message || 'Invalid verification code');
      } else {
        setError('Invalid verification code');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialSignUp = async (provider: 'oauth_google') => {
    if (!isLoaded) return;
    
    setIsLoading(true);
    try {
      await signUp.authenticateWithRedirect({
        strategy: provider,
        redirectUrl: '/dashboard',
        redirectUrlComplete: '/dashboard',
      });
    } catch (err: any) {
      console.error('Social signup error:', err);
      setError(err.errors?.[0]?.message || 'Social signup failed');
      setIsLoading(false);
    }
  };

  if (pendingVerification) {
    return (
      <div className="bg-gray-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-700/50 p-4 sm:p-6 w-full relative overflow-hidden">
        {/* Video Background */}
        <video
          autoPlay
          muted
          loop
          className="absolute inset-0 w-full h-full object-cover opacity-20 z-0"
          playsInline
        >
          <source src="public\hero.mp4" type="video/mp4" />
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
              Verify Your Email
            </h1>
            <p className="text-gray-400 text-xs sm:text-sm text-center px-2">
              We sent a verification code to {email}
            </p>
          </div>

          {/* Verification Form */}
          <form onSubmit={handleVerification} className="space-y-3 sm:space-y-4">
            <div>
              <label htmlFor="code" className="block text-gray-300 text-xs sm:text-sm font-medium mb-1">
                Verification Code
              </label>
              <input
                id="code"
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter 6-digit code"
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                required
                maxLength={6}
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
              {isLoading ? 'Verifying...' : 'Verify Email'}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-4 text-center">
            <span className="text-gray-400 text-xs">Already have an account? </span>
            <a href="/auth/login" className="text-purple-400 hover:text-purple-300 font-medium text-xs">
              Sign in
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-700/50 p-4 sm:p-6 w-full relative overflow-hidden">
      {/* Video Background */}
      <video
        autoPlay
        muted
        loop
        className="absolute inset-0 w-full h-full object-cover opacity-20 z-0"
        playsInline
      >
        <source src="/hero.mp4" type="video/mp4" />
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
            Create Account
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm text-center px-2">
            Get started with your free account today
          </p>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleEmailSubmit} className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            <div>
              <label htmlFor="firstName" className="block text-gray-300 text-xs sm:text-sm font-medium mb-1">
                First Name
              </label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-gray-300 text-xs sm:text-sm font-medium mb-1">
                Last Name
              </label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-gray-300 text-xs sm:text-sm font-medium mb-1">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
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
              placeholder="Create a strong password"
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
              required
            />
            <p className="text-gray-500 text-xs mt-1">
              Must be at least 8 characters long
            </p>
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
            {isLoading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center my-4">
          <div className="flex-1 border-t border-gray-600"></div>
          <span className="px-3 text-gray-400 text-xs">or</span>
          <div className="flex-1 border-t border-gray-600"></div>
        </div>

        {/* Google Sign Up Button */}
        <button
          onClick={() => handleSocialSignUp('oauth_google')}
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
          <span className="text-gray-400 text-xs">Already have an account? </span>
          <a href="/auth/login" className="text-purple-400 hover:text-purple-300 font-medium text-xs">
            Sign in
          </a>
        </div>
      </div>
    </div>
  );
} 