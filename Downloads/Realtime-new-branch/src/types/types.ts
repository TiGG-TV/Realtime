import { Timestamp } from 'firebase/firestore';

export enum VoiceType {
  Echo = "echo",     // Default voice
  Alloy = "alloy",   // Neutral, versatile voice
  Shimmer = "shimmer" // Clear, gentle voice
}

type ResponseTime = {
  min: number;
  max: number;
};

export interface Profile {
  id: string;
  userId: string;
  name: string;
  category: string;  // Made required
  instructions: string;  // Added
  scenarioDescription: string;  // Added
  voice: VoiceType;  // Added
  description: string;  // Made required
  imageUrl: string;  // Made required
  createdAt?: Timestamp | null;
  personality: {
    traits: string[];
    quirks: string[];
    speaking_style: string;
    emotional_responses: {
      [key: string]: string[];  // Different responses for different emotions
    };
  };
  conversation_style: {
    response_length: 'short' | 'medium' | 'long';
    formality_level: 'casual' | 'neutral' | 'formal';
    humor_level: 'none' | 'subtle' | 'moderate' | 'high';
    empathy_level: 'low' | 'moderate' | 'high';
  };
  memory: {
    remember_user_details: boolean;
    remember_conversation_context: boolean;
    reference_past_interactions: boolean;
  };
}

// If you need a version with optional fields for creation/updates
export interface PartialProfile extends Partial<Profile> {
  id: string;  // Keep id required
  name: string;  // Keep name required
}
