import { ExtractedFacts } from '../src/enrich.js';
import {
  preflightCheck,
  postThread,
  postThreadWithSafeguards,
  testTwitterConnection,
  PostResult,
  PreflightResult
} from '../src/publish/post.js';

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
 * Test preflight checks
 */
async function testPreflightChecks() {
  console.log('\n🧪 Testing Preflight Checks');
  console.log('===========================');
  
  // Test with valid facts (should pass)
  const validFacts: ExtractedFacts = {
    vendor: 'openai',
    product: 'gpt-4',
    version: 'turbo',
    features: ['128k context window'],
    changes: ['Context window increased'],
    prices: ['$0.01/1K tokens'],
    limits: ['10K tokens/minute'],
    date: new Date().toISOString(),
    citations: ['https://openai.com/blog/gpt-4-turbo'] // Official domain
  };
  
  const validResult = await preflightCheck(validFacts);
  
  assert(validResult.canPost === true, 'Valid facts pass preflight checks');
  assert(validResult.errors.length === 0, 'No errors for valid facts');
  assert(validResult.duplicateCheck === true, 'Duplicate check passes');
  assert(validResult.dailyLimitCheck === true, 'Daily limit check passes');
  assert(validResult.citationCheck === true, 'Citation check passes');
  
  console.log(`📊 Valid Facts Results:`);
  console.log(`   Can post: ${validResult.canPost}`);
  console.log(`   Errors: ${validResult.errors.length}`);
  console.log(`   Warnings: ${validResult.warnings.length}`);
  
  // Test with invalid facts (no official citations)
  const invalidFacts: ExtractedFacts = {
    vendor: 'unknown',
    product: 'model',
    version: '1.0',
    features: ['Some feature'],
    changes: ['Some change'],
    prices: [],
    limits: [],
    date: new Date().toISOString(),
    citations: ['https://random-blog.com/post'] // Non-official domain
  };
  
  const invalidResult = await preflightCheck(invalidFacts);
  
  assert(invalidResult.canPost === false, 'Invalid facts fail preflight checks');
  assert(invalidResult.errors.length > 0, 'Errors found for invalid facts');
  assert(invalidResult.citationCheck === false, 'Citation check fails');
  
  console.log(`📊 Invalid Facts Results:`);
  console.log(`   Can post: ${invalidResult.canPost}`);
  console.log(`   Errors: ${invalidResult.errors.length}`);
  console.log(`   Citation check: ${invalidResult.citationCheck}`);
  
  console.log('✅ Preflight checks tests passed');
}

/**
 * Test thread posting in test mode
 */
async function testThreadPostingTestMode() {
  console.log('\n🧪 Testing Thread Posting (Test Mode)');
  console.log('======================================');
  
  const testLines = [
    'OpenAI GPT-4 Turbo update: Context window increased to 128k tokens',
    '• New 128k context window capability\n• Enhanced reasoning performance',
    '• Major context window expansion\n• Significant performance improvements',
    'Details ↓ https://openai.com/blog/gpt-4-turbo'
  ];
  
  const result = await postThread(testLines, true); // testMode = true
  
  assert(result.success === true, 'Test mode posting succeeds');
  assert(result.testMode === true, 'Result marked as test mode');
  assert(result.tweetIds.length === testLines.length, `Generated ${result.tweetIds.length} test tweet IDs`);
  assert(result.skipped === false, 'Test posting not skipped');
  
  console.log(`📊 Test Mode Results:`);
  console.log(`   Success: ${result.success}`);
  console.log(`   Test mode: ${result.testMode}`);
  console.log(`   Tweet IDs: ${result.tweetIds.length}`);
  console.log(`   Skipped: ${result.skipped}`);
  
  console.log('✅ Thread posting test mode tests passed');
}

/**
 * Test thread posting with safeguards
 */
async function testThreadPostingWithSafeguards() {
  console.log('\n🧪 Testing Thread Posting with Safeguards');
  console.log('==========================================');
  
  const validFacts: ExtractedFacts = {
    vendor: 'openai',
    product: 'gpt-4',
    version: 'turbo',
    features: ['128k context window'],
    changes: ['Context window increased'],
    prices: ['$0.01/1K tokens'],
    limits: ['10K tokens/minute'],
    date: new Date().toISOString(),
    citations: ['https://openai.com/blog/gpt-4-turbo']
  };
  
  const testLines = [
    'OpenAI GPT-4 Turbo update: Context window increased to 128k tokens',
    '• New 128k context window capability\n• Enhanced reasoning performance',
    'Details ↓ https://openai.com/blog/gpt-4-turbo'
  ];
  
  // Test with safeguards (should pass preflight but skip actual posting)
  const result = await postThreadWithSafeguards(testLines, validFacts, { testMode: true });
  
  assert(result.success === true, 'Safeguarded posting succeeds');
  assert(result.testMode === true, 'Result marked as test mode');
  assert(result.skipped === false, 'Posting not skipped');
  
  console.log(`📊 Safeguarded Posting Results:`);
  console.log(`   Success: ${result.success}`);
  console.log(`   Test mode: ${result.testMode}`);
  console.log(`   Skipped: ${result.skipped}`);
  console.log(`   Skip reason: ${result.skipReason || 'None'}`);
  
  console.log('✅ Thread posting with safeguards tests passed');
}

/**
 * Test thread posting with failed safeguards
 */
