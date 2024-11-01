import { smallTalkProfiles } from './smallTalkProfiles';
import { salesProfiles } from './salesProfiles';
import { publicSpeakingProfiles } from './publicSpeakingProfiles';
import { negotiationProfiles } from './negotiationProfiles';
import { datingProfiles } from './datingProfiles';
import { customerServiceProfiles } from './customerServiceProfile';
import { debateProfiles } from './debateProfiles';
import { interviewProfiles } from './interviewProfiles';

const allProfiles = [
  ...smallTalkProfiles,
  ...salesProfiles,
  ...publicSpeakingProfiles,
  ...negotiationProfiles,
  ...datingProfiles,
  ...customerServiceProfiles,
  ...debateProfiles,
  ...interviewProfiles,
];

export { allProfiles };
