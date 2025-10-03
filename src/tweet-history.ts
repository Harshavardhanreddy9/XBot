import fs from 'fs';
import path from 'path';

/**
 * Interface for storing tweet history
 */
interface TweetHistory {
  tweets: TweetRecord[];
  lastUpdated: string;
}

interface TweetRecord {
  id: string;
  content: string;
  url: string;
  source: string;
  postedAt: string;
  hash: string; // Content hash for duplicate detection
}

/**
 * Simple hash function for content deduplication
 */
function createContentHash(content: string): string {
  // Remove URLs and timestamps for better duplicate detection
  const normalizedContent = content
    .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
    .replace(/\d{4}-\d{2}-\d{2}/g, '') // Remove dates
    .replace(/\d{1,2}:\d{2}/g, '') // Remove times
    .toLowerCase()
    .trim();
  
  // Simple hash (in production, you might want to use crypto.createHash)
  let hash = 0;
  for (let i = 0; i < normalizedContent.length; i++) {
    const char = normalizedContent.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Get the path to the tweet history file
 */
function getHistoryFilePath(): string {
  return path.join(process.cwd(), 'tweet-history.json');
}

/**
 * Load tweet history from file
 */
function loadTweetHistory(): TweetHistory {
  const filePath = getHistoryFilePath();
  
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.log('⚠️ Could not load tweet history, starting fresh');
  }
  
  return {
    tweets: [],
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Save tweet history to file
 */
function saveTweetHistory(history: TweetHistory): void {
  const filePath = getHistoryFilePath();
  
  try {
    fs.writeFileSync(filePath, JSON.stringify(history, null, 2));
  } catch (error) {
    console.error('❌ Could not save tweet history:', error);
  }
}

/**
 * Check if a tweet content is a duplicate
 */
export function isDuplicateTweet(content: string): boolean {
  const history = loadTweetHistory();
  const contentHash = createContentHash(content);
  
  // Check if we've posted this content before
  const isDuplicate = history.tweets.some(tweet => tweet.hash === contentHash);
  
  if (isDuplicate) {
    console.log(`🚫 Duplicate tweet detected (hash: ${contentHash})`);
    console.log(`📝 Content: "${content.substring(0, 100)}..."`);
  }
  
  return isDuplicate;
}

/**
 * Add a tweet to history
 */
export function addTweetToHistory(
  tweetId: string,
  content: string,
  url: string,
  source: string
): void {
  const history = loadTweetHistory();
  const contentHash = createContentHash(content);
  
  const tweetRecord: TweetRecord = {
    id: tweetId,
    content,
    url,
    source,
    postedAt: new Date().toISOString(),
    hash: contentHash
  };
  
  history.tweets.push(tweetRecord);
  history.lastUpdated = new Date().toISOString();
  
  // Keep only last 100 tweets to prevent file from growing too large
  if (history.tweets.length > 100) {
    history.tweets = history.tweets.slice(-100);
  }
  
  saveTweetHistory(history);
  console.log(`✅ Added tweet to history (hash: ${contentHash})`);
}

/**
 * Get recent tweet history for analysis
 */
export function getRecentTweetHistory(days: number = 7): TweetRecord[] {
  const history = loadTweetHistory();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return history.tweets.filter(tweet => 
    new Date(tweet.postedAt) > cutoffDate
  );
}

/**
 * Get tweet statistics
 */
export function getTweetStats(): {
  totalTweets: number;
  recentTweets: number;
  uniqueSources: string[];
  lastTweetDate?: string;
} {
  const history = loadTweetHistory();
  const recentTweets = getRecentTweetHistory(7);
  const uniqueSources = [...new Set(history.tweets.map(t => t.source))];
  
  return {
    totalTweets: history.tweets.length,
    recentTweets: recentTweets.length,
    uniqueSources,
    lastTweetDate: history.tweets.length > 0 ? history.tweets[history.tweets.length - 1].postedAt : undefined
  };
}

/**
 * Clean up old tweet history (older than 30 days)
 */
export function cleanupOldHistory(): void {
  const history = loadTweetHistory();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 30);
  
  const originalCount = history.tweets.length;
  history.tweets = history.tweets.filter(tweet => 
    new Date(tweet.postedAt) > cutoffDate
  );
  
  if (history.tweets.length < originalCount) {
    history.lastUpdated = new Date().toISOString();
    saveTweetHistory(history);
    console.log(`🧹 Cleaned up ${originalCount - history.tweets.length} old tweets from history`);
  }
}
