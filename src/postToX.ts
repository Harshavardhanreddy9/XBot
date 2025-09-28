import { TwitterApi } from 'twitter-api-v2';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Twitter API credentials interface
 */
interface TwitterCredentials {
  appKey: string;
  appSecret: string;
  accessToken: string;
  accessSecret: string;
}

/**
 * Loads Twitter API credentials from environment variables
 * @returns TwitterCredentials object
 * @throws Error if required credentials are missing
 */
function loadTwitterCredentials(): TwitterCredentials {
  const credentials = {
    appKey: process.env.X_API_KEY || '',
    appSecret: process.env.X_API_SECRET || '',
    accessToken: process.env.X_ACCESS_TOKEN || '',
    accessSecret: process.env.X_ACCESS_SECRET || '',
  };

  // Validate that all required credentials are present
  const missingCredentials = Object.entries(credentials)
    .filter(([key, value]) => !value)
    .map(([key]) => key);

  if (missingCredentials.length > 0) {
    throw new Error(
      `Missing required Twitter API credentials: ${missingCredentials.join(', ')}\n` +
      'Please check your .env file and ensure all credentials are set:\n' +
      '- X_API_KEY\n' +
      '- X_API_SECRET\n' +
      '- X_ACCESS_TOKEN\n' +
      '- X_ACCESS_SECRET'
    );
  }

  return credentials;
}

/**
 * Creates and configures Twitter API client with OAuth 1.0a
 * @returns Configured TwitterApi instance
 */
function createTwitterClient(): TwitterApi {
  try {
    const credentials = loadTwitterCredentials();
    
    console.log('🔐 Loading Twitter API credentials...');
    console.log(`✓ App Key: ${credentials.appKey.substring(0, 8)}...`);
    console.log(`✓ App Secret: ${credentials.appSecret.substring(0, 8)}...`);
    console.log(`✓ Access Token: ${credentials.accessToken.substring(0, 8)}...`);
    console.log(`✓ Access Secret: ${credentials.accessSecret.substring(0, 8)}...`);

    const client = new TwitterApi({
      appKey: credentials.appKey,
      appSecret: credentials.appSecret,
      accessToken: credentials.accessToken,
      accessSecret: credentials.accessSecret,
    });

    console.log('✅ Twitter API client created successfully');
    return client;
  } catch (error) {
    console.error('❌ Failed to create Twitter API client:', error);
    throw error;
  }
}

// Create Twitter client instance
let twitterClient: TwitterApi | null = null;

/**
 * Gets the Twitter API client instance (creates if not exists)
 * @returns TwitterApi instance
 */
function getTwitterClient(): TwitterApi {
  if (!twitterClient) {
    twitterClient = createTwitterClient();
  }
  return twitterClient;
}

/**
 * Validates tweet text before posting
 * @param text Tweet text to validate
 * @throws Error if tweet text is invalid
 */
function validateTweetText(text: string): void {
  if (!text || typeof text !== 'string') {
    throw new Error('Tweet text must be a non-empty string');
  }

  if (text.trim().length === 0) {
    throw new Error('Tweet text cannot be empty');
  }

  if (text.length > 280) {
    throw new Error(`Tweet text is too long: ${text.length} characters (max 280)`);
  }

  // Check for potentially problematic characters
  const problematicChars = text.match(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/);
  if (problematicChars) {
    throw new Error('Tweet text contains invalid characters');
  }
}

/**
 * Posts a tweet to X (Twitter) using OAuth 1.0a authentication
 * @param text The text content of the tweet (max 280 characters)
 * @returns Promise<string> The ID of the posted tweet
 * @throws Error if posting fails
 */
export async function postTweet(text: string): Promise<string> {
  try {
    console.log('🐦 Preparing to post tweet...');
    
    // Validate tweet text
    validateTweetText(text);
    console.log(`📝 Tweet text (${text.length} chars): ${text}`);

    // Get Twitter client
    const client = getTwitterClient();

    // Post the tweet using v2 API
    console.log('📤 Posting tweet to X...');
    const tweet = await client.v2.tweet(text);

    console.log('✅ Tweet posted successfully!');
    console.log(`🆔 Tweet ID: ${tweet.data.id}`);
    console.log(`🔗 Tweet URL: https://twitter.com/user/status/${tweet.data.id}`);
    
    return tweet.data.id;
  } catch (error) {
    console.error('❌ Failed to post tweet:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('credentials')) {
        throw new Error(`Authentication failed: ${error.message}`);
      } else if (error.message.includes('too long')) {
        throw new Error(`Tweet too long: ${error.message}`);
      } else if (error.message.includes('rate limit')) {
        throw new Error(`Rate limit exceeded: ${error.message}`);
      } else if (error.message.includes('duplicate')) {
        throw new Error(`Duplicate tweet: ${error.message}`);
      }
    }
    
    throw new Error(`Failed to post tweet: ${error}`);
  }
}

/**
 * Posts multiple tweets with delay between them
 * @param texts Array of tweet texts
 * @param delayMs Delay between tweets in milliseconds (default: 5000)
 * @returns Promise<string[]> Array of tweet IDs
 */
export async function postMultipleTweets(
  texts: string[], 
  delayMs: number = 5000
): Promise<string[]> {
  const tweetIds: string[] = [];
  
  console.log(`📤 Posting ${texts.length} tweets with ${delayMs}ms delay...`);
  
  for (let i = 0; i < texts.length; i++) {
    try {
      console.log(`\n--- Tweet ${i + 1}/${texts.length} ---`);
      const tweetId = await postTweet(texts[i]);
      tweetIds.push(tweetId);
      
      // Add delay between tweets (except for the last one)
      if (i < texts.length - 1) {
        console.log(`⏳ Waiting ${delayMs}ms before next tweet...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      console.error(`❌ Failed to post tweet ${i + 1}:`, error);
      // Continue with next tweet instead of failing completely
    }
  }
  
  console.log(`\n✅ Posted ${tweetIds.length}/${texts.length} tweets successfully`);
  return tweetIds;
}

/**
 * Gets information about the authenticated user
 * @returns Promise<any> User information
 */
export async function getCurrentUser(): Promise<any> {
  try {
    const client = getTwitterClient();
    const user = await client.v2.me();
    
    console.log(`👤 Authenticated as: @${user.data.username} (${user.data.name})`);
    return user.data;
  } catch (error) {
    console.error('❌ Failed to get current user:', error);
    throw new Error(`Failed to get user info: ${error}`);
  }
}

/**
 * Checks if Twitter API is properly configured and authenticated
 * @returns Promise<boolean> True if properly configured
 */
export async function isTwitterConfigured(): Promise<boolean> {
  try {
    await getCurrentUser();
    return true;
  } catch (error) {
    console.log('⚠️ Twitter API not properly configured:', error);
    return false;
  }
}

/**
 * Tests the Twitter API connection
 * @returns Promise<boolean> True if connection is successful
 */
export async function testTwitterConnection(): Promise<boolean> {
  try {
    console.log('🧪 Testing Twitter API connection...');
    await getCurrentUser();
    console.log('✅ Twitter API connection successful');
    return true;
  } catch (error) {
    console.error('❌ Twitter API connection failed:', error);
    return false;
  }
}

// Export the Twitter client for advanced usage
export { getTwitterClient };
