import { ExtractedArticle } from './extractor.js';

/**
 * Persona configuration
 */
export interface PersonaConfig {
  maxLength?: number;
  minLength?: number;
  includeRhetoricalDevice?: boolean;
  includeVoicePrefix?: boolean;
  includeCloser?: boolean;
  includeEmoji?: boolean;
  emojiChance?: number; // 0-1, default 0.12 (12%)
}

/**
 * Default configuration for persona
 */
const DEFAULT_CONFIG: Required<PersonaConfig> = {
  maxLength: 240,
  minLength: 200,
  includeRhetoricalDevice: true,
  includeVoicePrefix: true,
  includeCloser: true,
  includeEmoji: false, // Default OFF
  emojiChance: 0.12, // 12% chance when enabled
};

/**
 * Track last used opener to avoid repeats
 */
let lastUsedOpener: string | null = null;

/**
 * Resets the opener tracking (call at start of new batch)
 */
export function resetOpenerTracking(): void {
  lastUsedOpener = null;
}

/**
 * Voice prefix options for different styles
 */
const VOICE_PREFIXES = {
  casual: [
    "Quick take:",
    "Notable:",
    "TL;DR:",
    "Heads-up:",
    "Here's the gist:",
    "My read:",
    "Key point:",
    "Bottom line:",
    "The deal:",
    "What's up:"
  ],
  professional: [
    "Analysis:",
    "Insight:",
    "Observation:",
    "Assessment:",
    "Key finding:",
    "Notable development:",
    "Important update:",
    "Significant news:",
    "Industry update:",
    "Market insight:"
  ],
  conversational: [
    "If you follow AI:",
    "If you follow tech:",
    "If you follow startups:",
    "So here's what's happening:",
    "This caught my attention:",
    "Worth noting:",
    "Interesting development:",
    "Here's what matters:",
    "The big picture:",
    "What's interesting:",
    "This is notable:",
    "Quick heads-up:"
  ]
};

/**
 * Rhetorical devices to add personality
 */
const RHETORICAL_DEVICES = {
  opinion: [
    "This looks promising.",
    "Worth keeping an eye on.",
    "This could be significant.",
    "Interesting approach here.",
    "This matters more than it seems.",
    "Definitely worth watching.",
    "This is the kind of innovation we need.",
    "Smart move by the team."
  ],
  question: [
    "Will this change the game?",
    "How will this impact users?",
    "What does this mean for the industry?",
    "Could this be a game-changer?",
    "Is this the breakthrough we've been waiting for?",
    "What's the real impact here?",
    "How significant is this really?",
    "What's the bigger picture?"
  ],
  contrast: [
    "Unlike previous attempts, this seems different.",
    "This stands out from the usual noise.",
    "While others focus on X, this tackles Y.",
    "This isn't your typical announcement.",
    "What makes this different is the approach.",
    "This breaks from conventional thinking.",
    "Unlike similar projects, this has real potential.",
    "This is refreshingly different."
  ],
  "so_what": [
    "Why this matters: it's not just another tool.",
    "The real value: this solves actual problems.",
    "Here's why you should care: it's practical.",
    "The significance: this could be transformative.",
    "Why this is important: it addresses real needs.",
    "The key insight: this changes how we think about X.",
    "What makes this special: it's genuinely useful.",
    "The bottom line: this delivers real value."
  ]
};

/**
 * Source-specific voice adjustments
 */
const SOURCE_VOICES = {
  'TechCrunch AI': 'professional',
  'VentureBeat AI': 'professional', 
  'Hacker News AI': 'conversational',
  'Google AI Blog': 'professional',
  'default': 'casual'
};

/**
 * Humanizes a summary by adding personality and voice
 * @param summary The base summary to humanize
 * @param source The source of the article
 * @param style The voice style to use
 * @param config Persona configuration
 * @returns Humanized summary
 */
