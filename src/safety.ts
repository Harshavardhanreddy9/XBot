import { URL } from 'url';
import { ExtractedFacts } from './enrich.js';
import { upsertSkipReason, getSkipReasonStats } from './db.js';

/**
 * Skip reason tags for tracking why content was filtered
 */
export const REASON_TAGS = {
  NO_OFFICIAL_SOURCE: 'NO_OFFICIAL_SOURCE',
  EMPTY_FACTS: 'EMPTY_FACTS',
  OVER_DAILY_CAP: 'OVER_DAILY_CAP',
  DUP_EVENT: 'DUP_EVENT',
  RUMOR_ONLY: 'RUMOR_ONLY',
  INSUFFICIENT_CONTENT: 'INSUFFICIENT_CONTENT',
  SUSPICIOUS_DOMAIN: 'SUSPICIOUS_DOMAIN',
  RATE_LIMITED: 'RATE_LIMITED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  EXTRACTION_FAILED: 'EXTRACTION_FAILED',
  INVALID_URL: 'INVALID_URL',
  CONTENT_TOO_SHORT: 'CONTENT_TOO_SHORT',
  DUPLICATE_TITLE: 'DUPLICATE_TITLE',
  SPAM_DETECTED: 'SPAM_DETECTED',
  OFFENSIVE_CONTENT: 'OFFENSIVE_CONTENT',
} as const;

export type ReasonTag = typeof REASON_TAGS[keyof typeof REASON_TAGS];

/**
 * Official domains and patterns for trusted sources
 */
const OFFICIAL_DOMAINS = [
  'openai.com',
  'x.ai',
  'anthropic.com',
  'ai.googleblog.com',
  'google.com',
  'meta.ai',
  'mistral.ai',
  'cohere.com',
  'huggingface.co',
  'github.com',
  'microsoft.com',
  'nvidia.com',
  'deepmind.com',
  'stability.ai',
  'midjourney.com',
  'runwayml.com',
  'replicate.com',
  'together.ai',
  'perplexity.ai',
  'claude.ai',
  'chatgpt.com',
  'bard.google.com',
  'gemini.google.com',
];

/**
 * Official GitHub release patterns
 */
const OFFICIAL_GITHUB_PATTERNS = [
  /^https:\/\/github\.com\/(openai|anthropics|google|meta|microsoft|huggingface|stability-ai|runwayml|replicate|togethercomputer|perplexity-ai)\/[^\/]+\/releases\/?$/i,
  /^https:\/\/github\.com\/(openai|anthropics|google|meta|microsoft|huggingface|stability-ai|runwayml|replicate|togethercomputer|perplexity-ai)\/[^\/]+\/releases\/tag\/.+$/i,
];

/**
 * Official GitHub organizations
 */
const OFFICIAL_GITHUB_ORGS = [
  'openai',
  'anthropics', 
  'google',
  'meta',
  'microsoft',
  'huggingface',
  'stability-ai',
  'runwayml',
  'replicate',
  'togethercomputer',
  'perplexity-ai'
];

/**
 * Rumor and speculation language patterns
 */
const RUMOR_PATTERNS = [
  /\b(rumor|rumour|speculation|allegedly|reportedly|supposedly|purportedly|claims|sources say|insiders|leaked|unconfirmed|unverified)\b/i,
  /\b(might|may|could|possibly|potentially|alleged|suspected|believed to be)\b/i,
  /\b(according to|as reported by|sources indicate|word is|buzz is|talk is)\b/i,
  /\b(breaking|exclusive|scoop|tip|leak|insider|anonymous)\b/i,
];

/**
 * Spam and low-quality content patterns
 */
