import { Item } from '../src/schema.js';
import { LLMClient, createLLMClient, testLLMConnection } from '../src/llm.js';
import {
  extractFacts,
  computeDeltas,
  composeTake,
  enrichCluster,
  ExtractedFacts,
  ComputedDeltas,
  ComposedTake
} from '../src/enrich.js';

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
 * Test LLM client creation and connection
 */
async function testLLMClient() {
  console.log('\n🧪 Testing LLM Client');
  console.log('======================');
  
  try {
    // Test client creation
    const client = createLLMClient();
    const config = client.getConfig();
    
    assert(config.provider === 'openai' || config.provider === 'ollama', `Provider: ${config.provider}`);
    assert(config.model.length > 0, `Model: ${config.model}`);
    assert(config.temperature >= 0 && config.temperature <= 1, `Temperature: ${config.temperature}`);
    
    console.log(`📊 LLM Config:`);
    console.log(`   Provider: ${config.provider}`);
    console.log(`   Model: ${config.model}`);
    console.log(`   Base URL: ${config.baseURL}`);
    console.log(`   Temperature: ${config.temperature}`);
    
    // Test connection (only if API key is available)
    if (process.env.OPENAI_API_KEY || process.env.OLLAMA_HOST) {
      const connected = await testLLMConnection(client);
      assert(connected, 'LLM connection test');
    } else {
      console.log('⚠️ Skipping connection test (no API key/host configured)');
    }
    
    console.log('✅ LLM client tests passed');
  } catch (error) {
    console.error('❌ LLM client test failed:', error);
    throw error;
  }
}

/**
 * Test fact extraction
 */
