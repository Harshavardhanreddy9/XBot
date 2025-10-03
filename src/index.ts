import dotenv from 'dotenv';
import { fetchRSSHeadlines } from './rss.js';
import { selectRSSItems, getRSSStats } from './select.js';
import { postTweet, testTwitterConnection, getCurrentUser } from './postToX.js';
import { extractArticle } from './extractor.js';
import { writePost, writePostOrThread, getWriteStats } from './writer.js';
import { resetOpenerTracking } from './persona.js';
import { isDuplicateTweet, addTweetToHistory, getTweetStats, cleanupOldHistory } from './tweet-history.js';

// Load environment variables
dotenv.config();

/**
 * Generates a random delay between min and max milliseconds
 * @param min Minimum delay in milliseconds
 * @param max Maximum delay in milliseconds
 * @returns Promise that resolves after the delay
 */
function randomDelay(min: number, max: number): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Extracts domain from URL for short source display
 * @param url Full URL
 * @returns Short domain name
 */
export function getShortDomain(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return domain.replace('www.', '').split('.')[0];
  } catch {
    return 'Unknown';
  }
}

/**
 * Hashtag sets for rotation
 */
const HASHTAG_SETS = [
  ['#AI', '#GenAI'],
  ['#MachineLearning', '#TechNews'],
  ['#Innovation', '#Startup'],
  ['#Tech', '#Future'],
  ['#DataScience', '#Automation'],
  ['#DeepLearning', '#NeuralNetworks'],
  ['#TechNews', '#Innovation'],
  ['#AI', '#Tech'],
];

/**
 * Selects hashtags from rotating sets with 30% chance of none
 * @returns Array of hashtags
 */
export function selectHashtags(): string[] {
  // 30% chance of no hashtags
  if (Math.random() < 0.3) {
    return [];
  }
  
  // Select a random set
  const set = HASHTAG_SETS[Math.floor(Math.random() * HASHTAG_SETS.length)];
  
  // Randomly select 0-2 hashtags from the set
  const count = Math.floor(Math.random() * 3); // 0, 1, or 2 hashtags
  return set.sort(() => 0.5 - Math.random()).slice(0, count);
}

/**
 * Trims text to fit within character limit, prioritizing opener
 * @param text Text to trim
 * @param maxLength Maximum allowed length
 * @returns Trimmed text
 */
