import { 
  extractOpenGraphImage, 
  generateImageAltText, 
  shouldAttachMedia, 
  getProductUpdateMedia,
  formatImageForTwitter,
  validateImageForTwitter,
  OpenGraphImage 
} from '../src/media/preview.js';

/**
 * Simple assertion function
 */
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`❌ Assertion failed: ${message}`);
  }
  console.log(`✅ ${message}`);
}

// Mock fetch for testing
const originalFetch = global.fetch;
global.fetch = async (url: RequestInfo | URL, init?: RequestInit) => {
  if (typeof url === 'string') {
    // Mock OpenAI blog post
    if (url.includes('openai.com/blog/gpt-4')) {
      return {
        ok: true,
        text: async () => `
          <html>
            <head>
              <meta property="og:image" content="https://openai.com/images/gpt-4-hero.jpg" />
              <meta property="og:image:alt" content="GPT-4 announcement image" />
              <meta property="og:image:width" content="1200" />
              <meta property="og:image:height" content="630" />
            </head>
            <body>
              <h1>GPT-4 Announcement</h1>
              <p>OpenAI has released GPT-4...</p>
            </body>
          </html>
        `,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
      } as Response;
    }
    
    // Mock Anthropic blog post
    if (url.includes('anthropic.com/news/claude-3')) {
      return {
        ok: true,
        text: async () => `
          <html>
            <head>
              <meta name="twitter:image" content="https://anthropic.com/assets/claude-3-preview.png" />
              <meta name="twitter:image:alt" content="Claude 3 model preview" />
            </head>
            <body>
              <h1>Claude 3 Release</h1>
              <p>Anthropic announces Claude 3...</p>
            </body>
          </html>
        `,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
      } as Response;
    }
    
    // Mock GitHub release
    if (url.includes('github.com/openai/openai-python/releases')) {
      return {
        ok: true,
        text: async () => `
          <html>
            <head>
              <meta property="og:image" content="https://github.com/openai/openai-python/releases/download/v1.0.0/release-banner.png" />
            </head>
            <body>
              <h1>OpenAI Python SDK v1.0.0</h1>
              <p>New release with enhanced features...</p>
            </body>
          </html>
        `,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
      } as Response;
    }
    
    // Mock page without OpenGraph image
    if (url.includes('openai.com/blog/no-image')) {
      return {
        ok: true,
        text: async () => `
          <html>
            <head>
              <title>No Image Post</title>
            </head>
            <body>
              <h1>Post Without Image</h1>
              <p>This post has no OpenGraph image...</p>
            </body>
          </html>
        `,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
      } as Response;
    }
    
    // Mock 404 error
    if (url.includes('404')) {
      return {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers(),
      } as Response;
    }
  }
  
  // Default response
  return {
    ok: true,
    text: async () => '<html><body>Default response</body></html>',
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
  } as Response;
};

