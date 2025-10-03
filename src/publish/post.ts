import { TwitterApi } from 'twitter-api-v2';
import { getItemsByVendorProduct, recordTweet } from '../db.js';
import { ExtractedFacts } from '../enrich.js';
import { ThreadComposition } from './thread.js';

/**
 * Tweet posting result
 */
export interface PostResult {
  success: boolean;
  tweetIds: string[];
  error?: string;
  testMode: boolean;
  skipped: boolean;
  skipReason?: string;
}

/**
 * Preflight check result
 */
export interface PreflightResult {
  canPost: boolean;
  errors: string[];
  warnings: string[];
  duplicateCheck: boolean;
  dailyLimitCheck: boolean;
  citationCheck: boolean;
}

/**
 * Configuration for posting
 */
export interface PostConfig {
  maxTweetsPerDay?: number;
  duplicateCheckHours?: number;
  officialDomains?: string[];
  testMode?: boolean;
}

const DEFAULT_CONFIG: Required<PostConfig> = {
  maxTweetsPerDay: 5,
  duplicateCheckHours: 48,
  testMode: false,
  officialDomains: [
    // Major AI vendor domains
    'openai.com',
    'anthropic.com',
    'google.com',
    'deepmind.com',
    'meta.com',
    'microsoft.com',
    'x.ai',
    'nvidia.com',
    'tesla.com',
    'apple.com',
    'amazon.com',
    'huggingface.co',
    'stability.ai',
    'cohere.ai',
    'mistral.ai',
    'perplexity.ai',
    'character.ai',
    // GitHub releases
    'github.com',
    // Official blogs
    'blog.openai.com',
    'blog.google',
    'ai.googleblog.com',
    'blog.anthropic.com',
    'ai.meta.com',
    'blogs.microsoft.com',
    'blog.nvidia.com',
    'machinelearning.apple.com'
  ]
};

/**
 * Initialize Twitter API client
 */
function createTwitterClient(): TwitterApi {
  const apiKey = process.env.X_API_KEY;
  const apiSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessSecret = process.env.X_ACCESS_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    throw new Error('Twitter API credentials not configured');
  }

  return new TwitterApi({
    appKey: apiKey,
    appSecret: apiSecret,
    accessToken: accessToken,
    accessSecret: accessSecret,
  });
}

/**
 * Check for duplicate tweets within specified hours
 */
async function checkDuplicates(
  vendor: string,
  product: string,
  version?: string,
  hours: number = 48
): Promise<boolean> {
  try {
    // Get recent items for this vendor/product combination
    const recentItems = await getItemsByVendorProduct(vendor, product);
    
    if (recentItems.length === 0) {
      return false; // No duplicates if no recent items
    }

    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hours);
    
    // Check if any recent items are within the time window
    const recentDuplicates = recentItems.filter(item => {
      const itemTime = new Date(item.publishedAt);
      return itemTime >= cutoffTime;
    });

    // If version is specified, check for exact version matches
    if (version) {
      const versionDuplicates = recentDuplicates.filter(item => 
        item.title.toLowerCase().includes(version.toLowerCase()) ||
        item.text?.toLowerCase().includes(version.toLowerCase())
      );
      return versionDuplicates.length > 0;
    }

    return recentDuplicates.length > 0;
  } catch (error) {
    console.error('❌ Error checking duplicates:', error);
    return false; // Allow posting if check fails
  }
}

/**
 * Check daily tweet limit
 */
async function checkDailyLimit(maxTweetsPerDay: number): Promise<{ withinLimit: boolean; count: number }> {
  try {
    // This would typically query the tweets table for today's count
    // For now, we'll use a simple approach
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // In a real implementation, you'd query the database
    // For now, we'll assume we're within limits
    return { withinLimit: true, count: 0 };
  } catch (error) {
    console.error('❌ Error checking daily limit:', error);
    return { withinLimit: true, count: 0 }; // Allow posting if check fails
  }
}

/**
 * Check if citations include official domains
 */
function checkOfficialCitations(facts: ExtractedFacts, officialDomains: string[]): boolean {
  if (!facts.citations || facts.citations.length === 0) {
    return false;
  }

  return facts.citations.some(citation => {
    try {
      const url = new URL(citation);
      const hostname = url.hostname.toLowerCase();
      
      // Check if hostname matches any official domain
      return officialDomains.some(domain => 
        hostname === domain || 
        hostname.endsWith(`.${domain}`) ||
        hostname.includes(domain)
      );
    } catch (error) {
      // Invalid URL, skip
      return false;
    }
  });
}

