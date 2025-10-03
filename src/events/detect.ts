import { Item } from '../schema.js';
import * as stringSimilarity from 'string-similarity';

/**
 * Vendor and product aliases for detection
 */
const VENDOR_ALIASES: Record<string, string[]> = {
  'openai': [
    'openai', 'open ai', 'chatgpt', 'gpt', 'dall-e', 'dalle', 'whisper', 'codex'
  ],
  'google': [
    'google', 'deepmind', 'gemini', 'bard', 'alphago', 'alphafold', 'tensorflow', 'palm'
  ],
  'anthropic': [
    'anthropic', 'claude', 'constitutional ai'
  ],
  'meta': [
    'meta', 'facebook', 'llama', 'opt', 'galactica', 'blenderbot', 'fair'
  ],
  'microsoft': [
    'microsoft', 'msft', 'copilot', 'bing chat', 'bing', 'azure openai', 'azure ai'
  ],
  'xai': [
    'xai', 'grok', 'elon musk ai', 'musk ai'
  ],
  'nvidia': [
    'nvidia', 'nvdia', 'cuda', 'tensorrt', 'jetson', 'dgx'
  ],
  'tesla': [
    'tesla', 'fsd', 'full self driving', 'autopilot', 'dojo'
  ],
  'apple': [
    'apple', 'core ml', 'siri', 'neural engine', 'mlx'
  ],
  'amazon': [
    'amazon', 'aws', 'bedrock', 'sagemaker', 'lex', 'polly', 'rekognition'
  ],
  'huggingface': [
    'hugging face', 'huggingface', 'transformers', 'datasets', 'spaces'
  ],
  'stability': [
    'stability ai', 'stability', 'stable diffusion', 'stablelm', 'stablediffusion'
  ],
  'cohere': [
    'cohere', 'command', 'embed', 'classify'
  ],
  'mistral': [
    'mistral', 'mixtral', 'mistral ai'
  ],
  'perplexity': [
    'perplexity', 'perplexity ai'
  ],
  'character': [
    'character ai', 'character.ai', 'character'
  ]
};

const PRODUCT_ALIASES: Record<string, string[]> = {
  'gpt-4': [
    'gpt-4', 'gpt4', 'gpt 4', 'gpt-4o', 'gpt-4 turbo', 'gpt-4-turbo', 'chatgpt plus'
  ],
  'gpt-3.5': [
    'gpt-3.5', 'gpt-3', 'gpt3', 'gpt 3', 'chatgpt', 'chat gpt', 'gpt-3.5-turbo'
  ],
  'gemini': [
    'gemini', 'gemini pro', 'gemini ultra', 'gemini nano', 'bard', 'bard ai'
  ],
  'claude': [
    'claude', 'claude 3', 'claude-3', 'claude 3.5', 'claude-3.5', 'claude 3 opus', 'claude 3 sonnet', 'claude 3 haiku'
  ],
  'llama': [
    'llama', 'llama 2', 'llama-2', 'llama 3', 'llama-3', 'llama 3.1', 'llama-3.1', 'meta llama'
  ],
  'grok': [
    'grok', 'grok-1', 'grok 1', 'xai grok'
  ],
  'copilot': [
    'copilot', 'github copilot', 'microsoft copilot', 'bing copilot', 'copilot pro'
  ],
  'stable-diffusion': [
    'stable diffusion', 'stablediffusion', 'stable-diffusion', 'sd3', 'sdxl'
  ],
  'dall-e': [
    'dall-e', 'dalle', 'dall-e 2', 'dall-e 3', 'dalle-2', 'dalle-3'
  ],
  'whisper': [
    'whisper', 'whisper-1', 'openai whisper'
  ],
  'midjourney': [
    'midjourney', 'midjourney v6', 'mj v6'
  ]
};

/**
 * Release-like patterns for detecting announcements
 */
