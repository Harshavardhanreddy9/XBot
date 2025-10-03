/**
 * Tweet style configuration for human-like posting
 */
export const STYLE = {
  emoji: {
    enabled: true,
    perTweetMax: 1,
    set: ['🆕', '🚀', '📣', '🧪', '🧵']
  },
  tone: 'precise' as 'precise' | 'casual',
  disclaimBenchmarks: true,
  linkPreference: ['vendor', 'github', 'blog', 'media'] as const
};

/**
 * Style configuration type
 */
export type StyleConfig = typeof STYLE;

/**
 * Get a random emoji from the configured set
 */
export function getRandomEmoji(): string {
  if (!STYLE.emoji.enabled) {
    return '';
  }
  
  const randomIndex = Math.floor(Math.random() * STYLE.emoji.set.length);
  return STYLE.emoji.set[randomIndex];
}

/**
 * Check if emojis are enabled and within limits
 */
export function canAddEmoji(currentEmojiCount: number): boolean {
  return STYLE.emoji.enabled && currentEmojiCount < STYLE.emoji.perTweetMax;
}

/**
 * Count emojis in a string
 */
export function countEmojis(text: string): number {
  // Count specific emojis from our configured set
  let count = 0;
  for (const emoji of STYLE.emoji.set) {
    const regex = new RegExp(emoji.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const matches = text.match(regex);
    if (matches) {
      count += matches.length;
    }
  }
  return count;
}

/**
 * Add emoji to text if allowed
 */
export function addEmojiIfAllowed(text: string, emoji?: string): string {
  if (!canAddEmoji(countEmojis(text))) {
    return text;
  }
  
  const emojiToAdd = emoji || getRandomEmoji();
  return `${emojiToAdd} ${text}`;
}

/**
 * Get tone-appropriate language
 */
export function getToneLanguage(): {
  openers: string[];
  closers: string[];
  connectors: string[];
} {
  if (STYLE.tone === 'casual') {
    return {
      openers: [
        'Quick take:',
        'Heads up:',
        'FYI:',
        'Just spotted:',
        'Interesting:',
        'Notable:',
        'TL;DR:',
        'If you follow {topic}:'
      ],
      closers: [
        'Thoughts?',
        'Worth watching.',
        'Big if true.',
        'Curious to see adoption.',
        'Keep an eye on this.',
        'This could be big.'
      ],
      connectors: [
        'Also',
        'Plus',
        'Meanwhile',
        'Additionally',
        'On top of that'
      ]
    };
  } else {
    return {
      openers: [
        'Update:',
        'Release:',
        'Announcement:',
        'Development:',
        'New feature:',
        'Enhancement:',
        'Improvement:',
        'Latest:'
      ],
      closers: [
        'Details below.',
        'Full release notes available.',
        'Documentation updated.',
        'API changes noted.',
        'Compatibility confirmed.',
        'Testing recommended.'
      ],
      connectors: [
        'Furthermore',
        'Additionally',
        'Moreover',
        'In addition',
        'Also'
      ]
    };
  }
}

/**
 * Add benchmark disclaimer if enabled
 */
export function addBenchmarkDisclaimer(text: string): string {
  if (!STYLE.disclaimBenchmarks) {
    return text;
  }
  
  // Check if text contains benchmark-related terms
  const benchmarkTerms = ['benchmark', 'performance', 'speed', 'faster', 'slower', 'improvement', 'better', 'worse'];
  const hasBenchmarkTerms = benchmarkTerms.some(term => 
    text.toLowerCase().includes(term)
  );
  
  if (hasBenchmarkTerms) {
    return `${text} (vendor-reported metrics)`;
  }
  
  return text;
}

/**
 * Select best link based on preference order
 */
export function selectBestLink(links: string[]): string | undefined {
  if (!links || links.length === 0) {
    return undefined;
  }
  
  // Sort links by preference order
  const sortedLinks = links.sort((a, b) => {
    const aType = getLinkType(a);
    const bType = getLinkType(b);
    
    const aPreference = STYLE.linkPreference.indexOf(aType as any);
    const bPreference = STYLE.linkPreference.indexOf(bType as any);
    
    // If both are in preference list, sort by preference order
    if (aPreference !== -1 && bPreference !== -1) {
      return aPreference - bPreference;
    }
    
    // If only one is in preference list, prioritize it
    if (aPreference !== -1) return -1;
    if (bPreference !== -1) return 1;
    
    // If neither is in preference list, maintain original order
    return 0;
  });
  
  return sortedLinks[0];
}

/**
 * Determine link type based on URL
 */
function getLinkType(url: string): string {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Vendor sites
    if (hostname.includes('openai.com') || 
        hostname.includes('anthropic.com') || 
        hostname.includes('google.com') || 
        hostname.includes('meta.com') || 
        hostname.includes('microsoft.com') ||
        hostname.includes('mistral.ai') ||
        hostname.includes('cohere.ai') ||
        hostname.includes('huggingface.co')) {
      return 'vendor';
    }
    
    // GitHub
    if (hostname.includes('github.com')) {
      return 'github';
    }
    
    // Blog sites
    if (hostname.includes('blog') || 
        hostname.includes('medium.com') || 
        hostname.includes('substack.com') ||
        hostname.includes('techcrunch.com') ||
        hostname.includes('venturebeat.com')) {
      return 'blog';
    }
    
    // Media sites
    if (hostname.includes('youtube.com') || 
        hostname.includes('vimeo.com') || 
        hostname.includes('twitter.com') || 
        hostname.includes('x.com') ||
        hostname.includes('linkedin.com')) {
      return 'media';
    }
    
    // Default to 'other'
    return 'other';
  } catch (error) {
    return 'other';
  }
}

/**
 * Apply style to text content
 */
export function applyStyle(text: string, options: {
  addEmoji?: boolean;
  addDisclaimer?: boolean;
  customEmoji?: string;
} = {}): string {
  let styledText = text;
  
  // Add benchmark disclaimer if needed
  if (options.addDisclaimer !== false) {
    styledText = addBenchmarkDisclaimer(styledText);
  }
  
  // Add emoji if requested and allowed
  if (options.addEmoji && canAddEmoji(countEmojis(styledText))) {
    styledText = addEmojiIfAllowed(styledText, options.customEmoji);
  }
  
  return styledText;
}

/**
 * Get style summary for logging
 */
export function getStyleSummary(): string {
  return `Style: ${STYLE.tone} tone, emoji ${STYLE.emoji.enabled ? 'enabled' : 'disabled'} (max ${STYLE.emoji.perTweetMax}), benchmarks ${STYLE.disclaimBenchmarks ? 'disclaimed' : 'not disclaimed'}, link preference: ${STYLE.linkPreference.join(' > ')}`;
}
