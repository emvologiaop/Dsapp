# Vercel Deployment Guide for DSapp Social Media Platform

This guide will help you deploy the DSapp social media application to Vercel for production use.

## Prerequisites

- A Vercel account (sign up at https://vercel.com)
- Git repository with your code pushed to GitHub/GitLab/Bitbucket
- MongoDB Atlas account (or any MongoDB hosting service)
- Cloudflare R2 account for media storage
- Telegram Bot Token (if using Telegram features)

## Quick Deployment Steps

### 1. Prepare Your Repository

Ensure all changes are committed and pushed to your remote repository:

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### 2. Install Vercel CLI (Optional)

```bash
npm install -g vercel
```

### 3. Deploy to Vercel

#### Option A: Using Vercel Dashboard (Recommended)

1. Go to https://vercel.com/new
2. Import your Git repository
3. Configure the project:
   - **Framework Preset**: Other
   - **Build Command**: `npm run vercel-build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. Add Environment Variables (see section below)
5. Click "Deploy"

#### Option B: Using Vercel CLI

```bash
# Login to Vercel
vercel login

# Deploy (from project root)
vercel

# For production deployment
vercel --prod
```

## Environment Variables Configuration

Add these environment variables in your Vercel project settings (Settings → Environment Variables):

### Required Variables

```env
# MongoDB Connection
MONGODB_URI=mongodb+srv://your-username:your-password@cluster.mongodb.net/dsapp?retryWrites=true&w=majority

# Application URL (will be provided by Vercel)
APP_URL=https://your-app-name.vercel.app

# Cloudflare R2 Storage
R2_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_URL=https://your-public-domain.com

# Telegram Bot (Optional but recommended)
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Google AI (Optional for AI features)
GEMINI_API_KEY=your_gemini_api_key

# Google Drive (Optional)
GOOGLE_DRIVE_CLIENT_ID=your_client_id
GOOGLE_DRIVE_CLIENT_SECRET=your_client_secret
GOOGLE_DRIVE_REDIRECT_URI=your_redirect_uri

# Node Environment
NODE_ENV=production
```

### How to Get Environment Variables

#### MongoDB URI
1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Click "Connect" → "Connect your application"
4. Copy the connection string and replace `<password>` with your database password

#### Cloudflare R2
1. Go to https://dash.cloudflare.com/
2. Navigate to R2 Object Storage
3. Create a new bucket
4. Go to "Manage R2 API Tokens"
5. Create API token with read/write permissions
6. Save the Access Key ID and Secret Access Key
7. Get your account ID from the dashboard URL
8. Set R2_ENDPOINT as: `https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com`
9. For public access, configure a custom domain in R2 settings

#### Telegram Bot Token
1. Open Telegram and search for @BotFather
2. Send `/newbot` command
3. Follow the instructions to create your bot
4. Copy the bot token provided

#### Gemini API Key
1. Go to https://makersuite.google.com/app/apikey
2. Create a new API key
3. Copy the key

## Post-Deployment Configuration

### 1. Create Admin User

After deployment, you need to create an admin user:

```bash
# SSH into your Vercel deployment or run locally with production MongoDB
node seed-admin.js admin@example.com your-secure-password
```

Alternatively, connect to your MongoDB database directly and run:

```javascript
db.users.updateOne(
  { email: "your@email.com" },
  { $set: { role: "admin" } }
)
```

### 2. Configure CORS

The application is pre-configured with CORS settings. The `APP_URL` environment variable will be used for allowed origins.

### 3. Test Your Deployment

1. Visit your Vercel URL
2. Create a test account
3. Test creating posts and reels
4. Test the search functionality
5. Login with admin account and access admin dashboard

## Vercel Project Settings

### Build & Development Settings

- **Framework Preset**: Other
- **Build Command**: `npm run vercel-build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`
- **Development Command**: `npm run dev`

### Function Configuration

The serverless function is configured in `vercel.json`:

```json
{
  "functions": {
    "server.ts": {
      "memory": 1024,
      "maxDuration": 30
    }
  }
}
```

You can adjust these based on your needs:
- **memory**: 1024MB (can go up to 3008MB on Pro plan)
- **maxDuration**: 30 seconds (10s on Hobby, 60s on Pro, 300s on Enterprise)

## Monitoring and Logs

### View Logs

1. Go to your Vercel project dashboard
2. Click on "Deployments"
3. Select your deployment
4. Click "View Function Logs" or "Runtime Logs"

### Performance Monitoring

Vercel provides built-in analytics:
- Go to your project
- Click "Analytics" tab
- Monitor response times, error rates, and traffic

## Troubleshooting

### Common Issues

#### 1. Build Fails

**Error**: TypeScript compilation errors

**Solution**:
```bash
# Run lint locally to check for errors
npm run lint

# Fix any TypeScript errors before deploying
```

#### 2. API Routes Not Working

**Error**: 404 on API routes

**Solution**:
- Check `vercel.json` routes configuration
- Ensure `server.ts` is in the root directory
- Verify environment variables are set

#### 3. MongoDB Connection Failed

**Error**: Unable to connect to MongoDB

**Solution**:
- Verify `MONGODB_URI` is correctly set in environment variables
- Check MongoDB Atlas IP whitelist (add `0.0.0.0/0` for Vercel)
- Test connection string locally first

#### 4. File Upload Fails

**Error**: Media uploads not working

**Solution**:
- Verify all R2 environment variables are set correctly
- Check R2 bucket CORS configuration
- Ensure API tokens have correct permissions

#### 5. Functions Timeout

**Error**: Functions exceed execution time

**Solution**:
- Optimize database queries
- Consider upgrading Vercel plan for longer function duration
- Implement pagination for large datasets

### Debug Mode

To enable debug mode, add this environment variable:

```env
DEBUG=*
```

## Optimization Tips

### 1. Database Indexing

Ensure your MongoDB collections have proper indexes:

```javascript
// In MongoDB shell or Compass
db.users.createIndex({ email: 1 });
db.users.createIndex({ username: 1 });
db.posts.createIndex({ createdAt: -1 });
db.posts.createIndex({ userId: 1 });
db.reels.createIndex({ createdAt: -1 });
db.reels.createIndex({ userId: 1 });
```

### 2. Media Optimization

- Enable Cloudflare R2 automatic image optimization
- Use appropriate video compression settings
- Consider implementing CDN for static assets

### 3. Caching Strategy

The app uses rate limiting. Consider adding:
- Redis for session management (optional)
- Query result caching for frequently accessed data

## Security Checklist

Before going to production:

- [ ] Change all default passwords
- [ ] Enable MongoDB authentication
- [ ] Restrict MongoDB network access
- [ ] Use strong admin password
- [ ] Enable HTTPS (automatic with Vercel)
- [ ] Review CORS settings
- [ ] Enable rate limiting (already configured)
- [ ] Regular security audits
- [ ] Keep dependencies updated
- [ ] Monitor logs for suspicious activity

## Scaling Considerations

### Vercel Plans

- **Hobby (Free)**
  - 100 GB bandwidth
  - Serverless function execution
  - Automatic HTTPS
  - Good for testing and small projects

- **Pro ($20/month)**
  - 1 TB bandwidth
  - Higher function limits
  - Password protection
  - Better for production

- **Enterprise**
  - Custom bandwidth
  - SLA guarantees
  - Dedicated support
  - Required for high-traffic apps

### Database Scaling

As your app grows:
1. Upgrade MongoDB Atlas tier
2. Implement read replicas
3. Add database indexes
4. Consider sharding for very large datasets

## Continuous Deployment

Vercel automatically deploys when you push to your repository:

1. Push to `main` branch → Production deployment
2. Push to other branches → Preview deployment
3. Pull requests → Automatic preview URLs

### Deployment Protection

To protect production:

1. Go to project settings
2. Enable "Password Protection" (Pro plan)
3. Set up deployment approval workflows
4. Use preview deployments for testing

## Support and Resources

### Documentation

- [Vercel Docs](https://vercel.com/docs)
- [MongoDB Atlas Docs](https://docs.atlas.mongodb.com/)
- [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/)

### Getting Help

- GitHub Issues: Report bugs in your repository
- Vercel Support: support@vercel.com (Pro/Enterprise)
- Community: Vercel Discord, Stack Overflow

## Maintenance

### Regular Tasks

- **Weekly**: Check error logs, monitor performance
- **Monthly**: Review security updates, update dependencies
- **Quarterly**: Database optimization, clean up old data
- **Annually**: Security audit, backup verification

### Backup Strategy

1. MongoDB Atlas provides automatic backups
2. Export user data periodically
3. Store R2 bucket backups externally
4. Document restoration procedures

## Cost Estimation

### Free Tier (Hobby Plan)

- Vercel: Free
- MongoDB Atlas: Free (512MB)
- Cloudflare R2: 10GB free storage
- **Estimated monthly cost**: $0

### Small Production (100-1000 users)

- Vercel Pro: $20/month
- MongoDB Atlas M10: $57/month
- Cloudflare R2: ~$5-10/month
- **Estimated monthly cost**: $82-87

### Medium Production (1000-10000 users)

- Vercel Pro: $20/month
- MongoDB Atlas M20: $118/month
- Cloudflare R2: ~$20-30/month
- **Estimated monthly cost**: $158-168

## Conclusion

Your DSapp social media platform is now ready for production deployment on Vercel! Follow this guide carefully, and don't hesitate to refer back to it during troubleshooting.

For updates and improvements, always test in a preview deployment before pushing to production.

**Good luck with your deployment! 🚀**