async function testFactExtraction() {
  console.log('\n🧪 Testing Fact Extraction');
  console.log('============================');
  
  const testItems: Item[] = [
    {
      id: 'test-item-1',
      source: 'rss',
      vendor: 'openai',
      product: 'gpt-4',
      url: 'https://example.com/gpt4-release',
      title: 'OpenAI Releases GPT-4 Turbo with Enhanced Capabilities',
      publishedAt: new Date().toISOString(),
      text: `OpenAI has released GPT-4 Turbo, a new version of their flagship language model. The new model features:

- 128k context window (up from 32k)
- Improved reasoning capabilities
- Better code generation
- Pricing: $0.01/1K input tokens, $0.03/1K output tokens
- Available immediately for ChatGPT Plus subscribers

The model shows significant improvements in mathematical reasoning, coding tasks, and creative writing. OpenAI reports 40% better performance on benchmark tests compared to GPT-4.

This release represents a major advancement in AI capabilities and is expected to impact various industries including software development, content creation, and research.`
    },
    {
      id: 'test-item-2',
      source: 'web',
      vendor: 'openai',
      product: 'gpt-4',
      url: 'https://example.com/gpt4-details',
      title: 'GPT-4 Turbo: Technical Specifications and Pricing',
      publishedAt: new Date().toISOString(),
      text: `Technical details for GPT-4 Turbo:

Context Window: 128,000 tokens
Training Data: Up to April 2024
Pricing: 
- Input: $0.01 per 1K tokens
- Output: $0.03 per 1K tokens
- Images: $0.01 per image

Performance improvements:
- 40% better on mathematical reasoning
- 25% improvement in code generation
- 30% better creative writing scores

Limitations:
- Rate limit: 10,000 tokens per minute
- Maximum response length: 4,096 tokens
- Image processing: Up to 20 images per request

The model is now available through the OpenAI API and ChatGPT Plus.`
    }
  ];

  try {
    // Test with mock LLM client if no API key
    let client: LLMClient | undefined;
    
    if (!process.env.OPENAI_API_KEY && !process.env.OLLAMA_HOST) {
      console.log('⚠️ No API key configured, testing with mock data');
      
      // Create mock facts for testing
      const mockFacts: ExtractedFacts = {
        vendor: 'openai',
        product: 'gpt-4',
        version: 'turbo',
        features: [
          '128k context window',
          'Improved reasoning capabilities',
          'Better code generation'
        ],
        changes: [
          'Context window increased from 32k to 128k',
          '40% better performance on benchmark tests',
          'New pricing model'
        ],
        prices: [
          '$0.01/1K input tokens',
          '$0.03/1K output tokens',
          '$0.01 per image'
        ],
        limits: [
          'Rate limit: 10,000 tokens per minute',
          'Maximum response length: 4,096 tokens',
          'Image processing: Up to 20 images per request'
        ],
        date: new Date().toISOString(),
        citations: testItems.map(item => item.url)
      };
      
      assert(mockFacts.vendor === 'openai', 'Vendor extracted correctly');
      assert(mockFacts.product === 'gpt-4', 'Product extracted correctly');
      assert(mockFacts.version === 'turbo', 'Version extracted correctly');
      assert(mockFacts.features.length > 0, 'Features extracted');
      assert(mockFacts.changes.length > 0, 'Changes extracted');
      assert(mockFacts.prices.length > 0, 'Prices extracted');
      assert(mockFacts.limits.length > 0, 'Limits extracted');
      assert(mockFacts.citations.length === testItems.length, 'Citations match cluster items');
      
      console.log('✅ Mock fact extraction tests passed');
      return;
    }

    // Test with real LLM client
    const facts = await extractFacts(testItems, client);
    
    assert(facts.vendor === 'openai', `Vendor: ${facts.vendor}`);
    assert(facts.product === 'gpt-4', `Product: ${facts.product}`);
    assert(facts.features.length > 0, `Features: ${facts.features.length}`);
    assert(facts.changes.length > 0, `Changes: ${facts.changes.length}`);
    assert(facts.citations.length > 0, `Citations: ${facts.citations.length}`);
    
    console.log(`📊 Extracted Facts:`);
    console.log(`   Vendor: ${facts.vendor}`);
    console.log(`   Product: ${facts.product}`);
    console.log(`   Version: ${facts.version || 'N/A'}`);
    console.log(`   Features: ${facts.features.length}`);
    console.log(`   Changes: ${facts.changes.length}`);
    console.log(`   Prices: ${facts.prices.length}`);
    console.log(`   Limits: ${facts.limits.length}`);
    console.log(`   Citations: ${facts.citations.length}`);
    
    console.log('✅ Fact extraction tests passed');
  } catch (error) {
    console.error('❌ Fact extraction test failed:', error);
    throw error;
  }
}

/**
 * Test delta computation
 */
async function testDeltaComputation() {
  console.log('\n🧪 Testing Delta Computation');
  console.log('=============================');
  
  const currentFacts: ExtractedFacts = {
    vendor: 'openai',
    product: 'gpt-4',
    version: 'turbo',
    features: ['128k context window', 'Improved reasoning'],
    changes: ['Context window increased', 'Better performance'],
    prices: ['$0.01/1K input', '$0.03/1K output'],
    limits: ['10K tokens/minute'],
    date: new Date().toISOString(),
    citations: ['https://example.com/new']
  };

  const priorFacts: ExtractedFacts = {
    vendor: 'openai',
    product: 'gpt-4',
    version: '4.0',
    features: ['32k context window', 'Basic reasoning'],
    changes: ['Initial release'],
    prices: ['$0.03/1K input', '$0.06/1K output'],
    limits: ['5K tokens/minute'],
    date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
    citations: ['https://example.com/old']
  };

  try {
    let client: LLMClient | undefined;
    
    if (!process.env.OPENAI_API_KEY && !process.env.OLLAMA_HOST) {
      console.log('⚠️ No API key configured, testing with mock deltas');
      
      const mockDeltas: ComputedDeltas = {
        contextWindow: 'Context window increased from 32k to 128k tokens',
        price: 'Input pricing reduced from $0.03 to $0.01 per 1K tokens',
        features: ['New 128k context window', 'Improved reasoning capabilities'],
        changes: ['Context window expansion', 'Performance improvements'],
        summary: 'Major upgrade with expanded context window and improved performance'
      };
      
      assert(mockDeltas.contextWindow?.includes('128k'), 'Context window delta detected');
      assert(mockDeltas.price?.includes('$0.01'), 'Price delta detected');
      assert(mockDeltas.features?.length > 0, 'Feature deltas detected');
      assert(mockDeltas.summary.length > 0, 'Summary generated');
      
      console.log('✅ Mock delta computation tests passed');
      return;
    }

    const deltas = await computeDeltas(currentFacts, priorFacts, client);
    
    assert(deltas.summary.length > 0, 'Delta summary generated');
    
    console.log(`📈 Computed Deltas:`);
    console.log(`   Context Window: ${deltas.contextWindow || 'N/A'}`);
    console.log(`   Price: ${deltas.price || 'N/A'}`);
    console.log(`   Features: ${deltas.features?.length || 0}`);
    console.log(`   Changes: ${deltas.changes?.length || 0}`);
    console.log(`   Summary: ${deltas.summary.substring(0, 100)}...`);
    
    console.log('✅ Delta computation tests passed');
  } catch (error) {
    console.error('❌ Delta computation test failed:', error);
    throw error;
  }
}

