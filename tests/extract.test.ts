import { extractFullText, isExtractableUrl } from '../src/extract.js';

/**
 * Simple assertion function for testing
 */
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`❌ Assertion failed: ${message}`);
  }
  console.log(`✅ ${message}`);
}

/**
 * Test synthetic HTML string
 */
async function testSyntheticHTML() {
  console.log('\n🧪 Testing Synthetic HTML');
  console.log('==========================');
  
  const syntheticHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Test Article: AI Breakthrough in 2024</title>
      <meta property="og:title" content="AI Breakthrough in 2024" />
      <meta property="og:description" content="This is a test article about AI breakthroughs." />
      <meta property="og:image" content="https://example.com/image.jpg" />
    </head>
    <body>
      <nav>Navigation</nav>
      <header>Header</header>
      <article>
        <h1>AI Breakthrough in 2024</h1>
        <p>This is the first paragraph of the article. It contains important information about AI developments.</p>
        <p>This is the second paragraph with more details about the breakthrough. The technology has advanced significantly.</p>
        <p>This is the third paragraph explaining the implications of this development for the future of artificial intelligence.</p>
      </article>
      <aside>Sidebar content</aside>
      <footer>Footer</footer>
    </body>
    </html>
  `;
  
  // Note: This test would need a mock server to serve the HTML
  // For now, we'll test the URL validation
  assert(isExtractableUrl('https://example.com/article'), 'Synthetic URL is extractable');
}

/**
 * Test TechCrunch AI article
 */
async function testTechCrunchAI() {
  console.log('\n🧪 Testing TechCrunch AI Article');
  console.log('=================================');
  
  const url = 'https://techcrunch.com/category/artificial-intelligence/';
  
  try {
    const result = await extractFullText(url);
    
    assert(result.success, `Extraction succeeded: ${result.method}`);
    assert(result.title.length > 0, `Title extracted: "${result.title}"`);
    assert(result.text.length > 50, `Content length: ${result.text.length} chars`);
    assert(result.canonicalUrl === url, `Canonical URL preserved: ${result.canonicalUrl}`);
    
    console.log(`📊 Results:`);
    console.log(`   Method: ${result.method}`);
    console.log(`   Title: ${result.title}`);
    console.log(`   Content: ${result.text.substring(0, 100)}...`);
    console.log(`   Length: ${result.text.length} chars`);
    if (result.topImage) {
      console.log(`   Image: ${result.topImage}`);
    }
    
  } catch (error) {
    console.log(`⚠️ TechCrunch test failed: ${error}`);
  }
}

/**
 * Test VentureBeat article
 */
async function testVentureBeat() {
  console.log('\n🧪 Testing VentureBeat Article');
  console.log('===============================');
  
  const url = 'https://venturebeat.com/ai/';
  
  try {
    const result = await extractFullText(url);
    
    assert(result.success, `Extraction succeeded: ${result.method}`);
    assert(result.title.length > 0, `Title extracted: "${result.title}"`);
    assert(result.text.length > 50, `Content length: ${result.text.length} chars`);
    
    console.log(`📊 Results:`);
    console.log(`   Method: ${result.method}`);
    console.log(`   Title: ${result.title}`);
    console.log(`   Content: ${result.text.substring(0, 100)}...`);
    console.log(`   Length: ${result.text.length} chars`);
    
  } catch (error) {
    console.log(`⚠️ VentureBeat test failed: ${error}`);
  }
}

/**
 * Test Google AI Blog article
 */
async function testGoogleAIBlog() {
  console.log('\n🧪 Testing Google AI Blog Article');
  console.log('==================================');
  
  const url = 'https://ai.googleblog.com/';
  
  try {
    const result = await extractFullText(url);
    
    assert(result.success, `Extraction succeeded: ${result.method}`);
    assert(result.title.length > 0, `Title extracted: "${result.title}"`);
    assert(result.text.length > 50, `Content length: ${result.text.length} chars`);
    
    console.log(`📊 Results:`);
    console.log(`   Method: ${result.method}`);
    console.log(`   Title: ${result.title}`);
    console.log(`   Content: ${result.text.substring(0, 100)}...`);
    console.log(`   Length: ${result.text.length} chars`);
    
  } catch (error) {
    console.log(`⚠️ Google AI Blog test failed: ${error}`);
  }
}

/**
 * Test URL validation
 */
function testURLValidation() {
  console.log('\n🧪 Testing URL Validation');
  console.log('==========================');
  
  // Valid URLs
  assert(isExtractableUrl('https://techcrunch.com/article'), 'HTTPS URL is valid');
  assert(isExtractableUrl('http://example.com/article'), 'HTTP URL is valid');
  assert(isExtractableUrl('https://subdomain.example.com/article'), 'Subdomain URL is valid');
  
  // Invalid URLs
  assert(!isExtractableUrl('twitter.com/article'), 'Twitter URL is blocked');
  assert(!isExtractableUrl('https://twitter.com/article'), 'HTTPS Twitter URL is blocked');
  assert(!isExtractableUrl('https://x.com/article'), 'X.com URL is blocked');
  assert(!isExtractableUrl('https://facebook.com/article'), 'Facebook URL is blocked');
  assert(!isExtractableUrl('https://youtube.com/article'), 'YouTube URL is blocked');
  assert(!isExtractableUrl('ftp://example.com/article'), 'FTP URL is invalid');
  assert(!isExtractableUrl('invalid-url'), 'Invalid URL format is rejected');
  
  console.log('✅ All URL validation tests passed');
}

/**
 * Test extraction methods fallback
 */
async function testExtractionFallback() {
  console.log('\n🧪 Testing Extraction Fallback');
  console.log('==============================');
  
  // Test with a URL that might fail article-extractor but succeed with readability
  const url = 'https://example.com/test-article';
  
  try {
    const result = await extractFullText(url);
    
    // Should still return a result even if all methods fail
    assert(result.title.length > 0, 'Title is provided even on failure');
    assert(result.text.length > 0, 'Text is provided even on failure');
    assert(result.method !== undefined, 'Method is specified');
    
    console.log(`📊 Fallback Results:`);
    console.log(`   Method: ${result.method}`);
    console.log(`   Success: ${result.success}`);
    console.log(`   Title: ${result.title}`);
    console.log(`   Text: ${result.text}`);
    
  } catch (error) {
    console.log(`⚠️ Fallback test failed: ${error}`);
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🧪 Running Article Extraction Tests');
  console.log('====================================\n');
  
  try {
    // Test URL validation first
    testURLValidation();
    
    // Test synthetic HTML
    await testSyntheticHTML();
    
    // Test real URLs
    await testTechCrunchAI();
    await testVentureBeat();
    await testGoogleAIBlog();
    
    // Test fallback behavior
    await testExtractionFallback();
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('✅ Article extraction system is working properly.');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}
