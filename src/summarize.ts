import { ExtractedArticle } from './extractor';

/**
 * Summary configuration
 */
export interface SummaryConfig {
  maxLength?: number;
  minLength?: number;
  includeContext?: boolean;
  includeImpact?: boolean;
}

/**
 * Default configuration for summarization
 */
const DEFAULT_CONFIG: Required<SummaryConfig> = {
  maxLength: 220,
  minLength: 180,
  includeContext: true,
  includeImpact: true,
};

/**
 * Summarizes an article into 2-3 sentences following specific rules
 * @param article Extracted article data
 * @param config Summary configuration
 * @returns Promise<string> Generated summary
 */
export async function summarizeArticle(
  article: ExtractedArticle,
  config: SummaryConfig = {}
): Promise<string> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  console.log(`📝 Summarizing: ${article.title}`);
  
  try {
    // If extraction failed, create lighter take using RSS title
    if (!article.success) {
      console.log('⚠️ Extraction failed, creating lighter take from RSS title');
      return createLighterTake(article.title, article.source);
    }
    
    // Step 1: Clean and prepare text
    const cleanedText = cleanText(article.text);
    const sentences = splitIntoSentences(cleanedText);
    
    if (sentences.length === 0) {
      console.log('⚠️ No sentences found, using title as summary');
      return createLighterTake(article.title, article.source);
    }
    
    // Step 2: Extract first meaningful sentence (<=180 chars) with word limit
    const firstSentence = extractFirstMeaningfulSentence(sentences, 180);
    const limitedFirstSentence = limitConsecutiveWords(firstSentence, 8);
    
    // Step 3: Generate impact sentence
    const impactSentence = finalConfig.includeImpact 
      ? generateImpactSentence(sentences, article.title)
      : '';
    const limitedImpactSentence = impactSentence ? limitConsecutiveWords(impactSentence, 8) : '';
    
    // Step 4: Extract context nugget
    const contextNugget = finalConfig.includeContext
      ? extractContextNugget(sentences, article.title)
      : '';
    const limitedContextNugget = contextNugget ? limitConsecutiveWords(contextNugget, 8) : '';
    
    // Step 5: Combine sentences
    const summary = combineSentences(limitedFirstSentence, limitedImpactSentence, limitedContextNugget, finalConfig);
    
    // Step 6: Add source domain if not already present
    const summaryWithSource = addSourceDomain(summary, article.source);
    
    console.log(`✅ Generated summary (${summaryWithSource.length} chars): ${summaryWithSource}`);
    return summaryWithSource;
    
  } catch (error) {
    console.error(`❌ Summarization failed:`, error);
    // Fallback to lighter take
    return createLighterTake(article.title, article.source);
  }
}

/**
 * Cleans text by removing marketing fluff and formatting
 * @param text Raw text to clean
 * @returns Cleaned text
 */