const RELEASE_PATTERNS = [
  // Direct release words
  /(introducing|introduces|announcing|announces|launching|launches|releasing|releases|unveiling|unveils)/i,
  /(now available|now live|now out|now shipping)/i,
  /(released|launched|unveiled|announced|introduced)/i,
  
  // Version patterns
  /v\d+(\.\d+)*(\w+)?/i,  // v1.0, v2.1.3, v3.0-beta
  /version\s+\d+(\.\d+)*/i,  // version 1.0, version 2.1.3
  /\d+\.\d+(\.\d+)?\s+(release|update|launch)/i,  // 1.0 release, 2.1.3 update
  
  // Update patterns
  /(update|upgrade|enhancement|improvement)/i,
  /(new features|new capabilities|enhanced)/i,
  /(changelog|release notes|what's new)/i,
  
  // Availability patterns
  /(available|accessible|deployed|rolled out)/i,
  /(general availability|ga|public release)/i,
  /(beta|alpha|preview|experimental)/i,
  
  // Time-based patterns
  /(today|yesterday|this week|this month).*(release|launch|announce)/i,
  /(just|recently|latest).*(release|update|version)/i,
  /(this week|this month)/i
];

/**
 * Detect vendor and product from title and text
 */
export function detectVendorProduct(title: string, text?: string): { vendor?: string; product?: string } {
  const content = `${title} ${text || ''}`.toLowerCase();
  
  let detectedVendor: string | undefined;
  let detectedProduct: string | undefined;
  
  // Find vendor
  for (const [vendor, aliases] of Object.entries(VENDOR_ALIASES)) {
    for (const alias of aliases) {
      if (content.includes(alias.toLowerCase())) {
        detectedVendor = vendor;
        break;
      }
    }
    if (detectedVendor) break;
  }
  
  // Find product
  for (const [product, aliases] of Object.entries(PRODUCT_ALIASES)) {
    for (const alias of aliases) {
      if (content.includes(alias.toLowerCase())) {
        detectedProduct = product;
        break;
      }
    }
    if (detectedProduct) break;
  }
  
  return { vendor: detectedVendor, product: detectedProduct };
}

/**
 * Check if content contains release-like patterns
 */
export function isReleaseLike(title: string, text?: string): boolean {
  const content = `${title} ${text || ''}`;
  
  // Check against all release patterns
  for (const pattern of RELEASE_PATTERNS) {
    if (pattern.test(content)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Candidate cluster for grouping related items
 */
export interface CandidateCluster {
  vendor: string;
  product: string;
  itemIds: string[];
  items: Item[];
  confidence: number;
  timeWindow: {
    start: string;
    end: string;
  };
  titleSimilarity: number;
}

/**
 * Cluster items by vendor, product, time window, and title similarity
 */
export function clusterCandidates(items: Item[]): CandidateCluster[] {
  if (items.length === 0) return [];
  
  // Filter items that have both vendor and product detected
  const candidates = items.filter(item => {
    // Use existing vendor/product if available, otherwise detect from title/text
    const { vendor, product } = item.vendor && item.product 
      ? { vendor: item.vendor, product: item.product }
      : detectVendorProduct(item.title, item.text);
    return vendor && product;
  });
  
  if (candidates.length === 0) return [];
  
  // Group by vendor and product
  const vendorProductGroups = new Map<string, Item[]>();
  
  for (const item of candidates) {
    // Use existing vendor/product if available, otherwise detect from title/text
    const { vendor, product } = item.vendor && item.product 
      ? { vendor: item.vendor, product: item.product }
      : detectVendorProduct(item.title, item.text);
      
    if (vendor && product) {
      const key = `${vendor}:${product}`;
      if (!vendorProductGroups.has(key)) {
        vendorProductGroups.set(key, []);
      }
      vendorProductGroups.get(key)!.push(item);
    }
  }
  
  const clusters: CandidateCluster[] = [];
  
  // Process each vendor:product group
  for (const [key, groupItems] of vendorProductGroups) {
    const [vendor, product] = key.split(':');
    
    // Sort by published date
    groupItems.sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime());
    
    // Create time-based clusters within 36 hours
    const timeClusters = createTimeClusters(groupItems, 36);
    
    // Further cluster by title similarity
    for (const timeCluster of timeClusters) {
      const similarityClusters = createSimilarityClusters(timeCluster);
      
      for (const simCluster of similarityClusters) {
        if (simCluster.length >= 2) { // Only clusters with 2+ items
          const cluster: CandidateCluster = {
            vendor,
            product,
            itemIds: simCluster.map(item => item.id),
            items: simCluster,
            confidence: calculateClusterConfidence(simCluster),
            timeWindow: {
              start: simCluster[0].publishedAt,
              end: simCluster[simCluster.length - 1].publishedAt
            },
            titleSimilarity: calculateTitleSimilarity(simCluster)
          };
          
          clusters.push(cluster);
        }
      }
    }
  }
  
  // Sort clusters by confidence (highest first)
  clusters.sort((a, b) => b.confidence - a.confidence);
  
  return clusters;
}

/**
 * Create time-based clusters within a specified hour window
 */
function createTimeClusters(items: Item[], hoursWindow: number): Item[][] {
  if (items.length <= 1) return [items];
  
  const clusters: Item[][] = [];
  let currentCluster: Item[] = [items[0]];
  
  for (let i = 1; i < items.length; i++) {
    const currentItem = items[i];
    const lastItem = currentCluster[currentCluster.length - 1];
    
    const timeDiff = new Date(currentItem.publishedAt).getTime() - new Date(lastItem.publishedAt).getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    if (hoursDiff <= hoursWindow) {
      currentCluster.push(currentItem);
    } else {
      clusters.push(currentCluster);
      currentCluster = [currentItem];
    }
  }
  
  clusters.push(currentCluster);
  return clusters;
}

/**
 * Create similarity-based clusters using title similarity
 */
function createSimilarityClusters(items: Item[]): Item[][] {
  if (items.length <= 1) return [items];
  
  const clusters: Item[][] = [];
  const processed = new Set<string>();
  
  for (let i = 0; i < items.length; i++) {
    if (processed.has(items[i].id)) continue;
    
    const cluster: Item[] = [items[i]];
    processed.add(items[i].id);
    
    // Find similar items
    for (let j = i + 1; j < items.length; j++) {
      if (processed.has(items[j].id)) continue;
      
      const similarity = stringSimilarity.compareTwoStrings(
        items[i].title.toLowerCase(),
        items[j].title.toLowerCase()
      );
      
      if (similarity >= 0.4) { // 40% similarity threshold
        cluster.push(items[j]);
        processed.add(items[j].id);
      }
    }
    
    clusters.push(cluster);
  }
  
  return clusters;
}

/**
 * Calculate cluster confidence based on multiple factors
 */
function calculateClusterConfidence(items: Item[]): number {
  let confidence = 0;
  
  // Base confidence from number of items
  confidence += Math.min(items.length * 0.2, 1.0); // Max 1.0 for 5+ items
  
  // Boost for release-like content
  const releaseLikeCount = items.filter(item => 
    isReleaseLike(item.title, item.text)
  ).length;
  confidence += (releaseLikeCount / items.length) * 0.3;
  
  // Boost for recent items (last 24 hours)
  const now = Date.now();
  const recentCount = items.filter(item => {
    const itemTime = new Date(item.publishedAt).getTime();
    return (now - itemTime) <= 24 * 60 * 60 * 1000;
  }).length;
  confidence += (recentCount / items.length) * 0.2;
  
  // Boost for title similarity
  const avgSimilarity = calculateTitleSimilarity(items);
  confidence += avgSimilarity * 0.3;
  
  return Math.min(confidence, 1.0);
}

/**
 * Calculate average title similarity within a cluster
 */
function calculateTitleSimilarity(items: Item[]): number {
  if (items.length <= 1) return 1.0;
  
  let totalSimilarity = 0;
  let comparisons = 0;
  
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const similarity = stringSimilarity.compareTwoStrings(
        items[i].title.toLowerCase(),
        items[j].title.toLowerCase()
      );
      totalSimilarity += similarity;
      comparisons++;
    }
  }
  
  return comparisons > 0 ? totalSimilarity / comparisons : 0;
}

/**
 * Get the best candidate cluster for a given vendor and product
 */
export function getBestCluster(clusters: CandidateCluster[], vendor: string, product: string): CandidateCluster | null {
  const matchingClusters = clusters.filter(cluster => 
    cluster.vendor === vendor && cluster.product === product
  );
  
  if (matchingClusters.length === 0) return null;
  
  return matchingClusters.reduce((best, current) => 
    current.confidence > best.confidence ? current : best
  );
}

/**
 * Get all clusters for a specific vendor
 */
export function getClustersByVendor(clusters: CandidateCluster[], vendor: string): CandidateCluster[] {
  return clusters.filter(cluster => cluster.vendor === vendor);
}

/**
 * Get clusters sorted by confidence
 */
export function getTopClusters(clusters: CandidateCluster[], limit: number = 10): CandidateCluster[] {
  return clusters
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit);
}

/**
 * Analyze a single item for event potential
 */
export function analyzeItem(item: Item): {
  isReleaseLike: boolean;
  vendor?: string;
  product?: string;
  confidence: number;
} {
  const { vendor, product } = detectVendorProduct(item.title, item.text);
  const isRelease = isReleaseLike(item.title, item.text);
  
  let confidence = 0;
  
  // Base confidence from vendor/product detection
  if (vendor && product) confidence += 0.4;
  else if (vendor || product) confidence += 0.2;
  
  // Boost for release-like content
  if (isRelease) confidence += 0.3;
  
  // Boost for recent content
  const now = Date.now();
  const itemTime = new Date(item.publishedAt).getTime();
  const hoursAgo = (now - itemTime) / (1000 * 60 * 60);
  
  if (hoursAgo <= 24) confidence += 0.2;
  else if (hoursAgo <= 72) confidence += 0.1;
  
  // Boost for longer content (more likely to be substantial)
  if (item.text && item.text.length > 500) confidence += 0.1;
  
  return {
    isReleaseLike: isRelease,
    vendor,
    product,
    confidence: Math.min(confidence, 1.0)
  };
}
