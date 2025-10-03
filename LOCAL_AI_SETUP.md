# Local AI Setup Guide for XBot

## 🏆 Best Open-Source Models (October 2025)

### Top Tier Models (Recommended)
```bash
# 🥇 BEST OVERALL - DeepSeek R1 (Rivals GPT-4!)
ollama pull deepseek-r1:7b

# 🥈 Meta's Latest - Llama 3.2 (40+ languages)
ollama pull llama3.2:8b

# 🥉 Alibaba's Qwen3 (119 languages, Codeforces 2056)
ollama pull qwen3:7b

# 🏅 TII's Falcon 2 (Multimodal, 5T tokens)
ollama pull falcon2:7b
```

### High Performance Models
```bash
# Meta's largest model (requires 40GB+ RAM)
ollama pull llama3.1:70b

# Enhanced Qwen3 (14B parameters)
ollama pull qwen3:14b

# Mistral's latest (improved instruction following)
ollama pull mistral-nemo:12b
```

### Efficient Models (Lower Resources)
```bash
# LMSYS optimized for dialogue
ollama pull vicuna:13b

# Meta's efficient 8B model
ollama pull llama3.1:8b

# Microsoft's fast small model
ollama pull phi3:3.8b
```

## Option 1: Ollama (Recommended - Free & Open Source)

### Installation
```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Windows
# Download from https://ollama.ai/download
```

### Setup
```bash
# Start Ollama service
ollama serve

# Pull the best model (in another terminal)
ollama pull deepseek-r1:7b  # 🏆 Best model October 2025
# or for faster performance:
ollama pull llama3.2:8b     # Meta's latest
```

### Configure XBot
Add to your `.env` file:
```env
AI_PROVIDER=ollama
OLLAMA_HOST=http://localhost:11434
```

## Option 2: LM Studio (GUI-based)

1. Download from https://lmstudio.ai/
2. Install and download a model (Llama 3.2 3B recommended)
3. Start local server
4. Configure XBot:
```env
AI_PROVIDER=custom
OPENAI_API_KEY=lm-studio
OPENAI_BASE_URL=http://localhost:1234/v1
```

## Option 3: Continue with Heuristic (No AI needed)

The bot already works well with heuristic summarization. No additional setup required.

## Testing Local AI

```bash
# Test with Ollama
AI_PROVIDER=ollama npm run dev

# Test with custom endpoint
AI_PROVIDER=custom OPENAI_BASE_URL=http://localhost:1234/v1 npm run dev
```

## Model Recommendations by Use Case

### 🏆 Best Overall (October 2025)
- **deepseek-r1:7b** - Rivals GPT-4, excellent reasoning
- **llama3.2:8b** - Meta's latest, 40+ languages
- **qwen3:7b** - Alibaba's model, 119 languages

### ⚡ Fast & Efficient
- **phi3:3.8b** - Microsoft's fast small model
- **llama3.1:8b** - Meta's efficient 8B model
- **vicuna:13b** - Optimized for dialogue

### 🧠 High Performance
- **llama3.1:70b** - Meta's largest (requires 40GB+ RAM)
- **qwen3:14b** - Enhanced reasoning
- **mistral-nemo:12b** - Improved instruction following

### 🔧 Specialized
- **codellama:7b** - Code generation
- **bloom:7b** - Multilingual (46 languages)

## Performance Notes

- **3B models**: ~2-3 seconds per summary
- **7B models**: ~5-8 seconds per summary  
- **8B models**: ~8-12 seconds per summary
- **14B+ models**: ~15-30 seconds per summary

**For XBot**: 7B models offer the best balance of quality and speed.
