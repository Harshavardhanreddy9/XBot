import { TwitterApi } from 'twitter-api-v2';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Twitter API credentials from environment variables
const twitterConfig = {
  appKey: process.env.X_API_KEY || '',
  appSecret: process.env.X_API_SECRET || '',
  accessToken: process.env.X_ACCESS_TOKEN || '',
  accessSecret: process.env.X_ACCESS_SECRET || '',
};

// Create Twitter API client
const twitterClient = new TwitterApi({
  appKey: twitterConfig.appKey,
  appSecret: twitterConfig.appSecret,
  accessToken: twitterConfig.accessToken,
  accessSecret: twitterConfig.accessSecret,
});

/**
 * Post a tweet to Twitter
 * @param text The text content of the tweet
 * @returns Promise<string> The ID of the posted tweet
 */
export async function postTweet(text: string): Promise<string> {
  try {
    // Validate credentials
    if (!twitterConfig.appKey || !twitterConfig.appSecret) {
      throw new Error('Twitter API credentials are missing. Please check your .env file.');
    }

    if (!twitterConfig.accessToken || !twitterConfig.accessSecret) {
      throw new Error('Twitter access tokens are missing. You need to complete OAuth flow.');
    }

    console.log('Posting tweet...');
    console.log(`Content: ${text}`);
    
    const tweet = await twitterClient.v2.tweet(text);
    
    console.log(`✓ Tweet posted successfully! ID: ${tweet.data.id}`);
    return tweet.data.id;
  } catch (error) {
    console.error('✗ Error posting tweet:', error);
    throw new Error(`Failed to post tweet: ${error}`);
  }
}

/**
 * Get user information
 * @returns Promise<any> User information
 */
export async function getUserInfo(): Promise<any> {
  try {
    const user = await twitterClient.v2.me();
    console.log(`✓ Authenticated as: @${user.data.username}`);
    return user.data;
  } catch (error) {
    console.error('✗ Error getting user info:', error);
    throw new Error(`Failed to get user info: ${error}`);
  }
}

/**
 * Check if Twitter API credentials are properly configured
 * @returns boolean True if credentials are configured
 */
export function isTwitterConfigured(): boolean {
  return !!(twitterConfig.appKey && twitterConfig.appSecret && 
           twitterConfig.accessToken && twitterConfig.accessSecret);
}

/**
 * Get OAuth URL for Twitter authentication
 * This is needed to get access tokens
 * @returns Promise<string> OAuth URL
 */
export async function getOAuthUrl(): Promise<string> {
  try {
    const authLink = await twitterClient.generateAuthLink('oob');
    console.log('OAuth URL generated. Please visit this URL to authorize the app:');
    console.log(authLink.url);
    console.log('After authorization, you will get a PIN. Use that PIN to complete authentication.');
    return authLink.url;
  } catch (error) {
    console.error('✗ Error generating OAuth URL:', error);
    throw new Error(`Failed to generate OAuth URL: ${error}`);
  }
}

// Export the Twitter client for advanced usage
export { twitterClient };
