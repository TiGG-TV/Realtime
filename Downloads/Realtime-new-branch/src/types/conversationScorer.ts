import { Profile } from './types';
import OpenAI from 'openai';

function initializeOpenAIClient() {
  const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('OpenAI API key is not set in the environment variables.');
    return null;
  }

  try {
    return new OpenAI({ 
      apiKey,
      dangerouslyAllowBrowser: true // Add this line
    });
  } catch (error) {
    console.error('Failed to initialize OpenAI client:', error);
    return null;
  }
}

// Usage
const openai = initializeOpenAIClient();
if (!openai) {
  console.error('OpenAI client initialization failed. Check your API key and try again.');
}

export interface ScoringResult {
  score: number;
  feedback: string[];
  areasForImprovement: string[];
  profile: string;
  timestamp: string;
}

export async function scoreConversation(profile: Profile, conversation: string): Promise<ScoringResult> {
  if (!openai) {
    console.error("OpenAI client not initialized. Please check your API key configuration.");
    throw new Error("OpenAI client not initialized");
  }

  const prompt = generatePrompt(profile, conversation);
  
  try {
    console.log("Sending request to OpenAI API...");
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1000,
    });

    console.log("Received response from OpenAI API");
    const content = response.choices[0].message.content;
    if (!content) {
      console.error("Received empty content from OpenAI API");
      throw new Error("Empty response from OpenAI API");
    }

    console.log("Parsing AI response...");
    const result = parseAIResponse(content);
    console.log("Parsed result:", result);

    return {
      ...result,
      profile: profile.name,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    throw error;
  }
}

function generatePrompt(profile: Profile, conversation: string): string {
  const criteriaPrompt = getCriteriaPrompt(profile.category);
  return `
    Analyze the following conversation for a ${profile.category} scenario. 
    ${criteriaPrompt}
    Be a thorough, critical, but kind scorer, providing detailed and constructive feedback on the user's performance.
    Focus on scoring the user's responses and how they interact with the assistant.

    Scoring Guidelines:
    - Use the full range of scores from 0 to 100, but be fair in your assessment.
    - A score of 0 should be given for extremely poor performance that fails to meet any criteria.
    - Scores above 80 should be reserved for exceptional performance.
    - A score of 100 should represent outstanding performance in all aspects.
    - Be critical but compassionate, offering constructive feedback for improvement.
    - Pay special attention to the length and quality of the user's responses:
      * One-word or very short responses should result in lower scores (e.g., 10-20 range).
      * Single sentence responses should generally result in moderate scores (e.g., 20-40 range) unless exceptionally relevant and insightful.
      * Ideal responses should be multiple sentences, demonstrating deep engagement and insight.
    - Consider the overall length of the conversation:
      * Very short conversations (e.g., less than 5 exchanges) should result in lower scores.
      * Longer conversations with sustained, high-quality engagement should be necessary for scores above 60.

    Conversation:
    ${conversation}

    Provide your analysis of the user's performance in the following format:
    Overall Score: [overall score out of 100]

    Detailed Scoring:
    [Criterion 1 Name] ([Weight]%): [Score for this criterion]
    Explanation: [Brief explanation of the score, highlighting areas for improvement and strengths]

    [Criterion 2 Name] ([Weight]%): [Score for this criterion]
    Explanation: [Brief explanation of the score, highlighting areas for improvement and strengths]

    ... [Continue for all criteria]

    Response Quality and Conversation Length:
    Score: [Score for this aspect]
    Explanation: [Brief explanation of how the length and quality of responses affected the score]

    Overall Feedback:
    - You should work on [key area 1 for improvement], as this will significantly enhance your performance.
    - It would be beneficial for you to focus on [key area 2 for improvement] to strengthen your skills.
    - Consider improving [key area 3 for improvement] to make your interactions more effective.

    Areas for Improvement:
    - To enhance [specific skill 1], you could try [actionable suggestion 1].
    - For better [specific skill 2], practice [actionable suggestion 2].
    - To improve your [specific skill 3], consider [actionable suggestion 3].

    Remember, improvement is a journey, and each conversation is an opportunity to grow. Keep practicing and applying these suggestions!
  `;
}

