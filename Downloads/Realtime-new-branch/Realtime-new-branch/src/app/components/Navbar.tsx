'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '../../firebase/config';
import { useAuthState } from 'react-firebase-hooks/auth';
import { AuthModal } from './AuthModal';
import { Button } from './ui/button';

const Navbar: React.FC = () => {
  const router = useRouter();
  const [user, loading, error] = useAuthState(auth);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [modalType, setModalType] = useState<'signin' | 'signup' | 'initial'>('signin');

  useEffect(() => {
    setIsClient(true);
    // Show the initial auth modal when the app first loads
    if (!user && !loading) {
      setModalType('initial');
      setIsAuthModalOpen(true);
    }
  }, [user, loading]); // Add dependencies

  // Console log for error catching
  console.log('Navbar - User:', user, 'Loading:', loading, 'Error:', error);

  // Function to handle logo click and navigate to home page
  const handleLogoClick = () => {
    console.log('Navigating to home page');
    router.push('/');
  };

  // Function to handle login
  const handleAuthClick = (type: 'signin' | 'signup') => {
    console.log('Auth button clicked:', type);
    setModalType(type);
    setIsAuthModalOpen(true);
  };

  // Only render the component on the client-side and when the user is not signed in
  if (!isClient || loading || user) {
    return null;
  }

  return (
    <>
      <nav className="flex justify-between items-center px-8 py-4 bg-white sticky top-0 z-50 w-full">
        <div className="flex-1">
          {/* Add any left-aligned items here */}
        </div>
        <div className="flex-2 text-center">
          <div 
            className="text-2xl font-bold text-gray-800 cursor-pointer" 
            onClick={handleLogoClick}
          >
            chatchamp.ai
          </div>
        </div>
        <div className="flex-1 flex justify-end space-x-4">
          <Button
            onClick={() => handleAuthClick('signin')}
            variant="outline"
            size="default"
          >
            Log in
          </Button>
          <Button
            onClick={() => handleAuthClick('signup')}
            variant="default"
            size="default"
          >
            Sign Up
          </Button>
        </div>
      </nav>
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        modalType={modalType}
      />
    </>
  );
};

export default Navbar;