function trimToFit(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  // Try to trim the middle sentence first
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  if (sentences.length > 2) {
    // Remove middle sentences, keep first and last
    const trimmed = `${sentences[0]}. ${sentences[sentences.length - 1]}.`;
    if (trimmed.length <= maxLength) {
      return trimmed;
    }
  }
  
  // If still too long, shorten the opener
  const firstSentence = sentences[0] || text;
  const availableLength = maxLength - 3; // Reserve space for "..."
  
  if (firstSentence.length > availableLength) {
    return firstSentence.substring(0, availableLength) + '...';
  }
  
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Creates final tweet from humanized summary, source, and URL
 * @param humanizedSummary Humanized summary text
 * @param source Article source
 * @param url Article URL
 * @returns Final tweet text
 */
export function createFinalTweet(humanizedSummary: string, source: string, url: string): string {
  const shortDomain = getShortDomain(url);
  const hashtags = selectHashtags();
  const hashtagString = hashtags.length > 0 ? ' ' + hashtags.join(' ') : '';
  
  // Build tweet: summary + source + hashtags + URL
  const tweet = `${humanizedSummary} — ${shortDomain}${hashtagString} ${url}`;
  
  // Ensure it fits within 280 characters
  if (tweet.length <= 280) {
    return tweet;
  }
  
  // Calculate available space for summary
  const reservedSpace = ` — ${shortDomain}${hashtagString} ${url}`.length;
  const availableForSummary = 280 - reservedSpace;
  
  // Trim the summary to fit
  const trimmedSummary = trimToFit(humanizedSummary, availableForSummary);
  
  return `${trimmedSummary} — ${shortDomain}${hashtagString} ${url}`;
}

/**
 * Check if we've hit daily posting limit
 */
function checkDailyLimit(): boolean {
  const dailyLimit = parseInt(process.env.DAILY_POST_LIMIT || '5', 10);
  const stats = getTweetStats();
  
  if (stats.recentTweets >= dailyLimit) {
    console.log(`🚫 Daily posting limit reached (${stats.recentTweets}/${dailyLimit})`);
    console.log(`📅 Last tweet: ${stats.lastTweetDate ? new Date(stats.lastTweetDate).toLocaleString() : 'Never'}`);
    return true;
  }
  
  console.log(`📊 Daily limit check: ${stats.recentTweets}/${dailyLimit} tweets used`);
  return false;
}

/**
 * Main XBot orchestrator function
 * Handles the complete workflow: fetch → select → format → post
 */
export async function runXBot(): Promise<void> {
  console.log('🤖 XBot Orchestrator Starting...');
  console.log('================================\n');

  // Check if we're in test mode
  const testMode = process.env.TEST_MODE === 'true';
  if (testMode) {
    console.log('🧪 TEST MODE ENABLED - No tweets will be posted');
    console.log('===============================================\n');
  }

  try {
    // Step 1: Check Twitter configuration
    console.log('🔐 Checking Twitter API configuration...');
    const isTwitterConfigured = await testTwitterConnection();
    
    if (!isTwitterConfigured) {
      console.log('❌ Twitter API not properly configured');
      console.log('Please check your .env file and ensure all credentials are set:');
      console.log('- X_API_KEY');
      console.log('- X_API_SECRET');
      console.log('- X_ACCESS_TOKEN');
      console.log('- X_ACCESS_SECRET');
      console.log('\nRun: npm run auth to complete OAuth flow if needed');
      process.exit(1);
    }

    console.log('✅ Twitter API configured successfully');
    const user = await getCurrentUser();
    console.log(`👤 Authenticated as: @${user.username} (${user.name})\n`);

    // Step 2: Fetch RSS headlines
    console.log('📰 Fetching RSS headlines...');
    const allHeadlines = await fetchRSSHeadlines();
    
    if (allHeadlines.length === 0) {
      console.log('⚠️ No headlines fetched from RSS feeds');
      return;
    }

    // Show RSS statistics
    const rssStats = getRSSStats(allHeadlines);
    console.log(`✅ Fetched ${rssStats.totalItems} headlines from ${rssStats.uniqueSources} sources`);
    console.log(`📅 Date range: ${new Date(rssStats.dateRange.oldest).toLocaleDateString()} - ${new Date(rssStats.dateRange.newest).toLocaleDateString()}\n`);

    // Step 3: Select headlines based on POSTS_PER_RUN
    const postsPerRun = parseInt(process.env.POSTS_PER_RUN || '1');
    const maxItems = Math.min(postsPerRun, 3); // Cap at 3 items max
    
    console.log(`🎯 Selecting top ${maxItems} headlines...`);
    const selectedHeadlines = selectRSSItems(allHeadlines, {
      maxItems,
      removeDuplicates: true,
      sortByDate: true
    });

    if (selectedHeadlines.length === 0) {
      console.log('⚠️ No headlines selected for posting');
      return;
    }

    console.log(`✅ Selected ${selectedHeadlines.length} headlines for posting\n`);

    // Step 3.5: Check daily posting limit
    if (checkDailyLimit()) {
      console.log('⏭️ Skipping posting due to daily limit');
      return;
    }

    // Step 3.6: Clean up old tweet history
    cleanupOldHistory();

    // Step 4: Process each selected headline
    console.log('📝 Processing selected headlines...');
    
    // Reset opener tracking for this batch
    resetOpenerTracking();
    
    const postedTweets: string[] = [];
    const writeResults: any[] = [];
    
    for (let i = 0; i < selectedHeadlines.length; i++) {
      const item = selectedHeadlines[i];
      
      try {
        console.log(`\n--- Processing ${i + 1}/${selectedHeadlines.length} ---`);
        console.log(`📰 Source: ${item.source}`);
        console.log(`📄 Title: ${item.title}`);
        console.log(`🔗 URL: ${item.link}`);
        
        // Step 4a: Extract article content
        console.log('📄 Extracting article content...');
        const extractedArticle = await extractArticle(item.link, item, {
          timeout: 15000,
          maxRetries: 2,
        });
        
        console.log(`🔍 Extraction: ${extractedArticle.success ? '✅ Success' : '⚠️ Fallback'}`);
        if (extractedArticle.success) {
          console.log(`📝 Article text length: ${extractedArticle.text.length} characters`);
        }
        
        // Step 4b: Write post or thread using configured AI provider
        console.log('✍️ Writing post or thread...');
        const threadResult = await writePostOrThread(
          extractedArticle.title,
          extractedArticle.text,
          extractedArticle.source,
          {
            maxLength: 240,
            minLength: 200,
            includeSource: true,
          }
        );
        
        // Convert to WritePostResult format for compatibility
        const writeResult = {
          content: threadResult.tweets[0],
          provider: 'heuristic', // Will be updated based on actual provider
          length: threadResult.tweets[0].length,
          success: threadResult.success,
          error: threadResult.error,
        };
        
        writeResults.push(writeResult);
        
        if (threadResult.isThread) {
          console.log(`🧵 Generated thread (${threadResult.tweets.length} tweets, ${threadResult.totalLength} total chars)`);
        } else {
          console.log(`📝 Generated post (${writeResult.length} chars) using ${writeResult.provider}: ${writeResult.content}`);
        }
        
          // Step 4c: Create final tweets with URLs
          console.log('📝 Creating final tweet(s)...');
          const finalTweets = threadResult.tweets.map(tweet =>
            createFinalTweet(tweet, item.source, item.link)
          );

          finalTweets.forEach((tweet, index) => {
            console.log(`📝 Tweet ${index + 1} (${tweet.length} chars):`);
            console.log(`"${tweet}"`);
          });

          // Step 4c.5: Check for duplicates
          const enableDuplicateCheck = process.env.ENABLE_DUPLICATE_CHECK !== 'false';
          if (enableDuplicateCheck) {
            const isDuplicate = finalTweets.some(tweet => isDuplicateTweet(tweet));
            if (isDuplicate) {
              console.log('🚫 Skipping duplicate tweet(s)');
              continue; // Skip to next headline
            }
          }
        
        // Step 4d: Post tweets with error handling
        if (testMode) {
          console.log('🧪 TEST MODE: Would post tweet(s) but skipping actual posting');
          console.log('📊 Tweet stats:');
          finalTweets.forEach((tweet, index) => {
            console.log(`   Tweet ${index + 1}: ${tweet.length} chars`);
          });
          continue; // Skip actual posting
        }

        console.log('📤 Posting to X...');
        let postSuccess = false;
        
        try {
          if (threadResult.isThread) {
            // Post thread (tweets in sequence)
            console.log('🧵 Posting thread...');
            let previousTweetId: string | null = null;
            
            for (let i = 0; i < finalTweets.length; i++) {
              const tweet = finalTweets[i];
              console.log(`📤 Posting tweet ${i + 1}/${finalTweets.length}...`);
              
              try {
                  const tweetId = await postTweet(tweet, previousTweetId);
                  postedTweets.push(tweetId);
                  previousTweetId = tweetId;
                  postSuccess = true;

                  // Add to tweet history
                  addTweetToHistory(tweetId, tweet, item.link, item.source);

                  console.log(`✅ Tweet ${i + 1} posted! ID: ${tweetId}`);
                  console.log(`🔗 URL: https://twitter.com/user/status/${tweetId}`);
                
                // Add delay between thread tweets
                if (i < finalTweets.length - 1) {
                  await randomDelay(1000, 3000); // 1-3 seconds between tweets
                }
              } catch (tweetError) {
                console.error(`❌ Failed to post tweet ${i + 1}:`, tweetError);
                // Continue with next tweet
              }
            }
          } else {
              // Post single tweet
              const tweetId = await postTweet(finalTweets[0]);
              postedTweets.push(tweetId);
              postSuccess = true;

              // Add to tweet history
              addTweetToHistory(tweetId, finalTweets[0], item.link, item.source);

              console.log(`✅ Posted successfully! Tweet ID: ${tweetId}`);
              console.log(`🔗 URL: https://twitter.com/user/status/${tweetId}`);
          }
        } catch (postError) {
          console.error(`❌ Posting failed:`, postError);
          
          // Single retry for rate limits or network errors
          if (postError instanceof Error && (
            postError.message.includes('rate limit') || 
            postError.message.includes('network') ||
            postError.message.includes('timeout') ||
            postError.message.includes('429')
          )) {
            console.log('🔄 Retrying post once...');
            try {
              await randomDelay(2000, 5000); // Wait 2-5 seconds before retry
              const tweetId = await postTweet(finalTweets[0]);
              postedTweets.push(tweetId);
              postSuccess = true;
              console.log(`✅ Posted successfully on retry! Tweet ID: ${tweetId}`);
              console.log(`🔗 URL: https://twitter.com/user/status/${tweetId}`);
            } catch (retryError) {
              console.error(`❌ Retry also failed:`, retryError);
              console.log('⏭️ Skipping this post and continuing...');
            }
          } else {
            console.log('⏭️ Skipping this post and continuing...');
          }
        }
        
        // Add jitter between posts (except for the last one and only if post was successful)
        if (postSuccess && i < selectedHeadlines.length - 1) {
          const delaySeconds = Math.floor(Math.random() * 31); // 0-30 seconds
          console.log(`⏳ Waiting ${delaySeconds} seconds before next post...`);
          await randomDelay(0, 30000);
        }
        
      } catch (error) {
        console.error(`❌ Failed to process item ${i + 1}:`, error);
        // Continue with next item instead of stopping
      }
    }

    // Step 5: Summary
    console.log('\n🎉 XBot run completed!');
    console.log('====================');
    console.log(`📊 RSS headlines fetched: ${allHeadlines.length}`);
    console.log(`🎯 Headlines selected: ${selectedHeadlines.length}`);
    console.log(`📤 Tweets posted: ${postedTweets.length}`);
    
    // Show tweet history stats
    const tweetStats = getTweetStats();
    console.log('\n📈 Tweet History Stats:');
    console.log(`   Total tweets: ${tweetStats.totalTweets}`);
    console.log(`   Recent tweets (7 days): ${tweetStats.recentTweets}`);
    console.log(`   Sources: ${tweetStats.uniqueSources.join(', ')}`);
    if (tweetStats.lastTweetDate) {
      console.log(`   Last tweet: ${new Date(tweetStats.lastTweetDate).toLocaleString()}`);
    }
    
    // Show write statistics
    if (writeResults.length > 0) {
      const writeStats = getWriteStats(writeResults);
      console.log(`\n📝 Write Statistics:`);
      console.log(`   Provider: ${Object.keys(writeStats.providers).join(', ')}`);
      console.log(`   Success rate: ${writeStats.successRate}%`);
      console.log(`   Average length: ${writeStats.averageLength} chars`);
      console.log(`   Length distribution: ${writeStats.lengthDistribution.short} short, ${writeStats.lengthDistribution.medium} medium, ${writeStats.lengthDistribution.long} long`);
    }
    
    if (postedTweets.length > 0) {
      console.log('\n🔗 Posted tweets:');
      postedTweets.forEach((tweetId, index) => {
        console.log(`   ${index + 1}. https://twitter.com/user/status/${tweetId}`);
      });
    }

  } catch (error) {
    console.error('❌ XBot run failed:', error);
    process.exit(1);
  }
}

// Run the XBot orchestrator
runXBot();
