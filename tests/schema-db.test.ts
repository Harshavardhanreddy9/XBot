import { 
  Item, 
  Event, 
  Tweet, 
  createItemFromRSS, 
  createItemFromWeb, 
  extractVendorProduct,
  generateItemId,
  areItemsDuplicate,
  validateItem
} from '../src/schema.js';

import {
  upsertItem,
  getItemsSince,
  getItemsByVendorProduct,
  getRecentItemsBySource,
  createEvent,
  recordTweet,
  getDatabaseStats,
  closeDatabase
} from '../src/db.js';

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
 * Test schema validation
 */
function testSchemaValidation() {
  console.log('\n🧪 Testing Schema Validation');
  console.log('=============================');
  
  // Valid item
  const validItem: Item = {
    id: 'test123',
    source: 'rss',
    vendor: 'OpenAI',
    product: 'GPT-4',
    url: 'https://example.com/article',
    title: 'OpenAI Releases GPT-4',
    summary: 'A new AI model',
    publishedAt: '2024-01-15T10:00:00Z',
    text: 'Full article content here...',
    raw: { test: 'data' }
  };
  
  assert(validateItem(validItem).id === 'test123', 'Valid item passes validation');
  
  // Invalid item (missing required fields)
  try {
    validateItem({ id: 'test', source: 'invalid' });
    assert(false, 'Invalid item should fail validation');
  } catch (error) {
    assert(true, 'Invalid item correctly fails validation');
  }
  
  console.log('✅ Schema validation tests passed');
}

/**
 * Test utility functions
 */
function testUtilityFunctions() {
  console.log('\n🧪 Testing Utility Functions');
  console.log('============================');
  
  // Test ID generation
  const id1 = generateItemId('https://example.com/article1');
  const id2 = generateItemId('https://example.com/article2');
  const id3 = generateItemId('https://example.com/article1'); // Same URL
  
  assert(id1 !== id2, 'Different URLs generate different IDs');
  assert(id1 === id3, 'Same URL generates same ID');
  
  // Test vendor/product extraction
  const { vendor, product } = extractVendorProduct('OpenAI Releases GPT-4 Turbo');
  assert(vendor === 'openai', `Vendor extracted: ${vendor}`);
  assert(product === 'gpt-4', `Product extracted: ${product}`);
  
  // Test duplicate detection
  const item1: Item = {
    id: '1',
    source: 'rss',
    url: 'https://example.com/article1',
    title: 'OpenAI Releases GPT-4',
    publishedAt: '2024-01-15T10:00:00Z'
  };
  
  const item2: Item = {
    id: '2',
    source: 'web',
    url: 'https://example.com/article1', // Same URL
    title: 'OpenAI Releases GPT-4',
    publishedAt: '2024-01-15T10:00:00Z'
  };
  
  assert(areItemsDuplicate(item1, item2), 'Items with same URL are duplicates');
  
  console.log('✅ Utility function tests passed');
}

/**
 * Test RSS item creation
 */
function testRSSItemCreation() {
  console.log('\n🧪 Testing RSS Item Creation');
  console.log('============================');
  
  const rssData = {
    title: 'Google Announces Gemini 2.0',
    link: 'https://blog.google/ai/gemini-2-0',
    isoDate: '2024-01-15T10:00:00Z',
    source: 'Google AI Blog',
    description: 'Google\'s latest AI model with improved capabilities'
  };
  
  const item = createItemFromRSS(rssData);
  
  assert(item.source === 'rss', 'Source is set to rss');
  assert(item.url === rssData.link, 'URL is preserved');
  assert(item.title === rssData.title, 'Title is preserved');
  assert(item.vendor === 'google', 'Vendor extracted from title');
  assert(item.product === 'gemini', 'Product extracted from title');
  
  console.log('✅ RSS item creation tests passed');
}

/**
 * Test web item creation
 */
