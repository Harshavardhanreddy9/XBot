import Parser from 'rss-parser';
import fetch from 'node-fetch';
import { Item } from './schema.js';

/**
 * RSS feed configuration
 */
interface RSSFeed {
  url: string;
  source: string;
  vendor?: string;
  product?: string;
}

/**
 * GitHub repository configuration
 */
interface GitHubRepo {
  owner: string;
  repo: string;
  vendor: string;
  product: string;
}

/**
 * Collected item from any source
 */
export interface CollectedItem {
  id: string;
  source: 'rss' | 'github';
  vendor?: string;
  product?: string;
  url: string;
  title: string;
  summary?: string;
  publishedAt: string;
  text?: string;
  raw: any;
}

// Official AI company RSS feeds
const OFFICIAL_RSS_FEEDS: RSSFeed[] = [
  {
    url: 'https://openai.com/blog/rss.xml',
    source: 'OpenAI Blog',
    vendor: 'openai',
    product: 'gpt'
  },
  {
    url: 'https://www.anthropic.com/news/rss',
    source: 'Anthropic News',
    vendor: 'anthropic',
    product: 'claude'
  },
  {
    url: 'https://feeds.feedburner.com/blogspot/gJZg',
    source: 'Google AI Blog',
    vendor: 'google',
    product: 'gemini'
  },
  {
    url: 'https://ai.meta.com/blog/rss/',
    source: 'Meta AI Newsroom',
    vendor: 'meta',
    product: 'llama'
  },
  {
    url: 'https://mistral.ai/news/rss',
    source: 'Mistral News',
    vendor: 'mistralai',
    product: 'mistral'
  },
  {
    url: 'https://blog.cohere.ai/rss.xml',
    source: 'Cohere Blog',
    vendor: 'cohere',
    product: 'cohere'
  },
  {
    url: 'https://huggingface.co/blog/rss.xml',
    source: 'Hugging Face Blog',
    vendor: 'huggingface',
    product: 'transformers'
  },
  // Keep existing feeds
  {
    url: 'https://techcrunch.com/category/artificial-intelligence/feed/',
    source: 'TechCrunch AI'
  },
  {
    url: 'https://feeds.feedburner.com/venturebeat/SZYF',
    source: 'VentureBeat'
  },
  {
    url: 'https://hnrss.org/newest?q=AI',
    source: 'Hacker News AI'
  },
  {
    url: 'https://feeds.feedburner.com/techcrunch/startups',
    source: 'TechCrunch Startups'
  }
];

// GitHub repositories to monitor for releases
const GITHUB_REPOS: GitHubRepo[] = [
  {
    owner: 'ollama',
    repo: 'ollama',
    vendor: 'ollama',
    product: 'ollama'
  },
  {
    owner: 'vllm-project',
    repo: 'vllm',
    vendor: 'vllm',
    product: 'vllm'
  },
  {
    owner: 'ggerganov',
    repo: 'llama.cpp',
    vendor: 'llamacpp',
    product: 'llama.cpp'
  },
  {
    owner: 'langchain-ai',
    repo: 'langchain',
    vendor: 'langchain',
    product: 'langchain'
  },
  {
    owner: 'microsoft',
    repo: 'semantic-kernel',
    vendor: 'microsoft',
    product: 'semantic-kernel'
  },
  {
    owner: 'microsoft',
    repo: 'autogen',
    vendor: 'microsoft',
    product: 'autogen'
  },
  {
    owner: 'facebookresearch',
    repo: 'llama',
    vendor: 'meta',
    product: 'llama'
  },
  {
    owner: 'huggingface',
    repo: 'transformers',
    vendor: 'huggingface',
    product: 'transformers'
  },
  {
    owner: 'openai',
    repo: 'openai-python',
    vendor: 'openai',
    product: 'openai-python'
  },
  {
    owner: 'anthropics',
    repo: 'anthropic-sdk-python',
    vendor: 'anthropic',
    product: 'anthropic-sdk'
  }
];

// Create RSS parser instance
const parser = new Parser();

/**
 * Fetch GitHub API token from environment
 */
function getGitHubToken(): string | undefined {
  return process.env.GITHUB_TOKEN;
}

/**
 * Create GitHub API headers
 */
function createGitHubHeaders(): Record<string, string> {
  const token = getGitHubToken();
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'XBot/1.0'
  };
  
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }
  
  return headers;
}

/**
 * Fetch releases from a GitHub repository
 */
async function fetchGitHubReleases(repo: GitHubRepo): Promise<CollectedItem[]> {
  const url = `https://api.github.com/repos/${repo.owner}/${repo.repo}/releases`;
  const headers = createGitHubHeaders();
  
  try {
    console.log(`Fetching releases from ${repo.owner}/${repo.repo}...`);
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log(`⚠️ Repository ${repo.owner}/${repo.repo} not found or has no releases`);
        return [];
      }
      if (response.status === 403) {
        console.log(`⚠️ Rate limited for ${repo.owner}/${repo.repo} (consider adding GITHUB_TOKEN)`);
        return [];
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const releases = await response.json();
    
    if (!Array.isArray(releases)) {
      console.log(`⚠️ Invalid response format from ${repo.owner}/${repo.repo}`);
      return [];
    }
    
    const items: CollectedItem[] = releases.map((release: any) => ({
      id: `github-${repo.owner}-${repo.repo}-${release.id}`,
      source: 'github',
      vendor: repo.vendor,
      product: repo.product,
      url: release.html_url,
      title: release.name || release.tag_name || 'Release',
      summary: release.body ? release.body.substring(0, 500) : undefined,
      publishedAt: release.published_at || release.created_at,
      text: release.body || '',
      raw: release
    }));
    
    console.log(`✓ Fetched ${items.length} releases from ${repo.owner}/${repo.repo}`);
    return items;
    
  } catch (error) {
    console.error(`✗ Error fetching releases from ${repo.owner}/${repo.repo}:`, error);
    return [];
  }
}

