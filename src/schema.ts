import { z } from 'zod';

/**
 * Zod schema for normalized items from RSS, web, GitHub, and X
 */
export const Item = z.object({
  id: z.string(),                 // hash(url)
  source: z.enum(['rss', 'web', 'github', 'x']),
  vendor: z.string().optional(),  // 'xAI', 'OpenAI', 'Google'
  product: z.string().optional(), // 'Grok', 'GPT-4.1', 'Gemini'
  url: z.string().url(),
  title: z.string().min(3),
  summary: z.string().optional(),
  publishedAt: z.string(),        // ISO
  text: z.string().optional(),
  raw: z.any().optional()
});

export type Item = z.infer<typeof Item>;

/**
 * Event schema for tracking product releases and updates
 */
export const Event = z.object({
  id: z.string(),
  vendor: z.string(),
  product: z.string(),
  kind: z.enum(['release', 'update', 'announcement', 'launch']),
  version: z.string().optional(),
  windowStart: z.string(),        // ISO
  windowEnd: z.string(),          // ISO
  description: z.string().optional(),
  metadata: z.any().optional()
});

export type Event = z.infer<typeof Event>;

/**
 * Tweet schema for tracking posted tweets
 */
export const Tweet = z.object({
  id: z.string(),
  eventId: z.string().optional(),
  content: z.string(),
  url: z.string().optional(),
  postedAt: z.string(),           // ISO
  threadJson: z.string().optional(), // JSON string for thread data
  metrics: z.object({
    likes: z.number().optional(),
    retweets: z.number().optional(),
    replies: z.number().optional()
  }).optional()
});

export type Tweet = z.infer<typeof Tweet>;

/**
 * Utility function to generate item ID from URL
 */
export function generateItemId(url: string): string {
  // Simple hash function for URL
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Utility function to extract vendor and product from title/content
 */
export function extractVendorProduct(title: string, text?: string): { vendor?: string; product?: string } {
  const content = `${title} ${text || ''}`.toLowerCase();
  
  // Vendor mappings
  const vendors = {
    'openai': ['openai', 'chatgpt', 'gpt'],
    'google': ['google', 'deepmind', 'gemini', 'bard'],
    'anthropic': ['anthropic', 'claude'],
    'meta': ['meta', 'facebook', 'llama'],
    'microsoft': ['microsoft', 'copilot'],
    'xai': ['xai', 'grok'],
    'nvidia': ['nvidia'],
    'tesla': ['tesla'],
    'apple': ['apple']
  };
  
  // Product mappings
  const products = {
    'gpt-4': ['gpt-4', 'gpt4'],
    'gpt-3.5': ['gpt-3.5', 'gpt-3', 'chatgpt'],
    'gemini': ['gemini'],
    'claude': ['claude'],
    'llama': ['llama'],
    'grok': ['grok'],
    'copilot': ['copilot']
  };
  
  let vendor: string | undefined;
  let product: string | undefined;
  
  // Find vendor
  for (const [vendorName, keywords] of Object.entries(vendors)) {
    if (keywords.some(keyword => content.includes(keyword))) {
      vendor = vendorName;
      break;
    }
  }
  
  // Find product
  for (const [productName, keywords] of Object.entries(products)) {
    if (keywords.some(keyword => content.includes(keyword))) {
      product = productName;
      break;
    }
  }
  
  return { vendor, product };
}

/**
 * Create a normalized Item from RSS data
 */
export function createItemFromRSS(rssItem: {
  title: string;
  link: string;
  isoDate: string;
  source: string;
  description?: string;
}): Item {
  const id = generateItemId(rssItem.link);
  const { vendor, product } = extractVendorProduct(rssItem.title, rssItem.description);
  
  return {
    id,
    source: 'rss',
    vendor,
    product,
    url: rssItem.link,
    title: rssItem.title,
    summary: rssItem.description,
    publishedAt: rssItem.isoDate,
    text: undefined,
    raw: rssItem
  };
}

/**
 * Create a normalized Item from web extraction
 */
export function createItemFromWeb(webData: {
  title: string;
  text: string;
  url: string;
  publishedAt?: string;
  summary?: string;
}): Item {
  const id = generateItemId(webData.url);
  const { vendor, product } = extractVendorProduct(webData.title, webData.text);
  
  return {
    id,
    source: 'web',
    vendor,
    product,
    url: webData.url,
    title: webData.title,
    summary: webData.summary,
    publishedAt: webData.publishedAt || new Date().toISOString(),
    text: webData.text,
    raw: webData
  };
}

/**
 * Validate and sanitize an Item
 */
export function validateItem(data: unknown): Item {
  return Item.parse(data);
}

/**
 * Check if two items are duplicates based on content similarity
 */
export function areItemsDuplicate(item1: Item, item2: Item): boolean {
  // Same URL = definitely duplicate
  if (item1.url === item2.url) {
    return true;
  }
  
  // Same title and vendor/product = likely duplicate
  if (item1.title === item2.title && 
      item1.vendor === item2.vendor && 
      item1.product === item2.product) {
    return true;
  }
  
  // Similar titles (simple similarity check)
  const title1 = item1.title.toLowerCase().replace(/[^\w\s]/g, '');
  const title2 = item2.title.toLowerCase().replace(/[^\w\s]/g, '');
  
  if (title1 === title2) {
    return true;
  }
  
  return false;
}
