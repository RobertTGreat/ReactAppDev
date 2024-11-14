import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../config/firebase';
import { sendEmailVerification, reload } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { Loader2, Mail, RefreshCw, LogOut } from 'lucide-react';

const VerifyEmail: React.FC = () => {
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(true);
  const navigate = useNavigate();

  const updateUserVerificationStatus = async (uid: string) => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        emailVerified: true,
        verifiedAt: new Date()
      });
    } catch (error) {
      console.error('Error updating verification status:', error);
    }
  };

  // Check verification status periodically
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const checkVerification = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          await reload(user); // Refresh the user's token
          
          if (user.emailVerified) {
            clearInterval(interval);
            setMessage('Email verified! Redirecting...');
            
            // Update the verification status in Firestore
            await updateUserVerificationStatus(user.uid);
            
            // Navigate to chats
            setTimeout(() => navigate('/chats'), 2000);
          }
        }
      } catch (error) {
        console.error('Verification check error:', error);
      }
    };

    // Initial check
    checkVerification();

    // Set up interval for periodic checks
    interval = setInterval(checkVerification, 3000);

    // Cleanup
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [navigate]);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        navigate('/auth');
      } else if (user.emailVerified) {
        await updateUserVerificationStatus(user.uid);
        navigate('/chats');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Countdown timer for resending verification email
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (!canResend && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setCanResend(true);
      setCountdown(60);
    }
    return () => {
      if (timer) clearInterval(timer);
    }
  }, [canResend, countdown]);

  const handleResendVerification = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (user && !user.emailVerified) {
        await sendEmailVerification(user);
        setMessage('Verification email resent! Please check your inbox.');
        setError('');
        setCanResend(false);
      }
    } catch (err) {
      setError('Error sending verification email. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (user) {
        await reload(user);
        if (user.emailVerified) {
          setMessage('Email verified! Redirecting...');
          // Update verification status in Firestore
          await updateUserVerificationStatus(user.uid);
          setTimeout(() => navigate('/chats'), 2000);
        } else {
          setMessage('Email not verified yet. Please check your inbox.');
        }
      }
    } catch (err) {
      setError('Error checking verification status.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      navigate('/auth');
    } catch (err) {
      setError('Error signing out.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1121] text-white flex items-center justify-center px-4">
      <div className="max-w-md w-full p-8 rounded-2xl bg-gray-800/50 border border-gray-700/50 text-center">
        <div className="mb-8">
          <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-10 h-10 text-purple-400" />
          </div>
          <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Verify Your Email
          </h2>
          <p className="text-gray-300">
            We've sent a verification link to{' '}
            <span className="font-semibold text-purple-400">
              {auth.currentUser?.email}
            </span>
          </p>
        </div>

        {error && (
          <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20 mb-4">
            {error}
          </div>
        )}

        {message && (
          <div className="text-green-400 text-sm bg-green-400/10 p-3 rounded-lg border border-green-400/20 mb-4">
            {message}
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleManualRefresh}
            disabled={loading}
            className="w-full py-3 rounded-lg bg-gray-700 hover:bg-gray-600 
              transition-colors font-medium text-white focus:ring-2 
              focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800
              flex items-center justify-center space-x-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <RefreshCw className="w-5 h-5" />
                <span>Refresh Verification Status</span>
              </>
            )}
          </button>

          <button
            onClick={handleResendVerification}
            disabled={loading || !canResend}
            className="w-full py-3 rounded-lg bg-purple-600 hover:bg-purple-700 
              transition-colors font-medium text-white focus:ring-2 
              focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800
              disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center justify-center space-x-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Mail className="w-5 h-5" />
                <span>
                  {canResend
                    ? 'Resend Verification Email'
                    : `Resend available in ${countdown}s`}
                </span>
              </>
            )}
          </button>

          <button
            onClick={handleSignOut}
            className="flex items-center justify-center space-x-2 text-gray-400 
              hover:text-white transition-colors mx-auto"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </div>

        <div className="mt-8 text-sm text-gray-400">
          <p>Didn't receive the email? Check your spam folder or try resending.</p>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;