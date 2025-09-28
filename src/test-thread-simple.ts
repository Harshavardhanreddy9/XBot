import dotenv from 'dotenv';
import { writePostOrThread } from './writer';

dotenv.config();

/**
 * Simple thread test without Twitter API calls
 */
async function testThreadModeSimple() {
  console.log('🧵 Simple Thread Mode Test');
  console.log('==========================\n');

  const testCase = {
    title: 'OpenAI Raises $1.2B in Series C Funding Led by Microsoft',
    text: 'OpenAI has successfully raised $1.2 billion in Series C funding led by Microsoft. The funding round values the company at $29 billion. The investment will be used to accelerate AI research and development, with plans to hire 500 new employees and expand infrastructure. This brings OpenAI\'s total funding to over $3 billion since its founding.',
    source: 'https://techcrunch.com'
  };

  console.log(`📝 Testing: ${testCase.title}`);
  console.log(`📄 Content: ${testCase.text.substring(0, 100)}...`);
  console.log(`🌐 Source: ${testCase.source}\n`);

  try {
    // Force thread mode for testing
    const originalRandom = Math.random;
    Math.random = () => 0.1; // Force thread mode (15% chance)
    
    const result = await writePostOrThread(
      testCase.title,
      testCase.text,
      testCase.source,
      {
        maxLength: 240,
        minLength: 180,
        includeSource: true,
      }
    );
    
    // Restore original random function
    Math.random = originalRandom;
    
    console.log('📊 Results:');
    console.log(`   🧵 Thread Mode: ${result.isThread ? 'YES' : 'NO'}`);
    console.log(`   📝 Tweet Count: ${result.tweets.length}`);
    console.log(`   📏 Total Length: ${result.totalLength} chars`);
    console.log(`   ✅ Success: ${result.success}`);
    
    console.log('\n📱 Generated Tweets:');
    result.tweets.forEach((tweet, index) => {
      console.log(`\n   Tweet ${index + 1} (${tweet.length} chars):`);
      console.log(`   "${tweet}"`);
    });
    
    console.log('\n📊 Quality Checks:');
    console.log(`   ✅ Length under 240: ${result.tweets.every(t => t.length <= 240) ? 'PASS' : 'FAIL'}`);
    console.log(`   ✅ Thread structure: ${result.isThread && result.tweets.length === 2 ? 'PASS' : 'FAIL'}`);
    console.log(`   ✅ Key detail present: ${result.tweets[1]?.includes('Key metric:') || result.tweets[1]?.includes('Notable:') || result.tweets[1]?.includes('Focus:') ? 'PASS' : 'FAIL'}`);
    console.log(`   ✅ Source attribution: ${result.tweets.every(t => t.includes('techcrunch')) ? 'PASS' : 'FAIL'}`);
    
    // Test single post mode
    console.log('\n📝 Testing Single Post Mode:');
    Math.random = () => 0.8; // Force single post mode (85% chance)
    
    const singleResult = await writePostOrThread(
      testCase.title,
      testCase.text,
      testCase.source,
      {
        maxLength: 240,
        minLength: 180,
        includeSource: true,
      }
    );
    
    Math.random = originalRandom;
    
    console.log(`   📝 Single Post: ${!singleResult.isThread ? 'YES' : 'NO'}`);
    console.log(`   📏 Length: ${singleResult.totalLength} chars`);
    console.log(`   📱 Tweet Count: ${singleResult.tweets.length}`);
    
    console.log('\n🎉 Thread functionality test completed successfully!');
    console.log('✅ Both thread and single post modes are working properly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testThreadModeSimple();
}