function getCriteriaPrompt(category: string): string {
  const baseInstructions = `
    Focus on scoring the user's responses and how they interact with the assistant.
    Evaluate the user's performance based on their responses and how well they engage with and utilize the assistant's input.
    Provide a weighted score for each criterion, ensuring the total adds up to 100%.
    For each criterion, provide a brief explanation of why you assigned that score.
  `;

  const criteria: { [key: string]: string } = {
    Dating: `
      ${baseInstructions}
      Score based on the following criteria (total 100%):
      - Emotional Intelligence and Active Listening (30%): Assess how well the user picks up on emotional cues and responds empathetically.
      - Conversational Dynamism and Engagement (25%): Evaluate the user's ability to keep the conversation flowing and interesting.
      - Authenticity and Self-Expression (20%): Judge how genuine and open the user appears in their responses.
      - Wit and Humor Appropriateness (15%): Assess the user's ability to use humor effectively and appropriately.
      - Respect and Boundary Awareness (10%): Evaluate how well the user respects boundaries and shows consideration.
    `,
    Interview: `
      ${baseInstructions}
      Score based on the following criteria (total 100%):
      - Response Relevance and Concision (30%): Assess how well the user's answers directly address questions and remain concise.
      - Experience Articulation (25%): Evaluate the user's ability to clearly communicate their relevant experiences.
      - Professional Communication (20%): Judge the user's language, tone, and overall professionalism.
      - Strategic Question Formulation (15%): Assess the quality and relevance of questions the user asks about the role or company.
      - Overall Interview Navigation (10%): Evaluate how well the user guides the conversation and handles unexpected topics.
    `,
    PublicSpeaking: `
      ${baseInstructions}
      Score based on the following criteria (total 100%):
      - Content Structure and Clarity (30%): Assess the logical flow and understandability of the user's speech.
      - Audience Engagement Techniques (25%): Evaluate the user's methods to capture and maintain audience interest.
      - Vocal Variety and Pacing (20%): Judge the user's use of tone, pitch, and speed to enhance their message.
      - Argument Coherence and Flow (15%): Assess how well the user's points connect and support their overall message.
      - Opening and Closing Impact (10%): Evaluate the effectiveness of the user's introduction and conclusion.
    `,
    LanguagePractice: `
      ${baseInstructions}
      Score based on the following criteria (total 100%):
      - Grammatical Accuracy (30%): Assess the correctness of the user's grammar and sentence structure.
      - Vocabulary Usage and Range (25%): Evaluate the breadth and appropriateness of the user's vocabulary.
      - Pronunciation and Accent (20%): Judge the clarity and accuracy of the user's pronunciation.
      - Fluency and Natural Flow (15%): Assess how smoothly and naturally the user communicates.
      - Idiomatic and Cultural Aptitude (10%): Evaluate the user's use of idioms and cultural references.
    `,
    SalesPitch: `
      ${baseInstructions}
      Score based on the following criteria (total 100%):
      - Benefit Articulation (30%): Assess how well the user communicates the value proposition to the customer.
      - Need Identification and Addressing (25%): Evaluate the user's ability to uncover and address customer needs.
      - Persuasive Delivery (20%): Judge the user's overall persuasiveness and conviction in their pitch.
      - Objection Handling (15%): Assess how effectively the user addresses and overcomes customer objections.
      - Closing Effectiveness (10%): Evaluate the user's ability to guide the conversation towards a sale or next steps.
    `,
    SmallTalk: `
      ${baseInstructions}
      Score based on the following criteria (total 100%):
      - Conversation Initiation and Maintenance (30%): Assess the user's ability to start and sustain engaging small talk.
      - Active Interest Demonstration (25%): Evaluate how well the user shows genuine interest in the conversation topics.
      - Topic Selection and Transitioning (20%): Judge the user's skill in choosing appropriate topics and smoothly changing subjects.
      - Conversational Balance (15%): Assess the user's ability to maintain a give-and-take in the conversation.
      - Tonal Appropriateness (10%): Evaluate the user's ability to match the tone and mood of the conversation.
    `,
    Negotiation: `
      ${baseInstructions}
      Score based on the following criteria (total 100%):
      - Objective Clarity and Communication (30%): Assess how clearly the user states and pursues their goals.
      - Solution Creativity and Compromise (25%): Evaluate the user's ability to propose creative solutions and find middle ground.
      - Active Listening and Comprehension (20%): Judge how well the user understands and responds to the other party's needs.
      - Emotional Regulation and Composure (15%): Assess the user's ability to remain calm and professional under pressure.
      - Persuasion Technique Application (10%): Evaluate the user's use of various persuasion techniques in the negotiation.
    `,
    CustomerService: `
      ${baseInstructions}
      Score based on the following criteria (total 100%):
      - Empathy and Understanding (30%): Assess how well the user relates to and understands the customer's concerns.
      - Solution Communication (25%): Evaluate the user's ability to clearly explain solutions or next steps.
      - Issue Resolution Efficiency (20%): Judge how quickly and effectively the user works towards resolving the issue.
      - Patience and Positive Attitude (15%): Assess the user's ability to maintain a helpful and positive demeanor throughout.
      - Policy and Procedure Adherence (10%): Evaluate how well the user follows company guidelines while assisting the customer.
    `,
    Debate: `
      ${baseInstructions}
      Score based on the following criteria (total 100%):
      - Argument Strength and Logic (30%): Evaluate the clarity, coherence, and logical consistency of the user's arguments.
      - Evidence and Examples (25%): Assess the quality and relevance of evidence or examples provided to support arguments.
      - Rebuttal Effectiveness (20%): Judge how well the user addresses and counters opposing viewpoints presented by the assistant.
      - Persuasive Techniques (15%): Consider the use of rhetorical devices, emotional appeals, and other persuasive strategies.
      - Debate Etiquette and Composure (10%): Evaluate the user's adherence to debate norms, respect for opposing views, and emotional control.
    `,
  };

  return criteria[category] || `${baseInstructions}\nScore based on overall performance, considering how the user interacts with and responds to the assistant.`;
}

