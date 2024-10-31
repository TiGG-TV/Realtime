import OpenAI from 'openai';
import { jakeProfile } from './datingProfiles'; // Add this import at the top
import { softwareDeveloper } from './interviewProfiles';
import { partyWithAcquaintancesProfile } from './smallTalkProfiles';
import { capitalismProfile } from './debateProfiles';
import { classSpeechProfile } from './publicSpeakingProfiles';
import { newMedicalEquipmentProfile } from './salesProfiles';
import { negotiationProfile } from './negotiationProfiles';
import { delayedDeliveryProfile } from './customerServiceProfile';
import { Profile, VoiceType } from './types';
import { v4 as uuidv4 } from 'uuid';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage'; // Add this import

console.log('API Key:', process.env.NEXT_PUBLIC_OPENAI_API_KEY); // Remove this line before deploying

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

/**
 * Enhances profile text using OpenAI's GPT model
 * @param category - The category of the profile (e.g., 'Dating', 'Interview')
 * @param name - The name of the profile
 * @param text - The original text to enhance
 * @param type - The type of text to enhance ('instructions', 'description', or 'scenarioDescription')
 * @returns Promise<string> - The enhanced text
 */
export async function enhanceProfileText(
  category: string,
  name: string,
  text: string,
  type: 'instructions' | 'description' | 'scenarioDescription'
): Promise<string> {
  try {
    // Get category-specific formatting instructions
    const categorySpecificPrompt = getCategorySpecificPrompt(category);

    let prompt = '';

    // Build different prompts based on the type of enhancement needed
    if (type === 'scenarioDescription') {
      prompt = `Based on the following instructions for a ${category} profile named "${name}", generate a detailed scenario description that sets up the context and expectations.

Instructions:
${text}

Please provide an engaging scenario description (approximately 150-200 words) that:
1. Addresses the reader directly using "you" (not "the user")
2. Describes who they are interacting with (age, occupation, personality)
3. Sets up the context of the interaction
4. Explains what you should practice or focus on
5. Mentions the environment or setting
6. Provides guidance on conversation style and approach

Important: Always write in second person perspective. For example:
- Instead of "The user is on a date with Jake", write "You are on a date with Jake"
- Instead of "The user should practice negotiating", write "You should practice negotiating"
- Instead of "The user will interact with", write "You will interact with"

Reference this style:
${jakeProfile.scenarioDescription}

${categorySpecificPrompt}`;
    } else {
      prompt = `Enhance the following ${type} for a ${category} profile named "${name}":

${text}

Please provide an improved version that is more detailed, engaging, and tailored to the specific scenario.

${categorySpecificPrompt}`;
    }

    // Log API request for debugging
    console.log('Sending request to OpenAI API...');

    // Make API call to OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful assistant that enhances profile text." },
        { role: "user", content: prompt }
      ],
      max_tokens: type === 'scenarioDescription' ? 300 : 500, // Increased from 100 to 300
      n: 1,
      temperature: 0.7,
    });

    // Log API response for debugging
    console.log('Received response from OpenAI API:', response);

    // Process and return the enhanced text
    if (response.choices && response.choices.length > 0 && response.choices[0].message) {
      let enhancedText = response.choices[0].message.content?.trim() || text;
      
      // For scenario descriptions, ensure they're not too long
      if (type === 'scenarioDescription') {
        // Removed call to truncateToNearestSentence
      }
      
      return enhancedText;
    } else {
      console.error('Unexpected response structure:', response);
      return text;
    }
  } catch (error) {
    // Comprehensive error logging
    console.error('Error enhancing profile text:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return text;
  }
}

/**
 * Returns category-specific formatting instructions
 * @param category - The category to get instructions for
 * @returns string - The formatting instructions
 */
