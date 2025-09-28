import { RSSItem } from './rss';

/**
 * Configuration for tweet generation
 */
export interface TweetConfig {
  maxLength?: number;
  includeHashtags?: boolean;
  hashtagCount?: number;
  templateRotation?: boolean;
}

/**
 * Default configuration for tweet generation
 */
const DEFAULT_CONFIG: Required<TweetConfig> = {
  maxLength: 280,
  includeHashtags: true,
  hashtagCount: 2,
  templateRotation: true,
};

/**
 * Available hashtags for AI/tech content
 */
const HASHTAGS = [
  '#AI',
  '#MachineLearning',
  '#TechNews',
  '#ArtificialIntelligence',
  '#Innovation',
  '#Tech',
  '#Future',
  '#Automation',
  '#DataScience',
  '#DeepLearning'
];

/**
 * Tweet templates with placeholders
 */
const TWEET_TEMPLATES = [
  // Template 1: Emoji + title + source
  "🚀 {title} — {source}",
  
  // Template 2: Quick take style
  "Quick take: {title}",
  
  // Template 3: Breaking news style
  "📰 {title} via {source}",
  
  // Template 4: Question style
  "What do you think about {title}?",
  
  // Template 5: Personal take style
  "Interesting read: {title}",
  
  // Template 6: Direct announcement
  "{title} — {source}",
  
  // Template 7: Excitement style
  "🔥 {title}",
  
  // Template 8: Discussion starter
  "Thoughts on {title}?",
];

/**
 * Generates a human-like tweet from an RSS item
 * @param item RSS item to convert to tweet
 * @param config Tweet generation configuration
 * @returns Generated tweet string
 */
export function generateTweet(item: RSSItem, config: TweetConfig = {}): string {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Select a random template
  const template = selectTemplate();
  
  // Generate base tweet content
  let tweet = generateBaseTweet(item, template);
  
  // Add hashtags if enabled
  if (finalConfig.includeHashtags) {
    const hashtags = selectHashtags(finalConfig.hashtagCount);
    tweet = addHashtags(tweet, hashtags, finalConfig.maxLength);
  }
  
  // Add URL
  tweet = addUrl(tweet, item.link, finalConfig.maxLength);
  
  // Ensure we're under character limit
  tweet = truncateToLimit(tweet, finalConfig.maxLength);
  
  console.log(`📝 Generated tweet (${tweet.length} chars): ${tweet}`);
  return tweet;
}

/**
 * Selects a random template from available templates
 * @returns Selected template string
 */
function selectTemplate(): string {
  const randomIndex = Math.floor(Math.random() * TWEET_TEMPLATES.length);
  return TWEET_TEMPLATES[randomIndex];
}

/**
 * Generates base tweet content using template and item data
 * @param item RSS item
 * @param template Template string
 * @returns Base tweet content
 */
function generateBaseTweet(item: RSSItem, template: string): string {
  // Truncate title if too long (leave room for URL and hashtags)
  const maxTitleLength = 200;
  let title = item.title;
  if (title.length > maxTitleLength) {
    title = title.substring(0, maxTitleLength - 3) + '...';
  }
  
  // Clean up source name (remove "AI" suffix if present to avoid redundancy)
  let source = item.source;
  if (source.endsWith(' AI')) {
    source = source.replace(' AI', '');
  }
  
  // Replace placeholders in template
  return template
    .replace(/{title}/g, title)
    .replace(/{source}/g, source);
}

/**
 * Selects random hashtags from available hashtags
 * @param count Number of hashtags to select
 * @returns Array of selected hashtags
 */
function selectHashtags(count: number): string[] {
  const shuffled = [...HASHTAGS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, HASHTAGS.length));
}

/**
 * Adds hashtags to tweet if there's space
 * @param tweet Current tweet content
 * @param hashtags Array of hashtags to add
 * @param maxLength Maximum tweet length
 * @returns Tweet with hashtags added
 */
function addHashtags(tweet: string, hashtags: string[], maxLength: number): string {
  const hashtagString = ' ' + hashtags.join(' ');
  const newLength = tweet.length + hashtagString.length;
  
  // Only add hashtags if we have space (leave room for URL)
  if (newLength < maxLength - 25) { // Reserve 25 chars for URL
    return tweet + hashtagString;
  }
  
  return tweet;
}

