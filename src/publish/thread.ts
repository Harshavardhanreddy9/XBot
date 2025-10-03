import { ExtractedFacts, ComputedDeltas } from '../enrich.js';
import { STYLE, addEmojiIfAllowed, countEmojis, selectBestLink, applyStyle, getToneLanguage } from '../style.js';
import { OpenGraphImage, getProductUpdateMedia } from '../media/preview.js';

/**
 * Thread tweet structure
 */
export interface ThreadTweet {
  content: string;
  order: number;
  length: number;
  media?: OpenGraphImage;
}

/**
 * Complete thread structure
 */
export interface ThreadComposition {
  tweets: ThreadTweet[];
  totalLength: number;
  draftOnly: boolean;
  canonicalUrl?: string;
  summary: string;
}

/**
 * Configuration for thread building
 */
export interface ThreadConfig {
  maxTweetLength?: number;
  maxBulletsPerTweet?: number;
  maxTotalBullets?: number;
  includeDate?: boolean;
  includeProductName?: boolean;
}

const DEFAULT_CONFIG: Required<ThreadConfig> = {
  maxTweetLength: 270,
  maxBulletsPerTweet: 2,
  maxTotalBullets: 4,
  includeDate: true,
  includeProductName: true,
};

/**
 * Render bullets from a list, respecting max count
 */
export function renderBullets(list: string[], max: number): string[] {
  if (!list || list.length === 0) return [];
  
  // Filter out empty bullets and limit to max
  const validBullets = list
    .filter(bullet => bullet && bullet.trim().length > 0)
    .slice(0, max);
  
  // Format bullets with emoji
  return validBullets.map(bullet => {
    const trimmed = bullet.trim();
    // Remove leading bullet points or dashes if they exist
    const cleaned = trimmed.replace(/^[•\-\*]\s*/, '');
    return `• ${cleaned}`;
  });
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  } catch (error) {
    return 'recently';
  }
}

/**
 * Create plain-English highlight from facts and deltas
 */
function createHighlight(facts: ExtractedFacts, deltas: ComputedDeltas): string {
  const highlights: string[] = [];
  
  // Priority order for highlights
  if (deltas.contextWindow) {
    highlights.push(deltas.contextWindow);
  } else if (facts.features.length > 0) {
    highlights.push(facts.features[0]);
  }
  
  if (deltas.price) {
    highlights.push(deltas.price);
  } else if (facts.prices.length > 0) {
    highlights.push(facts.prices[0]);
  }
  
  if (deltas.changes && deltas.changes.length > 0) {
    highlights.push(deltas.changes[0]);
  } else if (facts.changes.length > 0) {
    highlights.push(facts.changes[0]);
  }
  
  // Fallback to version or product announcement
  if (highlights.length === 0) {
    if (facts.version) {
      highlights.push(`version ${facts.version} released`);
    } else {
      highlights.push('new capabilities announced');
    }
  }
  
  return highlights[0] || 'new update announced';
}

/**
 * Get appropriate opener based on style tone
 */
function getStyleOpener(): string {
  const toneLanguage = getToneLanguage();
  const randomIndex = Math.floor(Math.random() * toneLanguage.openers.length);
  return toneLanguage.openers[randomIndex];
}

/**
 * Get appropriate closer based on style tone
 */
function getStyleCloser(): string {
  const toneLanguage = getToneLanguage();
  const randomIndex = Math.floor(Math.random() * toneLanguage.closers.length);
  return toneLanguage.closers[randomIndex];
}

/**
 * Build thread tweets from facts and deltas
 */
