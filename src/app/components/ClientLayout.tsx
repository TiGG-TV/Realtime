'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../types/firebase';
import { Profile } from '../../types/types';

const Navbar = dynamic(() => import('./Navbar'), { ssr: false });
const FooterSection = dynamic(() => import('./FooterSection'), { ssr: false });

interface ClientLayoutProps {
  children: React.ReactNode;
  onProfileSelect?: (profile: Profile) => void;
}

const ClientLayout: React.FC<ClientLayoutProps> = ({ children, onProfileSelect }) => {
  const [user, loading] = useAuthState(auth);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex min-h-screen">
      <div className={`flex-1 flex flex-col transition-all duration-300 ${user ? 'ml-64' : ''}`}>
        <Navbar />
        <main className="flex-1 p-4">
          {children}
        </main>
        {!user && (
          <div className="mt-auto">
            <FooterSection />
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientLayout;

// Console log for error catching
console.log('ClientLayout component loaded');
