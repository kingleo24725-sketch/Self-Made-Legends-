# Self-Made Legends Deployment Guide

This guide explains how to deploy the Self-Made Legends website and backend using modern hosting platforms.

## Table of Contents

1. [Deployment Overview](#deployment-overview)
2. [Frontend Deployment (Vercel/Netlify)](#frontend-deployment)
3. [Backend Deployment (Railway/Render)](#backend-deployment)
4. [Environment Configuration](#environment-configuration)
5. [Continuous Deployment](#continuous-deployment)
6. [Monitoring and Verification](#monitoring-and-verification)
7. [Troubleshooting](#troubleshooting)

## Deployment Overview

Self-Made Legends uses a two-part deployment strategy:

- **Frontend**: Static website (HTML/CSS/JavaScript) hosted on Vercel or Netlify
- **Backend**: Node.js/Express API hosted on Railway or Render

### Architecture

```
GitHub Repository
       ↓
   Main Branch
       ↓
    ┌─────────────┬──────────────┐
    ↓             ↓
Vercel/Netlify   Railway/Render
(Frontend)       (Backend)
    ↓             ↓
Website Live   API Live
```

## Frontend Deployment

### Option 1: Vercel (Recommended)

Vercel is the easiest way to deploy a static frontend and works perfectly with Self-Made Legends.

#### Step 1: Connect GitHub Repository

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Select "Import Git Repository"
4. Connect your GitHub account
5. Select the Self-Made Legends repository
6. Click "Import"

#### Step 2: Configure Project

1. **Project Name**: `self-made-legends` (or your preferred name)
2. **Framework Preset**: Select "Other" (since we're using static HTML)
3. **Root Directory**: Leave as default or select `frontend/` if you restructured
4. **Build Command**: (optional) `npm run build` or leave empty
5. **Environment Variables**: (see Environment Configuration section)

#### Step 3: Deploy

1. Click "Deploy"
2. Vercel will build and deploy your site automatically
3. You'll receive a production URL: `https://self-made-legends.vercel.app`

#### Step 4: Configure Custom Domain

1. In Vercel dashboard, go to "Settings" → "Domains"
2. Click "Add Domain"
3. Enter your domain (e.g., `selfmadelegends.com`)
4. Follow DNS configuration instructions
5. Wait for DNS propagation (usually 24-48 hours)

### Option 2: Netlify

Netlify is another excellent choice with similar deployment flow.

#### Step 1: Connect Repository

1. Go to [netlify.com](https://netlify.com)
2. Click "New site from Git"
3. Select GitHub and authorize
4. Select Self-Made Legends repository
5. Click "Connect"

#### Step 2: Configure Build Settings

1. **Build command**: Leave empty (for static HTML)
2. **Publish directory**: `./` (or `frontend/` if restructured)
3. **Environment variables**: Add as needed

#### Step 3: Deploy

1. Click "Deploy site"
2. Netlify builds and deploys automatically
3. You'll get a URL: `https://self-made-legends.netlify.app`

#### Step 4: Custom Domain

1. Go to "Site settings" → "Domain management"
2. Click "Add custom domain"
3. Enter your domain
4. Configure DNS settings
5. Wait for propagation

### Verifying Frontend Deployment

- [ ] Visit your deployment URL
- [ ] Verify all pages load (homepage, product page, FAQ, etc.)
- [ ] Check responsive design on mobile
- [ ] Verify quote form works and accepts input
- [ ] Check console for JavaScript errors
- [ ] Verify links navigate correctly
- [ ] Test bot loads and is interactive

## Backend Deployment

### Option 1: Railway (Recommended)

Railway makes deploying Node.js apps incredibly simple.

#### Step 1: Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Authorize Railway to access your repositories

#### Step 2: Deploy from GitHub

1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Select the Self-Made Legends repository
4. Railway automatically detects it's a Node.js project
5. Click "Deploy"

#### Step 3: Configure Environment Variables

1. In Railway dashboard, go to "Variables"
2. Add environment variables:
   ```
   NODE_ENV=production
   PORT=3000
   DATABASE_URL=your_database_url (if using database)
   API_URL=https://self-made-legends.railway.app
   ```

#### Step 4: Configure Domain

1. Go to "Settings" → "Public Networking"
2. Click "Generate Domain"
3. You'll get a URL: `https://self-made-legends.up.railway.app`
4. For custom domain:
   - Click "Add Custom Domain"
   - Enter your domain (e.g., `api.selfmadelegends.com`)
   - Configure DNS records as instructed

#### Step 5: Set Up Auto-Deploy

1. Go to "GitHub" tab
2. Ensure "Auto Deploy" is enabled
3. Select which branch to deploy from (typically `main`)

### Option 2: Render

Render is another solid option for backend hosting.

#### Step 1: Connect GitHub

1. Go to [render.com](https://render.com)
2. Click "New +"
3. Select "Web Service"
4. Connect your GitHub account
5. Select Self-Made Legends repository

#### Step 2: Configure Service

1. **Name**: `self-made-legends-api`
2. **Environment**: `Node`
3. **Build Command**: `npm install`
4. **Start Command**: `npm start`
5. **Plan**: Free or Starter

#### Step 3: Set Environment Variables

1. Go to "Environment"
2. Add variables:
   ```
   NODE_ENV=production
   PORT=3000
   ```

#### Step 4: Deploy

1. Click "Create Web Service"
2. Render deploys your backend
3. You'll get URL: `https://self-made-legends-api.onrender.com`

#### Step 5: Configure Domain

1. Go to "Settings" → "Custom Domains"
2. Add your custom domain
3. Configure DNS records

## Environment Configuration

### Frontend Environment Variables

Create a `.env.production` file for frontend configuration:

```bash
# API Configuration
REACT_APP_API_URL=https://api.selfmadelegends.com
REACT_APP_BOT_API=https://api.selfmadelegends.com/api/submit-lead

# Analytics
REACT_APP_GA_ID=your_google_analytics_id

# Branding
REACT_APP_COMPANY_NAME=Self-Made Legends
REACT_APP_YEAR=2026
```

### Backend Environment Variables

Create a `.env` file for backend configuration:

```bash
# Server
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# CORS Configuration
CORS_ORIGIN=https://selfmadelegends.com

# Database (if applicable)
DATABASE_URL=your_database_url
DB_USER=your_username
DB_PASS=your_password

# API Keys
SECRET_KEY=your_secret_key
API_KEY=your_api_key

# Email (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_password

# Analytics
ANALYTICS_KEY=your_analytics_key
```

### Keeping Secrets Secure

**NEVER commit environment variable files to GitHub:**

1. Add to `.gitignore`:
   ```
   .env
   .env.local
   .env.production
   ```

2. Set variables in hosting platform:
   - Vercel: Project Settings → Environment Variables
   - Railway: Variables tab
   - Render: Environment section

3. Use GitHub Secrets for CI/CD:
   ```yaml
   - name: Deploy
     env:
       API_KEY: ${{ secrets.API_KEY }}
   ```

## Continuous Deployment

### Automatic Deployment on Push

Both Vercel and Railway support automatic deployment when you push to the `main` branch.

#### Enable Auto-Deploy

**Vercel:**
1. Project Settings → Git
2. Ensure "Auto-deploy" is enabled
3. Select `main` branch

**Railway:**
1. GitHub tab
2. Check "Auto Deploy from main"

**Render:**
1. Settings → Auto-deploy
2. Select branch

### Preview Deployments

Vercel and Netlify automatically create preview deployments for pull requests.

**How it works:**
1. Create pull request
2. Automatic deployment created
3. Share preview URL in PR
4. Reviewers can test changes
5. Merge to main triggers production deployment

### Manual Deployments

If needed, manually deploy:

**Vercel CLI:**
```bash
npm install -g vercel
vercel --prod
```

**Railway CLI:**
```bash
npm install -g @railway/cli
railway up
```

## Monitoring and Verification

### Post-Deployment Checklist

After deploying to production:

- [ ] **Frontend Verification**
  - Visit production URL
  - Verify all pages load
  - Test quote form submission
  - Check console for errors
  - Test on mobile devices
  - Verify Google Analytics tracking

- [ ] **Backend Verification**
  - Test API endpoints: `curl https://api.selfmadelegends.com/api/status`
  - Verify database connection
  - Check server logs for errors
  - Test lead submission: `curl -X POST https://api.selfmadelegends.com/api/submit-lead ...`
  - Verify daily summaries generate

- [ ] **Security**
  - Check HTTPS is enforced
  - Verify SSL certificate is valid
  - Test CORS configuration
  - Verify no sensitive data in logs

### Monitoring Tools

#### Vercel Analytics
1. Dashboard → Analytics
2. Monitor page views, performance
3. Set up alerts for errors

#### Railway Status
1. Dashboard → Metrics
2. Monitor CPU, memory, network
3. Check deployment history

#### Error Tracking

Add Sentry for error monitoring:

```bash
npm install @sentry/node
```

```javascript
const Sentry = require("@sentry/node");
Sentry.init({ dsn: "your_sentry_dsn" });
```

### Performance Monitoring

Use tools to monitor performance:

- **Google Lighthouse**: Built into Chrome DevTools
- **WebPageTest**: [webpagetest.org](https://www.webpagetest.org)
- **New Relic**: Performance monitoring
- **Datadog**: Infrastructure and application monitoring

### Uptime Monitoring

Set up monitoring to alert if site goes down:

- **Pingdom**: Monitors uptime
- **UptimeRobot**: Free uptime monitoring
- **Freshping**: Status page + monitoring

## Troubleshooting

### Frontend Issues

**Site not loading:**
- Check Vercel/Netlify deployment status
- Clear browser cache (Ctrl+Shift+Delete)
- Check console for errors
- Verify DNS settings

**Styling looks wrong:**
- Clear cache: `Ctrl+Shift+R` (hard refresh)
- Check CSS file paths
- Verify image paths
- Check responsive viewport meta tag

**Forms not submitting:**
- Check API endpoint URL in code
- Verify CORS is configured
- Check browser console for errors
- Test API directly with curl

### Backend Issues

**API not responding:**
- Check Railway/Render deployment status
- View server logs for errors
- Verify PORT environment variable
- Restart service

**Database connection error:**
- Verify DATABASE_URL is correct
- Check database is running
- Verify credentials
- Check firewall rules

**CORS errors:**
```javascript
// Add to server.js
app.use(cors({
  origin: 'https://selfmadelegends.com',
  credentials: true
}));
```

**High memory usage:**
- Check for memory leaks
- Monitor with `node --inspect`
- Use Chrome DevTools to profile
- Consider upgrading plan

### Common Error Solutions

| Error | Solution |
|-------|----------|
| 404 Not Found | Check file paths and routing |
| 500 Server Error | Check server logs, verify dependencies |
| CORS Error | Configure CORS in Express middleware |
| SSL Certificate Error | Verify domain DNS is correct |
| Timeout | Increase timeout settings, check database |
| Out of Memory | Restart service, optimize code |

## Deployment Checklist

Before going live:

- [ ] All tests pass
- [ ] Code reviewed and approved
- [ ] No console errors or warnings
- [ ] Environment variables configured
- [ ] Database migrated (if applicable)
- [ ] Backups configured
- [ ] Monitoring set up
- [ ] Error tracking enabled
- [ ] SSL certificate valid
- [ ] DNS records configured
- [ ] Email notifications working
- [ ] Analytics tracking working
- [ ] Performance acceptable
- [ ] Security scan passed
- [ ] Team trained on new features

## Rollback Procedure

If something goes wrong after deployment:

### Vercel Rollback
1. Go to Deployments
2. Select previous working deployment
3. Click "Promote to Production"

### Railway Rollback
1. Go to Deployments
2. Select previous version
3. Click "Redeploy"

### Render Rollback
1. Go to Deploy History
2. Click "Revert" on previous working version

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Netlify Documentation](https://docs.netlify.com)
- [Railway Documentation](https://docs.railway.app)
- [Render Documentation](https://render.com/docs)
- [Node.js Best Practices](https://nodejs.org/en/docs/guides/)

## Support

For deployment issues:

1. Check platform-specific documentation
2. Review error logs in platform dashboard
3. Post issue in repository discussions
4. Contact platform support (Vercel, Railway, etc.)

---

**Happy deploying! 🚀**

Your Self-Made Legends website is now live and ready to serve customers!