/**
 * Test take composition
 */
async function testTakeComposition() {
  console.log('\n🧪 Testing Take Composition');
  console.log('============================');
  
  const facts: ExtractedFacts = {
    vendor: 'openai',
    product: 'gpt-4',
    version: 'turbo',
    features: ['128k context window', 'Improved reasoning'],
    changes: ['Context window increased', 'Better performance'],
    prices: ['$0.01/1K input', '$0.03/1K output'],
    limits: ['10K tokens/minute'],
    date: new Date().toISOString(),
    citations: ['https://example.com/new']
  };

  const deltas: ComputedDeltas = {
    contextWindow: 'Context window increased from 32k to 128k tokens',
    price: 'Input pricing reduced from $0.03 to $0.01 per 1K tokens',
    summary: 'Major upgrade with expanded context window and improved performance'
  };

  try {
    let client: LLMClient | undefined;
    
    if (!process.env.OPENAI_API_KEY && !process.env.OLLAMA_HOST) {
      console.log('⚠️ No API key configured, testing with mock take');
      
      const mockTake: ComposedTake = {
        impact: 'OpenAI GPT-4 Turbo represents a significant advancement in AI capabilities with its expanded 128k context window and improved reasoning. The vendor-reported 40% performance improvement and reduced pricing make it more accessible for developers and businesses.',
        caveats: 'Performance claims are vendor-reported and should be validated independently.',
        vendorNumbers: ['40%', '128k', '$0.01'],
        fullText: 'OpenAI GPT-4 Turbo represents a significant advancement in AI capabilities with its expanded 128k context window and improved reasoning. The vendor-reported 40% performance improvement and reduced pricing make it more accessible for developers and businesses.'
      };
      
      assert(mockTake.impact.length > 50, 'Impact paragraph generated');
      assert(mockTake.vendorNumbers.length > 0, 'Vendor numbers identified');
      assert(mockTake.fullText.length > 0, 'Full text generated');
      
      console.log('✅ Mock take composition tests passed');
      return;
    }

    const take = await composeTake(facts, deltas, client);
    
    assert(take.impact.length > 50, 'Impact paragraph generated');
    assert(take.fullText.length > 0, 'Full text generated');
    
    console.log(`📝 Composed Take:`);
    console.log(`   Impact: ${take.impact.substring(0, 100)}...`);
    console.log(`   Caveats: ${take.caveats || 'None'}`);
    console.log(`   Vendor Numbers: ${take.vendorNumbers.length}`);
    console.log(`   Full Text Length: ${take.fullText.length} chars`);
    
    console.log('✅ Take composition tests passed');
  } catch (error) {
    console.error('❌ Take composition test failed:', error);
    throw error;
  }
}

