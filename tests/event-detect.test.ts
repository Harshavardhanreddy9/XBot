import { Item } from '../src/schema.js';
import {
  detectVendorProduct,
  isReleaseLike,
  clusterCandidates,
  analyzeItem,
  getBestCluster,
  getClustersByVendor,
  getTopClusters,
  CandidateCluster
} from '../src/events/detect.js';

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
 * Test vendor and product detection
 */
function testVendorProductDetection() {
  console.log('\n🧪 Testing Vendor & Product Detection');
  console.log('========================================');
  
  // Test OpenAI detection
  const openaiResult = detectVendorProduct('OpenAI Releases GPT-4 Turbo with Enhanced Capabilities');
  assert(openaiResult.vendor === 'openai', `OpenAI vendor detected: ${openaiResult.vendor}`);
  assert(openaiResult.product === 'gpt-4', `GPT-4 product detected: ${openaiResult.product}`);
  
  // Test Google detection
  const googleResult = detectVendorProduct('Google Announces Gemini 2.0 Pro');
  assert(googleResult.vendor === 'google', `Google vendor detected: ${googleResult.vendor}`);
  assert(googleResult.product === 'gemini', `Gemini product detected: ${googleResult.product}`);
  
  // Test Anthropic detection
  const anthropicResult = detectVendorProduct('Anthropic Launches Claude 3.5 Sonnet');
  assert(anthropicResult.vendor === 'anthropic', `Anthropic vendor detected: ${anthropicResult.vendor}`);
  assert(anthropicResult.product === 'claude', `Claude product detected: ${anthropicResult.product}`);
  
  // Test Meta detection
  const metaResult = detectVendorProduct('Meta Releases Llama 3.1 405B Model');
  assert(metaResult.vendor === 'meta', `Meta vendor detected: ${metaResult.vendor}`);
  assert(metaResult.product === 'llama', `Llama product detected: ${metaResult.product}`);
  
  // Test Microsoft detection
  const microsoftResult = detectVendorProduct('Microsoft Copilot Gets New AI Features');
  assert(microsoftResult.vendor === 'microsoft', `Microsoft vendor detected: ${microsoftResult.vendor}`);
  assert(microsoftResult.product === 'copilot', `Copilot product detected: ${microsoftResult.product}`);
  
  // Test case insensitive detection
  const caseInsensitiveResult = detectVendorProduct('OPENAI RELEASES GPT-4 TURBO');
  assert(caseInsensitiveResult.vendor === 'openai', 'Case insensitive vendor detection');
  assert(caseInsensitiveResult.product === 'gpt-4', 'Case insensitive product detection');
  
  // Test with text content
  const withTextResult = detectVendorProduct(
    'AI Model Update',
    'OpenAI has released a new version of GPT-4 with improved capabilities'
  );
  assert(withTextResult.vendor === 'openai', 'Vendor detection from text content');
  assert(withTextResult.product === 'gpt-4', 'Product detection from text content');
  
  console.log('✅ Vendor & product detection tests passed');
}

/**
 * Test release pattern detection
 */
function testReleasePatternDetection() {
  console.log('\n🧪 Testing Release Pattern Detection');
  console.log('======================================');
  
  // Test direct release words
  assert(isReleaseLike('OpenAI Introduces GPT-4 Turbo'), 'Direct release word detection');
  assert(isReleaseLike('Google Announces Gemini 2.0'), 'Announcement detection');
  assert(isReleaseLike('Anthropic Launches Claude 3.5'), 'Launch detection');
  
  // Test version patterns
  assert(isReleaseLike('OpenAI Releases v2.1.3'), 'Version pattern detection');
  assert(isReleaseLike('Version 1.0 Now Available'), 'Version availability detection');
  assert(isReleaseLike('GPT-4 Turbo v2.1 Release'), 'Product version release detection');
  
  // Test update patterns
  assert(isReleaseLike('New Features Added to ChatGPT'), 'New features detection');
  assert(isReleaseLike('Enhanced Capabilities Update'), 'Enhancement detection');
  assert(isReleaseLike('Changelog: What\'s New'), 'Changelog detection');
  
  // Test availability patterns
  assert(isReleaseLike('Claude 3.5 Now Available'), 'Availability detection');
  assert(isReleaseLike('General Availability for Gemini'), 'GA detection');
  assert(isReleaseLike('Beta Release of New Model'), 'Beta detection');
  
  // Test time-based patterns
  assert(isReleaseLike('Today OpenAI Released GPT-4'), 'Today release detection');
  assert(isReleaseLike('This Week: New AI Model'), 'This week detection');
  assert(isReleaseLike('Just Released: Latest Update'), 'Just released detection');
  
  // Test non-release content
  assert(!isReleaseLike('How to Use ChatGPT'), 'Non-release content correctly identified');
  assert(!isReleaseLike('AI Research Paper Published'), 'Research paper correctly identified');
  assert(!isReleaseLike('Company Earnings Report'), 'Earnings report correctly identified');
  
  console.log('✅ Release pattern detection tests passed');
}

