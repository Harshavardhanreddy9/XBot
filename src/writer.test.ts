import { writePost } from './writer';
import { createFinalTweet, getShortDomain, selectHashtags } from './index';

/**
 * Simple assertion function
 */
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`❌ Assertion failed: ${message}`);
  }
  console.log(`✅ ${message}`);
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('🧪 Running Writer Quality Control Tests');
  console.log('=====================================\n');
  
  try {
    // Length Validation
    console.log('📏 Testing Length Validation...');
    const longText = 'A'.repeat(1000);
    const result = await writePost('Test Title', longText, 'Test Source', { maxLength: 240, minLength: 200 });
    const testUrl = 'https://example.com/article';
    const finalTweet = createFinalTweet(result.content, 'Test Source', testUrl);
    
    assert(finalTweet.length <= 280, `Length test: ${finalTweet.length}/280 chars`);
    
    // Short content test
    const shortResult = await writePost('Test Title', 'Short', 'Test Source', { maxLength: 240, minLength: 200 });
    assert(shortResult.content.length > 0, `Short content handled: ${shortResult.content.length} chars`);
    assert(shortResult.provider === 'fallback', `Fallback provider used: ${shortResult.provider}`);
    
    // Clickbait Detection
    console.log('\n🚫 Testing Clickbait Detection...');
    const clickbaitResult = await writePost('Shocking AI Breakthrough', 'This shocking breakthrough will blow your mind!', 'Test Source', { maxLength: 240, minLength: 200 });
    const clickbaitWords = ['shocking', 'blow your mind', 'absolutely', 'definitely'];
    const hasClickbait = clickbaitWords.some(word => 
      clickbaitResult.content.toLowerCase().includes(word.toLowerCase())
    );
    assert(!hasClickbait, `Clickbait removed: "${clickbaitResult.content}"`);
    
    // Unsupported Claims Detection
    console.log('\n⚠️ Testing Unsupported Claims Detection...');
    const claimsResult = await writePost('Test Claims', 'This will definitely work for everyone and is proven to be 100% effective.', 'Test Source', { maxLength: 240, minLength: 200 });
    const strongClaims = ['definitely', 'proven to', '100%', 'always', 'never'];
    const hasStrongClaims = strongClaims.some(claim => 
      claimsResult.content.toLowerCase().includes(claim.toLowerCase())
    );
    assert(!hasStrongClaims, `Claims replaced: "${claimsResult.content}"`);
    
    // Emoji Limiting
    console.log('\n😀 Testing Emoji Limiting...');
    const emojiResult = await writePost('Emoji Test', '🚀 Amazing! 💡 Great! 🔥 Cool! 📈 Trending!', 'Test Source', { maxLength: 240, minLength: 200 });
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
    const emojiCount = (emojiResult.content.match(emojiRegex) || []).length;
    assert(emojiCount <= 1, `Emojis limited: ${emojiCount} emojis found`);
    
    // Plagiarism Prevention
    console.log('\n📝 Testing Plagiarism Prevention...');
    const sourceText = 'This is a very long sentence that contains many consecutive words that should be limited to prevent plagiarism in the generated content.';
    const plagiarismResult = await writePost('Plagiarism Test', sourceText, 'Test Source', { maxLength: 240, minLength: 200 });
    
    const sourceWords = sourceText.split(' ');
    const resultWords = plagiarismResult.content.split(' ');
    
    let maxConsecutive = 0;
    let currentConsecutive = 0;
    
    for (let i = 0; i < resultWords.length; i++) {
      if (sourceWords.includes(resultWords[i])) {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        currentConsecutive = 0;
      }
    }
    
    assert(maxConsecutive <= 8, `Plagiarism prevention: max ${maxConsecutive} consecutive words`);
    
    // URL Length Handling
    console.log('\n🔗 Testing URL Length Handling...');
    const longContent = 'A'.repeat(250);
    const longUrl = 'https://very-long-domain-name.com/very/long/path/to/article';
    const urlTweet = createFinalTweet(longContent, 'Test Source', longUrl);
    
    assert(urlTweet.length <= 280, `URL length test: ${urlTweet.length}/280 chars`);
    assert(urlTweet.includes(longUrl), `URL included in tweet`);
    
    // Hashtag Selection
    console.log('\n#️⃣ Testing Hashtag Selection...');
    const hashtagResults = Array.from({ length: 20 }, () => selectHashtags());
    const noHashtagCount = hashtagResults.filter(h => h.length === 0).length;
    const noHashtagPercentage = noHashtagCount / 20;
    
    // Test that hashtag selection is working (not all empty, not all full)
    const hasVariety = noHashtagCount > 0 && noHashtagCount < 20;
    assert(hasVariety, `Hashtag variety: ${noHashtagCount}/20 with no hashtags (${(noHashtagPercentage * 100).toFixed(1)}%)`);
    
    // Domain Extraction
    console.log('\n🌐 Testing Domain Extraction...');
    const testCases = [
      { url: 'https://techcrunch.com/article', expected: 'techcrunch' },
      { url: 'https://www.venturebeat.com/path', expected: 'venturebeat' },
      { url: 'https://news.ycombinator.com/item', expected: 'news' },
      { url: 'https://blog.google/ai-update', expected: 'blog' },
      { url: 'invalid-url', expected: 'Unknown' }
    ];
    
    testCases.forEach(({ url, expected }) => {
      const result = getShortDomain(url);
      assert(result === expected, `Domain extraction: ${url} -> ${result} (expected ${expected})`);
    });
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('✅ Writer quality controls are working properly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}
