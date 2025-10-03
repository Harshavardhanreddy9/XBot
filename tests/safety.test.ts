import { 
  isOfficial, 
  shouldSkip, 
  validateContent, 
  containsRumorLanguage, 
  containsSpamLanguage, 
  containsOffensiveLanguage,
  hasEmptyFacts,
  isContentTooShort,
  isDuplicateTitle,
  getOfficialDomains,
  isTrustedDomain,
  REASON_TAGS 
} from '../src/safety.js';
import { ExtractedFacts } from '../src/enrich.js';

/**
 * Simple assertion function
 */
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`❌ Assertion failed: ${message}`);
  }
  console.log(`✅ ${message}`);
}

async function runSafetyTests() {
  console.log('🧪 Running Safety Tests');
  console.log('========================\n');

  // --- Test Official Source Detection ---
  console.log('\n🧪 Testing Official Source Detection');
  console.log('=====================================');
  
  // Test official domains
  assert(isOfficial('https://openai.com/blog/new-model'), 'OpenAI domain is official');
  assert(isOfficial('https://anthropic.com/news'), 'Anthropic domain is official');
  assert(isOfficial('https://ai.googleblog.com/post'), 'Google AI Blog is official');
  assert(isOfficial('https://meta.ai/blog'), 'Meta AI domain is official');
  assert(isOfficial('https://github.com/openai/openai-python/releases'), 'OpenAI GitHub releases are official');
  assert(isOfficial('https://github.com/anthropics/anthropic-sdk-python/releases/tag/v1.0.0'), 'Anthropic GitHub releases are official');
  
  // Test non-official domains
  assert(!isOfficial('https://techcrunch.com/article'), 'TechCrunch is not official');
  assert(!isOfficial('https://venturebeat.com/news'), 'VentureBeat is not official');
  assert(!isOfficial('https://random-blog.com/post'), 'Random blog is not official');
  assert(!isOfficial('https://github.com/random-user/random-repo'), 'Random GitHub repo is not official');
  
  // Test invalid URLs
  assert(!isOfficial('not-a-url'), 'Invalid URL is not official');
  assert(!isOfficial(''), 'Empty URL is not official');
  
  console.log('✅ Official source detection tests passed');

  // --- Test Content Validation ---
  console.log('\n🧪 Testing Content Validation');
  console.log('==============================');
  
  // Test rumor language detection
  assert(containsRumorLanguage('According to sources, OpenAI is working on a new model'), 'Detects rumor language');
  assert(containsRumorLanguage('Reportedly, the company might release something'), 'Detects speculation language');
  assert(containsRumorLanguage('Insiders say this could be groundbreaking'), 'Detects insider language');
  assert(!containsRumorLanguage('OpenAI released GPT-4 with new capabilities'), 'Does not detect factual language');
  
  // Test spam language detection
  assert(containsSpamLanguage('Click here for free trial!'), 'Detects spam language');
  assert(containsSpamLanguage('Limited time offer - act now!'), 'Detects marketing spam');
  assert(!containsSpamLanguage('OpenAI announced GPT-4'), 'Does not detect normal content');
  
  // Test offensive language detection
  assert(containsOffensiveLanguage('This is hate speech'), 'Detects offensive language');
  assert(containsOffensiveLanguage('Violent threats against users'), 'Detects violent language');
  assert(!containsOffensiveLanguage('OpenAI released a new model'), 'Does not detect normal content');
  
  console.log('✅ Content validation tests passed');

  // --- Test Facts Validation ---
  console.log('\n🧪 Testing Facts Validation');
  console.log('============================');
  
  // Test empty facts detection
  const emptyFacts: ExtractedFacts = {
    vendor: 'test',
    product: 'test',
    version: '',
    date: '',
    features: [],
    changes: [],
    prices: [],
    limits: [],
    citations: []
  };
  
  const validFacts: ExtractedFacts = {
    vendor: 'openai',
    product: 'gpt-4',
    version: '4.0',
    date: '2024-01-01',
    features: ['Improved reasoning'],
    changes: ['Better performance'],
    prices: ['$0.03 per 1K tokens'],
    limits: ['1000 requests/hour'],
    citations: ['https://openai.com/blog/gpt-4']
  };
  
  assert(hasEmptyFacts(emptyFacts), 'Detects empty facts');
  assert(!hasEmptyFacts(validFacts), 'Does not detect valid facts');
  
  console.log('✅ Facts validation tests passed');

  // --- Test Content Length ---
  console.log('\n🧪 Testing Content Length');
  console.log('=========================');
  
  assert(isContentTooShort('Short'), 'Detects short content');
  assert(isContentTooShort('This is a very short piece of text that should be considered too short for our purposes'), 'Detects content under 100 chars');
  assert(!isContentTooShort('This is a much longer piece of content that provides substantial information about the topic and should be considered adequate for our purposes'), 'Does not detect adequate content');
  
  console.log('✅ Content length tests passed');

  // --- Test Duplicate Detection ---
  console.log('\n🧪 Testing Duplicate Detection');
  console.log('===============================');
  
  const existingTitles = [
    'OpenAI Releases GPT-4',
    'Anthropic Announces Claude 3',
    'Google Launches Gemini Pro'
  ];
  
  assert(isDuplicateTitle('OpenAI Releases GPT-4', existingTitles), 'Detects exact duplicate');
  assert(isDuplicateTitle('openai releases gpt-4', existingTitles), 'Detects case-insensitive duplicate');
  assert(!isDuplicateTitle('OpenAI Releases GPT-5', existingTitles), 'Does not detect different title');
  
  console.log('✅ Duplicate detection tests passed');

  // --- Test Content Validation Function ---
  console.log('\n🧪 Testing Content Validation Function');
  console.log('======================================');
  
  const validContent = {
    title: 'OpenAI Releases GPT-4',
    text: 'OpenAI has released GPT-4, a new large language model with improved capabilities and better performance across various tasks.',
    url: 'https://openai.com/blog/gpt-4'
  };
  
  const invalidContent = {
    title: '',
    text: 'Short',
    url: 'not-a-url'
  };
  
  const validResult = validateContent(validContent);
  const invalidResult = validateContent(invalidContent);
  
  assert(validResult.valid, 'Validates good content');
  assert(validResult.issues.length === 0, 'No issues with valid content');
  assert(!invalidResult.valid, 'Rejects invalid content');
  assert(invalidResult.issues.length > 0, 'Identifies issues with invalid content');
  
  console.log('✅ Content validation function tests passed');

  // --- Test Domain Utilities ---
  console.log('\n🧪 Testing Domain Utilities');
  console.log('===========================');
  
  const officialDomains = getOfficialDomains();
  assert(Array.isArray(officialDomains), 'Returns array of official domains');
  assert(officialDomains.length > 0, 'Has official domains');
  assert(officialDomains.includes('openai.com'), 'Includes OpenAI domain');
  
  assert(isTrustedDomain('openai.com'), 'Trusts OpenAI domain');
  assert(isTrustedDomain('subdomain.openai.com'), 'Trusts OpenAI subdomain');
  assert(!isTrustedDomain('fake-openai.com'), 'Does not trust fake domain');
  
  console.log('✅ Domain utilities tests passed');

  // --- Test Skip Decision Logic ---
  console.log('\n🧪 Testing Skip Decision Logic');
  console.log('==============================');
  
  // Test skip for non-official source
  const skipResult1 = await shouldSkip(validFacts, {
    url: 'https://techcrunch.com/article',
    title: 'TechCrunch Article',
    dailyPostCount: 0,
    maxDailyPosts: 5
  });
  
  assert(skipResult1.skip, 'Skips non-official source');
  assert(skipResult1.reason === REASON_TAGS.NO_OFFICIAL_SOURCE, 'Correct skip reason');
  
  // Test skip for empty facts
  const skipResult2 = await shouldSkip(emptyFacts, {
    url: 'https://openai.com/blog/test',
    title: 'Test Article',
    dailyPostCount: 0,
    maxDailyPosts: 5
  });
  
  assert(skipResult2.skip, 'Skips empty facts');
  assert(skipResult2.reason === REASON_TAGS.EMPTY_FACTS, 'Correct skip reason');
  
  // Test skip for daily limit
  const skipResult3 = await shouldSkip(validFacts, {
    url: 'https://openai.com/blog/test',
    title: 'Test Article',
    dailyPostCount: 5,
    maxDailyPosts: 5
  });
  
  assert(skipResult3.skip, 'Skips when daily limit reached');
  assert(skipResult3.reason === REASON_TAGS.OVER_DAILY_CAP, 'Correct skip reason');
  
  // Test skip for rumor content
  const skipResult4 = await shouldSkip(validFacts, {
    url: 'https://openai.com/blog/test',
    title: 'Test Article',
    text: 'According to sources, OpenAI might release something',
    dailyPostCount: 0,
    maxDailyPosts: 5
  });
  
  assert(skipResult4.skip, 'Skips rumor content');
  assert(skipResult4.reason === REASON_TAGS.RUMOR_ONLY, 'Correct skip reason');
  
  // Test no skip for valid content
  const noSkipResult = await shouldSkip(validFacts, {
    url: 'https://openai.com/blog/test',
    title: 'Test Article',
    text: 'OpenAI released GPT-4 with new capabilities including improved reasoning, better performance, and enhanced safety features. The model represents a significant advancement in artificial intelligence technology.',
    dailyPostCount: 0,
    maxDailyPosts: 5
  });
  
  assert(!noSkipResult.skip, 'Does not skip valid content');
  
  console.log('✅ Skip decision logic tests passed');

  console.log('\n🎉 All Safety Tests Passed!');
  console.log('============================');
  console.log('✅ Official source detection');
  console.log('✅ Content validation');
  console.log('✅ Facts validation');
  console.log('✅ Content length checks');
  console.log('✅ Duplicate detection');
  console.log('✅ Content validation function');
  console.log('✅ Domain utilities');
  console.log('✅ Skip decision logic');
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSafetyTests().catch(console.error);
}