export function humanize(
  summary: string,
  source: string,
  style: 'casual' | 'professional' | 'conversational' = 'casual',
  config: PersonaConfig = {}
): string {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  console.log(`🎭 Humanizing summary for ${source} with ${style} style`);
  
  try {
    // Step 1: Clean and prepare the summary
    let humanizedSummary = cleanSummary(summary);
    
    // Step 2: Add voice prefix if enabled
    if (finalConfig.includeVoicePrefix) {
      const voicePrefix = selectVoicePrefix(style, source);
      humanizedSummary = `${voicePrefix} ${humanizedSummary}`;
    }
    
    // Step 3: Add rhetorical device if enabled and space allows
    if (finalConfig.includeRhetoricalDevice) {
      const rhetoricalDevice = selectRhetoricalDevice(humanizedSummary, source);
      if (rhetoricalDevice && hasSpaceForDevice(humanizedSummary, rhetoricalDevice, finalConfig.maxLength)) {
        humanizedSummary = addRhetoricalDevice(humanizedSummary, rhetoricalDevice);
      }
    }
    
    // Step 4: Add closer if enabled and space allows
    if (finalConfig.includeCloser) {
      const closer = selectCloser(style);
      if (closer && hasSpaceForDevice(humanizedSummary, closer, finalConfig.maxLength)) {
        humanizedSummary = addRhetoricalDevice(humanizedSummary, closer);
      }
    }
    
    // Step 5: Add emoji if enabled and space allows
    if (finalConfig.includeEmoji) {
      const emoji = selectEmoji(humanizedSummary, style, finalConfig.emojiChance);
      if (emoji && hasSpaceForDevice(humanizedSummary, emoji, finalConfig.maxLength)) {
        humanizedSummary = addRhetoricalDevice(humanizedSummary, emoji);
      }
    }
    
    // Step 6: Ensure we're within length limits
    humanizedSummary = adjustToLength(humanizedSummary, finalConfig);
    
    console.log(`✅ Humanized summary (${humanizedSummary.length} chars): ${humanizedSummary}`);
    return humanizedSummary;
    
  } catch (error) {
    console.error(`❌ Humanization failed:`, error);
    // Fallback to original summary
    return truncateToLength(summary, finalConfig.maxLength);
  }
}

/**
 * Cleans and prepares the summary for humanization
 * @param summary Raw summary text
 * @returns Cleaned summary
 */
function cleanSummary(summary: string): string {
  return summary
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    .trim()
    // Remove claims like "first-ever" unless explicitly in title
    .replace(/\b(first-ever|first of its kind|unprecedented|never before seen|groundbreaking|revolutionary)\b/gi, 'significant')
    // Limit consecutive words to avoid plagiarism
    .replace(/(\w+\s+){8,}/g, (match) => {
      const words = match.trim().split(' ');
      return words.slice(0, 8).join(' ') + '...';
    })
    // Ensure it ends with proper punctuation
    .replace(/[.!?]+$/, '')
    .replace(/\s*$/, '') + '.';
}

/**
 * Closers for different styles (pick 0-1)
 */
const CLOSERS = {
  casual: [
    "Thoughts?",
    "Worth watching.",
    "Big if true.",
    "Curious to see adoption.",
    "What do you think?",
    "Keep an eye on this.",
    "Interesting times ahead.",
    "This could be big."
  ],
  professional: [
    "Worth monitoring.",
    "Significant development.",
    "Industry implications to watch.",
    "Key trend to follow.",
    "Important to track.",
    "Notable advancement.",
    "Worth following closely.",
    "Significant potential."
  ],
  conversational: [
    "Thoughts?",
    "Worth watching.",
    "Big if true.",
    "Curious to see adoption.",
    "What do you think?",
    "Keep an eye on this.",
    "Interesting times ahead.",
    "This could be big.",
    "What's your take?",
    "Definitely one to watch."
  ]
};

/**
 * Emojis for occasional use (10-15% chance, 0-1 max)
 */
const EMOJIS = [
  "🚀", "💡", "⚡", "🎯", "🔥", "📈", "🤖", "💻", "🔬", "🌟",
  "⚙️", "🎪", "🎨", "🔮", "🎭", "🎪", "🎨", "🔮", "🎭", "🎪"
];

/**
 * Selects an appropriate voice prefix based on style and source
 * @param style Voice style
 * @param source Article source
 * @returns Selected voice prefix
 */
