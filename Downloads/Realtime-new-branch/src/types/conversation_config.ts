import { Profile, VoiceType } from './types'; // Ensure both Profile and VoiceType are imported

import { 
  delayedDeliveryProfile,
  faultyProductProfile,
  billingIssueProfile,
  poorServiceExperienceProfile,
  websiteTechnicalProblemProfile,
  refundRequestProfile,
} from './customerServiceProfile';

import { datingProfiles } from './datingProfiles';
// Correctly import individual debate profiles
import { 
  capitalismProfile,
  socialismProfile,
} from './debateProfiles'; // Ensure these are the correct exports

import { interviewProfiles } from './interviewProfiles';
import { negotiationProfile } from './negotiationProfiles';
import { publicSpeakingProfile } from './publicSpeakingProfiles';
import { salesProfiles } from './salesProfiles';
import { smallTalkProfile } from './smallTalkProfiles';


export const profiles: Profile[] = [
  delayedDeliveryProfile,
  faultyProductProfile,
  billingIssueProfile,
  poorServiceExperienceProfile,
  websiteTechnicalProblemProfile,
  refundRequestProfile,
  ...datingProfiles, 
  capitalismProfile,
  socialismProfile,
  ...Object.values(interviewProfiles),
  negotiationProfile,
  publicSpeakingProfile,
  ...salesProfiles,
  smallTalkProfile,
];

export const conversationConfig = {
  maxParticipants: 10,
  defaultLanguage: 'en',
  enableLogging: true,
  // ...other configuration settings
};