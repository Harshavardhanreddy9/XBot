import { JSDOM } from 'jsdom';
import fetch from 'node-fetch';
import { unfurl } from 'unfurl.js';
import { extract } from '@extractus/article-extractor';

/**
 * Extracted article data
 */
export interface ExtractedArticle {
  title: string;
  text: string;
  topImage?: string;
  canonicalUrl?: string;
  method: 'article-extractor' | 'readability' | 'unfurl';
  success: boolean;
}

/**
 * Configuration for extraction
 */
interface ExtractionConfig {
  timeout?: number;
  maxRetries?: number;
  userAgent?: string;
}

const DEFAULT_CONFIG: Required<ExtractionConfig> = {
  timeout: 15000,
  maxRetries: 2,
  userAgent: 'Mozilla/5.0 (compatible; XBot/1.0; +https://github.com/Harshavardhanreddy9/XBot)'
};

/**
 * Normalize whitespace in text
 */
function normalizeWhitespace(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

/**
 * Strip scripts and styles from HTML
 */
function stripScriptsAndStyles(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '')
    .replace(/<canvas[^>]*>[\s\S]*?<\/canvas>/gi, '')
    .replace(/<audio[^>]*>[\s\S]*?<\/audio>/gi, '')
    .replace(/<video[^>]*>[\s\S]*?<\/video>/gi, '');
}

/**
 * Clean HTML tags and extract clean text
 */
function cleanHtmlTags(html: string): string {
  return html
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, '')
    // Remove HTML tags but preserve content
    .replace(/<[^>]+>/g, ' ')
    // Clean up common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Simple Readability clone implementation
 */
class SimpleReadability {
  private dom: JSDOM;
  private document: any;

  constructor(html: string) {
    this.dom = new JSDOM(html);
    this.document = this.dom.window.document;
  }

  /**
   * Extract article content using readability-like algorithm
   */
  extract(): { title: string; content: string; topImage?: string } {
    // Remove unwanted elements
    this.removeUnwantedElements();
    
    // Get title
    const title = this.extractTitle();
    
    // Get main content
    const content = this.extractContent();
    
    // Get top image
    const topImage = this.extractTopImage();
    
    return {
      title,
      content: normalizeWhitespace(cleanHtmlTags(content)),
      topImage
    };
  }

  private removeUnwantedElements(): void {
    const unwantedSelectors = [
      'script', 'style', 'nav', 'header', 'footer', 'aside',
      '.advertisement', '.ads', '.sidebar', '.menu', '.navigation',
      '.social-share', '.comments', '.related', '.newsletter',
      '[role="banner"]', '[role="navigation"]', '[role="complementary"]'
    ];

    unwantedSelectors.forEach(selector => {
      const elements = this.document.querySelectorAll(selector);
      elements.forEach((el: any) => el.remove());
    });
  }

  private extractTitle(): string {
    // Try various title sources
    const titleSelectors = [
      'h1',
      'title',
      '[property="og:title"]',
      '[name="twitter:title"]',
      '.article-title',
      '.post-title',
      '.entry-title'
    ];

    for (const selector of titleSelectors) {
      const element = this.document.querySelector(selector);
      if (element) {
        const title = element.textContent || element.getAttribute('content') || '';
        if (title.trim().length > 10) {
          return title.trim();
        }
      }
    }

    return 'Article Title';
  }

  private extractContent(): string {
    // Try to find main content area
    const contentSelectors = [
      'article',
      '.article-content',
      '.post-content',
      '.entry-content',
      '.content',
      'main',
      '.main-content',
      '[role="main"]'
    ];

    let contentElement: any = null;

    for (const selector of contentSelectors) {
      contentElement = this.document.querySelector(selector);
      if (contentElement) {
        break;
      }
    }

    // If no specific content area found, try to find the largest text block
    if (!contentElement) {
      contentElement = this.findLargestTextBlock();
    }

    if (contentElement) {
      return this.extractTextFromElement(contentElement);
    }

    return this.document.body?.textContent || '';
  }

  private findLargestTextBlock(): any {
    const candidates = this.document.querySelectorAll('div, section, p');
    let largestElement: any = null;
    let largestTextLength = 0;

    candidates.forEach((element: any) => {
      const textLength = element.textContent?.length || 0;
      if (textLength > largestTextLength && textLength > 200) {
        largestTextLength = textLength;
        largestElement = element;
      }
    });

    return largestElement;
  }

