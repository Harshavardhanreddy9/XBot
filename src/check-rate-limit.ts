import dotenv from 'dotenv';
import { TwitterApi } from 'twitter-api-v2';

dotenv.config();

async function checkRateLimit() {
  console.log('🔍 Checking Twitter API Rate Limits');
  console.log('==================================\n');

  try {
    // Create Twitter client
    const client = new TwitterApi({
      appKey: process.env.X_API_KEY || '',
      appSecret: process.env.X_API_SECRET || '',
      accessToken: process.env.X_ACCESS_TOKEN || '',
      accessSecret: process.env.X_ACCESS_SECRET || '',
    });

    console.log('✅ Twitter client created');

    // Check rate limits for different endpoints
    console.log('\n📊 Checking Rate Limits...');
    
    try {
      // Check user info endpoint
      const userInfo = await client.v2.me();
      console.log('✅ User info retrieved successfully');
      console.log(`👤 User: @${userInfo.data.username} (${userInfo.data.name})`);
    } catch (error: any) {
      console.log('❌ User info failed:', error.message);
      
      if (error.rateLimit) {
        console.log('\n📊 Rate Limit Details:');
        console.log(`   Limit: ${error.rateLimit.limit}`);
        console.log(`   Remaining: ${error.rateLimit.remaining}`);
        console.log(`   Reset: ${new Date(error.rateLimit.reset * 1000).toLocaleString()}`);
        
        if (error.rateLimit.userDay) {
          console.log(`   Daily Limit: ${error.rateLimit.userDay.limit}`);
          console.log(`   Daily Remaining: ${error.rateLimit.userDay.remaining}`);
          console.log(`   Daily Reset: ${new Date(error.rateLimit.userDay.reset * 1000).toLocaleString()}`);
        }
      }
    }

    // Try to get rate limit status for tweet posting
    try {
      console.log('\n🐦 Checking Tweet Posting Rate Limits...');
      const rateLimitStatus = await client.v1.rateLimitStatuses();
      
      console.log('📊 Rate Limit Status:');
      if (rateLimitStatus.resources?.statuses?.['/statuses/update']) {
        const statusUpdate = rateLimitStatus.resources.statuses['/statuses/update'];
        console.log(`   Statuses/update: ${statusUpdate.remaining}/${statusUpdate.limit}`);
        console.log(`   Reset: ${new Date(statusUpdate.reset * 1000).toLocaleString()}`);
      } else {
        console.log('   Statuses/update: Rate limit info not available');
      }
      
    } catch (error: any) {
      console.log('❌ Rate limit status check failed:', error.message);
    }

    // Try a simple test tweet (dry run)
    try {
      console.log('\n🧪 Testing Tweet Creation (Dry Run)...');
      const testTweet = 'Test tweet - ' + new Date().toISOString();
      console.log(`📝 Test tweet: "${testTweet}"`);
      console.log('⚠️ This would post a real tweet - skipping for safety');
      
    } catch (error: any) {
      console.log('❌ Tweet test failed:', error.message);
    }

  } catch (error) {
    console.error('❌ Error checking rate limits:', error);
  }
}

// Run the check
checkRateLimit();
