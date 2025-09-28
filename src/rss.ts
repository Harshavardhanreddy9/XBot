import Parser from 'rss-parser';

// Define the structure for RSS feed items
export interface RSSItem {
  title: string;
  link: string;
  isoDate: string;
  source: string;
}

// RSS feed URLs for AI/tech content
const RSS_FEEDS = [
  {
    url: 'https://techcrunch.com/category/artificial-intelligence/feed/',
    source: 'TechCrunch AI'
  },
  {
    url: 'https://venturebeat.com/ai/feed/',
    source: 'VentureBeat AI'
  },
  {
    url: 'https://hnrss.org/newest?q=AI',
    source: 'Hacker News AI'
  },
  {
    url: 'https://ai.googleblog.com/feeds/posts/default',
    source: 'Google AI Blog'
  }
];

// Create RSS parser instance
const parser = new Parser();

/**
 * Fetches headlines from multiple AI/tech RSS feeds
 * @returns Promise<RSSItem[]> Array of RSS items with title, link, isoDate, and source
 */
export async function fetchRSSHeadlines(): Promise<RSSItem[]> {
  const allItems: RSSItem[] = [];

  try {
    // Fetch from all RSS feeds in parallel
    const feedPromises = RSS_FEEDS.map(async (feed) => {
      try {
        console.log(`Fetching from ${feed.source}...`);
        const feedData = await parser.parseURL(feed.url);
        
        // Transform feed items to our RSSItem format
        const items: RSSItem[] = feedData.items.map((item) => ({
          title: item.title || 'No title',
          link: item.link || '',
          isoDate: item.isoDate || new Date().toISOString(),
          source: feed.source
        }));

        console.log(`✓ Fetched ${items.length} items from ${feed.source}`);
        return items;
      } catch (error) {
        console.error(`✗ Error fetching from ${feed.source}:`, error);
        return [];
      }
    });

    // Wait for all feeds to be fetched
    const feedResults = await Promise.all(feedPromises);
    
    // Flatten all items into a single array
    feedResults.forEach(items => {
      allItems.push(...items);
    });

    // Sort by date (newest first)
    allItems.sort((a, b) => new Date(b.isoDate).getTime() - new Date(a.isoDate).getTime());

    console.log(`✓ Total items fetched: ${allItems.length}`);
    return allItems;

  } catch (error) {
    console.error('Error fetching RSS feeds:', error);
    throw new Error('Failed to fetch RSS feeds');
  }
}

/**
 * Fetches headlines from a specific RSS feed
 * @param feedUrl The URL of the RSS feed
 * @param sourceName The name of the source
 * @returns Promise<RSSItem[]> Array of RSS items
 */
export async function fetchSingleRSSFeed(feedUrl: string, sourceName: string): Promise<RSSItem[]> {
  try {
    console.log(`Fetching from ${sourceName}...`);
    const feedData = await parser.parseURL(feedUrl);
    
    const items: RSSItem[] = feedData.items.map((item) => ({
      title: item.title || 'No title',
      link: item.link || '',
      isoDate: item.isoDate || new Date().toISOString(),
      source: sourceName
    }));

    console.log(`✓ Fetched ${items.length} items from ${sourceName}`);
    return items;
  } catch (error) {
    console.error(`✗ Error fetching from ${sourceName}:`, error);
    throw new Error(`Failed to fetch from ${sourceName}`);
  }
}

// Export the RSS feeds configuration for reference
export { RSS_FEEDS };
