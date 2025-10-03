import OpenAI from 'openai';
import { Ollama } from 'ollama';
import { summarizeArticle } from './summarize';
import { humanize } from './persona';
import { ExtractedArticle } from './extractor';

interface WritePostConfig {
  maxLength?: number;
  minLength?: number;
  includeSource?: boolean;
}

interface WritePostResult {
  content: string;
  provider: string;
  length: number;
  success: boolean;
  error?: string;
}

interface ThreadResult {
  isThread: boolean;
  tweets: string[];
  totalLength: number;
  success: boolean;
  error?: string;
}

const DEFAULT_CONFIG: Required<WritePostConfig> = {
  maxLength: 240,
  minLength: 200,
  includeSource: true,
};

/**
 * Writes a post using the configured AI provider or heuristic approach
 * @param title Article title
 * @param text Article text content
 * @param source Article source
 * @param config Configuration options
 * @returns Promise<WritePostResult> Generated post content
 */
export async function writePost(
  title: string,
  text: string,
  source: string,
  config: WritePostConfig = {}
): Promise<WritePostResult> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const aiProvider = process.env.AI_PROVIDER?.toLowerCase();

  console.log(`✍️ Writing post for "${title}" using ${aiProvider || 'heuristic'} approach`);

  try {
    let result: WritePostResult;

    switch (aiProvider) {
      case 'openai':
        result = await writeWithOpenAI(title, text, source, finalConfig);
        break;
      case 'ollama':
        result = await writeWithOllama(title, text, source, finalConfig);
        break;
      default:
        result = await writeWithHeuristic(title, text, source, finalConfig);
        break;
    }

    // Apply content quality filters
    result.content = removeClickbait(result.content);
    result.content = removeUnsupportedClaims(result.content);
    result.content = limitEmojis(result.content);
    
    // Ensure final content never exceeds 280 chars with URL
    result.content = hardTruncateForTweet(result.content, 280);
    result.length = result.content.length;

    console.log(`✅ Generated post (${result.length} chars) using ${result.provider}: ${result.content}`);
    return result;

  } catch (error) {
    console.error(`❌ Post writing failed:`, error);
    return {
      content: createFallbackPost(title, source),
      provider: 'fallback',
      length: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Writes a post or thread based on random chance (15% thread mode)
 * @param title Article title
 * @param text Article text content
 * @param source Article source
 * @param config Configuration options
 * @returns Promise<ThreadResult> Generated post or thread content
 */
export async function writePostOrThread(
  title: string,
  text: string,
  source: string,
  config: WritePostConfig = {}
): Promise<ThreadResult> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // 15% chance of thread mode
  const isThreadMode = Math.random() < 0.15;
  
  if (!isThreadMode) {
    // Regular single post
    const result = await writePost(title, text, source, config);
    return {
      isThread: false,
      tweets: [result.content],
      totalLength: result.length,
      success: result.success,
      error: result.error,
    };
  }
  
  // Thread mode
  console.log(`🧵 Thread mode activated! Creating 2-tweet thread for "${title}"`);
  
  try {
    // Generate main summary
    const summaryResult = await writePost(title, text, source, {
      ...config,
      maxLength: 240, // Shorter for thread
      minLength: 180,
    });
    
    // Extract key detail for second tweet
    const keyDetail = extractKeyDetail(title, text, source);
    
    // Create second tweet with key detail
    const secondTweet = createKeyDetailTweet(keyDetail, source);
    
    const tweets = [summaryResult.content, secondTweet];
    const totalLength = tweets.reduce((sum, tweet) => sum + tweet.length, 0);
    
    console.log(`✅ Generated thread (${tweets.length} tweets, ${totalLength} total chars)`);
    console.log(`   Tweet 1: "${tweets[0]}"`);
    console.log(`   Tweet 2: "${tweets[1]}"`);
    
    return {
      isThread: true,
      tweets,
      totalLength,
      success: true,
    };
    
  } catch (error) {
    console.error(`❌ Thread generation failed:`, error);
    // Fallback to single post
    const fallbackResult = await writePost(title, text, source, config);
    return {
      isThread: false,
      tweets: [fallbackResult.content],
      totalLength: fallbackResult.length,
      success: fallbackResult.success,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Writes post using OpenAI GPT
 * @param title Article title
 * @param text Article text content
 * @param source Article source
 * @param config Configuration options
 * @returns Promise<WritePostResult> Generated post content
 */
async function writeWithOpenAI(
  title: string,
  text: string,
  source: string,
  config: Required<WritePostConfig>
): Promise<WritePostResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not found in environment variables');
  }

  const openai = new OpenAI({ apiKey });
  const systemPrompt = `Write 2-3 sentence neutral, human, non-clickbait summary for X. Include source. ${config.maxLength}-${config.maxLength} chars. No emojis.`;
  
  const userPrompt = `Title: ${title}\nSource: ${source}\nContent: ${text.substring(0, 2000)}...`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content?.trim() || '';
    
    return {
      content: content || createFallbackPost(title, source),
      provider: 'openai',
      length: content.length,
      success: !!content,
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error(`OpenAI API failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Writes post using local Ollama
 * @param title Article title
 * @param text Article text content
 * @param source Article source
 * @param config Configuration options
 * @returns Promise<WritePostResult> Generated post content
 */
async function writeWithOllama(
  title: string,
  text: string,
  source: string,
  config: Required<WritePostConfig>
): Promise<WritePostResult> {
  const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
  const ollama = new Ollama({ host: ollamaHost });
  
  const systemPrompt = `Write 2-3 sentence neutral, human, non-clickbait summary for X. Include source. ${config.maxLength}-${config.maxLength} chars. No emojis.`;
  const userPrompt = `Title: ${title}\nSource: ${source}\nContent: ${text.substring(0, 2000)}...`;

  try {
    const response = await ollama.chat({
      model: 'llama3:instruct',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      options: {
        temperature: 0.7,
        num_predict: 150,
      },
    });

    const content = response.message?.content?.trim() || '';
    
    return {
      content: content || createFallbackPost(title, source),
      provider: 'ollama',
      length: content.length,
      success: !!content,
    };
  } catch (error) {
    console.error('Ollama API error:', error);
    throw new Error(`Ollama API failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Writes post using heuristic approach (summarize + humanize)
 * @param title Article title
 * @param text Article text content
 * @param source Article source
 * @param config Configuration options
 * @returns Promise<WritePostResult> Generated post content
 */
async function writeWithHeuristic(
  title: string,
  text: string,
  source: string,
  config: Required<WritePostConfig>
): Promise<WritePostResult> {
  try {
    // If text is too short (<400 chars), use fallback approach
    if (text.length < 400) {
      console.log(`⚠️ Insufficient content (${text.length} chars), using RSS title + what it means`);
      return {
        content: createFallbackPost(title, source),
        provider: 'fallback',
        length: 0,
        success: true,
      };
    }

    // Create a mock ExtractedArticle for the heuristic functions
    const extractedArticle: ExtractedArticle = {
      success: true,
      title,
      text,
      source,
      url: '', // Not needed for this use case
      fallbackUsed: false,
    };

    // Use existing summarize and humanize functions
    const summary = await summarizeArticle(extractedArticle, {
      maxLength: config.maxLength,
      minLength: config.minLength,
      includeContext: true,
      includeImpact: true,
    });

    const humanizedSummary = humanize(summary, source, 'conversational', {
      maxLength: config.maxLength,
      minLength: config.minLength,
      includeRhetoricalDevice: true,
      includeVoicePrefix: true,
      includeCloser: true,
      includeEmoji: false, // Default OFF
      emojiChance: 0.12,
    });

    return {
      content: humanizedSummary,
      provider: 'heuristic',
      length: humanizedSummary.length,
      success: true,
    };
  } catch (error) {
    console.error('Heuristic approach error:', error);
    throw new Error(`Heuristic approach failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Creates a fallback post when all methods fail
 * @param title Article title
 * @param source Article source
 * @returns Fallback post content
 */
function createFallbackPost(title: string, source: string): string {
  const shortTitle = title.length > 100 ? title.substring(0, 100) + '...' : title;
  
  // Add "what it means" mini-line
  const whatItMeans = generateWhatItMeans(title);
  
  return `${shortTitle} ${whatItMeans}`;
}

/**
 * Clickbait words and phrases to avoid
 */
const CLICKBAIT_PATTERNS = [
  'shocking', 'insane', 'amazing', 'incredible', 'unbelievable', 'mind-blowing',
  'you won\'t believe', 'this will blow your mind', 'game-changing', 'revolutionary',
  'breakthrough', 'first-ever', 'never before seen', 'exclusive', 'secret',
  'what happens next', 'the truth about', 'doctors hate this', 'one weird trick',
  'this simple trick', 'you\'ll never guess', 'the shocking truth', 'must-see',
  'viral', 'trending', 'breaking', 'urgent', 'alert', 'warning', 'danger'
];

/**
 * Unsupported claim patterns to avoid
 */
const UNSUPPORTED_CLAIMS = [
  'proven to', 'scientifically proven', 'guaranteed to', 'will definitely',
  'always', 'never', 'everyone', 'no one', 'all', 'none', '100%',
  'completely', 'totally', 'absolutely', 'certainly', 'definitely',
  'without a doubt', 'undoubtedly', 'clearly', 'obviously'
];

/**
 * Extracts key detail (metric/name) from article content
 * @param title Article title
 * @param text Article text
 * @param source Article source
 * @returns Key detail string
 */
function extractKeyDetail(title: string, text: string, source: string): string {
  const lowerText = text.toLowerCase();
  const lowerTitle = title.toLowerCase();
  
  // Look for metrics and numbers
  const metricPatterns = [
    /\$[\d,]+(?:\.\d+)?[kmb]?/gi, // Money: $1.2B, $500M, $50K
    /\d+(?:\.\d+)?%/, // Percentages: 15%, 2.5%
    /\d+(?:\.\d+)?[kmb]?\s*(?:users?|customers?|subscribers?|downloads?|views?|followers?)/gi, // User metrics
    /\d+(?:\.\d+)?[kmb]?\s*(?:million|billion|thousand)/gi, // Scale indicators
    /\d+(?:\.\d+)?[kmb]?\s*(?:dollars?|USD|euros?|pounds?)/gi, // Currency amounts
  ];
  
  // Look for company/product names
  const namePatterns = [
    /\b(OpenAI|Google|Microsoft|Apple|Meta|Amazon|Tesla|NVIDIA|Intel|AMD|Netflix|Spotify|Uber|Airbnb)\b/gi,
    /\b(GPT-\d+|ChatGPT|Claude|Bard|Gemini|DALL-E|Midjourney|Stable Diffusion)\b/gi,
    /\b(version \d+|v\d+\.\d+|\d+\.\d+)/gi, // Version numbers
  ];
  
  // Extract metrics
  for (const pattern of metricPatterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      const metric = matches[0].trim();
      if (metric.length <= 50) { // Keep it concise
        return metric;
      }
    }
  }
  
  // Also check title for metrics
  for (const pattern of metricPatterns) {
    const matches = title.match(pattern);
    if (matches && matches.length > 0) {
      const metric = matches[0].trim();
      if (metric.length <= 50) {
        return metric;
      }
    }
  }
  
  // Extract names
  for (const pattern of namePatterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      const name = matches[0].trim();
      if (name.length <= 30) { // Keep it concise
        return name;
      }
    }
  }
  
  // Also check title for names
  for (const pattern of namePatterns) {
    const matches = title.match(pattern);
    if (matches && matches.length > 0) {
      const name = matches[0].trim();
      if (name.length <= 30) {
        return name;
      }
    }
  }
  
  // Fallback: extract from title
  const titleWords = title.split(' ');
  if (titleWords.length >= 2) {
    // Look for capitalized words (likely names)
    const capitalizedWords = titleWords.filter(word => 
      word.length > 2 && word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase()
    );
    
    if (capitalizedWords.length > 0) {
      return capitalizedWords[0];
    }
  }
  
  // Final fallback
  return 'key development';
}

/**
 * Creates the second tweet with key detail and source
 * @param keyDetail Key detail to highlight
 * @param source Article source
 * @returns Second tweet content
 */
function createKeyDetailTweet(keyDetail: string, source: string): string {
  const domain = source.replace(/^https?:\/\//, '').split('/')[0].replace('www.', '');
  
  // Create different formats based on key detail type
  if (keyDetail.includes('$') || keyDetail.includes('%')) {
    // It's a metric
    return `Key metric: ${keyDetail} — ${domain}`;
  } else if (keyDetail.match(/\d/)) {
    // It contains numbers
    return `Notable: ${keyDetail} — ${domain}`;
  } else {
    // It's a name or concept
    return `Focus: ${keyDetail} — ${domain}`;
  }
}

/**
 * Generates a "what it means" mini-line based on title content
 * @param title Article title
 * @returns What it means mini-line
 */
function generateWhatItMeans(title: string): string {
  const lowerTitle = title.toLowerCase();
  
  // AI/ML related
  if (lowerTitle.includes('ai') || lowerTitle.includes('artificial intelligence')) {
    return '— AI advancement that could reshape how we work.';
  }
  if (lowerTitle.includes('machine learning') || lowerTitle.includes('ml')) {
    return '— ML breakthrough with real-world applications.';
  }
  if (lowerTitle.includes('neural') || lowerTitle.includes('deep learning')) {
    return '— Neural network innovation pushing boundaries.';
  }
  
  // Startup/Company related
  if (lowerTitle.includes('startup') || lowerTitle.includes('funding') || lowerTitle.includes('raise')) {
    return '— Startup move that signals market direction.';
  }
  if (lowerTitle.includes('launch') || lowerTitle.includes('release')) {
    return '— Product launch that could change the game.';
  }
  if (lowerTitle.includes('acquisition') || lowerTitle.includes('merger')) {
    return '— Strategic move with industry implications.';
  }
  
  // Tech/Innovation related
  if (lowerTitle.includes('breakthrough') || lowerTitle.includes('innovation')) {
    return '— Breakthrough that could be transformative.';
  }
  if (lowerTitle.includes('research') || lowerTitle.includes('study')) {
    return '— Research findings with practical potential.';
  }
  if (lowerTitle.includes('platform') || lowerTitle.includes('tool')) {
    return '— New tool that could streamline workflows.';
  }
  
  // Default fallback
  return '— Development worth watching closely.';
}

/**
 * Detects and removes clickbait language
 * @param text Text to clean
 * @returns Cleaned text without clickbait
 */
function removeClickbait(text: string): string {
  let cleaned = text;
  
  // Remove clickbait patterns
  for (const pattern of CLICKBAIT_PATTERNS) {
    const regex = new RegExp(`\\b${pattern}\\b`, 'gi');
    cleaned = cleaned.replace(regex, '');
  }
  
  // Clean up extra spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

/**
 * Detects and removes unsupported claims
 * @param text Text to clean
 * @returns Cleaned text without unsupported claims
 */
function removeUnsupportedClaims(text: string): string {
  let cleaned = text;
  
  // Replace unsupported claims with more cautious language
  for (const claim of UNSUPPORTED_CLAIMS) {
    const regex = new RegExp(`\\b${claim}\\b`, 'gi');
    cleaned = cleaned.replace(regex, 'may');
  }
  
  // Clean up extra spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

/**
 * Limits emojis to maximum 1
 * @param text Text to limit emojis
 * @returns Text with max 1 emoji
 */
function limitEmojis(text: string): string {
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
  const emojis = text.match(emojiRegex);
  
  if (!emojis || emojis.length <= 1) {
    return text;
  }
  
  // Keep only the first emoji
  const firstEmoji = emojis[0];
  const firstEmojiIndex = text.indexOf(firstEmoji);
  
  // Remove all other emojis
  let cleaned = text.replace(emojiRegex, '');
  
  // Add back the first emoji at its original position
  if (firstEmojiIndex !== -1) {
    const beforeEmoji = text.substring(0, firstEmojiIndex);
    const afterEmoji = text.substring(firstEmojiIndex + firstEmoji.length);
    cleaned = beforeEmoji + firstEmoji + afterEmoji.replace(emojiRegex, '');
  }
  
  // Clean up extra spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

/**
 * Hard truncates content to fit within tweet character limit
 * @param content Content to truncate
 * @param maxLength Maximum length (280 for tweets)
 * @returns Truncated content
 */
function hardTruncateForTweet(content: string, maxLength: number): string {
  if (content.length <= maxLength) {
    return content;
  }

  // Reserve space for URL (typically ~23 chars) and some buffer
  const reservedSpace = 30;
  const availableLength = maxLength - reservedSpace;
  
  if (availableLength <= 0) {
    return content.substring(0, maxLength - 3) + '...';
  }

  // Try to truncate at sentence boundary
  const sentences = content.split(/[.!?]+/);
  let truncated = '';
  
  for (const sentence of sentences) {
    const testLength = truncated.length + sentence.length + 1;
    if (testLength <= availableLength) {
      truncated += (truncated ? '. ' : '') + sentence;
    } else {
      break;
    }
  }

  // If no sentences fit, truncate at word boundary
  if (!truncated) {
    const words = content.split(' ');
    for (const word of words) {
      const testLength = truncated.length + word.length + 1;
      if (testLength <= availableLength) {
        truncated += (truncated ? ' ' : '') + word;
      } else {
        break;
      }
    }
  }

  // Final fallback: character truncation
  if (!truncated || truncated.length > availableLength) {
    truncated = content.substring(0, availableLength);
  }

  return truncated + '...';
}

/**
 * Writes multiple posts in parallel
 * @param posts Array of post data
 * @param config Configuration options
 * @returns Promise<WritePostResult[]> Array of generated posts
 */
export async function writeMultiplePosts(
  posts: Array<{ title: string; text: string; source: string }>,
  config: WritePostConfig = {}
): Promise<WritePostResult[]> {
  console.log(`✍️ Writing ${posts.length} posts in parallel...`);
  
  const promises = posts.map(post => 
    writePost(post.title, post.text, post.source, config)
  );
  
  const results = await Promise.allSettled(promises);
  
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      console.error(`❌ Post ${index + 1} failed:`, result.reason);
      return {
        content: createFallbackPost(posts[index].title, posts[index].source),
        provider: 'fallback',
        length: 0,
        success: false,
        error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
      };
    }
  });
}

/**
 * Gets statistics about written posts
 * @param results Array of WritePostResult
 * @returns Statistics object
 */
export function getWriteStats(results: WritePostResult[]) {
  const successful = results.filter(r => r.success);
  const providers = results.reduce((acc, r) => {
    acc[r.provider] = (acc[r.provider] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const lengths = results.map(r => r.length);
  const averageLength = lengths.length > 0 ? Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length) : 0;

  return {
    total: results.length,
    successful: successful.length,
    successRate: results.length > 0 ? Math.round((successful.length / results.length) * 100) : 0,
    providers,
    averageLength,
    lengthDistribution: {
      short: lengths.filter(l => l < 200).length,
      medium: lengths.filter(l => l >= 200 && l <= 240).length,
      long: lengths.filter(l => l > 240).length,
    },
  };
}
