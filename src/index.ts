import dotenv from 'dotenv';
import { fetchRSSHeadlines } from './rss';
import { selectRSSItems, getRSSStats } from './select';
import { generateTweet, getTweetStats } from './templates';
import { postTweet, testTwitterConnection, getCurrentUser } from './postToX';

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
 * Main XBot orchestrator function
 * Handles the complete workflow: fetch → select → format → post
 */
async function runXBot(): Promise<void> {
  console.log('🤖 XBot Orchestrator Starting...');
  console.log('================================\n');

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

    // Step 4: Format and post tweets
    console.log('📝 Formatting and posting tweets...');
    const postedTweets: string[] = [];
    
    for (let i = 0; i < selectedHeadlines.length; i++) {
      const item = selectedHeadlines[i];
      
      try {
        console.log(`\n--- Tweet ${i + 1}/${selectedHeadlines.length} ---`);
        console.log(`📰 Source: ${item.source}`);
        console.log(`📄 Title: ${item.title}`);
        
        // Generate tweet
        const tweet = generateTweet(item);
        console.log(`📝 Generated tweet (${tweet.length} chars):`);
        console.log(`"${tweet}"`);
        
        // Post tweet
        console.log('📤 Posting to X...');
        const tweetId = await postTweet(tweet);
        postedTweets.push(tweetId);
        
        console.log(`✅ Posted successfully! Tweet ID: ${tweetId}`);
        console.log(`🔗 URL: https://twitter.com/user/status/${tweetId}`);
        
        // Add random delay between posts (except for the last one)
        if (i < selectedHeadlines.length - 1) {
          const delaySeconds = Math.floor(Math.random() * 6) + 5; // 5-10 seconds
          console.log(`⏳ Waiting ${delaySeconds} seconds before next post...`);
          await randomDelay(5000, 10000);
        }
        
      } catch (error) {
        console.error(`❌ Failed to post tweet ${i + 1}:`, error);
        // Continue with next tweet instead of stopping
      }
    }

    // Step 5: Summary
    console.log('\n🎉 XBot run completed!');
    console.log('====================');
    console.log(`📊 RSS headlines fetched: ${allHeadlines.length}`);
    console.log(`🎯 Headlines selected: ${selectedHeadlines.length}`);
    console.log(`📤 Tweets posted: ${postedTweets.length}`);
    
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
