import { JSDOM } from 'jsdom';
import { isOfficial } from '../safety.js';

/**
 * OpenGraph image data
 */
export interface OpenGraphImage {
  url: string;
  alt: string;
  width?: number;
  height?: number;
}

/**
 * Media preview result
 */
export interface MediaPreviewResult {
  success: boolean;
  image?: OpenGraphImage;
  error?: string;
}

/**
 * Extract OpenGraph image from a URL
 */
export async function extractOpenGraphImage(url: string): Promise<MediaPreviewResult> {
  try {
    // Only process official sources (vendor or GitHub links)
    if (!isOfficial(url)) {
      return {
        success: false,
        error: 'Non-official source - skipping media extraction'
      };
    }

    console.log(`🖼️ Extracting OpenGraph image from: ${url}`);

    // Fetch the page content with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; XBot/1.0; +https://github.com/your-repo/xbot)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }

    const html = await response.text();
    
    // Parse HTML with JSDOM
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Extract OpenGraph image
    const ogImage = extractOpenGraphMeta(document);
    
    if (!ogImage) {
      return {
        success: false,
        error: 'No OpenGraph image found'
      };
    }

    // Validate image URL
    if (!isValidImageUrl(ogImage.url)) {
      return {
        success: false,
        error: 'Invalid image URL'
      };
    }

    console.log(`✅ Found OpenGraph image: ${ogImage.url}`);
    
    return {
      success: true,
      image: ogImage
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Failed to extract OpenGraph image from ${url}: ${errorMessage}`);
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Extract OpenGraph meta tags from document
 */
function extractOpenGraphMeta(document: Document): OpenGraphImage | null {
  // Try OpenGraph image first
  const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
  const ogImageAlt = document.querySelector('meta[property="og:image:alt"]')?.getAttribute('content');
  const ogImageWidth = document.querySelector('meta[property="og:image:width"]')?.getAttribute('content');
  const ogImageHeight = document.querySelector('meta[property="og:image:height"]')?.getAttribute('content');

  if (ogImage) {
    return {
      url: resolveImageUrl(ogImage),
      alt: ogImageAlt || 'Image',
      width: ogImageWidth ? parseInt(ogImageWidth, 10) : undefined,
      height: ogImageHeight ? parseInt(ogImageHeight, 10) : undefined
    };
  }

  // Fallback to Twitter card image
  const twitterImage = document.querySelector('meta[name="twitter:image"]')?.getAttribute('content');
  const twitterImageAlt = document.querySelector('meta[name="twitter:image:alt"]')?.getAttribute('content');

  if (twitterImage) {
    return {
      url: resolveImageUrl(twitterImage),
      alt: twitterImageAlt || 'Image'
    };
  }

  // Fallback to first large image in content
  const contentImages = document.querySelectorAll('img[src]');
  for (const img of contentImages) {
    const src = img.getAttribute('src');
    const alt = img.getAttribute('alt');
    const width = img.getAttribute('width');
    const height = img.getAttribute('height');

    if (src && isValidImageUrl(src)) {
      // Check if image is large enough to be meaningful
      const imgWidth = width ? parseInt(width, 10) : 0;
      const imgHeight = height ? parseInt(height, 10) : 0;
      
      if (imgWidth >= 300 || imgHeight >= 200) {
        return {
          url: resolveImageUrl(src),
          alt: alt || 'Image',
          width: imgWidth || undefined,
          height: imgHeight || undefined
        };
      }
    }
  }

  return null;
}

/**
 * Resolve relative image URLs to absolute URLs
 */
function resolveImageUrl(imageUrl: string, baseUrl?: string): string {
  // If already absolute, return as-is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // If baseUrl provided, resolve relative to it
  if (baseUrl) {
    try {
      return new URL(imageUrl, baseUrl).href;
    } catch {
      return imageUrl;
    }
  }

  return imageUrl;
}

/**
 * Validate if URL is a valid image
 */
function isValidImageUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    
    // Check if it's a valid image extension
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const pathname = parsedUrl.pathname.toLowerCase();
    
    return imageExtensions.some(ext => pathname.endsWith(ext)) || 
           parsedUrl.hostname.includes('cdn') ||
           parsedUrl.hostname.includes('images') ||
           parsedUrl.hostname.includes('assets');
  } catch {
    return false;
  }
}

/**
 * Generate alt text for product update images
 */
export function generateImageAltText(product: string, version?: string): string {
  const versionText = version ? ` ${version}` : '';
  return `${product}${versionText} update announcement image.`;
}

/**
 * Check if URL should have media attached
 */
export function shouldAttachMedia(url: string): boolean {
  // Only attach media for official sources
  if (!isOfficial(url)) {
    return false;
  }

  // Check if it's a vendor or GitHub link
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();
    
    // Vendor domains
    const vendorDomains = [
      'openai.com',
      'anthropic.com', 
      'ai.googleblog.com',
      'meta.ai',
      'mistral.ai',
      'cohere.com',
      'huggingface.co'
    ];
    
    if (vendorDomains.some(domain => hostname.includes(domain))) {
      return true;
    }
    
    // GitHub releases
    if (hostname === 'github.com' && url.includes('/releases')) {
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Extract media preview for a product update
 */
export async function getProductUpdateMedia(
  url: string, 
  product: string, 
  version?: string
): Promise<MediaPreviewResult> {
  // Check if we should attach media
  if (!shouldAttachMedia(url)) {
    return {
      success: false,
      error: 'Media not supported for this source type'
    };
  }

  // Extract OpenGraph image
  const result = await extractOpenGraphImage(url);
  
  if (result.success && result.image) {
    // Generate appropriate alt text
    result.image.alt = generateImageAltText(product, version);
  }
  
  return result;
}

/**
 * Format image for Twitter attachment
 */
export function formatImageForTwitter(image: OpenGraphImage): {
  url: string;
  alt_text: string;
} {
  return {
    url: image.url,
    alt_text: image.alt
  };
}

/**
 * Validate image dimensions for Twitter
 */
export function validateImageForTwitter(image: OpenGraphImage): boolean {
  // Twitter image requirements:
  // - Minimum 300x157 pixels
  // - Maximum 5MB file size
  // - Supported formats: JPG, PNG, WEBP, GIF
  
  if (!image.width || !image.height) {
    // If dimensions unknown, assume it's valid (will be validated by Twitter)
    return true;
  }
  
  return image.width >= 300 && image.height >= 157;
}

/**
 * Get media preview statistics
 */
export function getMediaPreviewStats(): {
  totalRequests: number;
  successfulExtractions: number;
  failedExtractions: number;
  averageResponseTime: number;
} {
  // This would be implemented with actual statistics tracking
  // For now, return mock data
  return {
    totalRequests: 0,
    successfulExtractions: 0,
    failedExtractions: 0,
    averageResponseTime: 0
  };
}
