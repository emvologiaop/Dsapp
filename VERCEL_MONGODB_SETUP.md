# MongoDB Atlas Setup for Vercel Deployment

## Issue: IP Whitelisting for Vercel Serverless Functions

When deploying to Vercel, you may encounter MongoDB connection errors like:

```
MongooseServerSelectionError: Could not connect to any servers in your MongoDB Atlas cluster.
One common reason is that you're trying to access the database from an IP that isn't whitelisted.
```

This happens because Vercel's serverless functions use dynamic IP addresses that change frequently.

## Solution: Allow All IPs in MongoDB Atlas

### Step 1: Access MongoDB Atlas Network Settings

1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Select your project
3. Click on "Network Access" in the left sidebar
4. Click "Add IP Address"

### Step 2: Whitelist All IPs

**Recommended for Vercel deployments:**

- Click "ALLOW ACCESS FROM ANYWHERE"
- Or manually enter: `0.0.0.0/0`
- Add a comment: "Vercel Serverless Functions"
- Click "Confirm"

**Important Security Note:** While `0.0.0.0/0` allows connections from any IP, your database is still protected by:
- Strong username/password authentication in your MONGODB_URI
- MongoDB Atlas encryption in transit
- Your application-level authentication

### Step 3: Verify Your Connection String

Ensure your `MONGODB_URI` environment variable in Vercel is correctly set:

```
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
```

### Step 4: Set Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add `MONGODB_URI` with your MongoDB connection string
4. Save and redeploy

## Alternative Solutions

### Option 1: Vercel IP Ranges (Not Recommended)

Vercel doesn't provide a static list of IP addresses for serverless functions. The IP addresses change frequently, making this approach impractical.

### Option 2: Use Vercel Edge Config

For high-security requirements, consider:
- Using Vercel's Edge Config for caching
- Implementing a proxy service with a static IP
- Using MongoDB Realm/Atlas App Services with custom authentication

### Option 3: Use VPC Peering (Enterprise)

For enterprise deployments:
- Set up Vercel Enterprise with static IPs
- Configure MongoDB Atlas VPC Peering
- This requires Vercel Enterprise plan

## Connection Configuration

Our application implements optimized connection handling for Vercel:

- **Connection Pooling**: Limited to 10 connections max, 1 min
- **Retry Logic**: 3 attempts with exponential backoff
- **Timeouts**: 5s server selection, 10s connection timeout
- **Error Messages**: Enhanced messages for common issues

## Testing Your Connection

After updating MongoDB Atlas settings:

1. Redeploy your Vercel application
2. Check Vercel logs: `vercel logs <your-deployment-url>`
3. Look for "MongoDB connected successfully" message
4. Test your API endpoints that require database access

## Troubleshooting

### Still Getting Connection Errors?

1. **Check MongoDB Atlas Status**: Visit [status.mongodb.com](https://status.mongodb.com/)
2. **Verify Credentials**: Ensure MONGODB_URI username/password are correct
3. **Check Database Name**: Verify the database name in your connection string exists
4. **Review Logs**: Check Vercel deployment logs for detailed error messages

### Connection Timeout Issues

If connections are timing out:
- Check if your MongoDB cluster is paused (free tier pauses after inactivity)
- Verify your cluster is in the correct region
- Ensure you're using the SRV connection string format

### Need Help?

- [MongoDB Atlas Documentation](https://www.mongodb.com/docs/atlas/)
- [Vercel Documentation](https://vercel.com/docs)
- Check application logs for specific error messages
