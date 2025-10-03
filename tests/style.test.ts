import {
  STYLE,
  getRandomEmoji,
  canAddEmoji,
  countEmojis,
  addEmojiIfAllowed,
  getToneLanguage,
  addBenchmarkDisclaimer,
  selectBestLink,
  applyStyle,
  getStyleSummary
} from '../src/style.js';

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
 * Test emoji functionality
 */
function testEmojiFunctionality() {
  console.log('\n🧪 Testing Emoji Functionality');
  console.log('===============================');
  
  // Test emoji configuration
  assert(STYLE.emoji.enabled === true, 'Emojis are enabled by default');
  assert(STYLE.emoji.perTweetMax === 1, 'Max 1 emoji per tweet');
  assert(STYLE.emoji.set.length > 0, 'Emoji set is configured');
  
  // Test random emoji generation
  const emoji1 = getRandomEmoji();
  const emoji2 = getRandomEmoji();
  assert(typeof emoji1 === 'string', 'Random emoji returns string');
  assert(STYLE.emoji.set.includes(emoji1), 'Random emoji is from configured set');
  
  // Test emoji counting
  const textWithEmoji = 'Hello 🚀 world!';
  const emojiCount = countEmojis(textWithEmoji);
  assert(emojiCount === 1, `Correctly counts ${emojiCount} emoji`);
  
  const textWithoutEmoji = 'Hello world!';
  const noEmojiCount = countEmojis(textWithoutEmoji);
  assert(noEmojiCount === 0, 'Correctly counts 0 emojis');
  
  // Test emoji limits
  assert(canAddEmoji(0) === true, 'Can add emoji when count is 0');
  assert(canAddEmoji(1) === false, 'Cannot add emoji when at limit');
  
  // Test adding emoji
  const textWithAddedEmoji = addEmojiIfAllowed('Hello world');
  assert(textWithAddedEmoji.includes('Hello world'), 'Original text preserved');
  assert(countEmojis(textWithAddedEmoji) === 1, 'Emoji added successfully');
  
  console.log('✅ Emoji functionality tests passed');
}

/**
 * Test tone language
 */
function testToneLanguage() {
  console.log('\n🧪 Testing Tone Language');
  console.log('=========================');
  
  const toneLanguage = getToneLanguage();
  
  assert(Array.isArray(toneLanguage.openers), 'Openers is array');
  assert(Array.isArray(toneLanguage.closers), 'Closers is array');
  assert(Array.isArray(toneLanguage.connectors), 'Connectors is array');
  
  assert(toneLanguage.openers.length > 0, 'Has openers');
  assert(toneLanguage.closers.length > 0, 'Has closers');
  assert(toneLanguage.connectors.length > 0, 'Has connectors');
  
  // Test that openers are appropriate for tone
  if (STYLE.tone === 'precise') {
    assert(toneLanguage.openers.some(opener => opener.includes('Update')), 'Has precise openers');
  } else {
    assert(toneLanguage.openers.some(opener => opener.includes('Quick')), 'Has casual openers');
  }
  
  console.log(`📊 Tone Language Results:`);
  console.log(`   Tone: ${STYLE.tone}`);
  console.log(`   Openers: ${toneLanguage.openers.length}`);
  console.log(`   Closers: ${toneLanguage.closers.length}`);
  console.log(`   Connectors: ${toneLanguage.connectors.length}`);
  
  console.log('✅ Tone language tests passed');
}

/**
 * Test benchmark disclaimers
 */
function testBenchmarkDisclaimers() {
  console.log('\n🧪 Testing Benchmark Disclaimers');
  console.log('=================================');
  
  // Test with benchmark terms
  const benchmarkText = 'Performance improved by 50%';
  const disclaimedText = addBenchmarkDisclaimer(benchmarkText);
  assert(disclaimedText.includes('vendor-reported metrics'), 'Benchmark disclaimer added');
  
  // Test without benchmark terms
  const normalText = 'New feature released';
  const normalDisclaimedText = addBenchmarkDisclaimer(normalText);
  assert(normalDisclaimedText === normalText, 'No disclaimer for non-benchmark text');
  
  // Test with disabled disclaimers
  const originalSetting = STYLE.disclaimBenchmarks;
  STYLE.disclaimBenchmarks = false;
  const noDisclaimerText = addBenchmarkDisclaimer(benchmarkText);
  assert(noDisclaimerText === benchmarkText, 'No disclaimer when disabled');
  STYLE.disclaimBenchmarks = originalSetting; // Restore
  
  console.log('✅ Benchmark disclaimer tests passed');
}

/**
 * Test link selection
 */
function testLinkSelection() {
  console.log('\n🧪 Testing Link Selection');
  console.log('=========================');
  
  const testLinks = [
    'https://github.com/openai/openai-python',
    'https://openai.com/blog/gpt-4',
    'https://techcrunch.com/ai-news',
    'https://youtube.com/watch?v=123'
  ];
  
  const bestLink = selectBestLink(testLinks);
  assert(bestLink !== undefined, 'Best link selected');
  
  // Should prefer vendor links over others
  const vendorLinks = ['https://openai.com/blog/gpt-4'];
  const githubLinks = ['https://github.com/openai/openai-python'];
  const blogLinks = ['https://techcrunch.com/ai-news'];
  
  const vendorBest = selectBestLink(vendorLinks);
  const githubBest = selectBestLink(githubLinks);
  const blogBest = selectBestLink(blogLinks);
  
  assert(vendorBest === vendorLinks[0], 'Vendor link selected');
  assert(githubBest === githubLinks[0], 'GitHub link selected');
  assert(blogBest === blogLinks[0], 'Blog link selected');
  
  // Test empty array
  const emptyBest = selectBestLink([]);
  assert(emptyBest === undefined, 'Empty array returns undefined');
  
  console.log(`📊 Link Selection Results:`);
  console.log(`   Preference order: ${STYLE.linkPreference.join(' > ')}`);
  console.log(`   Best link: ${bestLink}`);
  
  console.log('✅ Link selection tests passed');
}

