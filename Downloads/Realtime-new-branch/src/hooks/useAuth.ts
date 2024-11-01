import { useState, useEffect } from 'react';
import { auth } from '../types/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export function useAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
    });

    return () => unsubscribe();
  }, []);

  const onLoginClick = () => {
    // Implement your login logic here
    console.log('Login clicked');
  };

  return { isLoggedIn, onLoginClick };
}