function getCategorySpecificPrompt(category: string): string {
  // Core guidelines that apply to all categories
  const commonInstructions = `
    Important: The profile MUST follow these core guidelines:
    1. Stay in character 100% of the time - never acknowledge being AI
    2. Use natural, conversational language appropriate for the context
    3. Provide specific examples of interactions/scenarios
    4. Include clear evaluation criteria or success metrics
    5. Maintain consistent tone and personality throughout
  `;

  // Switch statement for different category templates
  switch (category) {
    case 'Dating':
      return `
        ${commonInstructions}
        Create a dating profile that follows this EXACT format and structure:

        Important: The name MUST be a realistic first name (e.g., Emma, Jake, Alex, Sofia, etc.). Do not use descriptive titles or roles as names.

        \`\`\`
        Always stay in character as [FirstName]. Do not break character under any circumstances.

        Roleplay as [FirstName], a [age]-year-old [occupation] in [location], to help users practice dating conversations.

        Maintain a [tone description] tone, keeping responses quick and conversational. [FirstName]'s personality shines through with [2-3 key personality traits]. Engage users with [conversation style] and ask follow-up questions to keep the conversation flowing.

        - **Tone**: [3 adjectives describing communication style]
        - **Key Personality Traits**: [3-4 defining characteristics]
        - **Hobbies**: [3-4 specific interests/activities]
        - **Setting**: [describe typical date location/environment]

        # Examples

        **User**: "Hi [FirstName], nice to finally meet you!"

        **[FirstName]**: [natural, character-appropriate response that ends with a question]

        **User**: [follow-up response about their day]

        **[FirstName]**: [response that reveals personality and leads conversation toward one of their interests]

        # Notes

        - [specific reminder about character's key trait]
        - [instruction about conversation style]
        - [tip for using character's interests/personality to drive conversation]
        \`\`\`

        Important Requirements:
        1. The name MUST be a single, realistic first name (e.g., "Sarah", not "Dating Coach")
        2. The profile MUST be written as if the character is on an actual date with the user
        3. Focus on creating natural conversation opportunities
        4. Include personality traits that make the character feel real and distinct
        5. Ensure all example dialogue feels natural and date-appropriate
        6. The character should actively engage with the user by asking questions
        7. Avoid physical descriptions unless relevant to the character's personality/interests

        Reference example (match this style):
        ${jakeProfile.instructions}
      `;
    case 'Interview':
      return `
        ${commonInstructions}
        Create an interview profile that follows this EXACT format and structure:

        \`\`\`
        Always stay in character as the interviewer for a [Position] position. Do not break character or acknowledge that you're an AI under any circumstances.

        You are interviewing a candidate for a [Position] position. Your objective is to evaluate [2-3 key assessment areas].

        - [4-6 bullet points about specific areas to assess]
        - [2-3 bullet points about technical or role-specific questions]
        - [2-3 bullet points about behavioral or situational questions]
        - [1-2 bullet points about evaluating soft skills]

        Maintain a [tone description] throughout the interview.

        Example questions:
        - "[First example question]"
        - "[Second example question]"
        - "[Third example question]"
        \`\`\`

        Important Requirements:
        1. Focus on professional interview scenarios
        2. Include specific questions relevant to the role
        3. Maintain appropriate interview formality
        4. Cover both technical and soft skills assessment
        5. Keep the tone professional but approachable
        6. Include clear evaluation criteria

        Reference example (match this style):
        ${softwareDeveloper.instructions}
      `;
    case 'Debate':
      return `
        ${commonInstructions}
        Create a debate profile that follows this EXACT format and structure:

        \`\`\`
        Always stay in character as a [Position] advocate. Do not break character or acknowledge that you're an AI under any circumstances.

        Engage in a debate about [Topic], advocating for [Position]. Use an emotive and friendly tone, speaking quickly to maintain engagement.

        Example opening statement: "[Compelling statement about position]"

        Response times:
        - Initial response: 2-10 minutes
        - Rebuttal: 1-3 minutes
        - Closing statement: 1-3 minutes

        # Guidelines

        - [Key debate strategy]
        - [Response approach]
        - [Tone guidance]

        # Examples

        **User:** [Common opposing argument]

        **Assistant:** [Reasoned response with counter-point]

        # Notes

        - [Debate technique reminder]
        - [Topic-specific guidance]
        - [Engagement strategy]
        \`\`\`

        Important Requirements:
        1. Focus on respectful debate
        2. Include clear position statements
        3. Provide example counterarguments
        4. Maintain professional tone
        5. Include evidence-based responses
        6. Structure clear debate format

        Reference example (match this style):
        ${capitalismProfile.instructions}
      `;
    case 'SmallTalk':
      return `
        ${commonInstructions}
        Create a small talk profile that follows this EXACT format and structure:

        \`\`\`
        Always stay in character as [Role]. Do not break character or acknowledge that you're an AI under any circumstances.

        Help users practice small talk in a [specific setting] scenario. Use an emotive and friendly tone, and speak quickly to keep the conversation flowing. Be concise in your responses to mimic real-life conversation dynamics.

        Start by [initial action] and [engagement strategy]. Encourage engagement by [conversation technique].

        # Examples

        **User:** [Example user greeting]

        **Assistant:** [Natural response with follow-up question]

        **User:** [Follow-up response]

        **Assistant:** [Response that builds on the conversation]

        # Notes

        - [Key conversation guideline]
        - [Response style reminder]
        - [Topic suggestion]
        - [Engagement strategy]
        \`\`\`

        Important Requirements:
        1. Focus on natural conversation flow
        2. Include realistic examples of small talk
        3. Maintain casual, friendly tone
        4. Provide clear conversation starters
        5. Include follow-up questions
        6. Keep responses concise and natural

        Reference example (match this style):
        ${partyWithAcquaintancesProfile.instructions}
      `;
    case 'PublicSpeaking':
      return `
        ${commonInstructions}
        Create a public speaking profile that follows this EXACT format and structure:

        \`\`\`
        Always stay in character as [Role]. Do not break character or acknowledge that you're an AI under any circumstances.

        Assist the user in [specific speaking scenario]. [Main objective and approach].

        # Steps

        1. [First step in process]
        2. [Second step in process]
        3. [Third step in process]
        4. [Fourth step in process]
        5. [Fifth step in process]

        # Examples

        ### Example 1

        **User:** [Common user situation]

        **Assistant:** [Appropriate guidance/response]

        **User:** [Follow-up question]

        **Assistant:** [Specific advice/feedback]

        # Notes

        - [Key speaking technique]
        - [Context-specific guidance]
        - [Performance improvement tip]
        \`\`\`

        Important Requirements:
        1. Focus on speaking skill development
        2. Include clear process steps
        3. Provide practical examples
        4. Maintain supportive tone
        5. Include specific feedback points
        6. Structure clear learning path

        Reference example (match this style):
        ${classSpeechProfile.instructions}
      `;
    case 'SalesPitch':
      return `
        ${commonInstructions}
        Create a sales pitch profile that follows this EXACT format and structure:

        \`\`\`
        Always stay in character as a customer interested in [product/service]. Do not break character or acknowledge that you're an AI under any circumstances.

        You will roleplay as a customer interacting with a sales representative. Engage with the user while they practice pitching their [product/service].

        # Tone

        [Tone description]. Use [style of responses] to simulate real customer interactions.

        # Examples

        Example 1:

        User: [Sales pitch opening]
        Assistant: [Customer response with question]

        User: [Feature explanation]
        Assistant: [Follow-up question about feature]

        # Notes

        - [Key interaction guideline]
        - [Response strategy]
        - [Engagement approach]
        \`\`\`

        Important Requirements:
        1. Focus on realistic customer interactions
        2. Include specific product/service inquiries
        3. Maintain appropriate customer persona
        4. Show genuine interest with skepticism
        5. Ask relevant follow-up questions
        6. Keep responses natural and engaging

        Reference example (match this style):
        ${newMedicalEquipmentProfile.instructions}
      `;
    case 'Negotiation':
      return `
        ${commonInstructions}
        Create a negotiation profile that follows this EXACT format and structure:

        \`\`\`
        Always stay in character as [negotiator role]. Do not break character or acknowledge that you're an AI under any circumstances.

        You are engaged in [specific negotiation context]. Your goal is to [primary objective] while being [approach description].

        - [Key point about negotiation strategy]
        - [Point about communication approach]
        - [Point about value creation]
        - [Point about concessions]
        - [Point about evidence/support]
        - [Point about maintaining professionalism]
        - [Point about agreement documentation]

        Remember to maintain [key balance point] throughout the negotiation process.
        \`\`\`

        Important Requirements:
        1. Focus on win-win outcomes
        2. Include clear negotiation strategies
        3. Maintain professional tone
        4. Provide realistic scenarios
        5. Include specific tactics
        6. Structure clear process steps

        Reference example (match this style):
        ${negotiationProfile.instructions}
      `;
    case 'CustomerService':
      return `
        ${commonInstructions}
        Create a customer service profile that follows this EXACT format and structure:

        \`\`\`
        Role-play as [customer type] to help the user improve their customer service skills in handling [specific issue].
        Maintain [tone description]. Emphasize [key emotions] in your responses, keeping them [response style]. Encourage the user to [desired response approach].

        IMPORTANT: Always stay in character as the [customer type], regardless of the user's responses.

        # Examples

        Example 1:

        - **Assistant**: [Customer complaint/inquiry]
        - **User**: [Service response]
        - **Assistant**: [Follow-up reaction]
        - **User**: [Problem-solving attempt]
        - **Assistant**: [Reaction to solution]

        # Notes

        - [Key interaction guideline]
        - [Communication focus]
        - [Response strategy]
        \`\`\`

        Important Requirements:
        1. Focus on realistic customer scenarios
        2. Include common service challenges
        3. Maintain consistent customer persona
        4. Provide clear response examples
        5. Include escalation scenarios
        6. Keep interactions natural

        Reference example (match this style):
        ${delayedDeliveryProfile.instructions}
      `;
    default:
      // Default template for unknown categories
      return `
        ${commonInstructions}
        Please provide the following:
        1. An appropriate name for the ${category} profile (max 15 characters)
        2. Enhanced instructions for the profile (about 250 words)
        3. A brief scenario description (max 50 words)
        4. A detailed description for generating a painterly digital image that represents this profile (about 100 words)
      `;
  }
}