function selectVoicePrefix(style: string, source: string): string {
  // Use source-specific style if available
  const sourceStyle = SOURCE_VOICES[source as keyof typeof SOURCE_VOICES] || SOURCE_VOICES.default;
  const effectiveStyle = sourceStyle as keyof typeof VOICE_PREFIXES;
  
  const prefixes = VOICE_PREFIXES[effectiveStyle] || VOICE_PREFIXES.casual;
  
  // For conversational style, try to match topic-based prefixes
  if (effectiveStyle === 'conversational') {
    const lowerSource = source.toLowerCase();
    if (lowerSource.includes('ai') || lowerSource.includes('artificial intelligence')) {
      const aiPrefix = "If you follow AI:";
      if (aiPrefix !== lastUsedOpener) {
        lastUsedOpener = aiPrefix;
        return aiPrefix;
      }
    }
    if (lowerSource.includes('startup') || lowerSource.includes('venture')) {
      const startupPrefix = "If you follow startups:";
      if (startupPrefix !== lastUsedOpener) {
        lastUsedOpener = startupPrefix;
        return startupPrefix;
      }
    }
    if (lowerSource.includes('tech') || lowerSource.includes('technology')) {
      const techPrefix = "If you follow tech:";
      if (techPrefix !== lastUsedOpener) {
        lastUsedOpener = techPrefix;
        return techPrefix;
      }
    }
  }
  
  // Filter out the last used opener to avoid repeats
  const availablePrefixes = prefixes.filter(prefix => prefix !== lastUsedOpener);
  
  // If all prefixes were used, reset and use any
  const selectedPrefix = availablePrefixes.length > 0 
    ? availablePrefixes[Math.floor(Math.random() * availablePrefixes.length)]
    : prefixes[Math.floor(Math.random() * prefixes.length)];
  
  lastUsedOpener = selectedPrefix;
  return selectedPrefix;
}

/**
 * Selects an appropriate closer based on style
 * @param style Voice style
 * @returns Selected closer or empty string
 */
function selectCloser(style: string): string {
  const closers = CLOSERS[style as keyof typeof CLOSERS] || CLOSERS.casual;
  
  // 30% chance of adding a closer
  if (Math.random() < 0.3) {
    return closers[Math.floor(Math.random() * closers.length)];
  }
  
  return '';
}

/**
 * Selects an emoji based on content and style
 * @param content Text content
 * @param style Voice style
 * @param emojiChance Probability of adding emoji (0-1)
 * @returns Selected emoji or empty string
 */
function selectEmoji(content: string, style: string, emojiChance: number = 0.12): string {
  if (Math.random() > emojiChance) {
    return '';
  }
  
  // Choose emoji based on content context
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('ai') || lowerContent.includes('artificial intelligence')) {
    return '🤖';
  }
  if (lowerContent.includes('launch') || lowerContent.includes('release')) {
    return '🚀';
  }
  if (lowerContent.includes('breakthrough') || lowerContent.includes('innovation')) {
    return '💡';
  }
  if (lowerContent.includes('growth') || lowerContent.includes('increase')) {
    return '📈';
  }
  if (lowerContent.includes('tech') || lowerContent.includes('technology')) {
    return '💻';
  }
  if (lowerContent.includes('research') || lowerContent.includes('study')) {
    return '🔬';
  }
  
  // Default random emoji
  return EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
}

/**
 * Selects an appropriate rhetorical device
 * @param summary Current summary
 * @param source Article source
 * @returns Selected rhetorical device or null
 */
function selectRhetoricalDevice(summary: string, source: string): string | null {
  // Don't add devices if summary is already too long
  if (summary.length > 180) return null;
  
  // Choose device type based on content and source
  const deviceTypes = Object.keys(RHETORICAL_DEVICES) as Array<keyof typeof RHETORICAL_DEVICES>;
  const deviceType = deviceTypes[Math.floor(Math.random() * deviceTypes.length)];
  
  const devices = RHETORICAL_DEVICES[deviceType];
  return devices[Math.floor(Math.random() * devices.length)];
}

/**
 * Checks if there's space for a rhetorical device
 * @param summary Current summary
 * @param device Rhetorical device
 * @param maxLength Maximum allowed length
 * @returns True if there's space
 */
