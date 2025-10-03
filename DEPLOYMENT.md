# 🚀 XBot Deployment Guide

This guide shows you how to deploy your XBot to run automatically in the cloud.

## 🌟 Recommended: Railway (Free & Easy)

### Step 1: Prepare Your Repository
1. **Push your code to GitHub** (already done ✅)
2. **Add environment variables** to your `.env` file:
   ```env
   BOT_RUN_INTERVAL_MINUTES=360  # Run every 6 hours
   ```

### Step 2: Deploy to Railway
1. **Go to [Railway.app](https://railway.app)**
2. **Sign up with GitHub**
3. **Click "New Project" → "Deploy from GitHub repo"**
4. **Select your XBot repository**
5. **Railway will automatically detect Node.js and deploy**

### Step 3: Configure Environment Variables
1. **Go to your Railway project dashboard**
2. **Click "Variables" tab**
3. **Add all your Twitter API credentials:**
   ```
   X_API_KEY=your_api_key_here
   X_API_SECRET=your_api_secret_here
   X_ACCESS_TOKEN=your_access_token_here
   X_ACCESS_SECRET=your_access_secret_here
   POSTS_PER_RUN=1
   BOT_RUN_INTERVAL_MINUTES=360
   ```

### Step 4: Deploy
1. **Railway will automatically build and deploy**
2. **Check the logs to see if it's working**
3. **Your bot will now run every 6 hours automatically!**

---

## 🔄 Alternative: Render (Free Tier)

### Step 1: Create Render Account
1. **Go to [Render.com](https://render.com)**
2. **Sign up with GitHub**

### Step 2: Deploy with Blueprint
1. **Click "New" → "Blueprint"**
2. **Connect your GitHub repository**
3. **Render will automatically detect `render.yaml` and deploy both services**

### Step 3: Add Environment Variables
In the Render dashboard, add these environment variables to both services:
```
X_API_KEY=your_api_key_here
X_API_SECRET=your_api_secret_here
X_ACCESS_TOKEN=your_access_token_here
X_ACCESS_SECRET=your_access_secret_here
POSTS_PER_RUN=1
BOT_RUN_INTERVAL_MINUTES=360
GITHUB_TOKEN=your_github_token_here (optional)
```

### Step 4: Services Deployed
Render will create two services:
- **Web Service**: Runs health endpoint and initial pipeline
- **Cron Job**: Runs pipeline every 6 hours automatically

### Step 5: Monitor Health
- **Health Check**: `https://your-app.onrender.com/health`
- **Status**: `https://your-app.onrender.com/status`
- **Logs**: Available in Render dashboard

---

## ⚙️ Configuration Options

### Run Frequency
```env
# Run every hour
BOT_RUN_INTERVAL_MINUTES=60

# Run every 6 hours (recommended)
BOT_RUN_INTERVAL_MINUTES=360

# Run every 12 hours
BOT_RUN_INTERVAL_MINUTES=720

# Run once per day
BOT_RUN_INTERVAL_MINUTES=1440
```

### Post Frequency
```env
# Post 1 tweet per run
POSTS_PER_RUN=1

# Post 2 tweets per run (if you have higher rate limits)
POSTS_PER_RUN=2
```

---

## 📊 Monitoring Your Bot

### Railway Dashboard
- **Logs**: See real-time bot activity
- **Metrics**: CPU, memory usage
- **Deployments**: Track updates

### Check Bot Status
1. **Look at your Twitter account** - tweets should appear automatically
2. **Check Railway logs** - see when bot runs
3. **Monitor rate limits** - bot handles this automatically

---

## 🛠️ Troubleshooting

### Bot Not Running
1. **Check Railway logs** for errors
2. **Verify environment variables** are set correctly
3. **Check Twitter API credentials**

### Rate Limit Issues
- **Bot automatically handles rate limits**
- **Reduces frequency if needed**
- **Logs will show rate limit status**

### Deployment Issues
1. **Check build logs** in Railway
2. **Ensure all dependencies** are in package.json
3. **Verify TypeScript compilation** works locally

---

## 🔧 Local Testing

### Test Scheduler Locally
```bash
# Test the scheduler
npm run dev-scheduler

# Test single run
npm run start-once
```

### Build and Test
```bash
# Build the project
npm run build

# Test production build
npm start
```

---

## 📈 Scaling Options

### Free Tier Limits
- **Railway**: 500 hours/month free
- **Render**: 750 hours/month free
- **Both**: Sufficient for bot running every 6 hours

### Paid Options
- **Railway Pro**: $5/month for unlimited
- **Render**: $7/month for always-on
- **AWS/GCP**: More complex but powerful

---

## 🎯 Best Practices

### Environment Variables
- **Never commit `.env` file**
- **Use Railway/Render environment variables**
- **Keep secrets secure**

### Monitoring
- **Check logs regularly**
- **Monitor Twitter account**
- **Set up alerts if needed**

### Updates
- **Push changes to GitHub**
- **Railway auto-deploys**
- **Test locally first**

---

## 🚀 Quick Start Commands

```bash
# Test locally
npm run dev-scheduler

# Build for production
npm run build

# Deploy to Railway
# (Just push to GitHub - Railway auto-deploys)
```

Your bot will now run automatically in the cloud! 🎉