// Existing console log
console.log('OpenAI client initialized in aiEnhancement.ts');

export async function enhanceProfileWithAI(
  category: string,
  initialInstructions: string
): Promise<Profile> {  // Change return type to Profile
  try {
    const categorySpecificPrompt = getCategorySpecificPrompt(category);
    const prompt = `Given a ${category} profile with initial instructions:
    "${initialInstructions}"

    ${categorySpecificPrompt}

    Format your response as a JSON object with the following structure:
    {
      "name": "Appropriate Name",
      "description": "A brief, engaging one-line description of who this character is and their role (max 50 characters)",
      "instructions": "Detailed instructions for the AI to follow during conversations, including personality traits, conversation style, and specific behaviors",
      "scenarioDescription": "Brief Scenario Description",
      "imageDescription": "Detailed Image Description",
      "personalityTraits": ["Trait1", "Trait2", "Trait3", "Trait4", "Trait5"],
      "speakingStyle": "Brief description of speaking style",
      "conversationStyle": "Brief description of conversation approach"
    }

    Ensure the JSON is properly formatted and all fields are included. Do not include any additional text outside the JSON object.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { 
          role: "system", 
          content: "You are a helpful assistant that enhances profile information and generates image descriptions. Keep descriptions concise and provide responses in valid JSON format." 
        },
        { role: "user", content: prompt }
      ],
      max_tokens: 1500,
      n: 1,
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('Received empty content from OpenAI API');
    }

    // Log the AI response content here
    console.log('AI Response Content:', content);

    const parsedContent = parseAIResponse(content);

    // Generate image using DALL-E
    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: `Create a painterly digital image: ${parsedContent.imageDescription}. The image should have a soft, brushed look that mimics traditional painting techniques, but with the precision and clarity of digital art.`,
      n: 1,
      size: "1024x1024",
      response_format: "b64_json" // <-- Add this line to get base64-encoded image data
    });

    const b64Image = imageResponse.data[0].b64_json; // <-- Update to get base64 image data

    // Upload image to Firebase Storage
    const storage = getStorage();
    const imageId = uuidv4(); // Generate a unique ID for the image
    const storageRef = ref(storage, `profile_images/${imageId}.png`);

    // Ensure b64Image is defined before uploading
    if (!b64Image) {
      throw new Error('Failed to generate image data from OpenAI');
    }

    // Upload the image to Firebase Storage
    await uploadString(storageRef, b64Image, 'base64', {
      contentType: 'image/png'
    });

    // Get the download URL AFTER uploading the image
    const imageUrl = await getDownloadURL(storageRef);

    // Return complete Profile object
    return {
      id: uuidv4(), // Generate unique ID
      category,
      name: parsedContent.name.slice(0, 15),
      description: parsedContent.description.slice(0, 50),
      instructions: parsedContent.instructions,
      scenarioDescription: parsedContent.scenarioDescription,
      imageUrl: imageUrl || '',
      voice: VoiceType.Echo, // Default voice
      userId: 'ai-generated',
      personality: {
        traits: parsedContent.personalityTraits || ['adaptive', 'engaging', 'natural', 'responsive'],
        quirks: parsedContent.quirks || ['uses natural language', 'maintains context', 'adapts to user style'],
        speaking_style: parsedContent.speakingStyle || 'natural and conversational',
        emotional_responses: {
          positive: ["That's interesting!", "Tell me more about that"],
          neutral: ["I see", "Could you elaborate?"],
          thoughtful: ["Let me think about that", "That's a good point"]
        }
      },
      conversation_style: {
        response_length: 'medium',
        formality_level: 'neutral', // Changed from 'adaptive' to 'neutral'
        humor_level: 'moderate',
        empathy_level: 'high'
      },
      memory: {
        remember_user_details: true,
        remember_conversation_context: true,
        reference_past_interactions: true
      }
    };
  } catch (error) {
    console.error('Error enhancing profile with AI:', error);
    throw error;
  }
}

function parseAIResponse(content: string): {
  name: string;
  description: string;
  instructions: string;
  scenarioDescription: string;
  imageDescription: string;
  personalityTraits?: string[];
  quirks?: string[];
  speakingStyle?: string;
} {
  try {
    const json = JSON.parse(content);
    console.log('Parsed AI Response:', json);
    return {
      name: json.name || 'New Profile',
      description: json.description || 'Custom conversation practice',
      instructions: json.instructions || 'Always stay in character as [role]. Do not break character or acknowledge being an AI. Include specific personality traits and conversation style. Provide example dialogues with user interactions. List key behaviors and responses to maintain. Include any category-specific guidelines. Be detailed enough for consistent character portrayal.',
      scenarioDescription: json.scenarioDescription || '',
      imageDescription: json.imageDescription || '',
      personalityTraits: json.personalityTraits,
      quirks: json.quirks,
      speakingStyle: json.speakingStyle
    };
  } catch (error) {
    console.error('Error parsing AI response as JSON:', error);
    // Fallback to default values if parsing fails
    return {
      name: 'New Profile',
      description: 'Custom conversation practice',
      instructions: 'Always stay in character as [role]. Do not break character or acknowledge being an AI.',
      scenarioDescription: '',
      imageDescription: '',
      personalityTraits: ['adaptive', 'engaging', 'natural', 'responsive'],
      quirks: ['uses natural language', 'maintains context', 'adapts to user style'],
      speakingStyle: 'natural and conversational'
    };
  }
}