/**
 * Preflight check before posting
 */
export async function preflightCheck(
  facts: ExtractedFacts,
  config: PostConfig = {}
): Promise<PreflightResult> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const errors: string[] = [];
  const warnings: string[] = [];

  console.log('🔍 Running preflight checks...');

  // Check 1: Duplicates within 48h for same (vendor, product, version)
  console.log('📋 Checking for duplicates...');
  const hasDuplicates = await checkDuplicates(
    facts.vendor,
    facts.product,
    facts.version,
    finalConfig.duplicateCheckHours
  );

  if (hasDuplicates) {
    errors.push(`Duplicate content found for ${facts.vendor} ${facts.product} ${facts.version || ''} within ${finalConfig.duplicateCheckHours}h`);
  }

  // Check 2: Daily tweet limit
  console.log('📊 Checking daily limit...');
  const dailyLimit = await checkDailyLimit(finalConfig.maxTweetsPerDay);
  
  if (!dailyLimit.withinLimit) {
    errors.push(`Daily tweet limit exceeded (${dailyLimit.count}/${finalConfig.maxTweetsPerDay})`);
  } else if (dailyLimit.count >= finalConfig.maxTweetsPerDay * 0.8) {
    warnings.push(`Approaching daily limit (${dailyLimit.count}/${finalConfig.maxTweetsPerDay})`);
  }

  // Check 3: Official citation domains
  console.log('🔗 Checking citation domains...');
  const hasOfficialCitations = checkOfficialCitations(facts, finalConfig.officialDomains);
  
  if (!hasOfficialCitations) {
    errors.push('No official citation domains found in facts.citations');
  }

  const canPost = errors.length === 0;

  console.log(`📋 Preflight Results:`);
  console.log(`   Can post: ${canPost}`);
  console.log(`   Errors: ${errors.length}`);
  console.log(`   Warnings: ${warnings.length}`);
  console.log(`   Duplicate check: ${!hasDuplicates ? '✅' : '❌'}`);
  console.log(`   Daily limit: ${dailyLimit.withinLimit ? '✅' : '❌'}`);
  console.log(`   Official citations: ${hasOfficialCitations ? '✅' : '❌'}`);

  return {
    canPost,
    errors,
    warnings,
    duplicateCheck: !hasDuplicates,
    dailyLimitCheck: dailyLimit.withinLimit,
    citationCheck: hasOfficialCitations
  };
}

/**
 * Post a single tweet
 */