const SPAM_PATTERNS = [
  /\b(click here|buy now|free trial|limited time|act now|don't miss|exclusive offer)\b/i,
  /\b(guaranteed|100%|instant|immediate|secret|hidden|revealed|shocking)\b/i,
  /\b(make money|earn cash|get rich|profit|income|revenue|sales|marketing)\b/i,
];

/**
 * Offensive content patterns
 */
const OFFENSIVE_PATTERNS = [
  /\b(hate|racist|sexist|discriminatory|offensive|inappropriate|harmful|dangerous)\b/i,
  /\b(violence|threats?|abuse|harassment|bullying|intimidation)\b/i,
];

/**
 * Check if a URL is from an official source
 */
export function isOfficial(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();
    
    // Check GitHub release patterns first (more specific)
    if (hostname === 'github.com') {
      // First check if it's a release URL
      if (!url.includes('/releases')) {
        return false;
      }
      
      // Extract organization from URL
      const urlParts = url.split('/');
      const orgIndex = urlParts.findIndex(part => part === 'github.com') + 1;
      const org = urlParts[orgIndex];
      
      // Check if organization is official
      if (!org || !OFFICIAL_GITHUB_ORGS.includes(org.toLowerCase())) {
        return false;
      }
      
      // Check if it matches release patterns
      return OFFICIAL_GITHUB_PATTERNS.some(pattern => pattern.test(url));
    }
    
    // Check other official domains (excluding github.com)
    if (OFFICIAL_DOMAINS.some(domain => hostname.includes(domain) && domain !== 'github.com')) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.warn(`⚠️ Invalid URL format: ${url}`);
    return false;
  }
}

/**
 * Check if content contains rumor language
 */
