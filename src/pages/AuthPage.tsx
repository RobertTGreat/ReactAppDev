import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  AuthError 
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const AuthPage: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [resetMode, setResetMode] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const createUserDocument = async (
    uid: string, 
    email: string, 
    username: string
  ) => {
    try {
      // Create user document
      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, {
        email,
        username,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date()
      });

      // Create username document for uniqueness
      const usernameRef = doc(db, 'usernames', username.toLowerCase());
      await setDoc(usernameRef, {
        uid
      });
    } catch (error) {
      console.error('Error creating user document:', error);
      throw error;
    }
  };

  // Check if username exists
  const checkUsername = async (username: string): Promise<boolean> => {
    const usernameRef = doc(db, 'usernames', username.toLowerCase());
    const usernameDoc = await getDoc(usernameRef);
    return usernameDoc.exists();
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Password reset email sent! Check your inbox.');
      setError('');
    } catch (err) {
      const firebaseError = err as AuthError;
      setError(firebaseError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    
    try {
      if (resetMode) {
        await handlePasswordReset(e);
        return;
      }

      if (isSignUp) {
        // Validation checks
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          return;
        }
        
        if (password.length < 6) {
          setError('Password must be at least 6 characters long');
          return;
        }

        if (!username || username.length < 3) {
          setError('Username must be at least 3 characters long');
          return;
        }

        // Check username availability
        const usernameExists = await checkUsername(username);
        if (usernameExists) {
          setError('Username is already taken');
          return;
        }

        // Create user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Update profile with username
        await updateProfile(user, {
          displayName: username
        });

        // Create user document
        await createUserDocument(user.uid, email, username);

        // Send verification email
        await sendEmailVerification(user);
        
        setMessage('Account created! Please check your email for verification.');
        navigate('/verify-email');
      } else {
        // Sign in
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Update last login
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          lastLoginAt: new Date()
        });

        if (!user.emailVerified) {
          navigate('/verify-email');
        } else {
          navigate('/chats');
        }
      }
    } catch (err) {
      const firebaseError = err as AuthError;
      switch (firebaseError.code) {
        case 'auth/email-already-in-use':
          setError('This email is already registered. Please sign in instead.');
          break;
        case 'auth/invalid-email':
          setError('Please enter a valid email address.');
          break;
        case 'auth/weak-password':
          setError('Password should be at least 6 characters long.');
          break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          setError('Invalid email or password.');
          break;
        default:
          setError(firebaseError.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1121] text-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md p-8 rounded-2xl bg-gray-800/50 border border-gray-700/50">
        {!resetMode ? (
          <>
            <h2 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h2>
            
            <form onSubmit={handleAuth} className="space-y-6">
              {isSignUp && (
                <div>
                  <label className="block text-sm font-medium mb-2">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-white 
                      focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none
                      transition-colors"
                    placeholder="Choose a username"
                    required
                    minLength={3}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-white 
                    focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none
                    transition-colors"
                  placeholder="Enter your email"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-white
                    focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none
                    transition-colors"
                  placeholder="Enter your password"
                  required
                  minLength={6}
                />
              </div>

              {isSignUp && (
                <div>
                  <label className="block text-sm font-medium mb-2">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-white
                      focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none
                      transition-colors"
                    placeholder="Re-enter your password"
                    required
                    minLength={6}
                  />
                </div>
              )}

              {error && (
                <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                  {error}
                </div>
              )}

              {message && (
                <div className="text-green-400 text-sm bg-green-400/10 p-3 rounded-lg border border-green-400/20">
                  {message}
                </div>
              )}
              
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg bg-purple-600 hover:bg-purple-700 
                  transition-colors font-medium text-white focus:ring-2 
                  focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Please wait...' : (isSignUp ? 'Sign Up' : 'Sign In')}
              </button>
            </form>

            <div className="mt-6 text-center space-y-4">
              {!isSignUp && (
                <button
                  onClick={() => setResetMode(true)}
                  className="text-purple-400 hover:text-purple-300 transition-colors text-sm"
                >
                  Forgot password?
                </button>
              )}

              <div>
                <button
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError('');
                    setMessage('');
                    setPassword('');
                    setConfirmPassword('');
                    setUsername('');
                  }}
                  className="text-purple-400 hover:text-purple-300 transition-colors"
                >
                  {isSignUp
                    ? 'Already have an account? Sign in'
                    : "Don't have an account? Sign up"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Reset Password
            </h2>
            
            <form onSubmit={handlePasswordReset} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-white 
                    focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none
                    transition-colors"
                  placeholder="Enter your email"
                  required
                />
              </div>

              {error && (
                <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                  {error}
                </div>
              )}

              {message && (
                <div className="text-green-400 text-sm bg-green-400/10 p-3 rounded-lg border border-green-400/20">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg bg-purple-600 hover:bg-purple-700 
                  transition-colors font-medium text-white focus:ring-2 
                  focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Please wait...' : 'Send Reset Link'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setResetMode(false);
                  setError('');
                  setMessage('');
                }}
                className="text-purple-400 hover:text-purple-300 transition-colors"
              >
                Back to sign in
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthPage;