'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Profile } from '../../types/types';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { scoreConversation, ScoringResult } from '../../types/conversationScorer';
import { ProfileSidebar } from './ProfileSidebar';
import { Button } from './ui/button';
import { X, MoreHorizontal } from 'react-feather';
import { Toggle } from './Toggle';
import { RealtimeClient } from '@openai/realtime-api-beta';
import { WavRecorder, WavStreamPlayer } from '../../lib/wavtools/index.js';
import { VoiceType } from '../../types/types';
import { Avatar, AvatarImage, AvatarFallback } from "@/app/components/ui/avatar";
import { getAvatarUrl } from '../../utils/avatar';

// Update the type to match what RealtimeClient expects
type AllowedVoice = "alloy" | "echo" | "shimmer";

interface ChatInterfaceProps {
  profileId: string;
}

// Change from default export to named export
export const ChatInterface: React.FC<ChatInterfaceProps> = ({ profileId }) => {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [conversation, setConversation] = useState<string[]>([]);
  const [score, setScore] = useState<ScoringResult | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [useVAD, setUseVAD] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [canPushToTalk, setCanPushToTalk] = useState(true);
  const clientRef = useRef<RealtimeClient>(
    new RealtimeClient({
      apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
      dangerouslyAllowAPIKeyInBrowser: true,
    })
  );
  const wavRecorderRef = useRef<WavRecorder | null>(null);
  const wavStreamPlayerRef = useRef<WavStreamPlayer | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const firestore = getFirestore();
      const profileDoc = await getDoc(doc(firestore, 'profiles', profileId));
      if (profileDoc.exists()) {
        const profileData = profileDoc.data() as Profile;
        setProfile(profileData);
        
        // Fetch avatar URL if userId exists
        if (profileData.userId) {
          const avatarUrl = await getAvatarUrl(profileData.userId);
          setProfileImage(avatarUrl);
        }
      } else {
        console.error('Profile not found');
        router.push('/');
      }
    };

    fetchProfile();
  }, [profileId, router]);

  const handleSendMessage = (message: string) => {
    setConversation(prev => [...prev, `User: ${message}`]);
    // Simulate AI response
    setTimeout(() => {
      setConversation(prev => [...prev, `AI: This is a simulated response to "${message}"`]);
    }, 1000);
  };

  const handleScoreConversation = async () => {
    if (profile && conversation.length > 0) {
      setIsScoring(true);
      try {
        const result = await scoreConversation(profile, conversation.join('\n'));
        setScore(result);
      } catch (error) {
        console.error('Error scoring conversation:', error);
      } finally {
        setIsScoring(false);
      }
    }
  };

  // Helper function to ensure we only use allowed voices
  const getValidVoice = (voice: VoiceType): AllowedVoice => {
    const voiceLower = voice.toLowerCase();
    // If the voice isn't supported, fallback to 'echo'
    if (!['alloy', 'echo', 'shimmer'].includes(voiceLower)) {
      console.warn(`Voice ${voice} not supported, falling back to echo`);
      return 'echo';
    }
    return voiceLower as AllowedVoice;
  };

  useEffect(() => {
    if (profile?.voice) {
      console.log('Updating voice to:', profile.voice);
      const client = clientRef.current;
      try {
        const voice = getValidVoice(profile.voice);
        client.updateSession({ voice });
        console.log('Voice updated successfully to:', voice);
      } catch (error) {
        console.error('Error updating voice:', error);
        setVoiceError('Failed to set voice. Please try reconnecting.');
      }
    }
  }, [profile?.voice]);

  useEffect(() => {
    wavRecorderRef.current = new WavRecorder({ sampleRate: 24000 });
    wavStreamPlayerRef.current = new WavStreamPlayer({ sampleRate: 24000 });

    return () => {
      wavRecorderRef.current?.end();
      wavStreamPlayerRef.current?.interrupt();
    };
  }, []);

  // Add new effect to handle automatic recording when VAD is enabled
  useEffect(() => {
    if (isConnected && useVAD) {
      const startVADRecording = async () => {
        const wavRecorder = wavRecorderRef.current;
        const client = clientRef.current;
        
        if (!wavRecorder || !client) return;
        
        try {
          await wavRecorder.record((data) => client.appendInputAudio(data.mono));
          console.log('VAD recording started');
        } catch (error) {
          console.error('Error starting VAD recording:', error);
          setVoiceError('Failed to start automatic recording. Please try again.');
        }
      };

      startVADRecording();
    }
  }, [isConnected, useVAD]);

  // Update the event listeners effect
  useEffect(() => {
    const client = clientRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;

    if (!client || !wavStreamPlayer) return;

    // Define the event handlers
    const handleConversationUpdate = async ({ item, delta }: any) => {
      // Handle audio output
      if (delta?.audio) {
        wavStreamPlayer.add16BitPCM(delta.audio, item.id);
      }

      // Update conversation messages
      if (delta?.transcript || delta?.text) {
        setConversation(prev => [
          ...prev,
          `${item.role === 'assistant' ? 'AI' : 'User'}: ${delta.transcript || delta.text}`
        ]);
      }
    };

    const handleInterruption = async () => {
      const trackSampleOffset = await wavStreamPlayer.interrupt();
      if (trackSampleOffset?.trackId) {
        const { trackId, offset } = trackSampleOffset;
        await client.cancelResponse(trackId, offset);
      }
    };

    // Add event listeners
    client.on('conversation.updated', handleConversationUpdate);
    client.on('conversation.interrupted', handleInterruption);

    // Set initial configuration with current VAD setting
    client.updateSession({
      input_audio_transcription: { model: 'whisper-1' },
      turn_detection: useVAD ? { type: 'server_vad' } : null,
    });

    return () => {
      // Cleanup event listeners
      client.off('conversation.updated', handleConversationUpdate);
      client.off('conversation.interrupted', handleInterruption);
    };
  }, [useVAD]);

  // Update handleStartConversation
  const handleStartConversation = async () => {
    if (!wavRecorderRef.current || !wavStreamPlayerRef.current) {
      setVoiceError('Audio system not initialized. Please refresh the page.');
      return;
    }

    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;
    
    try {
      // Connect to realtime API
      await client.connect();
      
      // Configure session with voice and VAD settings
      await client.updateSession({ 
        voice: profile?.voice ? getValidVoice(profile.voice) : 'echo',
        turn_detection: useVAD ? { type: 'server_vad' } : null,
        input_audio_transcription: { model: 'whisper-1' }
      });

      // Initialize audio
      await wavRecorder.begin();
      await wavStreamPlayer.connect();

      setIsConnected(true);
      setVoiceError(null);
      
      // Start VAD recording if enabled
      if (useVAD) {
        await wavRecorder.record((data) => {
          if (client.isConnected()) {
            client.appendInputAudio(data.mono);
          }
        });
        console.log('VAD recording started automatically');
      }
      
      // Trigger initial AI response
      client.createResponse();

    } catch (error) {
      console.error('Error starting conversation:', error);
      setIsConnected(false);
      setVoiceError('Failed to start conversation. Please check your connection and try again.');
    }
  };

  const handleDisconnectConversation = async () => {
    if (!wavRecorderRef.current || !wavStreamPlayerRef.current) {
      return;
    }

    console.log('Disconnecting conversation');
    const client = clientRef.current;
    
    try {
      client.disconnect();
      await wavRecorderRef.current.end();
      await wavStreamPlayerRef.current.interrupt();
      setIsConnected(false);
      setVoiceError(null);

      // Automatically trigger scoring when disconnecting
      if (profile && conversation.length > 0) {
        setIsScoring(true);
        try {
          const result = await scoreConversation(profile, conversation.join('\n'));
          setScore(result);
        } catch (error) {
          console.error('Error scoring conversation:', error);
        } finally {
          setIsScoring(false);
        }
      }

    } catch (error) {
      console.error('Error disconnecting:', error);
      setVoiceError('Error during disconnect. Please refresh the page.');
    }
  };

  // Update handleVADChange
  const handleVADChange = async (isEnabled: boolean) => {
    console.log('Changing VAD mode:', isEnabled);
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    
    if (!client || !wavRecorder) return;

    try {
      // Stop any ongoing recording
      if (wavRecorder.getStatus() === 'recording') {
        await wavRecorder.pause();
      }
      
      // Update states
      setUseVAD(isEnabled);
      setCanPushToTalk(!isEnabled);
      
      // Update client session with turn detection settings
      await client.updateSession({
        turn_detection: isEnabled ? { type: 'server_vad' } : null,
        input_audio_transcription: { model: 'whisper-1' },
      });
      
      // If VAD is enabled and client is connected, start recording
      if (isEnabled && client.isConnected()) {
        // Ensure the recording session is started
        if (!wavRecorder.isInitialized()) {
          await wavRecorder.begin();
        }
        await wavRecorder.record((data) => {
          if (client.isConnected()) {
            client.appendInputAudio(data.mono);
          }
        });
        console.log('VAD mode enabled and recording started');
      }
      
      setVoiceError(null);
    } catch (error) {
      console.error('Error changing VAD mode:', error);
      setVoiceError('Failed to change VAD mode. Please try again.');
      // Revert states on error
      setUseVAD(!isEnabled);
      setCanPushToTalk(isEnabled);
    }
  };

  const startRecording = async () => {
    if (!wavRecorderRef.current || !wavStreamPlayerRef.current) return;
    
    setIsRecording(true);
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;
    
    try {
      const trackSampleOffset = await wavStreamPlayer.interrupt();
      if (trackSampleOffset?.trackId) {
        const { trackId, offset } = trackSampleOffset;
        await client.cancelResponse(trackId, offset);
      }
      await wavRecorder.record((data) => client.appendInputAudio(data.mono));
    } catch (error) {
      console.error('Error starting recording:', error);
      setVoiceError('Failed to start recording. Please try again.');
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (!wavRecorderRef.current) return;
    
    setIsRecording(false);
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    
    try {
      await wavRecorder.pause();
      client.createResponse();
    } catch (error) {
      console.error('Error stopping recording:', error);
      setVoiceError('Failed to stop recording. Please try again.');
    }
  };

  if (!profile) {
    return <div>Loading profile...</div>;
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex justify-between items-center p-4 border-b">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage 
              src={profileImage || ''} 
              alt={profile.name}
              className="object-cover"
              onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                console.error('Profile image failed to load:', profileImage);
                e.currentTarget.src = '/placeholder.svg';
              }}
            />
            <AvatarFallback>{profile.name[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <h2 className="text-2xl font-bold">{profile.name}</h2>
        </div>
        <button
          className="p-2 bg-gray-200 rounded-full"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          {isSidebarOpen ? <X size={24} /> : <MoreHorizontal size={24} />}
        </button>
      </div>

      <div className={`flex-grow overflow-y-auto p-4 ${isSidebarOpen ? 'mr-80' : ''}`}>
        {conversation.map((message, index) => (
          <div key={index} className={`flex ${message.startsWith('User:') ? 'flex-row-reverse' : 'flex-row'} mb-4`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${message.startsWith('User:') ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'} ${message.startsWith('User:') ? 'ml-2' : 'mr-2'}`}>
              {message.startsWith('User:') ? 'U' : 'A'}
            </div>
            <div className={`max-w-[75%] ${message.startsWith('User:') ? 'bg-blue-100' : 'bg-green-100'} rounded-lg p-3`}>
              <div className="mt-1">
                {message.split(': ')[1]}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={`border-t p-4 ${isSidebarOpen ? 'mr-80' : ''}`}>
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-2">
            <Button
              onClick={isConnected ? handleDisconnectConversation : handleStartConversation}
              className="flex-grow"
            >
              {isConnected ? 'Disconnect' : 'Start'}
            </Button>
            <Toggle
              defaultValue={useVAD}
              labels={['Manual', 'Auto']}
              onChange={handleVADChange}
            />
          </div>
          {isConnected && canPushToTalk && (
            <Button
              disabled={!isConnected || !canPushToTalk}
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onMouseLeave={stopRecording}
              onTouchStart={(e) => {
                e.preventDefault();
                startRecording();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                stopRecording();
              }}
              onTouchCancel={(e) => {
                e.preventDefault();
                stopRecording();
              }}
              className="w-full"
            >
              {isRecording ? 'Recording...' : 'Push to Talk'}
            </Button>
          )}
        </div>
      </div>

      <ProfileSidebar
        profile={profile}
        score={score}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpen={() => setIsSidebarOpen(true)}
      />
      {voiceError && (
        <div className="bg-red-100 text-red-800 p-3 m-4 rounded-md">
          {voiceError}
        </div>
      )}
    </div>
  );
};
