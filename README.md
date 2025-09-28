# XBot - AI-Powered Twitter Bot

An intelligent Twitter bot that automatically curates and posts tech news with AI-generated summaries and thread support.

## 🚀 Features

### 📰 Content Curation
- **RSS Feed Integration**: Fetches headlines from multiple tech/AI sources
  - TechCrunch AI tag
  - VentureBeat AI
  - Hacker News AI search
  - Google AI blog
- **Smart Selection**: Sorts by date, removes duplicates, picks top N items
- **Article Extraction**: Full-text extraction with fallback to RSS titles

### 🧵 Dual Posting Modes
- **Single Posts** (85% of the time): Complete summary in one tweet
- **Thread Posts** (15% of the time): 2-tweet threads
  - Tweet 1: Humanized summary
  - Tweet 2: Key detail (metric/name) + source

### 🤖 AI-Powered Content Generation
- **Heuristic Summarization**: Custom rules-based summarization
- **AI Provider Support**: Optional OpenAI GPT or Ollama integration
- **Smart Fallbacks**: RSS title + context when extraction fails

### 🎭 Human-Like Persona
- **Voice Openers**: "Quick take:", "Notable:", "If you follow AI:", etc.
- **Rhetorical Devices**: Questions, contrasts, "so what" lines
- **Closers**: "Thoughts?", "Worth watching.", "Big if true."
- **Emoji Support**: Optional random emojis (10-15% chance)

### 🛡️ Quality Controls
- **Clickbait Filtering**: Removes "shocking", "insane", "amazing" language
- **Claims Validation**: Replaces unsupported claims with cautious language
- **Plagiarism Prevention**: Limits consecutive words to 8 max
- **Length Management**: Hard 280-character limit with URL space
- **Emoji Limiting**: Maximum 1 emoji per tweet

### 🔧 Technical Features
- **Thread Support**: Proper reply chains for multi-tweet threads
- **Jitter Delays**: Random 0-30s delays between multiple posts
- **Error Handling**: Graceful fallbacks and retry logic
- **Rate Limit Management**: Respects Twitter API limits
- **Comprehensive Testing**: Unit tests for all quality controls

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Harshavardhanreddy9/XBot.git
   cd XBot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Fill in your Twitter API credentials in `.env`:
   ```env
   # Twitter API Credentials
   X_API_KEY=your_api_key_here
   X_API_SECRET=your_api_secret_here
   X_ACCESS_TOKEN=your_access_token_here
   X_ACCESS_SECRET=your_access_secret_here
   
   # Bot Configuration
   POSTS_PER_RUN=1
   
   # Optional AI Provider
   # AI_PROVIDER=openai  # or ollama
   # OPENAI_API_KEY=sk-your-key-here
   # OLLAMA_HOST=http://localhost:11434
   ```

4. **Authenticate with Twitter**
   ```bash
   npm run auth
   ```

## 🚀 Usage

### Basic Usage
```bash
# Run the bot once
npm run dev

# Build and run production
npm run build
npm start
```

### Testing
```bash
# Test content pipeline (no posting)
npm run test

# Test writer quality controls
npm run test-writer

# Test thread functionality
npm run test-thread
```

## 📊 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTS_PER_RUN` | Number of posts per run | `1` |
| `AI_PROVIDER` | AI provider: `openai`, `ollama`, or unset for heuristic | `unset` |
| `MIN_ARTICLE_LENGTH` | Minimum article length before fallback | `400` |
| `JITTER_MIN` | Minimum delay between posts (seconds) | `0` |
| `JITTER_MAX` | Maximum delay between posts (seconds) | `30` |
| `HASHTAG_NONE_CHANCE` | Probability of no hashtags | `0.3` |
| `ENABLE_EMOJIS` | Enable random emoji usage | `false` |
| `EMOJI_CHANCE` | Probability of emoji when enabled | `0.12` |
| `ENABLE_CLOSERS` | Enable random closers | `true` |
| `CLOSER_CHANCE` | Probability of closer when enabled | `0.3` |

