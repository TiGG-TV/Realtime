'use client';

import React, { useEffect, useRef, useCallback, useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db as firestore } from '../../firebase/config';

import { RealtimeClient } from '@openai/realtime-api-beta';
import { ItemType } from '@openai/realtime-api-beta/dist/lib/client.js';
import { WavRecorder, WavStreamPlayer } from '../../lib/wavtools/index.js';
import { profiles as conversationProfiles } from '../../types/conversation_config.js';
import { WavRenderer } from '../../types/wav_renderer';

import { X, Edit, Zap, ArrowUp, ArrowDown, MoreHorizontal } from 'react-feather';
import { Button } from './ui/button';
import { Toggle } from './Toggle';

import { Profile as BaseProfile } from '../../types/types';
import { smallTalkProfiles } from '../../types/smallTalkProfiles';
import { salesProfiles } from '../../types/salesProfiles';
import { publicSpeakingProfiles } from '../../types/publicSpeakingProfiles';
import { negotiationProfiles } from '../../types/negotiationProfiles';
import { datingProfiles } from '../../types/datingProfiles';
import { customerServiceProfiles } from '../../types/customerServiceProfile';
import { debateProfiles } from '../../types/debateProfiles';
import { interviewProfiles } from '../../types/interviewProfiles';
import { scoreConversation, ScoringResult } from '../../types/conversationScorer';
import { v4 as uuidv4 } from 'uuid';
import { ProfileSidebar } from './ProfileSidebar';
import HeroSection from './HeroSection';
import { collection, addDoc, query, where, getDocs, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { allProfiles as predefinedProfiles } from '../../types/profileUtils';
import { useAuth } from '../../hooks/useAuth';

import { motion } from 'framer-motion';
import { AuthModal } from './AuthModal';
import Image from "next/image";
import { MessageCircle } from "lucide-react";
import { useToast } from "../../hooks/use-toast"
import { Toast } from "./ui/toast"

// Update the interface to accept props
interface ConsoleContentProps {
  selectedProfile: BaseProfile | null;
  onProfileSelect: (profile: BaseProfile | null) => void; // Update to allow null
}

const LOCAL_RELAY_SERVER_URL: string = process.env.NEXT_PUBLIC_LOCAL_RELAY_SERVER_URL || '';

const ConsoleContent: React.FC<ConsoleContentProps> = ({ selectedProfile, onProfileSelect }) => {
  const { toast } = useToast(); // Move this to the top of the component
  const { isLoggedIn, onLoginClick } = useAuth();
  const [user] = useAuthState(auth);
  const searchParams = useSearchParams();
  const profileId = searchParams?.get('profileId');
  const resetParam = searchParams?.get('reset');
  const router = useRouter();

  console.log('Rendering ConsolePage');

  React.useEffect(() => {
    console.log('ConsolePage mounted');
    return () => {
      console.log('ConsolePage unmounted');
    };
  }, []);

  /**
   * Instantiate:
   * - WavRecorder (speech input)
   * - WavStreamPlayer (speech output)
   * - RealtimeClient (API client)
   */
  const wavRecorderRef = useRef<WavRecorder>(
    new WavRecorder({ sampleRate: 24000 })
  );
  const wavStreamPlayerRef = useRef<WavStreamPlayer>(
    new WavStreamPlayer({ sampleRate: 24000 })
  );
  const clientRef = useRef<RealtimeClient>(
    new RealtimeClient({
      apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
      dangerouslyAllowAPIKeyInBrowser: true,
    })
  );

  /**
   * References for
   * - Rendering audio visualization (canvas)
   * - Autoscrolling event logs
   * - Timing delta for event log displays
   */
  const clientCanvasRef = useRef<HTMLCanvasElement>(null);
  const serverCanvasRef = useRef<HTMLCanvasElement>(null);
  const eventsScrollHeightRef = useRef(0);
  const eventsScrollRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<string>(new Date().toISOString());

  /**
   * All of our variables for displaying application state
   * - items are all conversation items (dialog)
   * - realtimeEvents are event logs, which can be expanded
   */
  const [items, setItems] = useState<ItemType[]>([]);
  const [realtimeEvents, setRealtimeEvents] = useState<any[]>([]); // Change to any[] or define a new type if needed
  const [expandedEvents, setExpandedEvents] = useState<{
    [key: string]: boolean;
  }>({});
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // Add state variables for selected category and profile
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [userProfiles, setUserProfiles] = useState<BaseProfile[]>([]); // State for user profiles

  // Declare 'filteredProfiles' state
  const [filteredProfiles, setFilteredProfiles] = useState<BaseProfile[]>([]);

  // Fetch user-created profiles
  useEffect(() => {
    console.log('Fetching user profiles');
    const fetchUserProfiles = async () => {
      try {
        // First check if user is authenticated
        if (!auth.currentUser) {
          console.log('No authenticated user');
          setUserProfiles([]);
          return;
        }

        const profilesCollection = collection(firestore, 'profiles');
        // Remove the where clause to fetch all profiles since we updated the rules
        const querySnapshot = await getDocs(profilesCollection);
        
        const profiles: BaseProfile[] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<BaseProfile, 'id'>),
        }));
        
        console.log('Fetched profiles:', profiles);
        setUserProfiles(profiles);
      } catch (error) {
        console.error('Error fetching profiles:', error);
        toast({
          title: "Error",
          description: "Failed to load profiles. Please try again later.",
          variant: "destructive",
        });
      }
    };

    // Only fetch if user is logged in
    if (isLoggedIn) {
      fetchUserProfiles();
    } else {
      setUserProfiles([]);
    }
  }, [isLoggedIn]); // Remove toast from dependencies since it's stable

  // Combine predefined and user-created profiles
  const allProfiles = useMemo(() => {
    return [
      ...predefinedProfiles,
      ...userProfiles,
    ];
  }, [predefinedProfiles, userProfiles]);

  // Extract unique categories from profiles, including user profiles
  const categories = useMemo(() => {
    const allCategories = allProfiles.map(profile => profile.category);
    return Array.from(new Set(allCategories));
  }, [allProfiles]);

  // Update 'filteredProfiles' when 'selectedCategory' or 'allProfiles' changes
  useEffect(() => {
    console.log('Updating filtered profiles', { selectedCategory, profilesCount: allProfiles.length });
    if (selectedCategory) {
      setFilteredProfiles(allProfiles.filter(profile => profile.category === selectedCategory));
    } else {
      setFilteredProfiles([]);
    }
  }, [selectedCategory, allProfiles]);

  /**
   * Utility for formatting the timing of logs
   */
  const formatTime = useCallback((timestamp: string) => {
    const startTime = startTimeRef.current;
    const t0 = new Date(startTime).valueOf();
    const t1 = new Date(timestamp).valueOf();
    const delta = t1 - t0;
    const hs = Math.floor(delta / 10) % 100;
    const s = Math.floor(delta / 1000) % 60;
    const m = Math.floor(delta / 60_000) % 60;
    const pad = (n: number) => {
      let s = n + '';
      while (s.length < 2) {
        s = '0' + s;
      }
      return s;
    };
    return `${pad(m)}:${pad(s)}.${pad(hs)}`;
  }, []);

  /**
   * Connect to conversation:
   * WavRecorder taks speech input, WavStreamPlayer output, client is API client
   */
  const connectConversation = useCallback(async () => {
    console.log('Connecting conversation');
    const client = clientRef.current;
    try {
      // Connect to realtime API
      await client.connect();
      console.log('Connected successfully');
      // Set state variables
      startTimeRef.current = new Date().toISOString();
      setIsConnected(true);
      setRealtimeEvents([]);
      setItems(client.conversation.getItems());

      // Connect to microphone
      await wavRecorderRef.current.begin();

      // Connect to audio output
      await wavStreamPlayerRef.current.connect();

      // Instead of sending a user message, we'll trigger the AI to start the conversation
      client.createResponse();

      if (client.getTurnDetectionType() === 'server_vad') {
        await wavRecorderRef.current.record((data) => client.appendInputAudio(data.mono));
      }
    } catch (error) {
      console.error('Error connecting to conversation:', error);
      // Handle the error (e.g., show an error message to the user)
    }
  }, []);

  // Add these functions before the disconnectConversation function
  const saveScore = async (result: ScoringResult) => {
    if (!user || !selectedProfile) return;

    try {
      const scoreRef = doc(firestore, 'scores', `${user.uid}_${selectedProfile.id}`);
      await setDoc(scoreRef, {
        score: result.score,
        timestamp: serverTimestamp(),
      });
      console.log('Score saved successfully');
    } catch (error) {
      console.error('Error saving score:', error);
    }
  };

  const saveConversation = async (transcript: string, score: ScoringResult) => {
    if (!user || !selectedProfile) return;

    try {
      const chatData = {
        userId: user.uid,
        username: user.displayName || 'Anonymous',
        profileId: selectedProfile.id,
        name: selectedProfile.name,
        description: selectedProfile.description,
        category: selectedProfile.category,
        imageUrl: selectedProfile.imageUrl,
        transcript: transcript,
        score: score.score,
        feedback: score.feedback,
        areasForImprovement: score.areasForImprovement,
        timestamp: serverTimestamp(),
      };

      console.log('Saving chat data:', chatData);
      const docRef = await addDoc(collection(firestore, 'chats'), chatData);
      console.log('Conversation saved successfully with ID:', docRef.id);
    } catch (error) {
      console.error('Error saving conversation:', error);
      throw error;
    }
  };

  // Now the disconnectConversation function can use these functions
  const disconnectConversation = useCallback(async () => {
    console.log('Disconnecting conversation');
    setIsConnected(false);
    setRealtimeEvents([]);

    const client = clientRef.current;
    client.disconnect();

    const wavRecorder = wavRecorderRef.current;
    await wavRecorder.end();

    const wavStreamPlayer = wavStreamPlayerRef.current;
    await wavStreamPlayer.interrupt();

    // Automatically trigger scoring when disconnecting
    if (selectedProfile && items.length > 0) {
      setIsScoring(true);
      try {
        const conversationText = items
          .map(item => `${item.role}: ${item.formatted.text || item.formatted.transcript}`)
          .join('\n');
        
        const result = await scoreConversation(selectedProfile, conversationText);
        setScore(result);
        
        // Save the score and conversation
        await saveScore(result);
        await saveConversation(conversationText, result);
      } catch (error) {
        console.error("Error scoring conversation:", error);
      } finally {
        setIsScoring(false);
      }
    }

    setItems([]);
  }, [selectedProfile, items, user]);

  const deleteConversationItem = useCallback(async (id: string) => {
    const client = clientRef.current;
    client.deleteItem(id);
  }, []);

  /**
   * In push-to-talk mode, start recording
   * .appendInputAudio() for each sample
   */
  async function startRecording() {
    setIsRecording(true);
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;
    const trackSampleOffset = await wavStreamPlayer.interrupt();
    if (trackSampleOffset?.trackId) {
        const { trackId, offset } = trackSampleOffset;
        await client.cancelResponse(trackId, offset);
    }
    try {
        // Ensure the recording session is started
        if (!wavRecorder.isInitialized()) {
            await wavRecorder.begin();
        }
        await wavRecorder.record((data) => client.appendInputAudio(data.mono));
    } catch (error) {
        console.error('Error starting recording:', error);
        setIsRecording(false);
    }
  }

  /**
   * In push-to-talk mode, stop recording
   */
  async function stopRecording() {
    setIsRecording(false);
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    try {
        await wavRecorder.pause();
        client.createResponse();
    } catch (error) {
        console.error('Error stopping recording:', error);
    }
  }

  /**
   * Switch between Manual <> VAD mode for communication
   */
  const changeTurnEndType = async (value: string) => {
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;

    if (value === 'none' && wavRecorder.getStatus() === 'recording') {
      await wavRecorder.pause();
    }

    client.updateSession({
      turn_detection: value === 'none' ? null : { type: 'server_vad' },
    });

    if (value === 'server_vad' && client.isConnected()) {
      // Ensure the recording session is started
      if (!wavRecorder.isInitialized()) {
        await wavRecorder.begin();
      }
      await wavRecorder.record((data) => client.appendInputAudio(data.mono));
    }

    setCanPushToTalk(value === 'none');
  };

  /**
   * Auto-scroll the event logs
   */
  useEffect(() => {
    if (eventsScrollRef.current) {
      const eventsEl = eventsScrollRef.current;
      const scrollHeight = eventsEl.scrollHeight;
      // Only scroll if height has just changed
      if (scrollHeight !== eventsScrollHeightRef.current) {
        eventsEl.scrollTop = scrollHeight;
        eventsScrollHeightRef.current = scrollHeight;
      }
    }
  }, [realtimeEvents]);

  /**
   * Auto-scroll the conversation logs
   */
  useEffect(() => {
    const conversationEls = [].slice.call(
      document.body.querySelectorAll('[data-conversation-content]')
    );
    for (const el of conversationEls) {
      const conversationEl = el as HTMLDivElement;
      conversationEl.scrollTop = conversationEl.scrollHeight;
    }
  }, [items]);

  /**
   * Set up render loops for the visualization canvas
   */
  useEffect(() => {
    let isLoaded = true;

    const wavRecorder = wavRecorderRef.current;
    const clientCanvas = clientCanvasRef.current;
    let clientCtx: CanvasRenderingContext2D | null = null;

    const wavStreamPlayer = wavStreamPlayerRef.current;
    const serverCanvas = serverCanvasRef.current;
    let serverCtx: CanvasRenderingContext2D | null = null;

    const render = () => {
      if (isLoaded) {
        if (clientCanvas) {
          if (!clientCanvas.width || !clientCanvas.height) {
            clientCanvas.width = clientCanvas.offsetWidth;
            clientCanvas.height = clientCanvas.offsetHeight;
          }
          clientCtx = clientCtx || clientCanvas.getContext('2d');
          if (clientCtx) {
            clientCtx.clearRect(0, 0, clientCanvas.width, clientCanvas.height);
            const result = wavRecorder.recording
              ? wavRecorder.getFrequencies('voice')
              : { values: new Float32Array([0]) };
            WavRenderer.drawBars(
              clientCanvas,
              clientCtx,
              result.values,
              '#0099ff',
              10,
              0,
              8
            );
          }
        }
        if (serverCanvas) {
          if (!serverCanvas.width || !serverCanvas.height) {
            serverCanvas.width = serverCanvas.offsetWidth;
            serverCanvas.height = serverCanvas.offsetHeight;
          }
          serverCtx = serverCtx || serverCanvas.getContext('2d');
          if (serverCtx) {
            serverCtx.clearRect(0, 0, serverCanvas.width, serverCanvas.height);
            const result = wavStreamPlayer.analyser
              ? wavStreamPlayer.getFrequencies('voice')
              : { values: new Float32Array([0]) };
            WavRenderer.drawBars(
              serverCanvas,
              serverCtx,
              result.values,
              '#009900',
              10,
              0,
              8
            );
          }
        }
        window.requestAnimationFrame(render);
      }
    };
    render();

    return () => {
      isLoaded = false;
    };
  }, []);

  /**
   * Core RealtimeClient and audio capture setup
   * Set all of our instructions, tools, events and more
   */
  useEffect(() => {
    // Get refs
    const wavStreamPlayer = wavStreamPlayerRef.current;
    const client = clientRef.current;

    // Set instructions
    client.updateSession({ instructions: selectedProfile?.instructions || '' });
    // Set transcription, otherwise we don't get user transcriptions back
    client.updateSession({ input_audio_transcription: { model: 'whisper-1' } });

    // handle realtime events from client + server for event logging
    client.on('realtime.event', (realtimeEvent: any) => { // Change to any
      setRealtimeEvents((realtimeEvents) => {
        const lastEvent = realtimeEvents[realtimeEvents.length - 1];
        if (lastEvent?.event.type === realtimeEvent.event.type) {
          // if we receive multiple events in a row, aggregate them for display purposes
          lastEvent.count = (lastEvent.count || 0) + 1;
          return realtimeEvents.slice(0, -1).concat(lastEvent);
        } else {
          return realtimeEvents.concat(realtimeEvent);
        }
      });
    });
    client.on('error', (event: any) => console.error(event));
    client.on('conversation.interrupted', async () => {
      const trackSampleOffset = await wavStreamPlayer.interrupt();
      if (trackSampleOffset?.trackId) {
        const { trackId, offset } = trackSampleOffset;
        await client.cancelResponse(trackId, offset);
      }
    });
    client.on('conversation.updated', async ({ item, delta }: any) => {
      const items = client.conversation.getItems();
      if (delta?.audio) {
        wavStreamPlayer.add16BitPCM(delta.audio, item.id);
      }
      if (item.status === 'completed' && item.formatted.audio?.length) {
        const wavFile = await WavRecorder.decode(
          item.formatted.audio,
          24000,
          24000
        );
        item.formatted.file = wavFile;
      }
      setItems(items);
    });

    setItems(client.conversation.getItems());

    return () => {
      // cleanup; resets to defaults
      client.reset();
    };
  }, [selectedProfile]);

  // Update the type definition of conversationScores
  const [conversationScores, setConversationScores] = useState<{ [key: string]: ScoringResult[] }>({});

  // Add this state to control sidebar visibility
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Add this state to track progress for each profile
  const [profileProgress, setProfileProgress] = useState<{ [key: string]: number }>({});

  // Inside the ConsoleContent component, add this state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Add this function to handle closing the AuthModal
  const handleCloseAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  // Update getLatestScore to handle arrays
  const getLatestScore = useCallback(() => {
    if (!selectedProfile) return null;
    const profileScores = conversationScores[selectedProfile.id];
    return profileScores && profileScores.length > 0
      ? profileScores[profileScores.length - 1]
      : null;
  }, [selectedProfile, conversationScores]);

  // Add this state to track progress
  const [progress, setProgress] = useState(0);

  // Add this state to track progress for each category
  const [categoryProgress, setCategoryProgress] = useState<{ [key: string]: number }>({});

  const [showProfiles, setShowProfiles] = useState(false);

  // Add this state to track if we're on the main screen
  const [isMainScreen, setIsMainScreen] = useState(true);

  // Add this new state to track whether categories should be shown
  const [showCategories, setShowCategories] = useState(true);

  // Modify the handleCategoryClick function
  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
    setShowProfiles(true);
    setShowCategories(false); // Hide categories after selection
    setIsMainScreen(false);
    console.log(`Selected category: ${category}`);
  };

  // Add a function to go back to categories
  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setShowProfiles(false);
    setShowCategories(true);
    setIsMainScreen(true);
  };

  const [useVAD, setUseVAD] = useState<boolean>(false);
  const [canPushToTalk, setCanPushToTalk] = useState<boolean>(true);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const [score, setScore] = useState<ScoringResult | null>(null);
  const [isScoring, setIsScoring] = useState(false); // Add this line

  const triggerScoring = async () => {
    console.log('Triggering conversation scoring');
    if (!selectedProfile || items.length === 0) {
      console.log(
        "Conversation is empty or no profile selected, not triggering scoring"
      );
      return;
    }
    setIsScoring(true); // Set isScoring to true when starting
    console.log("Triggering scoring...");
    const conversationText = items
      .map(
        (item) =>
          `${item.role}: ${item.formatted.text || item.formatted.transcript}`
      )
      .join("\n");
    try {
      const result = await scoreConversation(selectedProfile, conversationText);
      console.log("Scoring result:", result);
      setScore(result);
      // Update conversationScores with the new result
      setConversationScores(prevScores => ({
        ...prevScores,
        [selectedProfile.id]: [...(prevScores[selectedProfile.id] || []), result]
      }));
      setIsSidebarOpen(true);
      await saveScore(result); // Save the score if needed
      await saveConversation(conversationText, result); // Save the entire conversation
    } catch (error) {
      console.error("Error scoring conversation:", error);
    } finally {
      setIsScoring(false); // Set isScoring back to false when done
    }
  };

  // Update the categoryButtons rendering
  const categoryButtons = categories.map((category) => (
    <button
      key={category}
      className="bg-gray-100 rounded-lg p-4 flex items-start space-x-4 hover:bg-gray-200 transition-all duration-200 ease-in-out hover:transform hover:translate-y-[-4px] hover:shadow-lg w-full"
      onClick={() => handleCategoryClick(category)}
    >
      <Image
        src={`/categories/${category.toLowerCase()}.png`}
        alt={category}
        width={80}
        height={80}
        className="rounded-md object-cover"
      />
      <div className="flex flex-col items-start">
        <h3 className="font-semibold text-lg">{getCategoryName(category)}</h3>
        <p className="text-sm mt-1">{getCategoryDescription(category)}</p>
      </div>
    </button>
  ));

  // Update the profileButtons rendering
  interface ExtendedProfile extends BaseProfile {
    description: string;
  }

  const profileButtons = filteredProfiles.map((profile: ExtendedProfile) => (
    <button
      key={profile.id}
      className="bg-gray-100 rounded-lg p-4 flex items-start space-x-4 hover:bg-gray-200 transition-all duration-200 ease-in-out hover:transform hover:translate-y-[-4px] hover:shadow-lg w-full"
      onClick={() => onProfileSelect(profile)}
    >
      <Image
        src={profile.imageUrl || `/profiles/${profile.id.toLowerCase()}.png`}
        alt={profile.name}
        width={80}
        height={80}
        className="rounded-md object-cover"
      />
      <div className="flex flex-col items-start">
        <h3 className="font-semibold text-lg">{profile.name}</h3>
        <p className="text-sm mt-1">{profile.description}</p>
      </div>
    </button>
  ));

  /**
   * Render the application
   */
  const resetConsoleState = useCallback(() => {
    setIsMainScreen(true);
    setItems([]);
    setRealtimeEvents([]);
    setIsConnected(false);
    setShowCategories(true);
    setShowProfiles(false);
    onProfileSelect(null); // Reset the selected profile
  }, [onProfileSelect]);

  useEffect(() => {
    if (resetParam === 'true') {
      console.log('Resetting console state');
      resetConsoleState();
      router.replace('/'); // Remove the reset parameter from the URL
    }
  }, [resetParam, resetConsoleState, router]);

  const handleHomeClick = () => {
    resetConsoleState();
    router.push('/');
  };

  // Add this useEffect to handle profile selection from URL
  useEffect(() => {
    const fetchProfile = async () => {
      if (profileId) {
        try {
          // First check predefined profiles
          const predefinedProfile = predefinedProfiles.find(p => p.id === profileId);
          if (predefinedProfile) {
            console.log('Found predefined profile:', predefinedProfile.name);
            onProfileSelect(predefinedProfile);
            return;
          }

          // If not found in predefined profiles, check Firestore
          if (!auth.currentUser) {
            console.log('No authenticated user');
            return;
          }

          const profileDoc = doc(firestore, 'profiles', profileId);
          const profileSnapshot = await getDoc(profileDoc);
          
          if (profileSnapshot.exists()) {
            const profileData = {
              id: profileSnapshot.id,
              ...(profileSnapshot.data() as Omit<BaseProfile, 'id'>),
            };
            console.log('Found Firestore profile:', profileData.name);
            onProfileSelect(profileData);
          } else {
            console.error('Profile not found');
            toast({
              title: "Error",
              description: "Profile not found",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
          toast({
            title: "Error",
            description: "Failed to load profile. Please try again later.",
            variant: "destructive",
          });
        }
      }
    };

    fetchProfile();
  }, [profileId, predefinedProfiles]); // Add predefinedProfiles to dependencies

  // Add this to handle URL-based profile selection separately
  useEffect(() => {
    const handleUrlProfileId = async () => {
      if (profileId && !selectedProfile) {
        try {
          // First check predefined profiles
          const predefinedProfile = predefinedProfiles.find(p => p.id === profileId);
          if (predefinedProfile) {
            console.log('Found predefined profile:', predefinedProfile.name);
            onProfileSelect(predefinedProfile);
            return;
          }

          // If not found in predefined profiles, check Firestore
          if (!auth.currentUser) {
            console.log('No authenticated user');
            return;
          }

          const profileDoc = doc(firestore, 'profiles', profileId);
          const profileSnapshot = await getDoc(profileDoc);
          
          if (profileSnapshot.exists()) {
            const profileData = {
              id: profileSnapshot.id,
              ...(profileSnapshot.data() as Omit<BaseProfile, 'id'>),
            };
            console.log('Found Firestore profile:', profileData.name);
            onProfileSelect(profileData);
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
          toast({
            title: "Error",
            description: "Failed to load profile",
            variant: "destructive",
          });
        }
      }
    };

    handleUrlProfileId();
  }, [profileId]);

  interface ConversationItemProps {
    message: ItemType;
    onDelete?: (id: string) => void;
  }

  const ConversationItem: React.FC<ConversationItemProps> = ({ message, onDelete }) => {
    const isUser = message.role === 'user';
    const avatarLetter = isUser ? 'U' : 'A';

    return (
      <div className={`flex ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-4`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isUser ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'} ${isUser ? 'ml-2' : 'mr-2'}`}>
          {avatarLetter}
        </div>
        <div className={`max-w-[75%] ${isUser ? 'bg-blue-100' : 'bg-green-100'} rounded-lg p-3`}>
          <div className="mt-1">
            {message.formatted.text || message.formatted.transcript || '(awaiting response)'}
          </div>
        </div>
        {onDelete && (
          <button className={`${isUser ? 'mr-2' : 'ml-2'} text-gray-500 hover:text-gray-700`} onClick={() => onDelete(message.id)}>
            <X size={16} />
          </button>
        )}
      </div>
    );
  };

  const handleStartConversation = () => {
    if (isLoggedIn) {
      connectConversation();
    } else {
      onLoginClick();
    }
  };

  // Move handleVADChange inside the component
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
      if (isEnabled && isConnected) {
        // Ensure the recording session is started
        if (!wavRecorder.isInitialized()) {
          await wavRecorder.begin();
        }

        await wavRecorder.record((data: any) => {
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

  // Move useEffect inside the component
  useEffect(() => {
    if (isConnected && useVAD) {
      const startVADRecording = async () => {
        const wavRecorder = wavRecorderRef.current;
        const client = clientRef.current;

        if (!wavRecorder || !client) return;

        try {
          // Ensure the recording session is started
          if (!wavRecorder.isInitialized()) {
            await wavRecorder.begin();
          }

          await wavRecorder.record((data: any) => client.appendInputAudio(data.mono));
          console.log('VAD recording started');
        } catch (error) {
          console.error('Error starting VAD recording:', error);
          setVoiceError('Failed to start automatic recording. Please try again.');
        }
      };

      startVADRecording();
    }
  }, [isConnected, useVAD]);

  // Remove handleVADChange and useEffect from here (they should be inside the component)

  // Remove the flex container that included the Sidebar
  return (
    <div className="h-full overflow-y-auto p-4">
      {/* Only show HeroSection when no profile is selected and categories are visible */}
      {!selectedProfile && showCategories && <HeroSection />}

      {!selectedProfile && (
        <div className="w-full">
          {showCategories && (
            <div className="container mx-auto p-4">
              <h2 className="text-3xl font-bold mb-4 text-center">Choose a Category</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {categoryButtons}
              </div>
            </div>
          )}

          {showProfiles && (
            <div className="container mx-auto p-4">
              <h3 className="text-2xl font-bold mb-4 text-center">
                Select a Profile for {selectedCategory}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {profileButtons}
              </div>
              <Button
                onClick={handleBackToCategories}
                className="mt-8 mx-auto block"
              >
                Back to Categories
              </Button>
            </div>
          )}
        </div>
      )}

      {selectedProfile && isLoggedIn && (
        <div className="flex flex-col h-full">
          <div className="flex-grow flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-2xl font-bold">{selectedProfile.name}</h2>
              <button
                className="p-2 bg-gray-200 rounded-full"
                onClick={() => {
                  console.log('Profile sidebar toggled');
                  setIsSidebarOpen(!isSidebarOpen);
                }}
              >
                {isSidebarOpen ? <X size={24} /> : <MoreHorizontal size={24} />}
              </button>
            </div>

            {/* Update the conversation area for mobile */}
            <div className={`flex-grow overflow-y-auto p-4 ${isSidebarOpen ? 'mr-80' : ''}`}>
              {items.map((conversationItem, i) => (
                <ConversationItem
                  key={conversationItem.id}
                  message={conversationItem}
                  onDelete={deleteConversationItem}
                />
              ))}
            </div>

            {/* Update the input area for mobile */}
            <div className={`border-t p-4 ${isSidebarOpen ? 'mr-80' : ''}`}>
              <div className="flex flex-col space-y-2">
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={isConnected ? disconnectConversation : handleStartConversation}
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
                    onMouseLeave={stopRecording} // Also stop if mouse leaves button while holding
                    onTouchStart={(e) => {
                      e.preventDefault(); // Prevent mouse events from firing
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
          </div>
          <ProfileSidebar
            profile={selectedProfile}
            score={score}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            onOpen={() => setIsSidebarOpen(true)}
            isGeneratingScore={isScoring}
          />
        </div>
      )}

      <AuthModal isOpen={isAuthModalOpen} onClose={handleCloseAuthModal} />
    </div>
  );
};

export default ConsoleContent;

// Add these helper functions at the end of the file
function getCategoryName(category: string): string {
  const names: { [key: string]: string } = {
    'SmallTalk': 'Small Talk',
    'SalesPitch': 'Sales Pitch',
    'PublicSpeaking': 'Public Speaking',
    'Negotiation': 'Negotiation',
    'Dating': 'Dating',
    'CustomerService': 'Customer Service',
    'Debate': 'Debate',
    'Interview': 'Interview'
  };
  return names[category] || category;
}

function getCategoryDescription(category: string): string {
  const descriptions: { [key: string]: string } = {
    'SmallTalk': 'Casual conversation',
    'SalesPitch': 'Persuasive pitching',
    'PublicSpeaking': 'Engaging audiences',
    'Negotiation': 'Win-win outcomes',
    'Dating': 'Romantic interaction',
    'CustomerService': 'Client satisfaction',
    'Debate': 'Structured arguments',
    'Interview': 'Job seeking skills'
  };
  return descriptions[category] || '';
}