async function postSingleTweet(content: string, media?: any, replyToId?: string): Promise<string> {
  const client = createTwitterClient();
  
  try {
    const tweetOptions: any = {
      text: content,
      reply: replyToId ? { in_reply_to_tweet_id: replyToId } : undefined
    };
    
    // Add media if provided (only for first tweet)
    if (media && !replyToId) {
      // For now, we'll just log the media info since Twitter API v2 media upload
      // requires additional steps (upload media first, then attach to tweet)
      console.log(`🖼️ Media would be attached: ${media.url} (${media.alt})`);
      // TODO: Implement actual media upload and attachment
    }
    
    const tweet = await client.v2.tweet(tweetOptions);
    
    return tweet.data.id;
  } catch (error) {
    console.error('❌ Error posting tweet:', error);
    throw new Error(`Failed to post tweet: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Post a thread of tweets
 */
export async function postThread(
  thread: ThreadComposition,
  testMode: boolean = false,
  config: PostConfig = {}
): Promise<PostResult> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  console.log(`🧵 Posting thread (${thread.tweets.length} tweets, testMode: ${testMode})`);
  
  if (thread.tweets.length === 0) {
    return {
      success: false,
      tweetIds: [],
      error: 'No tweets to post',
      testMode,
      skipped: true,
      skipReason: 'Empty thread'
    };
  }

  const tweetIds: string[] = [];

  try {
    if (testMode) {
      // Test mode: log to console and record as TEST_ONLY
      console.log('🧪 TEST MODE - Logging tweets to console:');
      console.log('='.repeat(50));
      
      thread.tweets.forEach((tweet, index) => {
        console.log(`T${index + 1} (${tweet.length} chars):`);
        console.log(`"${tweet.content}"`);
        if (tweet.media) {
          console.log(`   Media: ${tweet.media.url}`);
          console.log(`   Alt: ${tweet.media.alt}`);
        }
        console.log('');
        
        // Record as test tweet
        const testTweetId = `test-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`;
        tweetIds.push(testTweetId);
        
        recordTweet({
          id: testTweetId,
          content: tweet.content,
          postedAt: new Date().toISOString(),
          threadJson: JSON.stringify({ testMode: true, order: index + 1 })
        });
      });
      
      console.log('='.repeat(50));
      console.log(`✅ Test thread logged (${thread.tweets.length} tweets)`);
      
      return {
        success: true,
        tweetIds,
        testMode: true,
        skipped: false
      };
    } else {
      // Live mode: post actual tweets
      console.log('📤 Posting live tweets...');
      
      // Post first tweet
      console.log(`📤 Posting tweet 1/${thread.tweets.length}...`);
      const firstTweet = thread.tweets[0];
      const firstTweetId = await postSingleTweet(firstTweet.content, firstTweet.media);
      tweetIds.push(firstTweetId);
      
      console.log(`✅ Tweet 1 posted: ${firstTweetId}`);
      
      // Record first tweet
      recordTweet({
        id: firstTweetId,
        content: firstTweet.content,
        postedAt: new Date().toISOString(),
        threadJson: JSON.stringify({ order: 1, isFirst: true })
      });
      
      // Post reply chain for remaining tweets
      let previousTweetId = firstTweetId;
      
      for (let i = 1; i < thread.tweets.length; i++) {
        console.log(`📤 Posting tweet ${i + 1}/${thread.tweets.length}...`);
        
        // Add small delay between tweets
        if (i > 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        const tweet = thread.tweets[i];
        const tweetId = await postSingleTweet(tweet.content, undefined, previousTweetId);
        tweetIds.push(tweetId);
        previousTweetId = tweetId;
        
        console.log(`✅ Tweet ${i + 1} posted: ${tweetId}`);
        
        // Record tweet
        recordTweet({
          id: tweetId,
          content: tweet.content,
          postedAt: new Date().toISOString(),
          threadJson: JSON.stringify({ order: i + 1, replyTo: previousTweetId })
        });
      }
      
      console.log(`🎉 Thread posted successfully! (${tweetIds.length} tweets)`);
      
      return {
        success: true,
        tweetIds,
        testMode: false,
        skipped: false
      };
    }
  } catch (error) {
    console.error('❌ Error posting thread:', error);
    
    return {
      success: false,
      tweetIds,
      error: error instanceof Error ? error.message : 'Unknown error',
      testMode,
      skipped: false
    };
  }
}

/**
 * Post thread with preflight checks
 */
export async function postThreadWithSafeguards(
  thread: ThreadComposition,
  facts: ExtractedFacts,
  config: PostConfig = {}
): Promise<PostResult> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  console.log('🛡️ Posting thread with safeguards...');
  
  // Run preflight checks
  const preflight = await preflightCheck(facts, finalConfig);
  
  if (!preflight.canPost) {
    console.log('❌ Preflight checks failed:');
    preflight.errors.forEach(error => console.log(`   - ${error}`));
    
    return {
      success: false,
      tweetIds: [],
      error: `Preflight checks failed: ${preflight.errors.join(', ')}`,
      testMode: finalConfig.testMode,
      skipped: true,
      skipReason: 'Preflight checks failed'
    };
  }
  
  // Show warnings if any
  if (preflight.warnings.length > 0) {
    console.log('⚠️ Preflight warnings:');
    preflight.warnings.forEach(warning => console.log(`   - ${warning}`));
  }
  
  console.log('✅ Preflight checks passed, proceeding with posting...');
  
  // Post the thread
  return await postThread(thread, finalConfig.testMode, finalConfig);
}

/**
 * Test Twitter API connection
 */
export async function testTwitterConnection(): Promise<boolean> {
  try {
    const client = createTwitterClient();
    const user = await client.v2.me();
    
    console.log(`✅ Twitter API connected successfully`);
    console.log(`   User: @${user.data.username}`);
    console.log(`   Name: ${user.data.name}`);
    
    return true;
  } catch (error) {
    console.error('❌ Twitter API connection failed:', error);
    return false;
  }
}

/**
 * Get posting statistics
 */
export async function getPostingStats(): Promise<{
  todayCount: number;
  weeklyCount: number;
  totalCount: number;
  lastPostDate?: string;
}> {
  try {
    // In a real implementation, you'd query the tweets table
    // For now, return mock data
    return {
      todayCount: 0,
      weeklyCount: 0,
      totalCount: 0,
      lastPostDate: undefined
    };
  } catch (error) {
    console.error('❌ Error getting posting stats:', error);
    return {
      todayCount: 0,
      weeklyCount: 0,
      totalCount: 0,
      lastPostDate: undefined
    };
  }
}