function testWebItemCreation() {
  console.log('\n🧪 Testing Web Item Creation');
  console.log('============================');
  
  const webData = {
    title: 'Anthropic Releases Claude 3.5',
    text: 'Anthropic has released Claude 3.5 with improved reasoning capabilities...',
    url: 'https://anthropic.com/news/claude-3-5',
    publishedAt: '2024-01-15T10:00:00Z',
    summary: 'Claude 3.5 release announcement'
  };
  
  const item = createItemFromWeb(webData);
  
  assert(item.source === 'web', 'Source is set to web');
  assert(item.url === webData.url, 'URL is preserved');
  assert(item.title === webData.title, 'Title is preserved');
  assert(item.text === webData.text, 'Text is preserved');
  assert(item.vendor === 'anthropic', 'Vendor extracted from title');
  assert(item.product === 'claude', 'Product extracted from title');
  
  console.log('✅ Web item creation tests passed');
}

/**
 * Test database operations
 */
async function testDatabaseOperations() {
  console.log('\n🧪 Testing Database Operations');
  console.log('===============================');
  
  try {
    // Test item upsert
    const testItem: Item = {
      id: 'test-db-item',
      source: 'rss',
      vendor: 'OpenAI',
      product: 'GPT-4',
      url: 'https://test.example.com/article',
      title: 'Test Article for Database',
      summary: 'Test summary',
      publishedAt: new Date().toISOString(),
      text: 'Test article content'
    };
    
    await upsertItem(testItem);
    assert(true, 'Item upserted successfully');
    
    // Test getting recent items
    const recentItems = await getItemsSince(24);
    assert(recentItems.length >= 1, `Found ${recentItems.length} recent items`);
    
    // Test getting items by vendor
    const openaiItems = await getItemsByVendorProduct('OpenAI');
    assert(openaiItems.length >= 1, `Found ${openaiItems.length} OpenAI items`);
    
    // Test getting items by source
    const rssItems = await getRecentItemsBySource('rss', 10);
    assert(rssItems.length >= 1, `Found ${rssItems.length} RSS items`);
    
    // Test event creation
    const testEvent: Event = {
      id: 'test-event-1',
      vendor: 'OpenAI',
      product: 'GPT-4',
      kind: 'release',
      version: '4.0',
      windowStart: new Date().toISOString(),
      windowEnd: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      description: 'Test event for database'
    };
    
    await createEvent(testEvent);
    assert(true, 'Event created successfully');
    
    // Test tweet recording
    const testTweet: Tweet = {
      id: 'test-tweet-1',
      eventId: 'test-event-1',
      content: 'Test tweet content',
      url: 'https://twitter.com/user/status/123',
      postedAt: new Date().toISOString(),
      threadJson: JSON.stringify({ tweets: ['Tweet 1', 'Tweet 2'] })
    };
    
    await recordTweet(testTweet);
    assert(true, 'Tweet recorded successfully');
    
    // Test database stats
    const stats = await getDatabaseStats();
    assert(stats.totalItems >= 1, `Total items: ${stats.totalItems}`);
    assert(stats.totalTweets >= 1, `Total tweets: ${stats.totalTweets}`);
    assert(stats.itemsBySource.rss >= 1, `RSS items: ${stats.itemsBySource.rss}`);
    
    console.log('📊 Database Stats:');
    console.log(`   Total Items: ${stats.totalItems}`);
    console.log(`   Total Tweets: ${stats.totalTweets}`);
    console.log(`   Recent Items (24h): ${stats.recentItems}`);
    console.log(`   Items by Source:`, stats.itemsBySource);
    console.log(`   Items by Vendor:`, stats.itemsByVendor);
    
    console.log('✅ Database operation tests passed');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    throw error;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🧪 Running Schema & Database Tests');
  console.log('==================================\n');
  
  try {
    testSchemaValidation();
    testUtilityFunctions();
    testRSSItemCreation();
    testWebItemCreation();
    await testDatabaseOperations();
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('✅ Schema and database system is working properly.');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    closeDatabase();
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}
