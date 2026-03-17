# Advanced Compression & Instagram-like Recommendations

This document explains the advanced video compression optimizations and Instagram-like recommendation algorithm implemented for Cloudflare R2 free tier.

## Table of Contents
1. [Advanced Compression](#advanced-compression)
2. [Instagram-like Recommendations](#instagram-like-recommendations)
3. [View Tracking](#view-tracking)
4. [Performance & Cost Savings](#performance--cost-savings)
5. [Configuration](#configuration)

---

## Advanced Compression

### Overview
The video compression system has been optimized for Cloudflare R2's free tier (10GB storage) with aggressive compression techniques while maintaining acceptable quality.

### Key Optimizations

#### 1. Two-Pass Encoding
**Before:** Single-pass encoding with `-preset fast`
**After:** Two-pass encoding with `-preset slow`

Two-pass encoding analyzes the entire video first, then encodes with optimal settings:
- **Pass 1:** Analyze video content and create statistics
- **Pass 2:** Encode using analysis data for better quality/size ratio
- **Result:** 15-30% better compression at same quality

```typescript
// Pass 1: Analysis
ffmpeg(videoPath)
  .outputOptions(['-pass 1', '-an', '-f mp4'])
  .output('/dev/null')

// Pass 2: Encoding
ffmpeg(videoPath)
  .outputOptions(['-pass 2'])
  .output(outputPath)
```

#### 2. Reduced Quality Tiers
**Before:**
- 360p @ 500kbps
- 720p @ 2500kbps
- 1080p @ 5000kbps (if source allows)

**After:**
- 360p @ 400kbps (20% reduction)
- 540p @ 800kbps (68% reduction vs 720p)

**Rationale:**
- 540p is the sweet spot for mobile viewing (most users)
- 1080p removed entirely - overkill for short videos
- Lower bitrates with two-pass still look good

#### 3. Audio Optimization
**Before:** 128kbps AAC
**After:** 64kbps AAC

Most short videos don't need high-fidelity audio. 64kbps AAC is sufficient for speech and music.

#### 4. Thumbnail Compression
**Before:** 720x1280 JPEG (default quality)
**After:** 360x640 JPEG with `-q:v 5` (aggressive compression)

Thumbnails are:
- 75% smaller resolution
- Higher compression ratio
- Still acceptable for preview purposes

#### 5. No Original Storage
**Before:** Original video uploaded to R2 + transcoded versions
**After:** Only transcoded versions uploaded

The `originalUrl` field now points to the best transcoded quality instead of a separate original file.

#### 6. Duration Limit
**New:** 60-second maximum enforced server-side

```typescript
if (metadata.duration > 60) {
  throw new Error('Video duration exceeds 60 seconds');
}
```

Prevents storage abuse and keeps content snappy like Instagram Reels/TikTok.

### Technical Details

#### FFmpeg Parameters
```typescript
.outputOptions([
  '-preset slow',          // Better compression (slower encode)
  '-crf 28',              // Constant Rate Factor (higher = more compression)
  '-profile:v main',      // H.264 Main profile
  '-level 3.1',           // Compatibility level
  '-pix_fmt yuv420p',     // Compatible pixel format
  '-g 48',                // GOP size (keyframe every 48 frames)
  '-sc_threshold 0',      // Disable scene change detection
  '-b_strategy 2',        // B-frame strategy
  '-movflags +faststart', // Enable streaming
])
```

#### CRF Values
- **360p:** CRF 28 (more aggressive compression)
- **540p:** CRF 26 (balanced)

CRF range: 0 (lossless) to 51 (worst quality). Sweet spot is 18-28.

### Compression Results

Example: 30-second video, 1080p source

| Metric | Before | After | Savings |
|--------|--------|-------|---------|
| Original | 10MB | 0MB | 100% |
| 360p | 2MB | 1.5MB | 25% |
| 720p | 8MB | - | 100% |
| 540p | - | 3MB | 62% vs 720p |
| Thumbnail | 500KB | 150KB | 70% |
| **Total** | **20.5MB** | **4.65MB** | **77%** |

For 1000 videos:
- Before: ~20.5GB
- After: ~4.65GB
- **Fits easily in R2 free tier (10GB)**

---

## Instagram-like Recommendations

### Overview
The recommendation system uses collaborative filtering and content-based signals to create personalized feeds, similar to Instagram's Explore algorithm.

### Algorithm Components

#### 1. Personalized Recommendations (`getPersonalizedReels`)

**Input Signals:**
- User's liked reels
- User's viewed reels
- Following list
- Watch duration/completion rates
- Creator interaction history

**Scoring Factors:**

```typescript
recommendationScore =
  // Base engagement
  (likesCount × 3) +
  (commentsCount × 5) +
  (sharesCount × 10) +
  (viewsCount × 0.1) +

  // Multipliers
  (timeFactor × 100) +           // Recency boost
  (isFromFollowing × 500) +      // Highest priority
  (isFromTopCreator × 200) +     // Favorite creators
  (isCollaborative × 150) +      // Similar users
  (engagementRate × 50)          // Quality content
```

**Time Decay:**
```typescript
timeFactor = exp(-ageInHours / 48)
```
Content loses relevance after 48 hours (2 days).

#### 2. Collaborative Filtering

Finds users with similar taste:
1. Get reels the current user liked
2. Find other users who liked the same reels
3. Rank by number of common likes
4. Recommend reels liked by similar users

```typescript
// Find users who liked same content
similarUsers = await Reel.aggregate([
  { $match: { _id: { $in: userLikedReels } } },
  { $unwind: '$likedBy' },
  { $match: { likedBy: { $ne: currentUser } } },
  { $group: { _id: '$likedBy', commonLikes: { $sum: 1 } } },
  { $sort: { commonLikes: -1 } }
]);
```

#### 3. Content-Based Filtering

Tracks user's favorite creators:
- Creators user follows: +500 score
- Creators user frequently interacts with: +200 score
- Collaborative recommendations: +150 score

#### 4. Engagement Rate

```typescript
engagementRate = (likes × 3 + comments × 5 + shares × 10) / (views + 1)
```

High engagement rate = quality content that resonates.

#### 5. Trending Algorithm (`getTrendingReels`)

For new users or when personalization fails:
- Only considers content from last 24 hours
- Scores based on velocity (recent engagement)
- Weights: shares > comments > likes > views

```typescript
trendingScore =
  (likes × 5) +
  (comments × 10) +
  (shares × 20) +
  (views × 1)
```

### Feed Endpoint

**GET /api/reels**

Query parameters:
- `userId`: User ID for personalization
- `page`: Page number (0-indexed)
- `trending`: Force trending mode (`true`/`false`)

**Logic:**
1. If `trending=true` or no `userId`: Show trending content
2. Otherwise: Try personalized recommendations
3. Fallback to trending if personalization fails/empty

**Example:**
```javascript
// Personalized feed
GET /api/reels?userId=123&page=0

// Trending feed
GET /api/reels?trending=true

// New user (no userId)
GET /api/reels
```

### Database Indexes

For optimal performance:
```typescript
// VideoView indexes
{ reelId: 1, userId: 1 }  // Compound index
{ userId: 1, createdAt: -1 }
{ reelId: 1, createdAt: -1 }

// Reel indexes (existing)
{ createdAt: -1 }
{ userId: 1 }
{ likedBy: 1 }
```

---

## View Tracking

### Overview
Tracks video viewing behavior to improve recommendations and measure engagement.

### VideoView Model

```typescript
{
  reelId: ObjectId,          // Video being watched
  userId: ObjectId,          // Viewer
  watchDuration: number,     // Seconds watched
  totalDuration: number,     // Video length
  watchPercentage: number,   // % watched (0-100)
  completed: boolean,        // >= 80% watched
  createdAt: Date
}
```

### Recording Views

**Endpoint:** `POST /api/reels/:reelId/view`

**Trigger:** Frontend sends when user watches >= 50% of video

**Request:**
```json
{
  "userId": "user123",
  "watchDuration": 15.5,
  "totalDuration": 30.0
}
```

**Response:**
```json
{
  "success": true,
  "completed": false
}
```

**Logic:**
- If view exists: Update if new watch duration is longer
- Otherwise: Create new view record
- `completed = watchPercentage >= 80%`

### Frontend Integration

**VideoPlayer Component:**
```typescript
// Track watch time
const handleTimeUpdate = () => {
  // Record view at 50% watched
  if (watchPercentage >= 50 && !viewRecorded) {
    recordView(currentTime);
    viewRecorded = true;
  }
};

// Send to API
const recordView = async (watchDuration) => {
  await fetch(`/api/reels/${reelId}/view`, {
    method: 'POST',
    body: JSON.stringify({
      userId,
      watchDuration,
      totalDuration: duration,
    }),
  });
};
```

### Analytics Use Cases

1. **Recommendations:** Completed videos indicate quality
2. **Creator insights:** Track which videos perform best
3. **Engagement metrics:** Average watch percentage
4. **A/B testing:** Test different video lengths/styles

---

## Performance & Cost Savings

### Storage Costs

**Cloudflare R2 Pricing (Free Tier):**
- Storage: 10GB free
- Class A operations: 1 million/month free (writes)
- Class B operations: Unlimited free (reads)
- Egress: Free (unlimited)

### Estimated Usage

**1000 videos (30s average):**
- Videos: 4.65GB
- Remaining: 5.35GB for future uploads
- **Result:** Fits comfortably in free tier

**At 2000 videos:** Still within 10GB limit

### Database Queries

**Before:** Simple chronological query
```typescript
Reel.find().sort({ createdAt: -1 }).limit(30)
// Fast but not personalized
```

**After:** Complex aggregation with recommendations
```typescript
Reel.aggregate([
  // Multiple $lookup, $match, $addFields
  // Calculates scores, filters, sorts
])
// Slower but highly personalized
```

**Optimization:**
- Indexes on critical fields
- Limit to 30 results per page
- Cache results (future enhancement)
- Background job for precomputing scores (future)

### Network Performance

**Compression benefits:**
- Smaller files = faster downloads
- Better mobile experience
- Lower bandwidth costs for users
- More videos fit in browser cache

**Streaming:**
- 540p loads quickly on 3G/4G
- 360p fallback for slow connections
- Progressive download (not full file)

---

## Configuration

### Environment Variables

Add to `.env`:

```bash
# Cloudflare R2 (existing)
R2_ENDPOINT="https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com"
R2_ACCESS_KEY_ID="your_access_key"
R2_SECRET_ACCESS_KEY="your_secret_key"
R2_BUCKET_NAME="your_bucket"
R2_PUBLIC_URL="https://your-domain.com"

# No additional variables needed for recommendations
```

### Video Processing Settings

To adjust compression (in `src/services/videoProcessor.ts`):

```typescript
// Quality tiers
const targetQualities = [
  { name: '360p', width: 360, height: 640, bitrate: '400k', crf: 28 },
  { name: '540p', width: 540, height: 960, bitrate: '800k', crf: 26 },
];

// Duration limit
if (metadata.duration > 60) {
  throw new Error('Video too long');
}

// Thumbnail size
.screenshots({ size: '360x640' })
.outputOptions(['-q:v 5'])
```

### Recommendation Tuning

To adjust scoring weights (in `src/services/recommendationService.ts`):

```typescript
// Engagement weights
(likesCount × 3) +      // Adjust multiplier
(commentsCount × 5) +
(sharesCount × 10) +

// Time decay window
const timeFactor = Math.exp(-ageInHours / 48); // 48 = hours

// Boost factors
{ $multiply: ['$isFromFollowing', 500] },    // Following boost
{ $multiply: ['$isFromTopCreator', 200] },   // Creator boost
{ $multiply: ['$isCollaborative', 150] },    // Similar users
```

### View Tracking Settings

Adjust when views are recorded (in `src/components/VideoPlayer.tsx`):

```typescript
// Record at 50% watched (changeable)
if (watchPercentage >= 50) {
  recordView(currentTime);
}

// Completion threshold
const completed = watchPercentage >= 80; // 80% = completed
```

---

## Testing

### Compression Quality Check

```bash
# Upload a test video
curl -X POST http://localhost:3000/api/reels/upload-r2 \
  -F "video=@test.mp4" \
  -F "userId=USER_ID" \
  -F "caption=Test"

# Check file sizes in R2 bucket
# Compare quality visually
```

### Recommendation Testing

```bash
# Test personalized feed
curl "http://localhost:3000/api/reels?userId=USER_ID"

# Test trending feed
curl "http://localhost:3000/api/reels?trending=true"

# Test pagination
curl "http://localhost:3000/api/reels?userId=USER_ID&page=1"
```

### View Tracking Test

```javascript
// Frontend: Watch a video for > 50%
// Check database
db.videoviews.find({ reelId: "REEL_ID" })

// Should see view record with watchPercentage
```

---

## Troubleshooting

### Compression Issues

**Problem:** FFmpeg errors during two-pass encoding
**Solution:** Check FFmpeg version (need 4.x+)
```bash
ffmpeg -version
```

**Problem:** Videos take too long to process
**Solution:** Adjust preset to `medium` or `fast`
```typescript
.outputOptions(['-preset medium'])
```

**Problem:** Quality too low
**Solution:** Lower CRF values (23-25 range)
```typescript
{ name: '540p', crf: 24 } // Lower = better quality
```

### Recommendation Issues

**Problem:** Empty personalized feed
**Solution:** System falls back to trending automatically

**Problem:** Trending shows old content
**Solution:** Check time window (default 24 hours)
```typescript
const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
```

**Problem:** Slow aggregation queries
**Solution:**
1. Add database indexes (see above)
2. Reduce lookup depth
3. Cache results (future enhancement)

### View Tracking Issues

**Problem:** Views not recording
**Solution:** Check browser console for errors
```javascript
// Should see in network tab
POST /api/reels/:id/view
```

**Problem:** Duplicate views
**Solution:** Check `viewRecordedRef` flag is working
```typescript
if (!viewRecordedRef.current) {
  recordView();
  viewRecordedRef.current = true;
}
```

---

## Future Enhancements

### Compression
- [ ] H.265/HEVC codec (50% better compression)
- [ ] WebM with VP9 (better for web)
- [ ] Adaptive bitrate streaming (HLS/DASH)
- [ ] Client-side quality selection based on bandwidth

### Recommendations
- [ ] Machine learning models
- [ ] Topic/category classification
- [ ] Similar video discovery
- [ ] Diversity injection (avoid filter bubbles)
- [ ] Real-time trending detection
- [ ] A/B testing framework

### Analytics
- [ ] Creator dashboards
- [ ] Engagement heatmaps
- [ ] Audience demographics
- [ ] Content performance metrics
- [ ] Retention analysis

### Performance
- [ ] Redis caching for recommendations
- [ ] Background jobs for score computation
- [ ] CDN integration
- [ ] Edge computing for personalization

---

## Summary

### Compression Improvements
✅ 77% storage reduction
✅ Maintains acceptable quality
✅ Fits in R2 free tier (10GB)
✅ Two-pass encoding
✅ Optimized for mobile viewing

### Recommendations
✅ Instagram-like personalization
✅ Collaborative filtering
✅ Content-based filtering
✅ Time-decay for freshness
✅ Trending fallback

### View Tracking
✅ Watch duration recording
✅ Completion tracking
✅ Foundation for analytics
✅ Improves recommendations

**Result:** Professional-grade video platform optimized for the free tier!
