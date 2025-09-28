import dotenv from 'dotenv';
import { extractArticle } from './extractor';
import { writePost } from './writer';
import { createFinalTweet, getShortDomain, selectHashtags } from './index';

// Load environment variables
dotenv.config();

/**
 * Test URL - a real AI/tech article for testing
 */
const TEST_URL = 'https://techcrunch.com/2024/01/15/openai-launches-gpt-4-turbo-with-vision-capabilities/';
const TEST_TITLE = 'OpenAI launches GPT-4 Turbo with vision capabilities';
const TEST_SOURCE = 'TechCrunch AI';

/**
 * Test the complete pipeline without publishing
 */
async function testPipeline(): Promise<void> {
  console.log('🧪 XBot Pipeline Test');
  console.log('====================\n');

  try {
    // Step 1: Extract article content
    console.log('📄 Step 1: Extracting article content...');
    console.log(`🔗 URL: ${TEST_URL}`);
    console.log(`📰 Title: ${TEST_TITLE}`);
    console.log(`📡 Source: ${TEST_SOURCE}\n`);

    const extractedArticle = await extractArticle(TEST_URL, {
      title: TEST_TITLE,
      link: TEST_URL,
      isoDate: new Date().toISOString(),
      source: TEST_SOURCE,
    }, {
      timeout: 15000,
      maxRetries: 2,
    });

    console.log(`🔍 Extraction: ${extractedArticle.success ? '✅ Success' : '⚠️ Fallback'}`);
    console.log(`📝 Article text length: ${extractedArticle.text.length} characters`);
    if (extractedArticle.success) {
      console.log(`📄 First 200 chars: "${extractedArticle.text.substring(0, 200)}..."`);
    }
    console.log('');

    // Step 2: Write post using configured AI provider
    console.log('✍️ Step 2: Writing post...');
    const writeResult = await writePost(
      extractedArticle.title,
      extractedArticle.text,
      extractedArticle.source,
      {
        maxLength: 240,
        minLength: 200,
        includeSource: true,
      }
    );

    console.log(`📝 Generated post (${writeResult.length} chars) using ${writeResult.provider}:`);
    console.log(`"${writeResult.content}"`);
    console.log('');

    // Step 3: Create final tweet with URL and hashtags
    console.log('📝 Step 3: Creating final tweet...');
    
    // Simulate hashtag selection
    const hashtags = selectHashtags();
    const hashtagString = hashtags.length > 0 ? ' ' + hashtags.join(' ') : '';
    const shortDomain = getShortDomain(TEST_URL);
    
    const finalTweet = createFinalTweet(writeResult.content, TEST_SOURCE, TEST_URL);
    
    console.log(`📝 Final tweet (${finalTweet.length} chars):`);
    console.log(`"${finalTweet}"`);
    console.log('');

    // Step 4: Analysis
    console.log('📊 Step 4: Analysis');
    console.log('==================');
    console.log(`✅ Length: ${finalTweet.length}/280 characters (${Math.round((finalTweet.length/280)*100)}% used)`);
    console.log(`🎯 Provider: ${writeResult.provider}`);
    console.log(`🏷️ Hashtags: ${hashtags.length > 0 ? hashtags.join(', ') : 'None'}`);
    console.log(`🌐 Domain: ${shortDomain}`);
    console.log(`📏 Content quality: ${writeResult.length < 200 ? 'Short' : writeResult.length < 240 ? 'Medium' : 'Long'}`);
    
    // Check for tone indicators
    const toneIndicators = {
      hasOpener: /^(Quick take:|Notable:|TL;DR:|Heads-up:|My read:|If you follow|Here's the gist:)/.test(writeResult.content),
      hasCloser: /(Thoughts\?|Worth watching\.|Big if true\.|Curious to see adoption\.|What do you think\?|Keep an eye on this\.|Interesting times ahead\.|This could be big\.|What's your take\?|Definitely one to watch\.)$/.test(writeResult.content),
      hasEmoji: /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(writeResult.content),
      hasSource: writeResult.content.includes(shortDomain) || writeResult.content.includes('via'),
    };

    console.log('\n🎭 Tone Analysis:');
    console.log(`   Opener: ${toneIndicators.hasOpener ? '✅' : '❌'}`);
    console.log(`   Closer: ${toneIndicators.hasCloser ? '✅' : '❌'}`);
    console.log(`   Emoji: ${toneIndicators.hasEmoji ? '✅' : '❌'}`);
    console.log(`   Source: ${toneIndicators.hasSource ? '✅' : '❌'}`);

    // Step 5: Recommendations
    console.log('\n💡 Recommendations:');
    if (finalTweet.length > 250) {
      console.log('   ⚠️ Tweet is getting long - consider shortening');
    }
    if (writeResult.length < 150) {
      console.log('   ⚠️ Content is quite short - might need more substance');
    }
    if (!toneIndicators.hasOpener) {
      console.log('   💡 Consider adding a voice opener for personality');
    }
    if (hashtags.length === 0) {
      console.log('   💡 No hashtags selected - consider adding relevant ones');
    }

    console.log('\n🎉 Test completed successfully!');
    console.log('📝 The pipeline is ready for production use.');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

/**
 * Run the test
 */
testPipeline();
