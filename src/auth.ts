import { getOAuthUrl } from './twitter';
import { TwitterApi } from 'twitter-api-v2';
import dotenv from 'dotenv';
import * as readline from 'readline';

// Load environment variables
dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function authenticateTwitter() {
  try {
    console.log('🔐 Twitter Authentication Setup');
    console.log('================================\n');

    // Check if we have the basic credentials
    const apiKey = process.env.X_API_KEY;
    const apiSecret = process.env.X_API_SECRET;

    if (!apiKey || !apiSecret) {
      console.error('❌ Missing Twitter API credentials!');
      console.log('Please set X_API_KEY and X_API_SECRET in your .env file');
      console.log('You can copy from .env.example and fill in your credentials');
      process.exit(1);
    }

    console.log('✓ API Key and Secret found');
    console.log('Generating OAuth URL...\n');

    // Create Twitter client
    const client = new TwitterApi({
      appKey: apiKey,
      appSecret: apiSecret,
    });

    // Generate OAuth URL
    const authLink = await client.generateAuthLink('oob');
    
    console.log('🔗 Please visit this URL to authorize the app:');
    console.log(authLink.url);
    console.log('\n📝 After authorization, you will get a PIN number.');
    console.log('Enter the PIN below:\n');

    // Get PIN from user
    const pin = await new Promise<string>((resolve) => {
      rl.question('Enter PIN: ', (answer) => {
        resolve(answer.trim());
      });
    });

    if (!pin) {
      console.log('❌ No PIN provided. Authentication cancelled.');
      process.exit(1);
    }

    // Exchange PIN for access tokens
    console.log('\n🔄 Exchanging PIN for access tokens...');
    const { client: loggedClient, accessToken, accessSecret } = await client.login(pin);

    console.log('✅ Authentication successful!');
    console.log('\n📋 Add these to your .env file:');
    console.log('================================');
    console.log(`X_ACCESS_TOKEN=${accessToken}`);
    console.log(`X_ACCESS_SECRET=${accessSecret}`);
    console.log('\n💡 Your .env file should now look like this:');
    console.log('X_API_KEY=your_api_key_here');
    console.log('X_API_SECRET=your_api_secret_here');
    console.log(`X_ACCESS_TOKEN=${accessToken}`);
    console.log(`X_ACCESS_SECRET=${accessSecret}`);
    console.log('POSTS_PER_RUN=1');

    // Test the authentication
    try {
      const user = await loggedClient.v2.me();
      console.log(`\n🎉 Successfully authenticated as: @${user.data.username}`);
    } catch (error) {
      console.log('⚠️  Authentication completed but could not verify user info');
    }

  } catch (error) {
    console.error('❌ Authentication failed:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run authentication
authenticateTwitter();
