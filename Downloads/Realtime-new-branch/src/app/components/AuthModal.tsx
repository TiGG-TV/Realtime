import React, { useState } from 'react';
import { auth } from '../../types/firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  OAuthProvider, 
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink 
} from 'firebase/auth';
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { X, Mail, ArrowLeft, Apple, Chrome } from 'lucide-react';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { generateRandomName } from '../../types/nameGenerator';
import { useToast } from "@/app/components/ui/use-toast";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  modalType?: 'signin' | 'signup' | 'initial';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, modalType = 'signin' }) => {
  const { toast } = useToast();
  const firestore = getFirestore();
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Email link authentication settings
  const actionCodeSettings = {
    url: window.location.origin + '/auth/email-signin',
    handleCodeInApp: true,
  };

  const initializeUserDocument = async (userId: string, email: string, photoURL: string | null) => {
    try {
      const userRef = doc(firestore, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        const randomUsername = generateRandomName();
        await setDoc(userRef, {
          username: randomUsername,
          bio: '',
          profilePicture: photoURL || '',
          email: email,
          subscriptionStatus: 'inactive',
          subscriptionPlan: 'free',
          credits: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        console.log('Created new user document:', userId);
        return randomUsername;
      }
      return null;
    } catch (error) {
      console.error('Error initializing user document:', error);
      throw error;
    }
  };

  const handleEmailLinkSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      // Save the email for later use
      window.localStorage.setItem('emailForSignIn', email);
      
      toast({
        title: "Email Sent!",
        description: "Check your email for the sign-in link.",
      });
      
      setShowEmailInput(false);
      onClose();
    } catch (error) {
      console.error('Error sending email link:', error);
      toast({
        title: "Error",
        description: "Failed to send sign-in link. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const username = await initializeUserDocument(user.uid, user.email!, user.photoURL);
      
      if (username) {
        toast({
          title: "Welcome!",
          description: `Your username is ${username}. You can change it in your profile settings.`,
        });
      }

      onClose();
    } catch (error) {
      console.error('Error signing in with Google:', error);
      toast({
        title: "Error",
        description: "Failed to sign in with Google. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAppleSignIn = async () => {
    try {
      const provider = new OAuthProvider('apple.com');
      provider.addScope('email');
      provider.addScope('name');
      
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const username = await initializeUserDocument(user.uid, user.email!, user.photoURL);
      
      if (username) {
        toast({
          title: "Welcome!",
          description: `Your username is ${username}. You can change it in your profile settings.`,
        });
      }

      onClose();
    } catch (error) {
      console.error('Error signing in with Apple:', error);
      toast({
        title: "Error",
        description: "Failed to sign in with Apple. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-lg relative max-w-[400px] w-full">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="space-y-6">
          <div className="text-center space-y-2 mb-8">
            <h2 className="text-2xl font-semibold">
              {modalType === 'initial' 
                ? 'Create a free account' 
                : modalType === 'signup' 
                  ? 'Sign Up' 
                  : 'Sign In'}
            </h2>
            {modalType === 'initial' && (
              <p className="text-lg text-gray-600">or Sign in</p>
            )}
          </div>

          <div className="space-y-3">
            {!showEmailInput ? (
              <>
                <Button
                  onClick={handleGoogleSignIn}
                  className="w-full h-12 text-base font-medium bg-gray-100 text-gray-900 hover:bg-gray-200 rounded-full"
                  variant="ghost"
                >
                  <Chrome className="w-5 h-5 mr-3" />
                  Continue with Google
                </Button>

                <Button
                  onClick={handleAppleSignIn}
                  className="w-full h-12 text-base font-medium bg-gray-100 text-gray-900 hover:bg-gray-200 rounded-full"
                  variant="ghost"
                >
                  <Apple className="w-5 h-5 mr-3" />
                  Continue with Apple
                </Button>

                <div className="text-center text-sm text-gray-500 my-4">
                  OR
                </div>

                <Button
                  onClick={() => setShowEmailInput(true)}
                  className="w-full h-12 text-base font-medium bg-gray-100 text-gray-900 hover:bg-gray-200 rounded-full"
                  variant="ghost"
                >
                  <Mail className="w-5 h-5 mr-3" />
                  Continue with email
                </Button>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center">
                  <Mail className="w-5 h-5 mr-3 text-gray-500" />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 h-12 text-base rounded-full px-6 bg-gray-100 border-0 focus:ring-2 focus:ring-gray-200"
                  />
                </div>

                <Button
                  onClick={handleEmailLinkSignIn}
                  className="w-full h-12 text-base font-medium bg-black text-white hover:bg-gray-900 rounded-full"
                  disabled={isLoading || !email}
                >
                  {isLoading ? 'Sending...' : 'Continue'}
                </Button>
              </div>
            )}

            {modalType === 'initial' && (
              <>
                <div className="text-center text-sm text-gray-500 mt-6">
                  By continuing, you agree to our{' '}
                  <a href="/terms" className="text-gray-900 hover:underline">
                    Terms
                  </a>{' '}
                  and acknowledge our{' '}
                  <a href="/privacy" className="text-gray-900 hover:underline">
                    Privacy Policy
                  </a>.
                </div>

                <div className="text-center text-sm text-gray-500 mt-4">
                  <button
                    onClick={() => {/* Add your trouble signing in handler */}}
                    className="text-gray-900 hover:underline"
                  >
                    Trouble signing in?
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