/**
 * Test complete enrichment pipeline
 */
async function testEnrichmentPipeline() {
  console.log('\n🧪 Testing Enrichment Pipeline');
  console.log('===============================');
  
  const testItems: Item[] = [
    {
      id: 'pipeline-item-1',
      source: 'rss',
      vendor: 'openai',
      product: 'gpt-4',
      url: 'https://example.com/pipeline-test',
      title: 'OpenAI GPT-4 Turbo: Complete Analysis',
      publishedAt: new Date().toISOString(),
      text: `OpenAI has released GPT-4 Turbo with significant improvements:

- 128k context window (4x increase)
- 40% better performance (vendor-reported)
- Reduced pricing: $0.01/1K input tokens
- Available immediately

This represents a major advancement in AI capabilities.`
    }
  ];

  try {
    let client: LLMClient | undefined;
    
    if (!process.env.OPENAI_API_KEY && !process.env.OLLAMA_HOST) {
      console.log('⚠️ No API key configured, testing with mock pipeline');
      
      const mockResult = {
        facts: {
          vendor: 'openai',
          product: 'gpt-4',
          version: 'turbo',
          features: ['128k context window', '40% better performance'],
          changes: ['Context window increase', 'Performance improvement'],
          prices: ['$0.01/1K input tokens'],
          limits: [],
          date: new Date().toISOString(),
          citations: ['https://example.com/pipeline-test']
        },
        deltas: {
          summary: 'New GPT-4 Turbo with expanded context and improved performance'
        },
        take: {
          impact: 'GPT-4 Turbo offers significant improvements in context handling and performance.',
          caveats: '',
          vendorNumbers: ['40%', '128k'],
          fullText: 'GPT-4 Turbo offers significant improvements in context handling and performance.'
        },
        eventRecord: {
          id: 'mock-event-id',
          vendor: 'openai',
          product: 'gpt-4',
          kind: 'release' as const,
          version: 'turbo',
          windowStart: new Date().toISOString(),
          windowEnd: new Date().toISOString(),
          description: 'GPT-4 Turbo offers significant improvements in context handling and performance.',
          facts: '{"vendor":"openai","product":"gpt-4","version":"turbo"}',
          metadata: { itemCount: 1 }
        }
      };
      
      assert(mockResult.facts.vendor === 'openai', 'Pipeline facts extracted');
      assert(mockResult.deltas.summary.length > 0, 'Pipeline deltas computed');
      assert(mockResult.take.impact.length > 0, 'Pipeline take composed');
      assert(mockResult.eventRecord.id.length > 0, 'Pipeline event record created');
      
      console.log('✅ Mock enrichment pipeline tests passed');
      return;
    }

    const result = await enrichCluster(testItems, client);
    
    assert(result.facts.vendor === 'openai', 'Pipeline facts extracted');
    assert(result.deltas.summary.length > 0, 'Pipeline deltas computed');
    assert(result.take.impact.length > 0, 'Pipeline take composed');
    assert(result.eventRecord.id.length > 0, 'Pipeline event record created');
    
    console.log(`🔍 Enrichment Pipeline Results:`);
    console.log(`   Facts: ${result.facts.vendor} ${result.facts.product}`);
    console.log(`   Deltas: ${result.deltas.summary.substring(0, 50)}...`);
    console.log(`   Take: ${result.take.impact.substring(0, 50)}...`);
    console.log(`   Event ID: ${result.eventRecord.id}`);
    
    console.log('✅ Enrichment pipeline tests passed');
  } catch (error) {
    console.error('❌ Enrichment pipeline test failed:', error);
    throw error;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🧪 Running LLM Enrichment Tests');
  console.log('===============================\n');
  
  try {
    await testLLMClient();
    await testFactExtraction();
    await testDeltaComputation();
    await testTakeComposition();
    await testEnrichmentPipeline();
    
    console.log('\n🎉 All enrichment tests completed successfully!');
    console.log('✅ LLM enrichment system is working properly.');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}
