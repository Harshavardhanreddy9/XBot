import OpenAI from 'openai';

/**
 * Configuration for LLM client
 */
export interface LLMConfig {
  provider: 'openai' | 'ollama' | 'custom';
  apiKey?: string;
  baseURL?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<LLMConfig> = {
  provider: 'openai',
  apiKey: '',
  baseURL: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
  temperature: 0.1,
  maxTokens: 2000,
};

/**
 * LLM client for OpenAI-compatible APIs
 */
export class LLMClient {
  private config: Required<LLMConfig>;
  private client: OpenAI | null = null;

  constructor(config: Partial<LLMConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeClient();
  }

  /**
   * Initialize the appropriate client based on provider
   */
  private initializeClient(): void {
    try {
      switch (this.config.provider) {
        case 'openai':
          const openaiKey = this.config.apiKey || process.env.OPENAI_API_KEY;
          if (!openaiKey) {
            console.warn('⚠️ OpenAI API key not provided, client will not be initialized');
            return;
          }
          this.client = new OpenAI({
            apiKey: openaiKey,
            baseURL: this.config.baseURL,
          });
          break;
        
        case 'ollama':
          this.client = new OpenAI({
            apiKey: 'ollama', // Ollama doesn't require a real API key
            baseURL: this.config.baseURL || 'http://localhost:11434/v1',
          });
          break;
        
        case 'custom':
          this.client = new OpenAI({
            apiKey: this.config.apiKey || 'custom',
            baseURL: this.config.baseURL,
          });
          break;
        
        default:
          throw new Error(`Unsupported provider: ${this.config.provider}`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to initialize LLM client:', error);
      this.client = null;
    }
  }

  /**
   * Make a completion request
   */
  async complete(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>): Promise<string> {
    if (!this.client) {
      throw new Error('LLM client not initialized');
    }

    try {
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('LLM completion error:', error);
      throw new Error(`LLM request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Make a simple prompt request with system message
   */
  async prompt(systemPrompt: string, userPrompt: string): Promise<string> {
    return this.complete([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<LLMConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.initializeClient();
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<LLMConfig> {
    return { ...this.config };
  }
}

/**
 * Create LLM client from environment variables
 */
export function createLLMClient(): LLMClient {
  const provider = (process.env.AI_PROVIDER as 'openai' | 'ollama' | 'custom') || 'openai';
  
  const config: LLMConfig = {
    provider,
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OLLAMA_HOST ? `${process.env.OLLAMA_HOST}/v1` : undefined,
    model: provider === 'ollama' ? 'llama3:instruct' : 'gpt-4o-mini',
    temperature: 0.1,
    maxTokens: 2000,
  };

  return new LLMClient(config);
}

/**
 * Test LLM connection
 */
export async function testLLMConnection(client?: LLMClient): Promise<boolean> {
  try {
    const llmClient = client || createLLMClient();
    const response = await llmClient.prompt(
      'You are a helpful assistant.',
      'Respond with "OK" if you can understand this message.'
    );
    
    console.log('✅ LLM connection test successful');
    console.log(`📝 Response: ${response.substring(0, 100)}...`);
    return true;
  } catch (error) {
    console.error('❌ LLM connection test failed:', error);
    return false;
  }
}