function hasSpaceForDevice(summary: string, device: string, maxLength: number): boolean {
  const withDevice = `${summary} ${device}`;
  return withDevice.length <= maxLength;
}

/**
 * Adds a rhetorical device to the summary
 * @param summary Current summary
 * @param device Rhetorical device to add
 * @returns Summary with device added
 */
function addRhetoricalDevice(summary: string, device: string): string {
  // Add device with appropriate spacing
  return `${summary} ${device}`;
}

/**
 * Adjusts summary to fit within length limits
 * @param summary Summary to adjust
 * @param config Configuration with length limits
 * @returns Adjusted summary
 */
function adjustToLength(summary: string, config: Required<PersonaConfig>): string {
  if (summary.length <= config.maxLength) {
    // If too short, try to add more content (but don't invent facts)
    if (summary.length < config.minLength) {
      // Just return as-is, don't pad with made-up content
      return summary;
    }
    return summary;
  }
  
  // If too long, truncate intelligently
  return truncateToLength(summary, config.maxLength);
}

/**
 * Truncates text to specified length while preserving word boundaries
 * @param text Text to truncate
 * @param maxLength Maximum length
 * @returns Truncated text
 */
function truncateToLength(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  
  const truncated = text.substring(0, maxLength - 3);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}

/**
 * Humanizes multiple summaries
 * @param summaries Array of summaries to humanize
 * @param sources Array of sources
 * @param style Voice style
 * @param config Persona configuration
 * @returns Array of humanized summaries
 */
export function humanizeMultiple(
  summaries: string[],
  sources: string[],
  style: 'casual' | 'professional' | 'conversational' = 'casual',
  config: PersonaConfig = {}
): string[] {
  console.log(`🎭 Humanizing ${summaries.length} summaries...`);
  
  return summaries.map((summary, index) => {
    const source = sources[index] || 'Unknown';
    return humanize(summary, source, style, config);
  });
}

/**
 * Humanizes based on extracted article data
 * @param article Extracted article data
 * @param style Voice style
 * @param config Persona configuration
 * @returns Humanized summary
 */
export function humanizeFromArticle(
  article: ExtractedArticle,
  style: 'casual' | 'professional' | 'conversational' = 'casual',
  config: PersonaConfig = {}
): string {
  // Use the extracted text if available, otherwise fall back to title
  const baseText = article.success && article.text ? article.text : article.title;
  
  // Create a simple summary from the base text
  const summary = createSimpleSummary(baseText);
  
  return humanize(summary, article.source || 'Unknown', style, config);
}

/**
 * Creates a simple summary from text
 * @param text Text to summarize
 * @returns Simple summary
 */
function createSimpleSummary(text: string): string {
  // Take first sentence or first 150 characters, whichever is shorter
  const firstSentence = text.split(/[.!?]/)[0];
  
  if (firstSentence.length <= 150) {
    return firstSentence;
  }
  
  return text.substring(0, 150).trim() + '...';
}

/**
 * Gets persona statistics
 * @param humanizedSummaries Array of humanized summaries
 * @returns Persona statistics
 */
export function getPersonaStats(humanizedSummaries: string[]): {
  total: number;
  averageLength: number;
  lengthDistribution: {
    short: number;    // < 200 chars
    medium: number;   // 200-240 chars
    long: number;     // > 240 chars
  };
  voicePrefixes: Record<string, number>;
} {
  const totalLength = humanizedSummaries.reduce((sum, s) => sum + s.length, 0);
  const averageLength = Math.round(totalLength / humanizedSummaries.length);
  
  const lengthDistribution = {
    short: humanizedSummaries.filter(s => s.length < 200).length,
    medium: humanizedSummaries.filter(s => s.length >= 200 && s.length <= 240).length,
    long: humanizedSummaries.filter(s => s.length > 240).length,
  };
  
  // Count voice prefixes
  const voicePrefixes: Record<string, number> = {};
  humanizedSummaries.forEach(summary => {
    const prefix = summary.split(':')[0] + ':';
    voicePrefixes[prefix] = (voicePrefixes[prefix] || 0) + 1;
  });
  
  return {
    total: humanizedSummaries.length,
    averageLength,
    lengthDistribution,
    voicePrefixes,
  };
}
