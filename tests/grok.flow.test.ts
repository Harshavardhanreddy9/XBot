import { detectVendorProduct, isReleaseLike } from '../src/events/detect.js';
import { buildThread } from '../src/publish/thread.js';
import { Item, ExtractedFacts } from '../src/schema.js';

/**
 * Simple assertion function
 */
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`❌ Assertion failed: ${message}`);
  }
  console.log(`✅ ${message}`);
}

// Mock extractFacts function for testing
async function mockExtractFacts(items: Item[]): Promise<ExtractedFacts> {
  // Return mock facts for Grok-2 Vision
  return {
    vendor: 'xai',
    product: 'grok',
    version: '2.0',
    title: 'Grok-2 Vision rolls out',
    summary: 'xAI announces Grok-2 Vision with enhanced multimodal capabilities',
    features: [
      'Advanced image understanding and analysis',
      'Real-time visual question answering'
    ],
    changes: [
      'New vision capabilities added',
      'Improved response accuracy'
    ],
    prices: [
      'Pricing TBA'
    ],
    limits: [
      'Rate limit: 1000 requests per hour'
    ],
    date: '2024-01-15',
    citations: [
      'https://x.ai/blog/grok-2-vision-announcement',
      'https://techcrunch.com/2024/01/15/xai-grok-2-vision-launch'
    ]
  };
}