  private extractTextFromElement(element: any): string {
    // Remove unwanted child elements
    const unwantedInContent = element.querySelectorAll('script, style, nav, .advertisement, .ads');
    unwantedInContent.forEach((el: any) => el.remove());

    // Extract text content
    let text = '';
    
    // Prefer paragraphs for better structure
    const paragraphs = element.querySelectorAll('p');
    if (paragraphs.length > 0) {
      text = Array.from(paragraphs)
        .map((p: any) => p.textContent?.trim())
        .filter((text: any) => text && text.length > 20)
        .join('\n\n');
    } else {
      text = element.textContent || '';
    }

    return text;
  }

  private extractTopImage(): string | undefined {
    const imageSelectors = [
      '[property="og:image"]',
      '[name="twitter:image"]',
      '.article-image img',
      '.post-image img',
      '.featured-image img',
      'article img:first-of-type'
    ];

    for (const selector of imageSelectors) {
      const element = this.document.querySelector(selector);
      if (element) {
        const src = element.getAttribute('content') || element.getAttribute('src');
        if (src && src.startsWith('http')) {
          return src;
        }
      }
    }

    return undefined;
  }
}

/**
 * Extract article using @extractus/article-extractor
 */
async function extractWithArticleExtractor(url: string, config: ExtractionConfig): Promise<ExtractedArticle | null> {
  try {
    console.log(`📄 Trying article-extractor for: ${url}`);
    const result = await extract(url);
    
    if (result && result.title && result.content) {
      return {
        title: result.title,
        text: normalizeWhitespace(cleanHtmlTags(result.content)),
        topImage: result.image,
        canonicalUrl: result.url,
        method: 'article-extractor',
        success: true
      };
    }
  } catch (error) {
    console.log(`⚠️ Article-extractor failed: ${error}`);
  }
  
  return null;
}

/**
 * Extract article using jsdom + readability
 */
async function extractWithReadability(url: string, config: ExtractionConfig): Promise<ExtractedArticle | null> {
  try {
    console.log(`📄 Trying readability for: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': config.userAgent || DEFAULT_CONFIG.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const cleanHtml = stripScriptsAndStyles(html);
    
    const readability = new SimpleReadability(cleanHtml);
    const result = readability.extract();
    
    if (result.content.length > 100) {
      return {
        title: result.title,
        text: result.content,
        topImage: result.topImage,
        canonicalUrl: url,
        method: 'readability',
        success: true
      };
    }
  } catch (error) {
    console.log(`⚠️ Readability failed: ${error}`);
  }
  
  return null;
}

/**
 * Extract article using unfurl.js (fallback)
 */
async function extractWithUnfurl(url: string, config: ExtractionConfig): Promise<ExtractedArticle | null> {
  try {
    console.log(`📄 Trying unfurl for: ${url}`);
    
    const result = await unfurl(url);
    
    if (result) {
      const title = result.title || result.open_graph?.title || 'Article Title';
      const description = result.description || result.open_graph?.description || '';
      
      return {
        title,
        text: normalizeWhitespace(cleanHtmlTags(description)),
        topImage: result.open_graph?.images?.[0]?.url,
        canonicalUrl: result.canonical_url || url,
        method: 'unfurl',
        success: true
      };
    }
  } catch (error) {
    console.log(`⚠️ Unfurl failed: ${error}`);
  }
  
  return null;
}

/**
 * Main extraction function with fallback chain
 */
export async function extractFullText(url: string, config: ExtractionConfig = {}): Promise<ExtractedArticle> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  console.log(`📄 Extracting article from: ${url}`);
  
  // Try article-extractor first
  let result = await extractWithArticleExtractor(url, finalConfig);
  if (result) {
    console.log(`✅ Article-extractor succeeded`);
    return result;
  }
  
  // Try readability fallback
  result = await extractWithReadability(url, finalConfig);
  if (result) {
    console.log(`✅ Readability succeeded`);
    return result;
  }
  
  // Try unfurl fallback
  result = await extractWithUnfurl(url, finalConfig);
  if (result) {
    console.log(`✅ Unfurl succeeded`);
    return result;
  }
  
  // All methods failed
  console.log(`❌ All extraction methods failed`);
  return {
    title: 'Article Title',
    text: 'Content extraction failed',
    canonicalUrl: url,
    method: 'unfurl',
    success: false
  };
}

/**
 * Check if URL is extractable
 */
export function isExtractableUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol;
    const hostname = parsedUrl.hostname;
    
    // Only allow http/https
    if (protocol !== 'http:' && protocol !== 'https:') {
      return false;
    }
    
    // Block common non-extractable domains
    const blockedDomains = [
      'twitter.com', 'x.com', 'facebook.com', 'instagram.com',
      'youtube.com', 'tiktok.com', 'linkedin.com', 'reddit.com'
    ];
    
    return !blockedDomains.some(domain => hostname.includes(domain));
  } catch {
    return false;
  }
}
