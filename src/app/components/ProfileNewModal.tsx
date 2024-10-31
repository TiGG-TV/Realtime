'use client';

import React, { useState, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';
import { auth } from '../../types/firebase';
import { Button } from "../components/ui/button";
import { Profile, VoiceType } from '../../types/types';
import { categories } from '../../types/categories';
import { enhanceProfileWithAI } from '../../types/aiEnhancement';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { X } from 'lucide-react';
import { Play } from 'lucide-react';
import { Sparkles } from 'lucide-react';
import { serverTimestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { Timestamp } from 'firebase/firestore';
import { useToast } from "@/app/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogDescription } from "@/app/components/ui/dialog";

interface ProfileNewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProfileNewModal: React.FC<ProfileNewModalProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const [category, setCategory] = useState('');
  const [instructions, setInstructions] = useState('');
  const [voice, setVoice] = useState<VoiceType>(VoiceType.Echo);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enhancedProfile, setEnhancedProfile] = useState<Profile | null>(null);
  const firestore = getFirestore();
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const voiceAudioClips: Record<VoiceType, string> = {
    [VoiceType.Echo]: '/audio/echo.mp3',
    [VoiceType.Alloy]: '/audio/alloy.mp3',
    [VoiceType.Shimmer]: '/audio/shimmer.mp3',
  };

  const getInstructionsPlaceholder = (category: string) => {
    switch (category) {
      case 'SmallTalk':
        return "Example: Act as a friendly neighbor. Ask about my day, hobbies, and recent local events. Keep the conversation light and casual.";
      case 'Sales':
        return "Example: You're a potential customer interested in our new smartphone. Ask about features, pricing, and comparisons with competitors.";
      case 'PublicSpeaking':
        return "Example: You're the audience for a TED talk on climate change. React to key points and ask thought-provoking questions.";
      case 'Negotiation':
        return "Example: You're a landlord negotiating rent with a tenant. Discuss terms, lease duration, and potential property improvements.";
      case 'Dating':
        return "Example: You're on a first date at a coffee shop. Share interests, ask questions, and show genuine curiosity about your date.";
      case 'CustomerService':
        return "Example: You're a customer with a faulty product. Express frustration politely and seek a satisfactory resolution.";
      case 'Debate':
        return "Example: You're arguing in favor of renewable energy. Present facts, address counterarguments, and persuade the audience.";
      case 'Interview':
        return "Example: You're interviewing a candidate for a marketing position. Ask about experience, skills, and situational scenarios.";
      default:
        return "Enter instructions for the AI to follow during the conversation...";
    }
  };

  const playAudioClip = (voiceType: VoiceType) => {
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }

    const audioSrc = voiceAudioClips[voiceType];
    const newAudio = new Audio(audioSrc);
    
    newAudio.onended = () => {
      setAudioElement(null);
    };

    setAudioElement(newAudio);
    newAudio.play().catch(error => {
      console.error('Error playing audio:', error);
      setError('Failed to play audio. Please try again.');
    });
  };

  const handleEnhanceProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !instructions) {
      setError('Please fill in all required fields');
      return;
    }

    setIsEnhancing(true);
    setError(null);

    try {
      const enhancedProfile = await enhanceProfileWithAI(category, instructions);
      setEnhancedProfile(enhancedProfile);
    } catch (error) {
      console.error('Error enhancing profile:', error);
      setError('Failed to enhance profile. Please try again.');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSubmit = async () => {
    if (!enhancedProfile) return;

    try {
      const user = auth.currentUser;
      if (!user) {
        setError('Please sign in to save profiles');
        return;
      }

      const profileData = {
        ...enhancedProfile,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        voice: voice,
      };

      const profilesRef = collection(firestore, 'profiles');
      await setDoc(doc(profilesRef, profileData.id), profileData);

      toast({
        title: "Success",
        description: "Your new profile has been saved successfully.",
      });

      onClose();
      router.push('/?reset=true');
    } catch (error) {
      console.error('Error saving profile:', error);
      setError('Failed to save profile. Please try again.');
    }
  };

  const handleResetProfile = () => {
    setEnhancedProfile(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[500px] mx-auto">
        <DialogHeader>
          <DialogTitle>Create New Profile</DialogTitle>
          <DialogClose />
        </DialogHeader>
        <DialogDescription>
          {/* Add a brief description of the dialog's purpose here */}
          This dialog allows you to create a new profile by selecting a category and providing instructions.
        </DialogDescription>
        <div className="p-4">
          {error && <div className="bg-red-100 text-red-800 p-3 rounded-md mb-4 text-sm">{error}</div>}
          
          {!enhancedProfile ? (
            <form onSubmit={handleEnhanceProfile} className="flex flex-col gap-5">
              <select
                value={category}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setCategory(e.target.value)}
                required
                className="w-full p-2 border border-gray-300 rounded-md bg-white h-[40px]"
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <div className="relative mb-4">
                <label htmlFor="instructions" className="block mb-2 font-bold text-gray-700">Instructions</label>
                <textarea
                  id="instructions"
                  placeholder={getInstructionsPlaceholder(category)}
                  value={instructions}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setInstructions(e.target.value)}
                  required
                  className="w-full min-h-[150px] p-3 border border-gray-300 rounded-md text-base leading-relaxed resize-y transition-colors focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={voice}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setVoice(e.target.value as VoiceType)}
                  required
                  className="flex-grow p-2 border border-gray-300 rounded-md bg-white h-[40px]"
                >
                  {Object.values(VoiceType).map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => playAudioClip(voice)}
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-green-500 hover:bg-green-600 transition-colors"
                >
                  <Play className="text-white" size={20} />
                </button>
              </div>

              <Button
                type="submit"
                disabled={isEnhancing || !instructions || !category}
                className="w-full bg-yellow-100 hover:bg-yellow-200 text-yellow-800 hover:text-yellow-900 transition-colors"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {isEnhancing ? 'Generating...' : 'Generate Profile'}
              </Button>
            </form>
          ) : (
            <Card className="w-full mt-6 relative">
              <button 
                onClick={handleResetProfile}
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
              <CardHeader>
                <CardTitle className="flex items-center gap-4">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={enhancedProfile.imageUrl} alt={enhancedProfile.name} />
                    <AvatarFallback>{enhancedProfile.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-semibold">{enhancedProfile.name}</h3>
                    <p className="text-sm text-gray-500">{enhancedProfile.description}</p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <h4 className="font-semibold mb-2">Scenario Description:</h4>
                <p className="text-sm mb-4">{enhancedProfile.scenarioDescription}</p>
                
                <h4 className="font-semibold mt-4 mb-2">Voice:</h4>
                <p className="text-sm">{enhancedProfile.voice}</p>
              </CardContent>
              <Button 
                onClick={handleSubmit}
                className="w-full mt-4"
              >
                Create Profile
              </Button>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileNewModal;
