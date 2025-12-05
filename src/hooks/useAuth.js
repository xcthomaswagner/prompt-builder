import { useState, useEffect } from 'react';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  OAuthProvider, 
  onAuthStateChanged, 
  signOut 
} from 'firebase/auth';

/**
 * useAuth - Custom hook for Firebase authentication.
 * 
 * Handles user authentication state, sign-in/sign-out,
 * and test mode detection for E2E tests.
 * 
 * @param {Object} firebaseApp - Initialized Firebase app instance
 * @returns {Object} Auth state and handlers
 */
export default function useAuth(firebaseApp) {
  const [user, setUser] = useState(null);
  const [isTestMode, setIsTestMode] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Get auth instance
  const auth = firebaseApp ? getAuth(firebaseApp) : null;

  // Check for test user in localStorage on mount (for E2E tests)
  useEffect(() => {
    try {
      const testUser = localStorage.getItem('playwright_test_user');
      if (testUser) {
        setUser(JSON.parse(testUser));
        setIsTestMode(true);
        setIsAuthLoading(false);
        return; // Skip Firebase auth if test user exists
      }
    } catch (e) {
      // Ignore parse errors
    }

    // Set up Firebase auth listener
    if (!auth) {
      setIsAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  // Google sign-in handler
  const handleGoogleSignIn = async () => {
    if (!auth) return;
    setAuthError('');
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Google sign-in failed:", error);
      setAuthError("Failed to sign in with Google. Please try again.");
    }
  };

  // Microsoft sign-in handler
  const handleMicrosoftSignIn = async () => {
    if (!auth) return;
    setAuthError('');
    const provider = new OAuthProvider('microsoft.com');
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Microsoft sign-in failed:", error);
      setAuthError("Failed to sign in with Microsoft. Please try again.");
    }
  };

  // Sign-out handler
  const handleSignOut = async () => {
    // Clear demo/test mode if active
    if (isTestMode || isDemoMode) {
      localStorage.removeItem('playwright_test_user');
      localStorage.removeItem('demo_mode_user');
      setUser(null);
      setIsTestMode(false);
      setIsDemoMode(false);
      return;
    }
    
    if (!auth) return;
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign-out failed:", error);
    }
  };

  // Demo mode state (dev only)
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Check for demo user on mount
  useEffect(() => {
    try {
      const demoUser = localStorage.getItem('demo_mode_user');
      if (demoUser) {
        setUser(JSON.parse(demoUser));
        setIsDemoMode(true);
        setIsAuthLoading(false);
      }
    } catch (e) {
      // Ignore parse errors
    }
  }, []);

  // Demo sign-in handler (dev only - simulates regular member)
  const handleDemoSignIn = () => {
    const demoUser = {
      uid: 'demo_user_001',
      email: 'demo@example.com',
      displayName: 'Demo User',
      photoURL: null,
      isDemo: true
    };
    localStorage.setItem('demo_mode_user', JSON.stringify(demoUser));
    setUser(demoUser);
    setIsDemoMode(true);
  };

  // Check if we're in development mode
  const isDev = import.meta.env.DEV;

  return {
    user,
    isTestMode,
    isDemoMode,
    isDev,
    isAuthLoading,
    authError,
    setAuthError,
    handleGoogleSignIn,
    handleMicrosoftSignIn,
    handleDemoSignIn,
    handleSignOut
  };
}
