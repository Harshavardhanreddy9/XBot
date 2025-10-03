# XBot Deployment Guide

## 🚀 Deploy to Render (Recommended)

### 1. Connect GitHub Repository
1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Blueprint"
3. Connect your GitHub account
4. Select the `Harshavardhanreddy9/XBot` repository
5. Render will automatically detect the `render.yaml` file

### 2. Configure Environment Variables
Add these environment variables in Render dashboard:

**Required:**
```env
X_API_KEY=your_twitter_api_key
X_API_SECRET=your_twitter_api_secret  
X_ACCESS_TOKEN=your_twitter_access_token
X_ACCESS_SECRET=your_twitter_access_secret
```

**Optional (for AI features):**
```env
OPENAI_API_KEY=your_openai_key  # For OpenAI integration
AI_PROVIDER=heuristic           # or 'openai' or 'ollama'
OLLAMA_HOST=http://localhost:11434  # For local Ollama
```

**Configuration:**
```env
POSTS_PER_RUN=1               # Number of tweets per run
MAX_TWEETS_PER_DAY=5          # Daily tweet limit
TEST_MODE=false               # Set to true for testing
```

### 3. Deploy
1. Click "Apply" in Render dashboard
2. Render will:
   - Build the project (`npm run build`)
   - Deploy web service with health endpoint
   - Set up cron job to run every 6 hours
   - Create persistent disk for database

### 4. Monitor Deployment
- **Web Service**: Provides health endpoint at `/health`
- **Cron Job**: Runs every 6 hours automatically
- **Logs**: Available in Render dashboard
- **Database**: Persisted on disk

## 🔧 Local Development

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your Twitter API keys

# Run in development mode
npm run dev

# Run tests
npm test
npm run test-grok
npm run test-media
```

## 📊 Monitoring

### Health Endpoints
- `GET /health` - Basic health check
- `GET /status` - Detailed status with statistics

### Logs
- Check Render dashboard for real-time logs
- Look for "HEALTH LOG" entries for monitoring data

### Database
- SQLite database stored in persistent disk
- Contains items, events, tweets, and skip reasons
- Automatically backed up with disk snapshots

## 🛠️ Troubleshooting

### Common Issues

1. **Database Permission Error**
   - Ensure `RENDER_DISK_PATH` is set correctly
   - Check disk mount permissions

2. **Twitter API Rate Limits**
   - Bot has built-in rate limiting
   - Check daily tweet limits in logs

3. **RSS Feed Errors**
   - Some feeds may be temporarily unavailable
   - Bot continues with available feeds

4. **Build Failures**
   - Check Node.js version compatibility
   - Ensure all dependencies are in package.json

### Debug Mode
```env
TEST_MODE=true  # Prevents actual posting
DEBUG=true      # Enables verbose logging
```

## 🔄 Updates

To update the deployed bot:
1. Push changes to GitHub
2. Render automatically redeploys
3. Check logs for any issues

## 📈 Scaling

- **Free Tier**: 1 web service + 1 cron job
- **Paid Plans**: Multiple services, custom domains
- **Database**: Upgrade disk size as needed
- **Monitoring**: Add external monitoring services

## 🎯 Production Checklist

- [ ] Twitter API keys configured
- [ ] Environment variables set
- [ ] Health endpoints responding
- [ ] Cron job running successfully
- [ ] Database persisting data
- [ ] Logs showing successful runs
- [ ] Test tweets posted successfully