function cleanText(text: string): string {
  return text
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    .trim()
    // Remove common marketing phrases
    .replace(/\b(click here|read more|learn more|find out more|discover|unlock|revolutionary|groundbreaking|cutting-edge|state-of-the-art|next-generation|industry-leading|world-class|premium|exclusive|limited time|act now|don't miss|hurry|urgent)\b/gi, '')
    // Remove excessive punctuation
    .replace(/[!]{2,}/g, '!')
    .replace(/[?]{2,}/g, '?')
    .replace(/[.]{2,}/g, '.')
    // Remove quotes longer than 10 words
    .replace(/"[^"]{50,}"/g, '')
    // Remove claims like "first-ever" unless explicitly in title
    .replace(/\b(first-ever|first of its kind|unprecedented|never before seen|groundbreaking|revolutionary)\b/gi, '')
    // Clean up extra spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Splits text into sentences
 * @param text Text to split
 * @returns Array of sentences
 */
function splitIntoSentences(text: string): string[] {
  return text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 10) // Filter out very short fragments
    .slice(0, 10); // Limit to first 10 sentences for processing
}

/**
 * Extracts the first meaningful sentence (<=180 chars)
 * @param sentences Array of sentences
 * @param maxLength Maximum length for first sentence
 * @returns First meaningful sentence
 */
function extractFirstMeaningfulSentence(sentences: string[], maxLength: number): string {
  for (const sentence of sentences) {
    if (sentence.length <= maxLength && isMeaningfulSentence(sentence)) {
      return sentence;
    }
  }
  
  // If no sentence fits, truncate the first one
  return truncateToLength(sentences[0] || '', maxLength);
}

/**
 * Checks if a sentence is meaningful (not just marketing fluff)
 * @param sentence Sentence to check
 * @returns True if meaningful
 */
function isMeaningfulSentence(sentence: string): boolean {
  const lowerSentence = sentence.toLowerCase();
  
  // Skip sentences that are mostly marketing
  const marketingWords = ['click', 'subscribe', 'follow', 'share', 'like', 'download', 'install', 'buy', 'purchase', 'order'];
  const marketingCount = marketingWords.filter(word => lowerSentence.includes(word)).length;
  
  if (marketingCount > 2) return false;
  
  // Skip sentences that are too short or too long
  if (sentence.length < 20 || sentence.length > 200) return false;
  
  // Prefer sentences with numbers, dates, or specific details
  const hasNumbers = /\d/.test(sentence);
  const hasSpecifics = /(version|v\d+|model|feature|update|release|announced|launched)/i.test(sentence);
  
  return hasNumbers || hasSpecifics || sentence.length > 50;
}

/**
 * Generates an impact sentence explaining why it matters
 * @param sentences Array of sentences
 * @param title Article title
 * @returns Impact sentence
 */
function generateImpactSentence(sentences: string[], title: string): string {
  // Look for sentences that explain impact, significance, or implications
  const impactKeywords = [
    'enables', 'allows', 'improves', 'enhances', 'increases', 'reduces', 'solves',
    'addresses', 'fixes', 'prevents', 'protects', 'secures', 'optimizes',
    'breakthrough', 'milestone', 'first', 'new', 'innovative', 'significant',
    'important', 'crucial', 'key', 'major', 'revolutionary'
  ];
  
  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase();
    const hasImpactKeywords = impactKeywords.some(keyword => lowerSentence.includes(keyword));
    
    if (hasImpactKeywords && sentence.length <= 100) {
      return sentence;
    }
  }
  
  // Fallback: generate based on title
  if (title.toLowerCase().includes('ai') || title.toLowerCase().includes('artificial intelligence')) {
    return 'This development advances AI capabilities and could impact various industries.';
  }
  
  if (title.toLowerCase().includes('tech') || title.toLowerCase().includes('technology')) {
    return 'This technology could reshape how we work and interact with digital systems.';
  }
  
  return 'This development represents an important step forward in the field.';
}

/**
 * Extracts context nugget (company, model, feature info)
 * @param sentences Array of sentences
 * @param title Article title
 * @returns Context nugget
 */
function extractContextNugget(sentences: string[], title: string): string {
  // Look for company names, model names, version numbers
  const contextPatterns = [
    /(OpenAI|Google|Microsoft|Apple|Meta|Amazon|Tesla|NVIDIA|Intel|AMD)/i,
    /(GPT-\d+|ChatGPT|Claude|Bard|Gemini|DALL-E|Midjourney)/i,
    /(version \d+|v\d+\.\d+|\d+\.\d+)/i,
    /(API|SDK|framework|platform|tool|service)/i
  ];
  
  for (const sentence of sentences) {
    for (const pattern of contextPatterns) {
      if (pattern.test(sentence) && sentence.length <= 80) {
        return sentence;
      }
    }
  }
  
  // Fallback: extract from title
  const titleWords = title.split(' ');
  if (titleWords.length >= 3) {
    return `${titleWords.slice(0, 3).join(' ')} represents a key development.`;
  }
  
  return '';
}

/**
 * Combines sentences into final summary
 * @param firstSentence First meaningful sentence
 * @param impactSentence Impact sentence
 * @param contextNugget Context nugget
 * @param config Summary configuration
 * @returns Combined summary
 */
function combineSentences(
  firstSentence: string,
  impactSentence: string,
  contextNugget: string,
  config: Required<SummaryConfig>
): string {
  const sentences = [firstSentence];
  
  // Add impact sentence if it fits and adds value
  if (impactSentence && impactSentence !== firstSentence) {
    const withImpact = `${firstSentence} ${impactSentence}`;
    if (withImpact.length <= config.maxLength) {
      sentences.push(impactSentence);
    }
  }
  
  // Add context nugget if it fits and adds value
  if (contextNugget && !sentences.includes(contextNugget)) {
    const withContext = sentences.join(' ') + ' ' + contextNugget;
    if (withContext.length <= config.maxLength) {
      sentences.push(contextNugget);
    }
  }
  
  let summary = sentences.join(' ');
  
  // Ensure we meet minimum length
  if (summary.length < config.minLength && sentences.length === 1) {
    // Try to add a simple impact statement
    const simpleImpact = ' This development could have significant implications.';
    if (summary.length + simpleImpact.length <= config.maxLength) {
      summary += simpleImpact;
    }
  }
  
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
 * Summarizes multiple articles
 * @param articles Array of extracted articles
 * @param config Summary configuration
 * @returns Promise<string[]> Array of summaries
 */
export async function summarizeMultipleArticles(
  articles: ExtractedArticle[],
  config: SummaryConfig = {}
): Promise<string[]> {
  console.log(`📝 Summarizing ${articles.length} articles...`);
  
  const summaries: string[] = [];
  
  for (const article of articles) {
    try {
      const summary = await summarizeArticle(article, config);
      summaries.push(summary);
    } catch (error) {
      console.error(`❌ Failed to summarize article: ${article.title}`, error);
      summaries.push(article.title); // Fallback to title
    }
  }
  
  return summaries;
}

/**
 * Gets summary statistics
 * @param summaries Array of summaries
 * @returns Summary statistics
 */
export function getSummaryStats(summaries: string[]): {
  total: number;
  averageLength: number;
  lengthDistribution: {
    short: number;    // < 180 chars
    medium: number;   // 180-220 chars
    long: number;     // > 220 chars
  };
} {
  const totalLength = summaries.reduce((sum, s) => sum + s.length, 0);
  const averageLength = Math.round(totalLength / summaries.length);
  
  const lengthDistribution = {
    short: summaries.filter(s => s.length < 180).length,
    medium: summaries.filter(s => s.length >= 180 && s.length <= 220).length,
    long: summaries.filter(s => s.length > 220).length,
  };
  
  return {
    total: summaries.length,
    averageLength,
    lengthDistribution,
  };
}

/**
 * Limits consecutive words copied from original text to avoid plagiarism
 * @param text Text to limit
 * @param maxConsecutiveWords Maximum consecutive words allowed
 * @returns Text with limited consecutive words
 */
function limitConsecutiveWords(text: string, maxConsecutiveWords: number): string {
  const words = text.split(' ');
  const result: string[] = [];
  let consecutiveCount = 0;
  
  for (let i = 0; i < words.length; i++) {
    result.push(words[i]);
    consecutiveCount++;
    
    // If we've hit the limit, add a paraphrase indicator
    if (consecutiveCount >= maxConsecutiveWords) {
      // Add a slight variation or break
      if (i < words.length - 1) {
        result.push('...');
        consecutiveCount = 0; // Reset counter
      }
    }
  }
  
  return result.join(' ').replace(/\s+\.\.\.\s+/g, '...');
}

/**
 * Creates a lighter take when extraction fails
 * @param title RSS title
 * @param source Article source
 * @returns Lighter take summary
 */
function createLighterTake(title: string, source: string): string {
  const companyMatch = title.match(/\b([A-Z][a-z]+(?: [A-Z][a-z]+)*)\b/);
  const company = companyMatch ? companyMatch[1] : 'the company';
  
  const contextPhrases = [
    `nice bump for ${company}`,
    `interesting move by ${company}`,
    `${company} making waves`,
    `notable development from ${company}`,
    `${company} in the spotlight`
  ];
  
  const contextPhrase = contextPhrases[Math.floor(Math.random() * contextPhrases.length)];
  const shortTitle = title.length > 100 ? title.substring(0, 100) + '...' : title;
  
  return `${shortTitle} — ${contextPhrase}`;
}

/**
 * Adds source domain to summary if not already present
 * @param summary Summary text
 * @param source Article source
 * @returns Summary with source domain
 */
function addSourceDomain(summary: string, source: string): string {
  // Handle undefined source
  if (!source) {
    return summary;
  }
  
  // Extract domain from source
  const domain = source.replace(/^https?:\/\//, '').split('/')[0].replace('www.', '');
  
  // Check if domain is already mentioned
  if (summary.toLowerCase().includes(domain.toLowerCase())) {
    return summary;
  }
  
  // Add domain in a natural way
  return `${summary} (via ${domain})`;
}
