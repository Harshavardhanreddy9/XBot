# Local AI Setup Guide for XBot

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

# Pull a model (in another terminal)
ollama pull llama3.2:3b  # Small, fast model
# or
ollama pull llama3.2:1b  # Even smaller
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

## Model Recommendations

- **llama3.2:1b** - Fastest, good for basic tasks
- **llama3.2:3b** - Balanced speed/quality
- **llama3.2:8b** - Higher quality, slower
- **phi3:3.8b** - Microsoft's efficient model

## Performance Notes

- 1B models: ~2-3 seconds per summary
- 3B models: ~5-8 seconds per summary  
- 8B models: ~15-30 seconds per summary

For a Twitter bot, 1B or 3B models are recommended for speed.
