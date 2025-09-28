import { extract } from '@extractus/article-extractor';
import { RSSItem } from './rss';

/**
 * Extracted article data
 */
export interface ExtractedArticle {
  title: string;
  text: string;
  url: string;
  success: boolean;
  fallbackUsed: boolean;
}

/**
 * Configuration for article extraction
 */
export interface ExtractionConfig {
  timeout?: number;
  maxRetries?: number;
  userAgent?: string;
}

/**
 * Default configuration for article extraction
 */
const DEFAULT_CONFIG: Required<ExtractionConfig> = {
  timeout: 10000, // 10 seconds
  maxRetries: 2,
  userAgent: 'XBot/1.0 (AI News Bot)',
};

/**
 * Extracts full article content from a URL
 * @param url The URL to extract content from
 * @param fallbackItem RSS item to use as fallback if extraction fails
 * @param config Extraction configuration
 * @returns Promise<ExtractedArticle> Extracted article data
 */
export async function extractArticle(
  url: string,
  fallbackItem?: RSSItem,
  config: ExtractionConfig = {}
): Promise<ExtractedArticle> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  console.log(`📄 Extracting article from: ${url}`);
  
  try {
    // Attempt to extract the article
    const article = await extract(url, {
      timeout: finalConfig.timeout,
      userAgent: finalConfig.userAgent,
    });

    if (article && article.title && article.content) {
      console.log(`✅ Successfully extracted article: ${article.title}`);
      
      return {
        title: article.title,
        text: article.content,
        url: url,
        success: true,
        fallbackUsed: false,
      };
    } else {
      throw new Error('Article extraction returned empty or invalid data');
    }
  } catch (error) {
    console.log(`⚠️ Article extraction failed: ${error}`);
    
    // Fallback to RSS data
    if (fallbackItem) {
      console.log(`🔄 Using RSS fallback data`);
      
      return {
        title: fallbackItem.title,
        text: fallbackItem.title, // Use title as text since we don't have full content
        url: fallbackItem.link,
        success: false,
        fallbackUsed: true,
      };
    } else {
      throw new Error(`Article extraction failed and no fallback available: ${error}`);
    }
  }
}

/**
 * Extracts articles from multiple URLs in parallel
 * @param items Array of RSS items with URLs to extract
 * @param config Extraction configuration
 * @returns Promise<ExtractedArticle[]> Array of extracted articles
 */
export async function extractMultipleArticles(
  items: RSSItem[],
  config: ExtractionConfig = {}
): Promise<ExtractedArticle[]> {
  console.log(`📚 Extracting ${items.length} articles in parallel...`);
  
  const extractionPromises = items.map(item => 
    extractArticle(item.link, item, config)
  );
  
  try {
    const results = await Promise.all(extractionPromises);
    
    const successCount = results.filter(r => r.success).length;
    const fallbackCount = results.filter(r => r.fallbackUsed).length;
    
    console.log(`✅ Extraction complete: ${successCount} successful, ${fallbackCount} fallbacks`);
    
    return results;
  } catch (error) {
    console.error(`❌ Error extracting multiple articles:`, error);
    throw error;
  }
}

/**
 * Extracts article with retry logic
 * @param url The URL to extract content from
 * @param fallbackItem RSS item to use as fallback
 * @param config Extraction configuration
 * @returns Promise<ExtractedArticle> Extracted article data
 */
export async function extractArticleWithRetry(
  url: string,
  fallbackItem?: RSSItem,
  config: ExtractionConfig = {}
): Promise<ExtractedArticle> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      console.log(`🔄 Extraction attempt ${attempt}/${finalConfig.maxRetries}`);
      return await extractArticle(url, fallbackItem, config);
    } catch (error) {
      lastError = error as Error;
      console.log(`⚠️ Attempt ${attempt} failed: ${error}`);
      
      if (attempt < finalConfig.maxRetries) {
        // Wait before retry (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // All retries failed, use fallback
  console.log(`❌ All extraction attempts failed, using fallback`);
  
  if (fallbackItem) {
    return {
      title: fallbackItem.title,
      text: fallbackItem.title,
      url: fallbackItem.link,
      success: false,
      fallbackUsed: true,
    };
  } else {
    throw lastError || new Error('Article extraction failed after all retries');
  }
}

/**
 * Gets a summary of extracted articles
 * @param articles Array of extracted articles
 * @returns Summary statistics
 */
export function getExtractionStats(articles: ExtractedArticle[]): {
  total: number;
  successful: number;
  fallbacks: number;
  averageTextLength: number;
  successRate: number;
} {
  const successful = articles.filter(a => a.success);
  const fallbacks = articles.filter(a => a.fallbackUsed);
  const totalTextLength = articles.reduce((sum, a) => sum + a.text.length, 0);
  
  return {
    total: articles.length,
    successful: successful.length,
    fallbacks: fallbacks.length,
    averageTextLength: Math.round(totalTextLength / articles.length),
    successRate: Math.round((successful.length / articles.length) * 100),
  };
}

/**
 * Validates if a URL is likely to have extractable content
 * @param url The URL to validate
 * @returns boolean True if URL looks extractable
 */
export function isExtractableUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    
    // Check if it's a valid HTTP/HTTPS URL
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return false;
    }
    
    // Check for common non-extractable patterns
    const nonExtractablePatterns = [
      /\.pdf$/i,
      /\.doc$/i,
      /\.docx$/i,
      /\.xls$/i,
      /\.xlsx$/i,
      /\.ppt$/i,
      /\.pptx$/i,
      /youtube\.com/i,
      /youtu\.be/i,
      /twitter\.com/i,
      /x\.com/i,
      /facebook\.com/i,
      /instagram\.com/i,
    ];
    
    return !nonExtractablePatterns.some(pattern => pattern.test(url));
  } catch {
    return false;
  }
}
