import { ExtractedFacts, ComputedDeltas } from '../src/enrich.js';
import {
  buildThread,
  validateThread,
  formatThread,
  createSimpleThread,
  ThreadComposition,
  renderBullets
} from '../src/publish/thread.js';

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
 * Test renderBullets helper function
 */
function testRenderBullets() {
  console.log('\n🧪 Testing renderBullets Helper');
  console.log('===============================');
  
  // Test basic bullet rendering
  const bullets1 = ['Feature 1', 'Feature 2', 'Feature 3'];
  const rendered1 = renderBullets(bullets1, 2);
  assert(rendered1.length === 2, `Rendered ${rendered1.length} bullets (max 2)`);
  assert(rendered1[0].startsWith('• '), 'First bullet starts with bullet point');
  
  // Test empty list
  const bullets2: string[] = [];
  const rendered2 = renderBullets(bullets2, 5);
  assert(rendered2.length === 0, 'Empty list returns empty array');
  
  // Test with existing bullet points
  const bullets3 = ['• Existing bullet', '- Dash bullet', 'Plain text'];
  const rendered3 = renderBullets(bullets3, 3);
  assert(rendered3.length === 3, 'All bullets rendered');
  assert(rendered3[0] === '• Existing bullet', 'Existing bullet preserved');
  assert(rendered3[1] === '• Dash bullet', 'Dash converted to bullet');
  assert(rendered3[2] === '• Plain text', 'Plain text gets bullet');
  
  // Test filtering empty bullets
  const bullets4 = ['Valid bullet', '', '   ', 'Another valid'];
  const rendered4 = renderBullets(bullets4, 5);
  assert(rendered4.length === 2, 'Empty bullets filtered out');
  
  console.log('✅ renderBullets helper tests passed');
}

/**
 * Test thread building with comprehensive facts
 */
function testThreadBuilding() {
  console.log('\n🧪 Testing Thread Building');
  console.log('===========================');
  
  const facts: ExtractedFacts = {
    vendor: 'openai',
    product: 'gpt-4',
    version: 'turbo',
    features: [
      '128k context window',
      'Improved reasoning capabilities',
      'Better code generation',
      'Enhanced creative writing'
    ],
    changes: [
      'Context window increased from 32k to 128k',
      '40% better performance on benchmarks',
      'Reduced pricing for input tokens'
    ],
    prices: [
      '$0.01 per 1K input tokens',
      '$0.03 per 1K output tokens'
    ],
    limits: [
      'Rate limit: 10,000 tokens per minute',
      'Maximum response length: 4,096 tokens'
    ],
    date: '2024-01-15T10:00:00Z',
    citations: ['https://openai.com/blog/gpt-4-turbo']
  };
  
  const deltas: ComputedDeltas = {
    contextWindow: 'Context window increased from 32k to 128k tokens',
    price: 'Input pricing reduced from $0.03 to $0.01 per 1K tokens',
    features: [
      'New 128k context window capability',
      'Enhanced reasoning performance'
    ],
    changes: [
      'Major context window expansion',
      'Significant performance improvements'
    ],
    summary: 'Major upgrade with expanded context window and improved performance'
  };
  
  const canonicalUrl = 'https://openai.com/blog/gpt-4-turbo';
  
  const thread = buildThread(facts, deltas, canonicalUrl);
  
  // Validate thread structure
  assert(thread.tweets.length > 0, `Thread has ${thread.tweets.length} tweets`);
  assert(thread.tweets.length <= 5, `Thread has reasonable length (${thread.tweets.length} tweets)`);
  assert(!thread.draftOnly, 'Thread is not draft only (has citations)');
  assert(thread.canonicalUrl === canonicalUrl, 'Canonical URL preserved');
  
  // Validate first tweet
  const tweet1 = thread.tweets[0];
  assert(tweet1.content.includes('gpt-4'), 'T1 includes product name');
  assert(tweet1.content.includes('update'), 'T1 includes update indicator');
  assert(tweet1.length <= 270, `T1 length: ${tweet1.length} chars`);
  
  // Validate bullet tweets
  const bulletTweets = thread.tweets.slice(1, -1);
  bulletTweets.forEach((tweet, index) => {
    assert(tweet.content.includes('•'), `Bullet tweet ${index + 2} contains bullet points`);
    assert(tweet.length <= 270, `Bullet tweet ${index + 2} length: ${tweet.length} chars`);
  });
  
  // Validate last tweet
  const lastTweet = thread.tweets[thread.tweets.length - 1];
  assert(lastTweet.content.includes('Details'), 'Last tweet contains details link');
  assert(lastTweet.content.includes(canonicalUrl), 'Last tweet contains canonical URL');
  
  console.log(`📊 Thread Results:`);
  console.log(`   Tweets: ${thread.tweets.length}`);
  console.log(`   Total length: ${thread.totalLength} chars`);
  console.log(`   Draft only: ${thread.draftOnly}`);
  console.log(`   Summary: ${thread.summary}`);
  
  console.log('✅ Thread building tests passed');
}