async function runMediaPreviewTests() {
  console.log('🧪 Running Media Preview Tests');
  console.log('===============================\n');

  // --- Test OpenGraph Image Extraction ---
  console.log('\n🧪 Testing OpenGraph Image Extraction');
  console.log('=====================================');
  
  // Test OpenAI blog with OpenGraph image
  const openaiResult = await extractOpenGraphImage('https://openai.com/blog/gpt-4');
  assert(openaiResult.success, 'OpenAI blog extraction succeeds');
  assert(openaiResult.image !== undefined, 'OpenAI blog has image');
  if (openaiResult.image) {
    assert(openaiResult.image.url === 'https://openai.com/images/gpt-4-hero.jpg', 'Correct image URL');
    assert(openaiResult.image.alt === 'GPT-4 announcement image', 'Correct alt text');
    assert(openaiResult.image.width === 1200, 'Correct width');
    assert(openaiResult.image.height === 630, 'Correct height');
  }
  
  // Test Anthropic blog with Twitter card image
  const anthropicResult = await extractOpenGraphImage('https://anthropic.com/news/claude-3');
  assert(anthropicResult.success, 'Anthropic blog extraction succeeds');
  assert(anthropicResult.image !== undefined, 'Anthropic blog has image');
  if (anthropicResult.image) {
    assert(anthropicResult.image.url === 'https://anthropic.com/assets/claude-3-preview.png', 'Correct Twitter image URL');
    assert(anthropicResult.image.alt === 'Claude 3 model preview', 'Correct Twitter alt text');
  }
  
  // Test GitHub release
  const githubResult = await extractOpenGraphImage('https://github.com/openai/openai-python/releases');
  assert(githubResult.success, 'GitHub release extraction succeeds');
  assert(githubResult.image !== undefined, 'GitHub release has image');
  
  // Test page without image
  const noImageResult = await extractOpenGraphImage('https://openai.com/blog/no-image');
  assert(!noImageResult.success, 'Page without image fails gracefully');
  assert(noImageResult.error === 'No OpenGraph image found', 'Correct error message');
  
  // Test 404 error
  const errorResult = await extractOpenGraphImage('https://openai.com/blog/404');
  assert(!errorResult.success, '404 error handled gracefully');
  assert(errorResult.error?.includes('HTTP 404'), 'Correct error message');
  
  // Test non-official source
  const nonOfficialResult = await extractOpenGraphImage('https://techcrunch.com/article');
  assert(!nonOfficialResult.success, 'Non-official source rejected');
  assert(nonOfficialResult.error === 'Non-official source - skipping media extraction', 'Correct rejection reason');
  
  console.log('✅ OpenGraph image extraction tests passed');

  // --- Test Alt Text Generation ---
  console.log('\n🧪 Testing Alt Text Generation');
  console.log('===============================');
  
  const alt1 = generateImageAltText('GPT-4', '4.0');
  assert(alt1 === 'GPT-4 4.0 update announcement image.', 'Correct alt text with version');
  
  const alt2 = generateImageAltText('Claude', undefined);
  assert(alt2 === 'Claude update announcement image.', 'Correct alt text without version');
  
  const alt3 = generateImageAltText('OpenAI Python SDK', '1.0.0');
  assert(alt3 === 'OpenAI Python SDK 1.0.0 update announcement image.', 'Correct alt text for SDK');
  
  console.log('✅ Alt text generation tests passed');

  // --- Test Media Attachment Logic ---
  console.log('\n🧪 Testing Media Attachment Logic');
  console.log('==================================');
  
  // Test vendor domains
  assert(shouldAttachMedia('https://openai.com/blog/gpt-4'), 'OpenAI blog should attach media');
  assert(shouldAttachMedia('https://anthropic.com/news/claude-3'), 'Anthropic news should attach media');
  assert(shouldAttachMedia('https://ai.googleblog.com/post'), 'Google AI blog should attach media');
  assert(shouldAttachMedia('https://meta.ai/blog'), 'Meta AI blog should attach media');
  
  // Test GitHub releases
  assert(shouldAttachMedia('https://github.com/openai/openai-python/releases'), 'OpenAI GitHub releases should attach media');
  assert(shouldAttachMedia('https://github.com/anthropics/anthropic-sdk-python/releases/tag/v1.0.0'), 'Anthropic GitHub releases should attach media');
  
  // Test non-official sources
  assert(!shouldAttachMedia('https://techcrunch.com/article'), 'TechCrunch should not attach media');
  assert(!shouldAttachMedia('https://venturebeat.com/news'), 'VentureBeat should not attach media');
  assert(!shouldAttachMedia('https://github.com/random-user/random-repo'), 'Random GitHub repo should not attach media');
  
  console.log('✅ Media attachment logic tests passed');

  // --- Test Product Update Media ---
  console.log('\n🧪 Testing Product Update Media');
  console.log('===============================');
  
  const productMediaResult = await getProductUpdateMedia(
    'https://openai.com/blog/gpt-4',
    'GPT-4',
    '4.0'
  );
  
  assert(productMediaResult.success, 'Product update media extraction succeeds');
  assert(productMediaResult.image !== undefined, 'Product update media has image');
  if (productMediaResult.image) {
    assert(productMediaResult.image.alt === 'GPT-4 4.0 update announcement image.', 'Correct generated alt text');
  }
  
  // Test non-supported source
  const nonSupportedResult = await getProductUpdateMedia(
    'https://techcrunch.com/article',
    'TechCrunch Article',
    undefined
  );
  
  assert(!nonSupportedResult.success, 'Non-supported source rejected');
  assert(nonSupportedResult.error === 'Media not supported for this source type', 'Correct rejection reason');
  
  console.log('✅ Product update media tests passed');

  // --- Test Twitter Formatting ---
  console.log('\n🧪 Testing Twitter Formatting');
  console.log('=============================');
  
  const testImage: OpenGraphImage = {
    url: 'https://example.com/image.jpg',
    alt: 'Test image alt text',
    width: 1200,
    height: 630
  };
  
  const twitterFormat = formatImageForTwitter(testImage);
  assert(twitterFormat.url === 'https://example.com/image.jpg', 'Correct Twitter URL');
  assert(twitterFormat.alt_text === 'Test image alt text', 'Correct Twitter alt text');
  
  console.log('✅ Twitter formatting tests passed');

  // --- Test Image Validation ---
  console.log('\n🧪 Testing Image Validation');
  console.log('===========================');
  
  const validImage: OpenGraphImage = {
    url: 'https://example.com/image.jpg',
    alt: 'Valid image',
    width: 1200,
    height: 630
  };
  
  const invalidImage: OpenGraphImage = {
    url: 'https://example.com/image.jpg',
    alt: 'Invalid image',
    width: 200,
    height: 100
  };
  
  assert(validateImageForTwitter(validImage), 'Valid image dimensions pass validation');
  assert(!validateImageForTwitter(invalidImage), 'Invalid image dimensions fail validation');
  
  // Test image without dimensions
  const unknownDimensionsImage: OpenGraphImage = {
    url: 'https://example.com/image.jpg',
    alt: 'Unknown dimensions'
  };
  
  assert(validateImageForTwitter(unknownDimensionsImage), 'Image without dimensions passes validation');
  
  console.log('✅ Image validation tests passed');

  console.log('\n🎉 All Media Preview Tests Passed!');
  console.log('==================================');
  console.log('✅ OpenGraph image extraction');
  console.log('✅ Alt text generation');
  console.log('✅ Media attachment logic');
  console.log('✅ Product update media');
  console.log('✅ Twitter formatting');
  console.log('✅ Image validation');
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMediaPreviewTests().catch(console.error);
}