/**
 * Test item analysis
 */
function testItemAnalysis() {
  console.log('\n🧪 Testing Item Analysis');
  console.log('=========================');
  
  const recentItem: Item = {
    id: 'test-item-1',
    source: 'rss',
    vendor: 'openai',
    product: 'gpt-4',
    url: 'https://example.com/gpt4-release',
    title: 'OpenAI Introduces GPT-4 Turbo with Enhanced Capabilities',
    summary: 'New AI model with improved performance',
    publishedAt: new Date().toISOString(), // Recent
    text: 'OpenAI has released GPT-4 Turbo with significant improvements in reasoning, coding, and creative writing capabilities. The new model offers enhanced performance while maintaining the same safety standards.'
  };
  
  const analysis = analyzeItem(recentItem);
  
  assert(analysis.isReleaseLike === true, 'Release-like content detected');
  assert(analysis.vendor === 'openai', `Vendor detected: ${analysis.vendor}`);
  assert(analysis.product === 'gpt-4', `Product detected: ${analysis.product}`);
  assert(analysis.confidence > 0.7, `High confidence: ${analysis.confidence}`);
  
  console.log(`📊 Analysis Results:`);
  console.log(`   Release-like: ${analysis.isReleaseLike}`);
  console.log(`   Vendor: ${analysis.vendor}`);
  console.log(`   Product: ${analysis.product}`);
  console.log(`   Confidence: ${analysis.confidence.toFixed(2)}`);
  
  console.log('✅ Item analysis tests passed');
}

/**
 * Test clustering functionality
 */
function testClustering() {
  console.log('\n🧪 Testing Clustering Functionality');
  console.log('====================================');
  
  // Create test items for clustering
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  
  const testItems: Item[] = [
    {
      id: 'item-1',
      source: 'rss',
      vendor: 'openai',
      product: 'gpt-4',
      url: 'https://example.com/gpt4-1',
      title: 'OpenAI Releases GPT-4 Turbo with Enhanced Capabilities',
      publishedAt: twoHoursAgo.toISOString(),
      text: 'OpenAI has released GPT-4 Turbo with significant improvements...'
    },
    {
      id: 'item-2',
      source: 'web',
      vendor: 'openai',
      product: 'gpt-4',
      url: 'https://example.com/gpt4-2',
      title: 'OpenAI Launches GPT-4 Turbo: New Features and Improvements',
      publishedAt: oneHourAgo.toISOString(),
      text: 'OpenAI announces the launch of GPT-4 Turbo featuring new capabilities...'
    },
    {
      id: 'item-3',
      source: 'rss',
      vendor: 'openai',
      product: 'gpt-4',
      url: 'https://example.com/gpt4-3',
      title: 'GPT-4 Turbo Now Available: Enhanced AI Model Released',
      publishedAt: now.toISOString(),
      text: 'The latest version of GPT-4 Turbo is now available with enhanced features...'
    },
    {
      id: 'item-4',
      source: 'web',
      vendor: 'google',
      product: 'gemini',
      url: 'https://example.com/gemini-1',
      title: 'Google Announces Gemini 2.0 Pro Release',
      publishedAt: now.toISOString(),
      text: 'Google has announced the release of Gemini 2.0 Pro...'
    },
    {
      id: 'item-5',
      source: 'rss',
      vendor: 'google',
      product: 'gemini',
      url: 'https://example.com/gemini-2',
      title: 'Google Launches Gemini 2.0: Enhanced AI Capabilities',
      publishedAt: new Date(now.getTime() + 30 * 60 * 1000).toISOString(), // 30 minutes later
      text: 'Google launches Gemini 2.0 with enhanced AI capabilities...'
    }
  ];
  
  const clusters = clusterCandidates(testItems);
  
  assert(clusters.length > 0, `Found ${clusters.length} clusters`);
  
  // Check OpenAI cluster
  const openaiCluster = getBestCluster(clusters, 'openai', 'gpt-4');
  assert(openaiCluster !== null, 'OpenAI cluster found');
  assert(openaiCluster!.itemIds.length >= 2, `OpenAI cluster has ${openaiCluster!.itemIds.length} items`);
  assert(openaiCluster!.confidence > 0.5, `OpenAI cluster confidence: ${openaiCluster!.confidence}`);
  
  // Check Google cluster
  const googleCluster = getBestCluster(clusters, 'google', 'gemini');
  assert(googleCluster !== null, 'Google cluster found');
  assert(googleCluster!.itemIds.length >= 1, `Google cluster has ${googleCluster!.itemIds.length} items`);
  
  // Test vendor filtering
  const openaiClusters = getClustersByVendor(clusters, 'openai');
  assert(openaiClusters.length > 0, `Found ${openaiClusters.length} OpenAI clusters`);
  
  // Test top clusters
  const topClusters = getTopClusters(clusters, 2);
  assert(topClusters.length <= 2, `Top clusters limited to ${topClusters.length}`);
  
  console.log(`📊 Clustering Results:`);
  console.log(`   Total clusters: ${clusters.length}`);
  console.log(`   OpenAI clusters: ${openaiClusters.length}`);
  console.log(`   Top cluster confidence: ${topClusters[0]?.confidence.toFixed(2) || 'N/A'}`);
  
  clusters.forEach((cluster, index) => {
    console.log(`   Cluster ${index + 1}: ${cluster.vendor} ${cluster.product} (${cluster.itemIds.length} items, confidence: ${cluster.confidence.toFixed(2)})`);
  });
  
  console.log('✅ Clustering functionality tests passed');
}