export function containsRumorLanguage(text: string): boolean {
  return RUMOR_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Check if content contains spam patterns
 */
export function containsSpamLanguage(text: string): boolean {
  return SPAM_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Check if content contains offensive language
 */
export function containsOffensiveLanguage(text: string): boolean {
  return OFFENSIVE_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Check if facts are empty or insufficient
 */
export function hasEmptyFacts(facts: ExtractedFacts): boolean {
  const hasFeatures = facts.features && facts.features.length > 0;
  const hasChanges = facts.changes && facts.changes.length > 0;
  const hasPrices = facts.prices && facts.prices.length > 0;
  const hasLimits = facts.limits && facts.limits.length > 0;
  const hasVersion = facts.version && facts.version.trim().length > 0;
  const hasDate = facts.date && facts.date.trim().length > 0;
  
  // Need at least 2 meaningful facts
  const meaningfulFacts = [hasFeatures, hasChanges, hasPrices, hasLimits, hasVersion, hasDate].filter(Boolean).length;
  
  return meaningfulFacts < 2;
}

/**
 * Check if content is too short
 */
export function isContentTooShort(text: string, minLength: number = 100): boolean {
  return text.trim().length < minLength;
}

/**
 * Check if title is duplicate
 */
export function isDuplicateTitle(title: string, existingTitles: string[]): boolean {
  const normalizedTitle = title.toLowerCase().trim();
  return existingTitles.some(existing => 
    existing.toLowerCase().trim() === normalizedTitle ||
    calculateSimilarity(normalizedTitle, existing.toLowerCase().trim()) > 0.98
  );
}

/**
 * Simple string similarity calculation
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Check if we should skip posting based on safety criteria
 */
export async function shouldSkip(
  facts: ExtractedFacts,
  options: {
    title?: string;
    text?: string;
    url?: string;
    existingTitles?: string[];
    dailyPostCount?: number;
    maxDailyPosts?: number;
  } = {}
): Promise<{ skip: boolean; reason?: ReasonTag; details?: string }> {
  const { title, text, url, existingTitles = [], dailyPostCount = 0, maxDailyPosts = 5 } = options;
  
  // Check for official source
  if (url && !isOfficial(url)) {
    await logSkipReason(REASON_TAGS.NO_OFFICIAL_SOURCE, `Non-official source: ${url}`, { url, title });
    return { skip: true, reason: REASON_TAGS.NO_OFFICIAL_SOURCE, details: `Non-official source: ${url}` };
  }
  
  // Check for empty facts
  if (hasEmptyFacts(facts)) {
    await logSkipReason(REASON_TAGS.EMPTY_FACTS, 'Insufficient facts extracted', { facts, title });
    return { skip: true, reason: REASON_TAGS.EMPTY_FACTS, details: 'Insufficient facts extracted' };
  }
  
  // Check daily post limit
  if (dailyPostCount >= maxDailyPosts) {
    await logSkipReason(REASON_TAGS.OVER_DAILY_CAP, `Daily limit reached: ${dailyPostCount}/${maxDailyPosts}`, { dailyPostCount, maxDailyPosts });
    return { skip: true, reason: REASON_TAGS.OVER_DAILY_CAP, details: `Daily limit reached: ${dailyPostCount}/${maxDailyPosts}` };
  }
  
  // Check for duplicate title
  if (title && isDuplicateTitle(title, existingTitles)) {
    await logSkipReason(REASON_TAGS.DUP_EVENT, `Duplicate title detected: ${title}`, { title, existingTitles });
    return { skip: true, reason: REASON_TAGS.DUP_EVENT, details: `Duplicate title detected: ${title}` };
  }
  
  // Check for rumor language
  if (text && containsRumorLanguage(text)) {
    await logSkipReason(REASON_TAGS.RUMOR_ONLY, 'Content contains rumor language', { text: text.substring(0, 200), title });
    return { skip: true, reason: REASON_TAGS.RUMOR_ONLY, details: 'Content contains rumor language' };
  }
  
  // Check for spam language
  if (text && containsSpamLanguage(text)) {
    await logSkipReason(REASON_TAGS.SPAM_DETECTED, 'Content contains spam language', { text: text.substring(0, 200), title });
    return { skip: true, reason: REASON_TAGS.SPAM_DETECTED, details: 'Content contains spam language' };
  }
  
  // Check for offensive content
  if (text && containsOffensiveLanguage(text)) {
    await logSkipReason(REASON_TAGS.OFFENSIVE_CONTENT, 'Content contains offensive language', { text: text.substring(0, 200), title });
    return { skip: true, reason: REASON_TAGS.OFFENSIVE_CONTENT, details: 'Content contains offensive language' };
  }
  
  // Check content length
  if (text && isContentTooShort(text)) {
    await logSkipReason(REASON_TAGS.CONTENT_TOO_SHORT, `Content too short: ${text.length} chars`, { textLength: text.length, title });
    return { skip: true, reason: REASON_TAGS.CONTENT_TOO_SHORT, details: `Content too short: ${text.length} chars` };
  }
  
  // Check for invalid URL
  if (url && !isValidUrl(url)) {
    await logSkipReason(REASON_TAGS.INVALID_URL, `Invalid URL format: ${url}`, { url, title });
    return { skip: true, reason: REASON_TAGS.INVALID_URL, details: `Invalid URL format: ${url}` };
  }
  
  return { skip: false };
}

/**
 * Check if URL is valid
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Log skip reason to database
 */
async function logSkipReason(reason: ReasonTag, details: string, metadata: any = {}): Promise<void> {
  try {
    await upsertSkipReason({
      reason,
      details,
      metadata: JSON.stringify(metadata),
      timestamp: new Date().toISOString(),
    });
    console.log(`🚫 Skip reason logged: ${reason} - ${details}`);
  } catch (error) {
    console.error(`❌ Failed to log skip reason: ${error}`);
  }
}

/**
 * Get safety statistics
 */
export async function getSafetyStats(): Promise<{
  totalSkips: number;
  skipReasons: Record<ReasonTag, number>;
  recentSkips: Array<{ reason: ReasonTag; details: string; timestamp: string }>;
}> {
  try {
    const stats = await getSkipReasonStats();
    return {
      totalSkips: stats.totalSkips,
      skipReasons: stats.skipReasons as Record<ReasonTag, number>,
      recentSkips: stats.recentSkips.map(skip => ({
        reason: skip.reason as ReasonTag,
        details: skip.details,
        timestamp: skip.timestamp
      }))
    };
  } catch (error) {
    console.error(`❌ Failed to get safety stats: ${error}`);
    return {
      totalSkips: 0,
      skipReasons: {} as Record<ReasonTag, number>,
      recentSkips: []
    };
  }
}

/**
 * Validate content before processing
 */
export function validateContent(content: {
  title: string;
  text: string;
  url: string;
}): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (!content.title || content.title.trim().length === 0) {
    issues.push('Title is empty');
  }
  
  if (!content.text || content.text.trim().length < 50) {
    issues.push('Text content too short');
  }
  
  if (!content.url || !isValidUrl(content.url)) {
    issues.push('Invalid URL');
  }
  
  if (containsOffensiveLanguage(content.title + ' ' + content.text)) {
    issues.push('Contains offensive content');
  }
  
  if (containsSpamLanguage(content.title + ' ' + content.text)) {
    issues.push('Contains spam content');
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * Get official source domains for reference
 */
export function getOfficialDomains(): string[] {
  return [...OFFICIAL_DOMAINS];
}

/**
 * Check if domain is trusted
 */
export function isTrustedDomain(domain: string): boolean {
  const normalizedDomain = domain.toLowerCase();
  return OFFICIAL_DOMAINS.some(officialDomain => {
    const normalizedOfficial = officialDomain.toLowerCase();
    // Check for exact match or subdomain
    return normalizedDomain === normalizedOfficial || 
           normalizedDomain.endsWith('.' + normalizedOfficial);
  });
}