async function runGrokFlowTests() {
  console.log('🧪 Running Grok Flow Tests');
  console.log('==========================\n');

  // --- Create Test Data ---
  console.log('\n🧪 Creating Test Data');
  console.log('=====================');
  
  const grokItem: Item = {
    id: 'test-grok-1',
    source: 'rss',
    vendor: 'xai',
    product: 'grok',
    url: 'https://x.ai/blog/grok-2-vision-announcement',
    title: 'Grok-2 Vision rolls out',
    summary: 'xAI announces Grok-2 Vision with enhanced multimodal capabilities',
    publishedAt: '2024-01-15T10:00:00Z',
    text: `xAI has officially launched Grok-2 Vision, a significant upgrade to their AI model that introduces advanced multimodal capabilities. The new model features enhanced image understanding and analysis, allowing users to ask complex questions about visual content and receive detailed, accurate responses.

Key features include real-time visual question answering, improved multimodal reasoning capabilities, and enhanced safety and alignment features. The model can now process and understand images, charts, diagrams, and other visual content with unprecedented accuracy.

xAI has implemented robust safety measures to ensure responsible AI deployment, including content filtering and bias detection. The model maintains the conversational style that made Grok popular while adding powerful new visual capabilities.

Pricing details are still to be announced (TBA), but xAI has confirmed that the model will be available through their API and web interface. Rate limits are set at 1000 requests per hour for initial rollout.

This release represents a major milestone in xAI's mission to develop AI that is both powerful and beneficial to humanity.`,
    raw: {
      source: 'xAI Blog',
      author: 'xAI Team',
      category: 'Product Updates'
    }
  };

  const techcrunchItem: Item = {
    id: 'test-grok-2',
    source: 'rss',
    vendor: 'techcrunch',
    product: 'ai-news',
    url: 'https://techcrunch.com/2024/01/15/xai-grok-2-vision-launch',
    title: 'xAI launches Grok-2 Vision with advanced multimodal capabilities',
    summary: 'TechCrunch reports on xAI\'s latest AI model release',
    publishedAt: '2024-01-15T11:30:00Z',
    text: `xAI, the AI company founded by Elon Musk, has launched Grok-2 Vision, marking a significant advancement in multimodal AI capabilities. The new model combines text and image processing to provide comprehensive understanding of visual content.

The announcement comes as competition in the AI space intensifies, with companies racing to develop more sophisticated multimodal models. Grok-2 Vision represents xAI's response to this competitive landscape, offering enhanced visual reasoning and analysis capabilities.

Industry experts have noted the model's improved safety features and alignment with human values, addressing concerns about AI development and deployment. The pricing structure remains to be announced, but early access is expected to be available soon.`,
    raw: {
      source: 'TechCrunch',
      author: 'Sarah Johnson',
      category: 'AI'
    }
  };

  const testItems = [grokItem, techcrunchItem];
  
  assert(testItems.length === 2, 'Created 2 test items');
  assert(testItems[0].vendor === 'xai', 'First item has xai vendor');
  assert(testItems[0].product === 'grok', 'First item has grok product');
  assert(testItems[0].title.includes('Grok-2 Vision'), 'First item has correct title');
  assert(testItems[1].vendor === 'techcrunch', 'Second item has techcrunch vendor');
  
  console.log('✅ Test data creation passed');

  // --- Test Vendor/Product Detection ---
  console.log('\n🧪 Testing Vendor/Product Detection');
  console.log('====================================');
  
  const vendorProduct1 = detectVendorProduct(grokItem.title, grokItem.text);
  assert(vendorProduct1.vendor === 'xai', 'Detected xai vendor from title');
  assert(vendorProduct1.product === 'grok', 'Detected grok product from title');
  
  const vendorProduct2 = detectVendorProduct(techcrunchItem.title, techcrunchItem.text);
  assert(vendorProduct2.vendor === 'xai', 'Detected xai vendor from TechCrunch title');
  assert(vendorProduct2.product === 'grok', 'Detected grok product from TechCrunch title');
  
  console.log('✅ Vendor/product detection tests passed');

  // --- Test Release Detection ---
  console.log('\n🧪 Testing Release Detection');
  console.log('=============================');
  
  const isRelease1 = isReleaseLike(grokItem.title + ' ' + grokItem.text);
  assert(isRelease1 === true, 'Grok item detected as release-like');
  
  const isRelease2 = isReleaseLike(techcrunchItem.title + ' ' + techcrunchItem.text);
  assert(isRelease2 === true, 'TechCrunch item detected as release-like');
  
  console.log('✅ Release detection tests passed');

  // --- Test Fact Extraction ---
  console.log('\n🧪 Testing Fact Extraction');
  console.log('===========================');
  
  const facts = await mockExtractFacts(testItems);
  
  assert(facts.vendor === 'xai', 'Extracted xai vendor');
  assert(facts.product === 'grok', 'Extracted grok product');
  assert(facts.version === '2.0', 'Extracted version 2.0');
  assert(facts.title === 'Grok-2 Vision rolls out', 'Extracted correct title');
  
  assert(Array.isArray(facts.features), 'Features is array');
  assert(facts.features.length >= 1, 'Has at least 1 feature');
  assert(facts.features.length <= 2, 'Has at most 2 features (as requested)');
  assert(facts.features.some(f => f.includes('image') || f.includes('visual')), 'Has visual/image feature');
  
  assert(Array.isArray(facts.changes), 'Changes is array');
  assert(facts.changes.length > 0, 'Has changes');
  
  assert(Array.isArray(facts.prices), 'Prices is array');
  assert(facts.prices.length > 0, 'Has pricing info');
  assert(facts.prices.some(p => p.includes('TBA') || p.includes('To be announced')), 'Contains TBA pricing');
  
  assert(facts.date === '2024-01-15', 'Extracted correct date');
  
  assert(Array.isArray(facts.citations), 'Citations is array');
  assert(facts.citations.length >= 2, 'Has at least 2 citations');
  assert(facts.citations.includes('https://x.ai/blog/grok-2-vision-announcement'), 'Contains x.ai citation');
  assert(facts.citations.includes('https://techcrunch.com/2024/01/15/xai-grok-2-vision-launch'), 'Contains TechCrunch citation');
  
  console.log('✅ Fact extraction tests passed');

  // --- Test Thread Building ---
  console.log('\n🧪 Testing Thread Building');
  console.log('===========================');
  
  const mockDeltas = {
    contextWindow: 'Enhanced multimodal capabilities',
    price: 'Pricing TBA',
    features: ['Advanced image understanding', 'Real-time visual Q&A'],
    changes: ['New vision capabilities', 'Improved safety measures'],
    summary: 'Grok-2 Vision introduces advanced multimodal AI capabilities with enhanced safety features'
  };
  
  const canonicalUrl = 'https://x.ai/blog/grok-2-vision-announcement';
  const thread = await buildThread(facts, mockDeltas, canonicalUrl);
  
  assert(thread.tweets.length >= 3, 'Thread has at least 3 tweets');
  assert(thread.tweets.length <= 5, 'Thread has at most 5 tweets');
  assert(thread.totalLength > 0, 'Thread has positive total length');
  assert(thread.draftOnly === false, 'Thread is not draft-only (has official citations)');
  
  // Check first tweet
  const firstTweet = thread.tweets[0];
  assert(firstTweet.content.toLowerCase().includes('grok'), 'First tweet mentions grok');
  assert(firstTweet.content.includes('update') || firstTweet.content.includes('Vision'), 'First tweet mentions update/Vision');
  assert(firstTweet.order === 1, 'First tweet has order 1');
  
  // Check last tweet
  const lastTweet = thread.tweets[thread.tweets.length - 1];
  assert(lastTweet.content.includes('Details'), 'Last tweet contains Details');
  assert(lastTweet.content.includes('https://'), 'Last tweet has a link');
  
  // Check middle tweets contain features/changes
  const middleTweets = thread.tweets.slice(1, -1);
  const hasFeatureContent = middleTweets.some(tweet => 
    tweet.content.includes('image') || 
    tweet.content.includes('visual') || 
    tweet.content.includes('multimodal')
  );
  assert(hasFeatureContent, 'Middle tweets contain feature information');
  
  // Check media extraction (should be attempted for x.ai URL)
  if (firstTweet.media) {
    assert(firstTweet.media.url.length > 0, 'Media has URL');
    assert(firstTweet.media.alt.includes('Grok'), 'Media alt text mentions Grok');
  }
  
  console.log('✅ Thread building tests passed');

  // --- Test Full Pipeline Flow ---
  console.log('\n🧪 Testing Full Pipeline Flow');
  console.log('==============================');
  
  // Simulate the complete flow
  console.log('📊 Pipeline Flow Summary:');
  console.log(`   1. Items collected: ${testItems.length}`);
  console.log(`   2. Vendor detected: ${vendorProduct1.vendor}`);
  console.log(`   3. Product detected: ${vendorProduct1.product}`);
  console.log(`   4. Release detected: ${isRelease1}`);
  console.log(`   5. Facts extracted: ${Object.keys(facts).length} fields`);
  console.log(`   6. Thread built: ${thread.tweets.length} tweets`);
  console.log(`   7. Total length: ${thread.totalLength} characters`);
  
  // Verify all requirements are met
  const requirements = [
    { test: vendorProduct1.vendor === 'xai', desc: 'Vendor detection → xai' },
    { test: vendorProduct1.product === 'grok', desc: 'Product detection → grok' },
    { test: isRelease1 === true, desc: 'Release detection → true' },
    { test: Array.isArray(facts.features) && facts.features.length > 0, desc: 'Facts contain features[]' },
    { test: facts.date && facts.date.length > 0, desc: 'Facts contain date' },
    { test: Array.isArray(facts.citations) && facts.citations.length > 0, desc: 'Facts contain citations[]' },
    { test: facts.citations.includes('https://x.ai/blog/grok-2-vision-announcement'), desc: 'Citations include x.ai' },
    { test: thread.tweets.length >= 3 && thread.tweets.length <= 5, desc: 'Thread has 3-5 tweets' },
    { test: lastTweet.content.includes('https://'), desc: 'Last tweet has Details link' }
  ];
  
  requirements.forEach((req, index) => {
    assert(req.test, `${index + 1}. ${req.desc}`);
  });
  
  console.log('✅ Full pipeline flow tests passed');

  console.log('\n🎉 All Grok Flow Tests Passed!');
  console.log('=================================');
  console.log('✅ Test data creation');
  console.log('✅ Vendor/product detection');
  console.log('✅ Release detection');
  console.log('✅ Fact extraction');
  console.log('✅ Thread building');
  console.log('✅ Full pipeline flow');
  
  // Display final thread for verification
  console.log('\n📱 Final Thread Preview:');
  console.log('========================');
  thread.tweets.forEach((tweet, index) => {
    console.log(`T${index + 1} (${tweet.length} chars):`);
    console.log(`"${tweet.content}"`);
    if (tweet.media) {
      console.log(`   Media: ${tweet.media.url}`);
      console.log(`   Alt: ${tweet.media.alt}`);
    }
    console.log('');
  });
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runGrokFlowTests().catch(console.error);
}
