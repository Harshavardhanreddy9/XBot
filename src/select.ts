import { RSSItem } from './rss';

/**
 * Configuration for RSS item selection
 */
export interface SelectionConfig {
  maxItems?: number;
  sortByDate?: boolean;
  removeDuplicates?: boolean;
}

/**
 * Default configuration for RSS item selection
 */
const DEFAULT_CONFIG: Required<SelectionConfig> = {
  maxItems: 1,
  sortByDate: true,
  removeDuplicates: true,
};

/**
 * Selects and processes RSS items based on the given configuration
 * @param items Array of RSS items to process
 * @param config Selection configuration options
 * @returns Processed array of RSS items
 */
export function selectRSSItems(
  items: RSSItem[], 
  config: SelectionConfig = {}
): RSSItem[] {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  let processedItems = [...items];

  console.log(`📊 Processing ${processedItems.length} RSS items...`);

  // Step 1: Remove duplicates if enabled
  if (finalConfig.removeDuplicates) {
    processedItems = removeDuplicates(processedItems);
    console.log(`🔍 After deduplication: ${processedItems.length} items`);
  }

  // Step 2: Sort by date if enabled
  if (finalConfig.sortByDate) {
    processedItems = sortByDate(processedItems);
    console.log(`📅 Sorted by latest date`);
  }

  // Step 3: Select top N items
  const selectedItems = processedItems.slice(0, finalConfig.maxItems);
  console.log(`✅ Selected top ${selectedItems.length} items`);

  return selectedItems;
}

/**
 * Removes duplicate RSS items based on title and source domain
 * @param items Array of RSS items
 * @returns Array of unique RSS items
 */
export function removeDuplicates(items: RSSItem[]): RSSItem[] {
  const seen = new Set<string>();
  const uniqueItems: RSSItem[] = [];

  for (const item of items) {
    // Create a unique key based on title and source
    const key = createUniqueKey(item);
    
    if (!seen.has(key)) {
      seen.add(key);
      uniqueItems.push(item);
    } else {
      console.log(`🔄 Duplicate removed: ${item.title} from ${item.source}`);
    }
  }

  return uniqueItems;
}

/**
 * Sorts RSS items by date (newest first)
 * @param items Array of RSS items
 * @returns Sorted array of RSS items
 */
export function sortByDate(items: RSSItem[]): RSSItem[] {
  return items.sort((a, b) => {
    const dateA = new Date(a.isoDate).getTime();
    const dateB = new Date(b.isoDate).getTime();
    return dateB - dateA; // Newest first
  });
}

/**
 * Creates a unique key for deduplication based on title and source
 * @param item RSS item
 * @returns Unique key string
 */
function createUniqueKey(item: RSSItem): string {
  // Normalize title by removing extra whitespace and converting to lowercase
  const normalizedTitle = item.title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
  
  // Use source as the domain identifier
  const source = item.source.toLowerCase().trim();
  
  return `${normalizedTitle}|${source}`;
}

/**
 * Filters RSS items by source domain
 * @param items Array of RSS items
 * @param sources Array of source names to include
 * @returns Filtered array of RSS items
 */
export function filterBySource(items: RSSItem[], sources: string[]): RSSItem[] {
  const normalizedSources = sources.map(s => s.toLowerCase().trim());
  
  return items.filter(item => 
    normalizedSources.includes(item.source.toLowerCase().trim())
  );
}

/**
 * Filters RSS items by date range
 * @param items Array of RSS items
 * @param days Number of days to look back
 * @returns Filtered array of RSS items
 */
export function filterByDateRange(items: RSSItem[], days: number): RSSItem[] {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return items.filter(item => {
    const itemDate = new Date(item.isoDate);
    return itemDate >= cutoffDate;
  });
}

/**
 * Gets statistics about the RSS items
 * @param items Array of RSS items
 * @returns Statistics object
 */
export function getRSSStats(items: RSSItem[]): {
  totalItems: number;
  uniqueSources: number;
  dateRange: { oldest: string; newest: string };
  sourceBreakdown: Record<string, number>;
} {
  const sources = new Set(items.map(item => item.source));
  const dates = items.map(item => new Date(item.isoDate));
  
  const sourceBreakdown: Record<string, number> = {};
  items.forEach(item => {
    sourceBreakdown[item.source] = (sourceBreakdown[item.source] || 0) + 1;
  });

  return {
    totalItems: items.length,
    uniqueSources: sources.size,
    dateRange: {
      oldest: new Date(Math.min(...dates.map(d => d.getTime()))).toISOString(),
      newest: new Date(Math.max(...dates.map(d => d.getTime()))).toISOString(),
    },
    sourceBreakdown,
  };
}

/**
 * Selects RSS items with advanced filtering options
 * @param items Array of RSS items
 * @param options Advanced selection options
 * @returns Selected RSS items
 */
export function selectRSSItemsAdvanced(
  items: RSSItem[],
  options: {
    maxItems?: number;
    sources?: string[];
    maxDays?: number;
    removeDuplicates?: boolean;
    sortByDate?: boolean;
  } = {}
): RSSItem[] {
  let processedItems = [...items];
  
  console.log(`📊 Advanced selection starting with ${processedItems.length} items`);

  // Filter by sources if specified
  if (options.sources && options.sources.length > 0) {
    processedItems = filterBySource(processedItems, options.sources);
    console.log(`🔍 After source filtering: ${processedItems.length} items`);
  }

  // Filter by date range if specified
  if (options.maxDays) {
    processedItems = filterByDateRange(processedItems, options.maxDays);
    console.log(`📅 After date filtering (last ${options.maxDays} days): ${processedItems.length} items`);
  }

  // Apply standard selection
  return selectRSSItems(processedItems, {
    maxItems: options.maxItems,
    removeDuplicates: options.removeDuplicates,
    sortByDate: options.sortByDate,
  });
}