async function testThreadPostingFailedSafeguards() {
  console.log('\n🧪 Testing Thread Posting with Failed Safeguards');
  console.log('=================================================');
  
  const invalidFacts: ExtractedFacts = {
    vendor: 'unknown',
    product: 'model',
    version: '1.0',
    features: ['Some feature'],
    changes: ['Some change'],
    prices: [],
    limits: [],
    date: new Date().toISOString(),
    citations: ['https://random-blog.com/post'] // Non-official domain
  };
  
  const testLines = [
    'Unknown model update: Some feature announced',
    'Details ↓ https://random-blog.com/post'
  ];
  
  // Test with failed safeguards (should skip posting)
  const result = await postThreadWithSafeguards(testLines, invalidFacts, { testMode: true });
  
  assert(result.success === false, 'Failed safeguards result in failure');
  assert(result.skipped === true, 'Posting skipped due to failed safeguards');
  assert(result.skipReason === 'Preflight checks failed', 'Correct skip reason');
  assert(result.error?.includes('Preflight checks failed'), 'Error message includes preflight failure');
  
  console.log(`📊 Failed Safeguards Results:`);
  console.log(`   Success: ${result.success}`);
  console.log(`   Skipped: ${result.skipped}`);
  console.log(`   Skip reason: ${result.skipReason}`);
  console.log(`   Error: ${result.error}`);
  
  console.log('✅ Thread posting with failed safeguards tests passed');
}

/**
 * Test empty thread handling
 */
async function testEmptyThreadHandling() {
  console.log('\n🧪 Testing Empty Thread Handling');
  console.log('==================================');
  
  const emptyLines: string[] = [];
  
  const result = await postThread(emptyLines, true);
  
  assert(result.success === false, 'Empty thread fails');
  assert(result.skipped === true, 'Empty thread skipped');
  assert(result.skipReason === 'Empty thread', 'Correct skip reason');
  assert(result.error === 'No tweets to post', 'Correct error message');
  
  console.log(`📊 Empty Thread Results:`);
  console.log(`   Success: ${result.success}`);
  console.log(`   Skipped: ${result.skipped}`);
  console.log(`   Skip reason: ${result.skipReason}`);
  console.log(`   Error: ${result.error}`);
  
  console.log('✅ Empty thread handling tests passed');
}

/**
 * Test Twitter connection (if credentials available)
 */
async function testTwitterConnection() {
  console.log('\n🧪 Testing Twitter Connection');
  console.log('==============================');
  
  try {
    const connected = await testTwitterConnection();
    
    if (connected) {
      assert(connected === true, 'Twitter connection successful');
      console.log('✅ Twitter API connection test passed');
    } else {
      console.log('⚠️ Twitter API connection failed (credentials may not be configured)');
      console.log('✅ Twitter connection test handled gracefully');
    }
  } catch (error) {
    console.log('⚠️ Twitter connection test failed:', error);
    console.log('✅ Twitter connection test handled gracefully');
  }
}

/**
 * Test configuration options
 */
async function testConfigurationOptions() {
  console.log('\n🧪 Testing Configuration Options');
  console.log('=================================');
  
  const facts: ExtractedFacts = {
    vendor: 'openai',
    product: 'gpt-4',
    version: 'turbo',
    features: ['128k context window'],
    changes: ['Context window increased'],
    prices: ['$0.01/1K tokens'],
    limits: ['10K tokens/minute'],
    date: new Date().toISOString(),
    citations: ['https://openai.com/blog/gpt-4-turbo']
  };
  
  // Test with custom configuration
  const customConfig = {
    maxTweetsPerDay: 10,
    duplicateCheckHours: 24,
    testMode: true
  };
  
  const result = await preflightCheck(facts, customConfig);
  
  assert(result.canPost === true, 'Custom configuration works');
  
  console.log(`📊 Custom Configuration Results:`);
  console.log(`   Can post: ${result.canPost}`);
  console.log(`   Errors: ${result.errors.length}`);
  console.log(`   Warnings: ${result.warnings.length}`);
  
  console.log('✅ Configuration options tests passed');
}

/**
 * Test edge cases
 */
async function testEdgeCases() {
  console.log('\n🧪 Testing Edge Cases');
  console.log('=====================');
  
  // Test with very long tweet content
  const longLines = [
    'A'.repeat(300), // Exceeds normal tweet length
    'Another very long tweet content that might cause issues',
    'Details ↓ https://example.com'
  ];
  
  const result = await postThread(longLines, true);
  
  assert(result.success === true, 'Long content handled gracefully');
  assert(result.tweetIds.length === longLines.length, 'All long tweets processed');
  
  // Test with special characters
  const specialLines = [
    'GPT-4 update: 🚀 New features! #AI #MachineLearning',
    '• Enhanced capabilities 🎯\n• Better performance 📈',
    'Details ↓ https://example.com'
  ];
  
  const specialResult = await postThread(specialLines, true);
  
  assert(specialResult.success === true, 'Special characters handled');
  assert(specialResult.tweetIds.length === specialLines.length, 'Special character tweets processed');
  
  console.log('✅ Edge case tests passed');
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🧪 Running Publisher Tests');
  console.log('===========================\n');
  
  try {
    await testPreflightChecks();
    await testThreadPostingTestMode();
    await testThreadPostingWithSafeguards();
    await testThreadPostingFailedSafeguards();
    await testEmptyThreadHandling();
    await testTwitterConnection();
    await testConfigurationOptions();
    await testEdgeCases();
    
    console.log('\n🎉 All publisher tests completed successfully!');
    console.log('✅ Publisher system is working properly.');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}