/**
 * Test thread building without citations (draft only)
 */
function testDraftOnlyThread() {
  console.log('\n🧪 Testing Draft Only Thread');
  console.log('=============================');
  
  const facts: ExtractedFacts = {
    vendor: 'google',
    product: 'gemini',
    version: '2.0',
    features: ['Enhanced reasoning', 'Better multimodal'],
    changes: ['Improved performance'],
    prices: ['Free tier available'],
    limits: [],
    date: '2024-01-15T10:00:00Z',
    citations: [] // No citations = draft only
  };
  
  const deltas: ComputedDeltas = {
    summary: 'New Gemini 2.0 with enhanced capabilities'
  };
  
  const thread = buildThread(facts, deltas);
  
  assert(thread.draftOnly === true, 'Thread marked as draft only');
  assert(thread.tweets.length > 0, 'Draft thread still has tweets');
  
  console.log(`📊 Draft Thread Results:`);
  console.log(`   Draft only: ${thread.draftOnly}`);
  console.log(`   Tweets: ${thread.tweets.length}`);
  
  console.log('✅ Draft only thread tests passed');
}

/**
 * Test thread validation
 */
function testThreadValidation() {
  console.log('\n🧪 Testing Thread Validation');
  console.log('=============================');
  
  // Test valid thread
  const validThread: ThreadComposition = {
    tweets: [
      { content: 'Valid tweet 1', order: 1, length: 50 },
      { content: 'Valid tweet 2', order: 2, length: 60 }
    ],
    totalLength: 110,
    draftOnly: false,
    canonicalUrl: 'https://example.com',
    summary: 'Valid thread'
  };
  
  const validResult = validateThread(validThread);
  assert(validResult.isValid === true, 'Valid thread passes validation');
  assert(validResult.errors.length === 0, 'No validation errors');
  
  // Test invalid thread (too long)
  const invalidThread: ThreadComposition = {
    tweets: [
      { content: 'A'.repeat(300), order: 1, length: 300 }, // Too long
      { content: '', order: 2, length: 0 } // Empty
    ],
    totalLength: 300,
    draftOnly: false,
    canonicalUrl: 'https://example.com',
    summary: 'Invalid thread'
  };
  
  const invalidResult = validateThread(invalidThread);
  assert(invalidResult.isValid === false, 'Invalid thread fails validation');
  assert(invalidResult.errors.length > 0, 'Validation errors found');
  
  console.log(`📊 Validation Results:`);
  console.log(`   Valid thread: ${validResult.isValid}`);
  console.log(`   Invalid thread: ${invalidResult.isValid}`);
  console.log(`   Validation errors: ${invalidResult.errors.length}`);
  
  console.log('✅ Thread validation tests passed');
}

/**
 * Test thread formatting
 */
function testThreadFormatting() {
  console.log('\n🧪 Testing Thread Formatting');
  console.log('=============================');
  
  const thread: ThreadComposition = {
    tweets: [
      { content: 'Test tweet 1', order: 1, length: 50 },
      { content: '• Bullet point 1\n• Bullet point 2', order: 2, length: 60 },
      { content: 'Details ↓ https://example.com', order: 3, length: 40 }
    ],
    totalLength: 150,
    draftOnly: true,
    canonicalUrl: 'https://example.com',
    summary: 'Test thread'
  };
  
  const formatted = formatThread(thread);
  
  assert(formatted.includes('Thread Composition'), 'Formatted output includes header');
  assert(formatted.includes('DRAFT ONLY'), 'Formatted output shows draft status');
  assert(formatted.includes('T1'), 'Formatted output includes tweet numbers');
  assert(formatted.includes('Test tweet 1'), 'Formatted output includes tweet content');
  assert(formatted.includes('Total: 150 characters'), 'Formatted output includes total length');
  
  console.log(`📊 Formatted Thread:`);
  console.log(formatted);
  
  console.log('✅ Thread formatting tests passed');
}