/**
 * Test edge cases
 */
function testEdgeCases() {
  console.log('\n🧪 Testing Edge Cases');
  console.log('====================');
  
  // Test empty input
  const emptyClusters = clusterCandidates([]);
  assert(emptyClusters.length === 0, 'Empty input returns no clusters');
  
  // Test single item
  const singleItem: Item = {
    id: 'single-item',
    source: 'rss',
    url: 'https://example.com/single',
    title: 'Single Item Test',
    publishedAt: new Date().toISOString(),
    text: 'This is a single item test'
  };
  
  const singleClusters = clusterCandidates([singleItem]);
  assert(singleClusters.length === 0, 'Single item creates no clusters (needs 2+ items)');
  
  // Test items without vendor/product
  const noVendorItems: Item[] = [
    {
      id: 'no-vendor-1',
      source: 'rss',
      url: 'https://example.com/no-vendor-1',
      title: 'Random Tech News Article',
      publishedAt: new Date().toISOString(),
      text: 'This is just a random tech article'
    },
    {
      id: 'no-vendor-2',
      source: 'web',
      url: 'https://example.com/no-vendor-2',
      title: 'Another Random Article',
      publishedAt: new Date().toISOString(),
      text: 'Another random article about technology'
    }
  ];
  
  const noVendorClusters = clusterCandidates(noVendorItems);
  assert(noVendorClusters.length === 0, 'Items without vendor/product create no clusters');
  
  // Test items with different vendors (should not cluster together)
  const differentVendorItems: Item[] = [
    {
      id: 'openai-item-1',
      source: 'rss',
      vendor: 'openai',
      product: 'gpt-4',
      url: 'https://example.com/openai-1',
      title: 'OpenAI Releases GPT-4',
      publishedAt: new Date().toISOString(),
      text: 'OpenAI has released GPT-4'
    },
    {
      id: 'openai-item-2',
      source: 'web',
      vendor: 'openai',
      product: 'gpt-4',
      url: 'https://example.com/openai-2',
      title: 'OpenAI Launches GPT-4 Turbo',
      publishedAt: new Date().toISOString(),
      text: 'OpenAI launches GPT-4 Turbo'
    },
    {
      id: 'google-item-1',
      source: 'web',
      vendor: 'google',
      product: 'gemini',
      url: 'https://example.com/google-1',
      title: 'Google Announces Gemini',
      publishedAt: new Date().toISOString(),
      text: 'Google has announced Gemini'
    },
    {
      id: 'google-item-2',
      source: 'rss',
      vendor: 'google',
      product: 'gemini',
      url: 'https://example.com/google-2',
      title: 'Google Launches Gemini 2.0',
      publishedAt: new Date().toISOString(),
      text: 'Google launches Gemini 2.0'
    }
  ];
  
  const differentVendorClusters = clusterCandidates(differentVendorItems);
  assert(differentVendorClusters.length >= 2, 'Different vendors create separate clusters');
  
  console.log('✅ Edge case tests passed');
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🧪 Running Event Detection Tests');
  console.log('================================\n');
  
  try {
    testVendorProductDetection();
    testReleasePatternDetection();
    testItemAnalysis();
    testClustering();
    testEdgeCases();
    
    console.log('\n🎉 All event detection tests completed successfully!');
    console.log('✅ Event detection system is working properly.');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}
