# 🤖 XBot - AI News Twitter Bot

An automated Twitter bot that fetches AI and tech news from RSS feeds and posts them to X (Twitter) with human-like templates and hashtags.

## ✨ Features

- 📰 **RSS Feed Integration** - Fetches from 4 AI/tech RSS sources
- 🎯 **Smart Content Selection** - Deduplicates and selects top headlines
- 📝 **Human-like Templates** - 8 different tweet templates with rotating styles
- 🏷️ **Auto Hashtags** - Adds relevant AI/tech hashtags automatically
- ⏰ **Smart Delays** - Random delays between multiple posts
- 🔒 **Secure** - All credentials stored in environment variables

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd XBot
npm install
```

### 2. Environment Setup

Create a `.env` file in the root directory:

```bash
# Twitter API Credentials
X_API_KEY=your_api_key_here
X_API_SECRET=your_api_secret_here
X_ACCESS_TOKEN=your_access_token_here
X_ACCESS_SECRET=your_access_secret_here

# Bot Configuration
POSTS_PER_RUN=1
```

### 3. Get Twitter API Credentials

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create a new app or use existing one
3. Go to "Keys and Tokens" tab
4. Copy:
   - **API Key and Secret** (Consumer Keys)
   - **Access Token and Secret** (Authentication Tokens)

### 4. Run the Bot

```bash
# Development mode
npm run dev

# Build and run
npm run build
npm start
```

## 📁 Project Structure

```
XBot/
├── src/
│   ├── index.ts          # Main orchestrator
│   ├── rss.ts            # RSS feed fetching
│   ├── select.ts         # Content selection & deduplication
│   ├── templates.ts      # Tweet template generation
│   ├── postToX.ts        # Twitter posting functionality
│   └── twitter.ts        # Twitter API utilities
├── .env.example          # Environment variables template
├── .gitignore           # Git ignore rules
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
└── README.md           # This file
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `X_API_KEY` | Twitter API Key | ✅ |
| `X_API_SECRET` | Twitter API Secret | ✅ |
| `X_ACCESS_TOKEN` | Twitter Access Token | ✅ |
| `X_ACCESS_SECRET` | Twitter Access Secret | ✅ |
| `POSTS_PER_RUN` | Number of tweets per run (1-3) | ❌ (default: 1) |

### RSS Sources

The bot fetches from these AI/tech RSS feeds:
- TechCrunch AI
- VentureBeat AI  
- Hacker News AI
- Google AI Blog

## 📝 Tweet Templates

The bot uses 8 different human-like templates:

1. `🚀 {title} — {source}`
2. `Quick take: {title}`
3. `📰 {title} via {source}`
4. `What do you think about {title}?`
5. `Interesting read: {title}`
6. `{title} — {source}`
7. `🔥 {title}`
8. `Thoughts on {title}?`

## 🏷️ Hashtags

Automatically adds 1-2 relevant hashtags from:
- #AI, #MachineLearning, #TechNews
- #ArtificialIntelligence, #Innovation, #Tech
- #Future, #Automation, #DataScience, #DeepLearning

## 🛠️ Development

### Available Scripts

```bash
npm run dev      # Run in development mode
npm run build    # Build TypeScript to JavaScript
npm start        # Run built JavaScript
npm run auth     # Twitter authentication helper
```

### Adding New RSS Sources

Edit `src/rss.ts` and add to the `RSS_FEEDS` array:

```typescript
{
  url: 'https://example.com/feed.xml',
  source: 'Example Source'
}
```

### Customizing Tweet Templates

Edit `src/templates.ts` and modify the `TWEET_TEMPLATES` array:

```typescript
const TWEET_TEMPLATES = [
  "Your custom template: {title}",
  // ... other templates
];
```

## 🔒 Security

- All sensitive data is stored in `.env` file
- `.env` is excluded from git via `.gitignore`
- Never commit API keys or tokens
- Use `.env.example` as a template for others

## 📊 Example Output

```
🤖 XBot Orchestrator Starting...
================================

✅ Twitter API configured successfully
👤 Authenticated as: @yourusername

📰 Fetching RSS headlines...
✅ Fetched 40 headlines from 2 sources

🎯 Selecting top 1 headlines...
✅ Selected 1 headlines for posting

📝 Generated tweet (221 chars):
"🚀 OpenAI releases GPT-5 with revolutionary capabilities — TechCrunch #AI #MachineLearning https://example.com"

📤 Posting to X...
✅ Posted successfully! Tweet ID: 1234567890
🔗 URL: https://twitter.com/user/status/1234567890

🎉 XBot run completed!
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - feel free to use this project for your own Twitter bots!

## ⚠️ Disclaimer

This bot is for educational and personal use. Please respect Twitter's Terms of Service and API rate limits. Use responsibly!