export async function buildThread(
  facts: ExtractedFacts,
  deltas: ComputedDeltas,
  canonicalUrl?: string,
  config: ThreadConfig = {}
): Promise<ThreadComposition> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const tweets: ThreadTweet[] = [];
  
  // Check if we have official citations
  const hasOfficialCitation = facts.citations && facts.citations.length > 0;
  const draftOnly = !hasOfficialCitation;
  
  if (draftOnly) {
    console.log('⚠️ No official citations found, marking as draft only');
  }
  
  // T1: Product update with highlight and date
  const highlight = createHighlight(facts, deltas);
  const dateStr = finalConfig.includeDate ? formatDate(facts.date) : '';
  const productName = finalConfig.includeProductName ? facts.product : 'AI model';
  
  // Apply style-based opener
  const opener = getStyleOpener();
  let tweet1Content = `${opener} ${productName} update: ${highlight}`;
  if (dateStr) {
    tweet1Content += ` (${dateStr})`;
  }
  
  // Apply style (emoji, disclaimers)
  tweet1Content = applyStyle(tweet1Content, {
    addEmoji: true,
    addDisclaimer: true
  });
  
  // Ensure T1 fits within character limit
  if (tweet1Content.length > finalConfig.maxTweetLength) {
    tweet1Content = `${opener} ${productName} update: ${highlight}`;
    if (tweet1Content.length > finalConfig.maxTweetLength) {
      tweet1Content = `${productName} update announced`;
    }
  }
  
  // Extract media preview for the first tweet
  let mediaPreview: OpenGraphImage | undefined;
  if (canonicalUrl) {
    try {
      console.log(`🖼️ Extracting media preview for: ${canonicalUrl}`);
      const mediaResult = await getProductUpdateMedia(canonicalUrl, facts.product, facts.version);
      
      if (mediaResult.success && mediaResult.image) {
        mediaPreview = mediaResult.image;
        console.log(`✅ Media preview extracted: ${mediaPreview.url}`);
      } else {
        console.log(`⚠️ No media preview available: ${mediaResult.error}`);
      }
    } catch (error) {
      console.error(`❌ Failed to extract media preview: ${error}`);
    }
  }

  tweets.push({
    content: tweet1Content,
    order: 1,
    length: tweet1Content.length,
    media: mediaPreview
  });
  
  // T2-T4: Bullets from deltas or features
  const allBullets: string[] = [];
  
  // Prioritize deltas over features
  if (deltas.features && deltas.features.length > 0) {
    allBullets.push(...deltas.features);
  } else if (facts.features.length > 0) {
    allBullets.push(...facts.features);
  }
  
  if (deltas.changes && deltas.changes.length > 0) {
    allBullets.push(...deltas.changes);
  } else if (facts.changes.length > 0) {
    allBullets.push(...facts.changes);
  }
  
  // Add pricing info if available
  if (deltas.price) {
    allBullets.push(deltas.price);
  } else if (facts.prices.length > 0) {
    allBullets.push(facts.prices[0]);
  }
  
  // Add limits if significant
  if (facts.limits.length > 0) {
    allBullets.push(facts.limits[0]);
  }
  
  // Render bullets and distribute across tweets
  const renderedBullets = renderBullets(allBullets, finalConfig.maxTotalBullets);
  
  if (renderedBullets.length > 0) {
    // Distribute bullets across tweets (max 2 bullets per tweet)
    const bulletsPerTweet = finalConfig.maxBulletsPerTweet;
    const numBulletTweets = Math.ceil(renderedBullets.length / bulletsPerTweet);
    
    for (let i = 0; i < numBulletTweets && tweets.length < 4; i++) {
      const startIdx = i * bulletsPerTweet;
      const endIdx = Math.min(startIdx + bulletsPerTweet, renderedBullets.length);
      const tweetBullets = renderedBullets.slice(startIdx, endIdx);
      
      let tweetContent = tweetBullets.join('\n');
      
      // Apply style to bullet tweets (limited emoji, disclaimers)
      tweetContent = applyStyle(tweetContent, {
        addEmoji: countEmojis(tweetContent) === 0, // Only add emoji if none present
        addDisclaimer: true
      });
      
      if (tweetContent.length <= finalConfig.maxTweetLength) {
        tweets.push({
          content: tweetContent,
          order: tweets.length + 1,
          length: tweetContent.length
        });
      }
    }
  }
  
  // Last tweet: Details link with style-based selection
  if (canonicalUrl) {
    // Select best link based on style preferences
    const allLinks = [canonicalUrl, ...(facts.citations || [])];
    const bestLink = selectBestLink(allLinks);
    const linkToUse = bestLink || canonicalUrl;
    
    // Apply style-based closer
    const closer = getStyleCloser();
    let lastTweetContent = `${closer} Details ↓ ${linkToUse}`;
    
    // Apply style (no emoji for last tweet, no disclaimers)
    lastTweetContent = applyStyle(lastTweetContent, {
      addEmoji: false,
      addDisclaimer: false
    });
    
    if (lastTweetContent.length <= finalConfig.maxTweetLength) {
      tweets.push({
        content: lastTweetContent,
        order: tweets.length + 1,
        length: lastTweetContent.length
      });
    }
  }
  
  // Calculate total length
  const totalLength = tweets.reduce((sum, tweet) => sum + tweet.length, 0);
  
  // Create summary
  const summary = `${facts.vendor} ${facts.product} ${facts.version ? `v${facts.version}` : ''} thread: ${tweets.length} tweets, ${totalLength} total chars`;
  
  const composition: ThreadComposition = {
    tweets,
    totalLength,
    draftOnly,
    canonicalUrl,
    summary
  };
  
  console.log(`🧵 Built thread: ${summary}`);
  console.log(`   Draft only: ${draftOnly}`);
  console.log(`   Tweets: ${tweets.length}`);
  tweets.forEach((tweet, index) => {
    console.log(`   T${index + 1} (${tweet.length} chars): "${tweet.content}"`);
  });
  
  return composition;
}