## 🧵 Thread Mode

The bot has a **15% chance** of creating 2-tweet threads:

### Thread Structure
1. **Tweet 1**: Humanized summary (under 240 chars)
2. **Tweet 2**: Key detail + source domain (under 240 chars)

### Key Detail Extraction
- **Metrics**: `$1.2B`, `95%`, `2.5M users`
- **Company Names**: `OpenAI`, `Google`, `Tesla`
- **Product Names**: `GPT-5`, `Gemini 2.0`
- **Version Numbers**: `v2.0`, `version 3.1`

### Example Thread
```
Tweet 1: "Quick take: OpenAI raises $1.2B in Series C funding led by Microsoft. This could accelerate AI research and development significantly. — techcrunch"

Tweet 2: "Key metric: $1.2B — techcrunch"
```

## 🛡️ Quality Controls

### Content Filtering
- **Clickbait Removal**: Filters out sensational language
- **Claims Validation**: Replaces absolute claims with cautious language
- **Plagiarism Prevention**: Limits consecutive word copying to 8 words max

### Length Management
- **Hard 280-char limit**: Ensures URL fits in every tweet
- **Smart Trimming**: Prioritizes opener, then middle sentences
- **URL Space Reservation**: Reserves 30 chars for URL + source

### Persona Controls
- **Opener Variety**: 8-10 different voice openers
- **Closer Options**: 4-5 different closers
- **Emoji Limiting**: Maximum 1 emoji per tweet
- **No Repetition**: Prevents consecutive same openers

## 🧪 Testing

### Unit Tests
```bash
# Test writer quality controls
npm run test-writer

# Test thread functionality
npm run test-thread

# Test full pipeline
npm run test
```

### Test Coverage
- ✅ Length validation (280 char limit)
- ✅ Clickbait detection and removal
- ✅ Unsupported claims filtering
- ✅ Emoji limiting (max 1)
- ✅ Plagiarism prevention (8-word limit)
- ✅ Thread structure validation
- ✅ Key detail extraction
- ✅ Source attribution

## 🔄 Automation

### Daily Automation (Mac/Linux)
Add to crontab for daily posting:
```bash
# Edit crontab
crontab -e

# Add daily at 9 AM
0 9 * * * cd /path/to/XBot && npm run dev >> /var/log/xbot.log 2>&1
```

### Manual Scheduling
```bash
# Run once
npm run dev

# Run with specific post count
POSTS_PER_RUN=3 npm run dev
```

## 📁 Project Structure

```
src/
├── index.ts          # Main orchestrator
├── rss.ts            # RSS feed fetching
├── select.ts         # Content selection & deduplication
├── extractor.ts      # Article text extraction
├── summarize.ts      # Content summarization
├── persona.ts        # Human-like voice generation
├── writer.ts         # Post/thread generation
├── postToX.ts        # Twitter API integration
├── auth.ts           # OAuth authentication
├── test.ts           # Pipeline testing
├── test-thread.ts    # Thread functionality testing
└── writer.test.ts    # Quality control testing
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

ISC License - see LICENSE file for details

## ⚠️ Important Notes

- **Never commit `.env` file** - it contains sensitive API keys
- **Rate Limits**: Respect Twitter API rate limits
- **Content Quality**: Bot includes multiple quality controls
- **Fallback Mechanisms**: Graceful handling of extraction failures
- **Thread Support**: Proper reply chains for multi-tweet threads

## 🆘 Troubleshooting

### Common Issues
1. **Authentication Failed**: Run `npm run auth` to complete OAuth flow
2. **Rate Limited**: Wait for rate limit reset or reduce `POSTS_PER_RUN`
3. **Extraction Failed**: Bot will fallback to RSS title + context
4. **Thread Posting Failed**: Bot will fallback to single post

### Debug Mode
```bash
# Enable verbose logging
DEBUG=true npm run dev
```

---

**Made with ❤️ for the tech community**