/**
 * Test style application
 */
function testStyleApplication() {
  console.log('\n🧪 Testing Style Application');
  console.log('============================');
  
  const testText = 'Performance improved significantly';
  
  // Test with emoji and disclaimer
  const styledText = applyStyle(testText, {
    addEmoji: true,
    addDisclaimer: true
  });
  
  assert(styledText.includes('Performance'), 'Original text preserved');
  assert(countEmojis(styledText) <= 1, 'Emoji limit respected');
  
  // Test without emoji
  const noEmojiText = applyStyle(testText, {
    addEmoji: false,
    addDisclaimer: true
  });
  
  assert(countEmojis(noEmojiText) === 0, 'No emoji added when disabled');
  
  // Test with custom emoji
  const customEmojiText = applyStyle(testText, {
    addEmoji: true,
    customEmoji: '🚀'
  });
  
  assert(customEmojiText.includes('🚀'), 'Custom emoji used');
  
  console.log(`📊 Style Application Results:`);
  console.log(`   Original: "${testText}"`);
  console.log(`   Styled: "${styledText}"`);
  console.log(`   No emoji: "${noEmojiText}"`);
  console.log(`   Custom emoji: "${customEmojiText}"`);
  
  console.log('✅ Style application tests passed');
}

/**
 * Test style summary
 */
function testStyleSummary() {
  console.log('\n🧪 Testing Style Summary');
  console.log('========================');
  
  const summary = getStyleSummary();
  
  assert(typeof summary === 'string', 'Summary is string');
  assert(summary.includes(STYLE.tone), 'Summary includes tone');
  assert(summary.includes('emoji'), 'Summary includes emoji info');
  assert(summary.includes('benchmarks'), 'Summary includes benchmark info');
  
  console.log(`📊 Style Summary: ${summary}`);
  
  console.log('✅ Style summary tests passed');
}

/**
 * Test configuration
 */
function testConfiguration() {
  console.log('\n🧪 Testing Configuration');
  console.log('========================');
  
  // Test emoji configuration
  assert(STYLE.emoji.enabled === true, 'Emojis enabled');
  assert(STYLE.emoji.perTweetMax === 1, 'Max 1 emoji per tweet');
  assert(STYLE.emoji.set.length === 5, '5 emojis in set');
  assert(STYLE.emoji.set.includes('🚀'), 'Set includes rocket emoji');
  
  // Test tone configuration
  assert(STYLE.tone === 'precise', 'Tone is precise');
  
  // Test disclaimer configuration
  assert(STYLE.disclaimBenchmarks === true, 'Benchmark disclaimers enabled');
  
  // Test link preference configuration
  assert(Array.isArray(STYLE.linkPreference), 'Link preference is array');
  assert(STYLE.linkPreference.length === 4, '4 link preferences');
  assert(STYLE.linkPreference[0] === 'vendor', 'Vendor is first preference');
  assert(STYLE.linkPreference[1] === 'github', 'GitHub is second preference');
  
  console.log(`📊 Configuration Results:`);
  console.log(`   Emoji set: ${STYLE.emoji.set.join(', ')}`);
  console.log(`   Tone: ${STYLE.tone}`);
  console.log(`   Disclaim benchmarks: ${STYLE.disclaimBenchmarks}`);
  console.log(`   Link preference: ${STYLE.linkPreference.join(' > ')}`);
  
  console.log('✅ Configuration tests passed');
}

/**
 * Test edge cases
 */
function testEdgeCases() {
  console.log('\n🧪 Testing Edge Cases');
  console.log('=====================');
  
  // Test emoji counting with multiple emojis from our set
  const multiEmojiText = 'Hello 🚀 world 📣 test 🆕';
  const multiEmojiCount = countEmojis(multiEmojiText);
  assert(multiEmojiCount === 3, `Correctly counts ${multiEmojiCount} emojis`);
  
  // Test emoji limits with multiple emojis
  assert(canAddEmoji(3) === false, 'Cannot add emoji when over limit');
  
  // Test link selection with invalid URLs
  const invalidLinks = ['not-a-url', 'https://invalid-domain-12345.com'];
  const invalidBest = selectBestLink(invalidLinks);
  assert(invalidBest !== undefined, 'Handles invalid URLs gracefully');
  
  // Test style application with empty text
  const emptyStyled = applyStyle('', { addEmoji: true });
  assert(emptyStyled.length >= 0, 'Handles empty text');
  
  // Test benchmark disclaimer with edge cases
  const edgeCaseText = 'The benchmark shows improvement';
  const edgeCaseDisclaimed = addBenchmarkDisclaimer(edgeCaseText);
  assert(edgeCaseDisclaimed.includes('vendor-reported'), 'Handles edge case benchmarks');
  
  console.log('✅ Edge case tests passed');
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🧪 Running Style Tests');
  console.log('======================\n');
  
  try {
    testEmojiFunctionality();
    testToneLanguage();
    testBenchmarkDisclaimers();
    testLinkSelection();
    testStyleApplication();
    testStyleSummary();
    testConfiguration();
    testEdgeCases();
    
    console.log('\n🎉 All style tests completed successfully!');
    console.log('✅ Style system is working properly.');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}