/**
 * Format thread for console output
 */
export function formatThreadForConsole(thread: ThreadComposition): string {
  let output = `🧵 Thread Composition (${thread.tweets.length} tweets)\n`;
  output += `==================================================\n`;
  
  if (thread.draftOnly) {
    output += `⚠️ DRAFT ONLY - No official citations\n\n`;
  }
  
  thread.tweets.forEach((tweet, index) => {
    const emojiCount = countEmojis(tweet.content);
    output += `T${index + 1} (${tweet.length} chars${emojiCount > 0 ? `, ${emojiCount} emoji` : ''}):\n`;
    output += `"${tweet.content}"\n\n`;
  });
  
  output += `Total: ${thread.totalLength} characters\n`;
  output += `Summary: ${thread.summary}\n`;
  
  return output;
}

/**
 * Validate thread composition
 */
export function validateThread(composition: ThreadComposition, config: ThreadConfig = {}): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check tweet count
  if (composition.tweets.length === 0) {
    errors.push('Thread has no tweets');
  }
  
  if (composition.tweets.length > 5) {
    warnings.push(`Thread has ${composition.tweets.length} tweets (recommended max: 5)`);
  }
  
  // Check individual tweet lengths
  composition.tweets.forEach((tweet, index) => {
    if (tweet.length > finalConfig.maxTweetLength) {
      errors.push(`Tweet ${index + 1} exceeds ${finalConfig.maxTweetLength} chars (${tweet.length} chars)`);
    }
    
    if (tweet.length > 250) {
      warnings.push(`Tweet ${index + 1} is long (${tweet.length} chars)`);
    }
  });
  
  // Check for empty tweets
  composition.tweets.forEach((tweet, index) => {
    if (!tweet.content.trim()) {
      errors.push(`Tweet ${index + 1} is empty`);
    }
  });
  
  // Check draft status
  if (composition.draftOnly) {
    warnings.push('Thread marked as draft only (no official citations)');
  }
  
  // Check URL presence
  if (!composition.canonicalUrl) {
    warnings.push('No canonical URL provided');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Format thread for display
 */
export function formatThread(composition: ThreadComposition): string {
  const lines: string[] = [];
  
  lines.push(`🧵 Thread Composition (${composition.tweets.length} tweets)`);
  lines.push('='.repeat(50));
  
  if (composition.draftOnly) {
    lines.push('⚠️ DRAFT ONLY - No official citations');
    lines.push('');
  }
  
  composition.tweets.forEach((tweet, index) => {
    lines.push(`T${index + 1} (${tweet.length} chars):`);
    lines.push(`"${tweet.content}"`);
    lines.push('');
  });
  
  lines.push(`Total: ${composition.totalLength} characters`);
  lines.push(`Summary: ${composition.summary}`);
  
  return lines.join('\n');
}

/**
 * Create a simple thread from basic facts (fallback)
 */
export function createSimpleThread(
  vendor: string,
  product: string,
  version?: string,
  canonicalUrl?: string
): ThreadComposition {
  const tweets: ThreadTweet[] = [];
  
  // T1: Basic announcement
  const tweet1Content = `${product} ${version ? `v${version}` : 'update'} announced`;
  tweets.push({
    content: tweet1Content,
    order: 1,
    length: tweet1Content.length
  });
  
  // T2: Details link if available
  if (canonicalUrl) {
    const tweet2Content = `Details ↓ ${canonicalUrl}`;
    tweets.push({
      content: tweet2Content,
      order: 2,
      length: tweet2Content.length
    });
  }
  
  const totalLength = tweets.reduce((sum, tweet) => sum + tweet.length, 0);
  
  return {
    tweets,
    totalLength,
    draftOnly: true, // Simple threads are always draft
    canonicalUrl,
    summary: `${vendor} ${product} simple thread: ${tweets.length} tweets`
  };
}