/**
 * Adds URL to tweet
 * @param tweet Current tweet content
 * @param url URL to add
 * @param maxLength Maximum tweet length
 * @returns Tweet with URL added
 */
function addUrl(tweet: string, url: string, maxLength: number): string {
  const urlWithSpace = ' ' + url;
  const newLength = tweet.length + urlWithSpace.length;
  
  if (newLength <= maxLength) {
    return tweet + urlWithSpace;
  }
  
  // If URL doesn't fit, try to truncate the tweet content
  const availableSpace = maxLength - urlWithSpace.length;
  if (availableSpace > 50) { // Only truncate if we have reasonable space left
    const truncatedTweet = tweet.substring(0, availableSpace - 3) + '...';
    return truncatedTweet + urlWithSpace;
  }
  
  // If still too long, just return the URL
  return url;
}

/**
 * Truncates tweet to fit within character limit
 * @param tweet Tweet content
 * @param maxLength Maximum allowed length
 * @returns Truncated tweet
 */
function truncateToLimit(tweet: string, maxLength: number): string {
  if (tweet.length <= maxLength) {
    return tweet;
  }
  
  // Find the last space before the limit to avoid cutting words
  const truncated = tweet.substring(0, maxLength - 3);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.8) { // Only use last space if it's not too far back
    return tweet.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}

/**
 * Generates multiple tweet variations for the same item
 * @param item RSS item
 * @param count Number of variations to generate
 * @param config Tweet generation configuration
 * @returns Array of tweet variations
 */
export function generateTweetVariations(
  item: RSSItem, 
  count: number = 3, 
  config: TweetConfig = {}
): string[] {
  const variations: string[] = [];
  const usedTemplates = new Set<number>();
  
  for (let i = 0; i < count && i < TWEET_TEMPLATES.length; i++) {
    let templateIndex: number;
    
    // Try to use different templates
    do {
      templateIndex = Math.floor(Math.random() * TWEET_TEMPLATES.length);
    } while (usedTemplates.has(templateIndex) && usedTemplates.size < TWEET_TEMPLATES.length);
    
    usedTemplates.add(templateIndex);
    const template = TWEET_TEMPLATES[templateIndex];
    
    // Generate base tweet
    let tweet = generateBaseTweet(item, template);
    
    // Add hashtags if enabled
    if (config.includeHashtags !== false) {
      const hashtags = selectHashtags(config.hashtagCount || 2);
      tweet = addHashtags(tweet, hashtags, config.maxLength || 280);
    }
    
    // Add URL
    tweet = addUrl(tweet, item.link, config.maxLength || 280);
    
    // Ensure we're under character limit
    tweet = truncateToLimit(tweet, config.maxLength || 280);
    
    variations.push(tweet);
  }
  
  return variations;
}

/**
 * Gets statistics about tweet generation
 * @param items Array of RSS items
 * @returns Statistics object
 */
export function getTweetStats(items: RSSItem[]): {
  averageLength: number;
  templateUsage: Record<string, number>;
  hashtagUsage: Record<string, number>;
  characterDistribution: {
    under200: number;
    under250: number;
    under280: number;
  };
} {
  const tweets = items.map(item => generateTweet(item));
  const totalLength = tweets.reduce((sum, tweet) => sum + tweet.length, 0);
  
  const templateUsage: Record<string, number> = {};
  const hashtagUsage: Record<string, number> = {};
  const characterDistribution = { under200: 0, under250: 0, under280: 0 };
  
  tweets.forEach(tweet => {
    // Count character distribution
    if (tweet.length < 200) characterDistribution.under200++;
    else if (tweet.length < 250) characterDistribution.under250++;
    else characterDistribution.under280++;
    
    // Count hashtag usage
    const hashtagMatches = tweet.match(/#\w+/g);
    if (hashtagMatches) {
      hashtagMatches.forEach(hashtag => {
        hashtagUsage[hashtag] = (hashtagUsage[hashtag] || 0) + 1;
      });
    }
  });
  
  return {
    averageLength: Math.round(totalLength / tweets.length),
    templateUsage,
    hashtagUsage,
    characterDistribution,
  };
}

// Export template and hashtag arrays for reference
export { TWEET_TEMPLATES, HASHTAGS };
