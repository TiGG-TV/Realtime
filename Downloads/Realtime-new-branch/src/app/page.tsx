'use client';

import dynamic from 'next/dynamic';
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from './components/sidebar'; // Import the Sidebar component
import { Profile as BaseProfile } from '@/types/types'; // Updated import path

const ConsoleContent = dynamic(() => import('./components/ConsoleContent'), {
  ssr: false
});

const Home: React.FC = () => {
  const [selectedProfile, setSelectedProfile] = useState<BaseProfile | null>(null);
  const searchParams = useSearchParams();
  const resetParam = searchParams?.get('reset');

  // Handle profile selection
  const handleProfileSelect = (profile: BaseProfile | null) => {
    console.log('Profile selected:', profile?.name);
    setSelectedProfile(profile);
  };

  // Reset when reset parameter is present
  useEffect(() => {
    if (resetParam === 'true') {
      setSelectedProfile(null);
    }
  }, [resetParam]);

  return (
    <div className="h-full overflow-hidden bg-white flex">
      {/* Sidebar */}
      <Sidebar onProfileSelect={handleProfileSelect} />

      {/* Main content */}
      <div className="flex-grow">
        <ConsoleContent
          selectedProfile={selectedProfile}
          onProfileSelect={handleProfileSelect}
        />
      </div>
    </div>
  );
};

export default Home;

// Console log for error catching
console.log('Home component loaded');
