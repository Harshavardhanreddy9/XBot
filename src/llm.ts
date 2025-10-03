import OpenAI from 'openai';

/**
 * Configuration for LLM client
 */
export interface LLMConfig {
  provider: 'openai' | 'ollama' | 'custom' | 'heuristic';
  apiKey?: string;
  baseURL?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Model strength types
 */
type ModelStrength = 
  | 'mathematics' | 'programming' | 'multi-step reasoning' | 'efficiency'
  | 'multilingual' | 'creative text' | 'versatility' | 'coding'
  | 'complex reasoning' | 'long context' | 'high accuracy'
  | 'enhanced reasoning' | 'instruction following' | 'balanced performance'
  | 'dialogue' | 'conversational' | 'cost-effective' | 'speed'
  | 'low resources' | 'basic tasks' | 'code generation' | 'debugging'
  | 'collaborative' | 'ethical AI' | 'multimodal' | 'vision-language'
  | 'modern architecture' | 'adaptive reasoning'
  | 'mathematical reasoning' | 'good quality';

/**
 * Model tier types
 */
type ModelTier = 'premium' | 'high' | 'efficient' | 'specialized';

/**
 * Model configuration interface
 */
interface ModelConfig {
  name: string;
  description: string;
  size: string;
  recommended: boolean;
  tier: ModelTier;
  strengths: ModelStrength[];
}

/**
 * Best open-source models available through Ollama (October 2025)
 */
export const BEST_OLLAMA_MODELS: Record<string, ModelConfig> = {
  // 🏆 TOP TIER - Best Performance (October 2025)
  'deepseek-r1:7b': {
    name: 'DeepSeek R1 7B',
    description: '🏆 BEST MODEL 2025 - Chinese startup DeepSeek\'s revolutionary model, rivals GPT-4',
    size: '7B parameters',
    recommended: true,
    tier: 'premium',
    strengths: ['mathematics', 'programming', 'multi-step reasoning', 'efficiency']
  },
  'llama3.2:8b': {
    name: 'Llama 3.2 8B',
    description: 'Meta\'s latest Llama - improved architecture, 40+ languages, optimized tokenization',
    size: '8B parameters', 
    recommended: true,
    tier: 'premium',
    strengths: ['multilingual', 'creative text', 'programming', 'versatility']
  },
  'qwen3:7b': {
    name: 'Qwen3 7B',
    description: 'Alibaba\'s Qwen3 - 119 languages, Codeforces 2056 rating, hybrid reasoning',
    size: '7B parameters',
    recommended: true,
    tier: 'premium', 
    strengths: ['multilingual', 'mathematical reasoning', 'coding', 'adaptive reasoning']
  },
  'falcon2:7b': {
    name: 'Falcon 2 7B',
    description: 'TII Abu Dhabi\'s Falcon 2 - 5T tokens training, multimodal capabilities',
    size: '7B parameters',
    recommended: true,
    tier: 'premium',
    strengths: ['multimodal', 'vision-language', 'efficiency', 'modern architecture']
  },
  
  // 🥈 HIGH PERFORMANCE - Excellent Quality
  'llama3.1:70b': {
    name: 'Llama 3.1 70B',
    description: 'Meta\'s largest Llama - state-of-the-art performance for complex tasks',
    size: '70B parameters',
    recommended: true,
    tier: 'high',
    strengths: ['complex reasoning', 'long context', 'high accuracy']
  },
  'qwen3:14b': {
    name: 'Qwen3 14B', 
    description: 'Larger Qwen3 model with enhanced reasoning and multilingual support',
    size: '14B parameters',
    recommended: true,
    tier: 'high',
    strengths: ['enhanced reasoning', 'multilingual', 'coding']
  },
  'mistral-nemo:12b': {
    name: 'Mistral Nemo 12B',
    description: 'Mistral\'s latest - improved instruction following and efficiency',
    size: '12B parameters',
    recommended: true,
    tier: 'high',
    strengths: ['instruction following', 'efficiency', 'balanced performance']
  },
  
  // 🥉 EFFICIENT - Good Performance, Lower Resources
  'vicuna:13b': {
    name: 'Vicuna 13B',
    description: 'LMSYS optimized for dialogue - 70K conversations training, $300 cost',
    size: '13B parameters',
    recommended: true,
    tier: 'efficient',
    strengths: ['dialogue', 'conversational', 'cost-effective']
  },
  'llama3.1:8b': {
    name: 'Llama 3.1 8B',
    description: 'Meta\'s efficient 8B model - great balance of speed and quality',
    size: '8B parameters',
    recommended: true,
    tier: 'efficient',
    strengths: ['speed', 'efficiency', 'good quality']
  },
  'phi3:3.8b': {
    name: 'Phi-3 3.8B',
    description: 'Microsoft\'s efficient small model - fast and capable for basic tasks',
    size: '3.8B parameters',
    recommended: false,
    tier: 'efficient',
    strengths: ['speed', 'low resources', 'basic tasks']
  },
  
  // 🔧 SPECIALIZED - Domain-Specific
  'codellama:7b': {
    name: 'Code Llama 7B',
    description: 'Specialized for code generation and understanding',
    size: '7B parameters',
    recommended: false,
    tier: 'specialized',
    strengths: ['code generation', 'programming', 'debugging']
  },
  'bloom:7b': {
    name: 'BLOOM 7B',
    description: 'Hugging Face collaborative model - 46 languages, 13 programming languages',
    size: '7B parameters',
    recommended: false,
    tier: 'specialized',
    strengths: ['multilingual', 'collaborative', 'ethical AI']
  }
} as const;

/**
 * Default configuration - Uses best open-source model by default
 */
const DEFAULT_CONFIG: Required<LLMConfig> = {
  provider: 'ollama',
  apiKey: '',
  baseURL: 'http://localhost:11434/v1',
  model: 'deepseek-r1:7b', // 🏆 Best model October 2025
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
  const provider = (process.env.AI_PROVIDER as 'openai' | 'ollama' | 'custom' | 'heuristic') || 'ollama';
  
  const config: LLMConfig = {
    provider,
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OLLAMA_HOST ? `${process.env.OLLAMA_HOST}/v1` : undefined,
    model: provider === 'ollama' ? 'deepseek-r1:7b' : 'gpt-4o-mini', // 🏆 Best open-source model
    temperature: 0.1,
    maxTokens: 2000,
  };

  return new LLMClient(config);
}

/**
 * Get recommended models based on use case
 */
export function getRecommendedModels(useCase: 'summarization' | 'general' | 'coding' | 'multilingual' | 'efficient' = 'general') {
  const models = Object.entries(BEST_OLLAMA_MODELS);
  
  switch (useCase) {
    case 'summarization':
      return models.filter(([_, model]) => 
        model.strengths.includes('efficiency') || 
        model.strengths.includes('multi-step reasoning') ||
        model.tier === 'premium'
      );
    
    case 'coding':
      return models.filter(([_, model]) => 
        model.strengths.includes('programming') || 
        model.strengths.includes('code generation') ||
        model.strengths.includes('coding')
      );
    
    case 'multilingual':
      return models.filter(([_, model]) => 
        model.strengths.includes('multilingual') ||
        model.strengths.includes('versatility')
      );
    
    case 'efficient':
      return models.filter(([_, model]) => 
        model.tier === 'efficient' || 
        model.strengths.includes('speed')
      );
    
    default:
      return models.filter(([_, model]) => model.recommended);
  }
}

/**
 * Get the best model for a specific use case
 */
export function getBestModelForUseCase(useCase: 'summarization' | 'general' | 'coding' | 'multilingual' | 'efficient' = 'general'): string {
  const recommended = getRecommendedModels(useCase);
  
  if (recommended.length === 0) {
    return 'deepseek-r1:7b'; // Fallback to best overall model
  }
  
  // Return the first recommended model (highest tier)
  return recommended[0][0];
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
