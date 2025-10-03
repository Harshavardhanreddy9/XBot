import {
  collectAllItems,
  collectFromSource,
  getCollectionStats,
  collectedItemToDbItem,
  OFFICIAL_RSS_FEEDS,
  GITHUB_REPOS
} from '../src/collector.js';

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
 * Test RSS feed collection
 */
async function testRSSCollection() {
  console.log('\n🧪 Testing RSS Feed Collection');
  console.log('==============================');
  
  const rssItems = await collectFromSource('rss');
  
  assert(Array.isArray(rssItems), 'RSS collection returns array');
  assert(rssItems.length >= 0, `RSS collection returns ${rssItems.length} items`);
  
  // Check RSS feed configuration
  assert(OFFICIAL_RSS_FEEDS.length > 0, `Configured ${OFFICIAL_RSS_FEEDS.length} RSS feeds`);
  
  // Verify RSS items have correct structure
  rssItems.forEach((item, index) => {
    assert(item.source === 'rss', `RSS item ${index + 1} has correct source`);
    assert(typeof item.title === 'string', `RSS item ${index + 1} has title`);
    assert(typeof item.url === 'string', `RSS item ${index + 1} has URL`);
    assert(typeof item.publishedAt === 'string', `RSS item ${index + 1} has publishedAt`);
    assert(typeof item.id === 'string', `RSS item ${index + 1} has ID`);
  });
  
  console.log(`📊 RSS Collection Results:`);
  console.log(`   Feeds configured: ${OFFICIAL_RSS_FEEDS.length}`);
  console.log(`   Items collected: ${rssItems.length}`);
  
  // Show vendor breakdown for RSS items
  const vendorCounts = rssItems.reduce((acc, item) => {
    if (item.vendor) {
      acc[item.vendor] = (acc[item.vendor] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  
  if (Object.keys(vendorCounts).length > 0) {
    console.log(`   Vendors found: ${Object.keys(vendorCounts).join(', ')}`);
  }
  
  console.log('✅ RSS collection tests passed');
}

/**
 * Test GitHub releases collection
 */
async function testGitHubCollection() {
  console.log('\n🧪 Testing GitHub Releases Collection');
  console.log('=====================================');
  
  const githubItems = await collectFromSource('github');
  
  assert(Array.isArray(githubItems), 'GitHub collection returns array');
  assert(githubItems.length >= 0, `GitHub collection returns ${githubItems.length} items`);
  
  // Check GitHub repository configuration
  assert(GITHUB_REPOS.length > 0, `Configured ${GITHUB_REPOS.length} GitHub repositories`);
  
  // Verify GitHub items have correct structure
  githubItems.forEach((item, index) => {
    assert(item.source === 'github', `GitHub item ${index + 1} has correct source`);
    assert(typeof item.title === 'string', `GitHub item ${index + 1} has title`);
    assert(typeof item.url === 'string', `GitHub item ${index + 1} has URL`);
    assert(typeof item.publishedAt === 'string', `GitHub item ${index + 1} has publishedAt`);
    assert(typeof item.id === 'string', `GitHub item ${index + 1} has ID`);
    assert(typeof item.vendor === 'string', `GitHub item ${index + 1} has vendor`);
    assert(typeof item.product === 'string', `GitHub item ${index + 1} has product`);
  });
  
  console.log(`📊 GitHub Collection Results:`);
  console.log(`   Repositories configured: ${GITHUB_REPOS.length}`);
  console.log(`   Releases collected: ${githubItems.length}`);
  
  // Show vendor breakdown for GitHub items
  const vendorCounts = githubItems.reduce((acc, item) => {
    if (item.vendor) {
      acc[item.vendor] = (acc[item.vendor] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  
  if (Object.keys(vendorCounts).length > 0) {
    console.log(`   Vendors found: ${Object.keys(vendorCounts).join(', ')}`);
  }
  
  console.log('✅ GitHub collection tests passed');
}

/**
 * Test combined collection
 */
async function testCombinedCollection() {
  console.log('\n🧪 Testing Combined Collection');
  console.log('==============================');
  
  const allItems = await collectAllItems();
  
  assert(Array.isArray(allItems), 'Combined collection returns array');
  assert(allItems.length >= 0, `Combined collection returns ${allItems.length} items`);
  
  // Get collection statistics
  const stats = getCollectionStats(allItems);
  
  assert(typeof stats.total === 'number', 'Stats has total count');
  assert(typeof stats.rss === 'number', 'Stats has RSS count');
  assert(typeof stats.github === 'number', 'Stats has GitHub count');
  assert(stats.total === stats.rss + stats.github, 'Total equals RSS + GitHub');
  
  console.log(`📊 Combined Collection Results:`);
  console.log(`   Total items: ${stats.total}`);
  console.log(`   RSS items: ${stats.rss}`);
  console.log(`   GitHub releases: ${stats.github}`);
  console.log(`   Vendors: ${Object.keys(stats.vendors).length}`);
  console.log(`   Sources: ${Object.keys(stats.sources).length}`);
  
  // Verify all items have unique IDs
  const ids = allItems.map(item => item.id);
  const uniqueIds = new Set(ids);
  assert(ids.length === uniqueIds.size, 'All items have unique IDs');
  
  console.log('✅ Combined collection tests passed');
}

/**
 * Test collection statistics
 */
async function testCollectionStats() {
  console.log('\n🧪 Testing Collection Statistics');
  console.log('=================================');
  
  const allItems = await collectAllItems();
  const stats = getCollectionStats(allItems);
  
  // Test vendor counting
  const vendorCounts = allItems.reduce((acc, item) => {
    if (item.vendor) {
      acc[item.vendor] = (acc[item.vendor] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  
  assert(Object.keys(stats.vendors).length === Object.keys(vendorCounts).length, 'Vendor counts match');
  
  // Test source counting
  const sourceCounts = allItems.reduce((acc, item) => {
    acc[item.source] = (acc[item.source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  assert(Object.keys(stats.sources).length === Object.keys(sourceCounts).length, 'Source counts match');
  
  console.log(`📊 Statistics Results:`);
  console.log(`   Vendors: ${Object.keys(stats.vendors).join(', ')}`);
  console.log(`   Sources: ${Object.keys(stats.sources).join(', ')}`);
  
  console.log('✅ Collection statistics tests passed');
}

/**
 * Test item conversion to database format
 */
async function testItemConversion() {
  console.log('\n🧪 Testing Item Conversion');
  console.log('==========================');
  
  const allItems = await collectAllItems();
  
  if (allItems.length > 0) {
    const testItem = allItems[0];
    const dbItem = collectedItemToDbItem(testItem);
    
    assert(dbItem.id === testItem.id, 'ID preserved in conversion');
    assert(dbItem.source === testItem.source, 'Source preserved in conversion');
    assert(dbItem.vendor === testItem.vendor, 'Vendor preserved in conversion');
    assert(dbItem.product === testItem.product, 'Product preserved in conversion');
    assert(dbItem.url === testItem.url, 'URL preserved in conversion');
    assert(dbItem.title === testItem.title, 'Title preserved in conversion');
    assert(dbItem.publishedAt === testItem.publishedAt, 'PublishedAt preserved in conversion');
    assert(dbItem.text === testItem.text, 'Text preserved in conversion');
    
    console.log(`📊 Conversion Results:`);
    console.log(`   Original item: ${testItem.title}`);
    console.log(`   Converted item: ${dbItem.title}`);
    console.log(`   Source: ${dbItem.source}`);
    console.log(`   Vendor: ${dbItem.vendor || 'None'}`);
    console.log(`   Product: ${dbItem.product || 'None'}`);
  } else {
    console.log('⚠️ No items available for conversion test');
  }
  
  console.log('✅ Item conversion tests passed');
}

/**
 * Test error handling
 */
async function testErrorHandling() {
  console.log('\n🧪 Testing Error Handling');
  console.log('==========================');
  
  try {
    // Test with invalid source
    await collectFromSource('invalid' as any);
    assert(false, 'Should have thrown error for invalid source');
  } catch (error) {
    assert(error instanceof Error, 'Error handling works for invalid source');
    assert(error.message.includes('Unknown source type'), 'Error message is descriptive');
  }
  
  console.log('✅ Error handling tests passed');
}

/**
 * Test configuration
 */
async function testConfiguration() {
  console.log('\n🧪 Testing Configuration');
  console.log('========================');
  
  // Test RSS feed configuration
  assert(OFFICIAL_RSS_FEEDS.length > 0, 'RSS feeds configured');
  
  OFFICIAL_RSS_FEEDS.forEach((feed, index) => {
    assert(typeof feed.url === 'string', `RSS feed ${index + 1} has URL`);
    assert(typeof feed.source === 'string', `RSS feed ${index + 1} has source`);
    assert(feed.url.startsWith('http'), `RSS feed ${index + 1} has valid URL`);
  });
  
  // Test GitHub repository configuration
  assert(GITHUB_REPOS.length > 0, 'GitHub repositories configured');
  
  GITHUB_REPOS.forEach((repo, index) => {
    assert(typeof repo.owner === 'string', `GitHub repo ${index + 1} has owner`);
    assert(typeof repo.repo === 'string', `GitHub repo ${index + 1} has repo`);
    assert(typeof repo.vendor === 'string', `GitHub repo ${index + 1} has vendor`);
    assert(typeof repo.product === 'string', `GitHub repo ${index + 1} has product`);
  });
  
  console.log(`📊 Configuration Results:`);
  console.log(`   RSS feeds: ${OFFICIAL_RSS_FEEDS.length}`);
  console.log(`   GitHub repos: ${GITHUB_REPOS.length}`);
  
  // Show some configured sources
  console.log(`   Sample RSS feeds: ${OFFICIAL_RSS_FEEDS.slice(0, 3).map(f => f.source).join(', ')}`);
  console.log(`   Sample GitHub repos: ${GITHUB_REPOS.slice(0, 3).map(r => `${r.owner}/${r.repo}`).join(', ')}`);
  
  console.log('✅ Configuration tests passed');
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🧪 Running Collector Tests');
  console.log('===========================\n');
  
  try {
    await testRSSCollection();
    await testGitHubCollection();
    await testCombinedCollection();
    await testCollectionStats();
    await testItemConversion();
    await testErrorHandling();
    await testConfiguration();
    
    console.log('\n🎉 All collector tests completed successfully!');
    console.log('✅ Collector system is working properly.');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}