function parseAIResponse(response: string): ScoringResult {
  console.log("Raw AI response:", response);
  const lines = response.split('\n');
  let score = 0;
  const feedback: string[] = [];
  const areasForImprovement: string[] = [];

  let currentSection = '';

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith('Overall Score:')) {
      score = parseInt(trimmedLine.split(':')[1].trim()) || 0;
    } else if (trimmedLine === 'Overall Feedback:') {
      currentSection = 'feedback';
    } else if (trimmedLine === 'Areas for Improvement:') {
      currentSection = 'improvement';
    } else if (trimmedLine.startsWith('-') && currentSection) {
      const point = trimmedLine.substring(1).trim();
      if (currentSection === 'feedback') {
        feedback.push(point);
      } else if (currentSection === 'improvement') {
        areasForImprovement.push(point);
      }
    }
  }

  console.log("Parsed score:", score);
  console.log("Parsed feedback:", feedback);
  console.log("Parsed areas for improvement:", areasForImprovement);

  // If no feedback or areas for improvement were parsed, add default messages
  if (feedback.length === 0) {
    feedback.push("The conversation was too short to provide detailed feedback.");
  }
  if (areasForImprovement.length === 0) {
    areasForImprovement.push("Engage in a longer conversation to receive specific improvement suggestions.");
  }

  // Adjust the score to be harsher
  if (score > 80) {
    score = Math.floor(score * 0.8); // Reduce high scores by 20%
  } else if (score > 60) {
    score = Math.floor(score * 0.9); // Reduce scores above 60 by 10%
  }

  return { 
    score, 
    feedback, 
    areasForImprovement,
    profile: '',
    timestamp: new Date().toISOString()
  };
}