/**
 * Test simple thread creation
 */
function testSimpleThreadCreation() {
  console.log('\n🧪 Testing Simple Thread Creation');
  console.log('==================================');
  
  const simpleThread = createSimpleThread('OpenAI', 'GPT-4', 'turbo', 'https://openai.com');
  
  assert(simpleThread.tweets.length >= 1, 'Simple thread has at least 1 tweet');
  assert(simpleThread.draftOnly === true, 'Simple thread is draft only');
  assert(simpleThread.tweets[0].content.includes('GPT-4'), 'Simple thread includes product name');
  
  if (simpleThread.tweets.length > 1) {
    const lastTweet = simpleThread.tweets[simpleThread.tweets.length - 1];
    assert(lastTweet.content.includes('Details'), 'Simple thread includes details link');
  }
  
  console.log(`📊 Simple Thread Results:`);
  console.log(`   Tweets: ${simpleThread.tweets.length}`);
  console.log(`   Draft only: ${simpleThread.draftOnly}`);
  console.log(`   Summary: ${simpleThread.summary}`);
  
  console.log('✅ Simple thread creation tests passed');
}

/**
 * Test edge cases
 */
function testEdgeCases() {
  console.log('\n🧪 Testing Edge Cases');
  console.log('=====================');
  
  // Test with minimal facts
  const minimalFacts: ExtractedFacts = {
    vendor: 'test',
    product: 'model',
    version: undefined,
    features: [],
    changes: [],
    prices: [],
    limits: [],
    date: '2024-01-15T10:00:00Z',
    citations: ['https://example.com']
  };
  
  const minimalDeltas: ComputedDeltas = {
    summary: 'Minimal update'
  };
  
  const minimalThread = buildThread(minimalFacts, minimalDeltas);
  assert(minimalThread.tweets.length > 0, 'Minimal thread has tweets');
  assert(minimalThread.tweets[0].content.includes('model'), 'Minimal thread includes product');
  
  // Test with very long content
  const longFacts: ExtractedFacts = {
    vendor: 'test',
    product: 'very-long-product-name-that-might-cause-issues',
    version: 'very-long-version-name-that-exceeds-normal-limits',
    features: [
      'This is a very long feature description that might exceed the character limits and cause issues with tweet composition',
      'Another extremely long feature description that contains a lot of detailed information about capabilities and improvements'
    ],
    changes: [
      'This is an extremely long change description that provides detailed information about modifications and improvements',
      'Another very long change description with extensive details about updates and enhancements'
    ],
    prices: ['Very long pricing information with detailed breakdown'],
    limits: ['Very long limitation description with extensive details'],
    date: '2024-01-15T10:00:00Z',
    citations: ['https://example.com']
  };
  
  const longDeltas: ComputedDeltas = {
    summary: 'Very long summary with extensive details about changes and improvements'
  };
  
  const longThread = buildThread(longFacts, longDeltas);
  assert(longThread.tweets.length > 0, 'Long content thread has tweets');
  
  // Validate all tweets are within limits
  longThread.tweets.forEach((tweet, index) => {
    assert(tweet.length <= 270, `Long content tweet ${index + 1} within limits: ${tweet.length} chars`);
  });
  
  console.log('✅ Edge case tests passed');
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🧪 Running Thread Composer Tests');
  console.log('=================================\n');
  
  try {
    testRenderBullets();
    testThreadBuilding();
    testDraftOnlyThread();
    testThreadValidation();
    testThreadFormatting();
    testSimpleThreadCreation();
    testEdgeCases();
    
    console.log('\n🎉 All thread composer tests completed successfully!');
    console.log('✅ Thread composer system is working properly.');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}