/**
 * Fetch RSS feed items
 */
async function fetchRSSItems(feed: RSSFeed): Promise<CollectedItem[]> {
  try {
    console.log(`Fetching from ${feed.source}...`);
    const feedData = await parser.parseURL(feed.url);
    
    const items: CollectedItem[] = feedData.items.map((item: any) => ({
      id: `rss-${feed.source.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      source: 'rss',
      vendor: feed.vendor,
      product: feed.product,
      url: item.link || '',
      title: item.title || 'No title',
      summary: item.contentSnippet || item.description || item.title,
      publishedAt: item.isoDate || new Date().toISOString(),
      text: item.content || item.description || item.title,
      raw: item
    }));
    
    console.log(`✓ Fetched ${items.length} items from ${feed.source}`);
    return items;
    
  } catch (error) {
    console.error(`✗ Error fetching from ${feed.source}:`, error);
    return [];
  }
}

/**
 * Fetch all RSS items from official feeds
 */
async function fetchAllRSSItems(): Promise<CollectedItem[]> {
  console.log('📰 Fetching RSS feeds...');
  
  const feedPromises = OFFICIAL_RSS_FEEDS.map(feed => fetchRSSItems(feed));
  const feedResults = await Promise.all(feedPromises);
  
  const allItems: CollectedItem[] = [];
  feedResults.forEach(items => {
    allItems.push(...items);
  });
  
  console.log(`📊 Total RSS items fetched: ${allItems.length}`);
  return allItems;
}

/**
 * Fetch all GitHub releases
 */
async function fetchAllGitHubReleases(): Promise<CollectedItem[]> {
  console.log('🐙 Fetching GitHub releases...');
  
  const repoPromises = GITHUB_REPOS.map(repo => fetchGitHubReleases(repo));
  const repoResults = await Promise.all(repoPromises);
  
  const allItems: CollectedItem[] = [];
  repoResults.forEach(items => {
    allItems.push(...items);
  });
  
  console.log(`📊 Total GitHub releases fetched: ${allItems.length}`);
  return allItems;
}

/**
 * Main collection function - fetches from all sources
 */
export async function collectAllItems(): Promise<CollectedItem[]> {
  console.log('🔍 Collecting items from all sources...');
  console.log('='.repeat(60));
  
  const allItems: CollectedItem[] = [];
  
  try {
    // Fetch RSS items
    const rssItems = await fetchAllRSSItems();
    allItems.push(...rssItems);
    
    // Fetch GitHub releases
    const githubItems = await fetchAllGitHubReleases();
    allItems.push(...githubItems);
    
    // Sort by date (newest first)
    allItems.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    
    console.log('\n📊 Collection Summary:');
    console.log(`   Total items: ${allItems.length}`);
    console.log(`   RSS items: ${rssItems.length}`);
    console.log(`   GitHub releases: ${githubItems.length}`);
    
    // Show source breakdown
    const sourceCounts = allItems.reduce((acc, item) => {
      acc[item.source] = (acc[item.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('   Source breakdown:');
    Object.entries(sourceCounts).forEach(([source, count]) => {
      console.log(`     ${source}: ${count}`);
    });
    
    // Show vendor breakdown
    const vendorCounts = allItems.reduce((acc, item) => {
      if (item.vendor) {
        acc[item.vendor] = (acc[item.vendor] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    if (Object.keys(vendorCounts).length > 0) {
      console.log('   Vendor breakdown:');
      Object.entries(vendorCounts).forEach(([vendor, count]) => {
        console.log(`     ${vendor}: ${count}`);
      });
    }
    
    return allItems;
    
  } catch (error) {
    console.error('❌ Error collecting items:', error);
    throw new Error('Failed to collect items from sources');
  }
}

/**
 * Convert CollectedItem to database Item format
 */
export function collectedItemToDbItem(collectedItem: CollectedItem): Item {
  return {
    id: collectedItem.id,
    source: collectedItem.source,
    vendor: collectedItem.vendor,
    product: collectedItem.product,
    url: collectedItem.url,
    title: collectedItem.title,
    summary: collectedItem.summary,
    publishedAt: collectedItem.publishedAt,
    text: collectedItem.text,
    raw: collectedItem.raw
  };
}

/**
 * Fetch items from a specific source type
 */
export async function collectFromSource(source: 'rss' | 'github'): Promise<CollectedItem[]> {
  if (source === 'rss') {
    return await fetchAllRSSItems();
  } else if (source === 'github') {
    return await fetchAllGitHubReleases();
  } else {
    throw new Error(`Unknown source type: ${source}`);
  }
}

/**
 * Get collection statistics
 */
export function getCollectionStats(items: CollectedItem[]): {
  total: number;
  rss: number;
  github: number;
  vendors: Record<string, number>;
  sources: Record<string, number>;
} {
  const stats = {
    total: items.length,
    rss: 0,
    github: 0,
    vendors: {} as Record<string, number>,
    sources: {} as Record<string, number>
  };
  
  items.forEach(item => {
    if (item.source === 'rss') stats.rss++;
    if (item.source === 'github') stats.github++;
    
    if (item.vendor) {
      stats.vendors[item.vendor] = (stats.vendors[item.vendor] || 0) + 1;
    }
    
    stats.sources[item.source] = (stats.sources[item.source] || 0) + 1;
  });
  
  return stats;
}

// Export configurations for reference
export { OFFICIAL_RSS_FEEDS, GITHUB_REPOS };
