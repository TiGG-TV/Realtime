import { useState, useEffect } from 'react';
import { auth } from '../types/firebase';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';

export function useSubscription() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [credits, setCredits] = useState(0);
  const firestore = getFirestore();

  useEffect(() => {
    const checkSubscription = async () => {
      const user = auth.currentUser;
      if (!user) {
        setIsSubscribed(false);
        setIsLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(firestore, 'users', user.uid));
        const userData = userDoc.data();
        setIsSubscribed(userData?.subscriptionStatus === 'active');
        setCredits(userData?.credits || 0);
      } catch (error) {
        console.error('Error checking subscription:', error);
        setIsSubscribed(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSubscription();
  }, []);

  const cancelSubscription = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('No user logged in');

    const response = await fetch('/api/cancel-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: user.uid,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to cancel subscription');
    }

    setIsSubscribed(false);
  };

  return { isSubscribed, isLoading, credits, cancelSubscription };
}
