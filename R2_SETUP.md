# Cloudflare R2 Storage Setup Guide

This guide explains how to set up and use Cloudflare R2 storage for videos and photos in the Dsapp application.

## Features

### Video Features
- **Multiple Quality Transcoding**: Videos are automatically transcoded to 360p, 720p, and 1080p (if source resolution allows)
- **Thumbnail Generation**: Automatic thumbnail generation from video at 1-second mark
- **Chunked Streaming**: Support for efficient video streaming with progressive loading
- **Predictive Preloading**: Next 2-3 videos are preloaded in the background for smooth playback
- **Quality Selector**: Users can switch between different video qualities on-the-fly
- **Upload Progress**: Real-time progress indicator during video upload and processing

### Photo Features
- **Batch Upload**: Upload up to 10 images per post
- **Image Compression**: Automatic client-side compression before upload
- **R2 Storage**: All images stored in Cloudflare R2 with public URL access
- **Upload Progress**: Real-time progress tracking for image uploads

## Setup Instructions

### 1. Create Cloudflare R2 Bucket

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to R2 Storage
3. Click "Create bucket"
4. Choose a unique bucket name (e.g., `dsapp-media`)
5. Select your preferred location

### 2. Generate R2 API Tokens

1. In R2 dashboard, go to "Manage R2 API Tokens"
2. Click "Create API Token"
3. Set permissions:
   - Object Read: Allow
   - Object Write: Allow
4. Copy the generated credentials:
   - Access Key ID
   - Secret Access Key
   - Endpoint URL

### 3. Configure Public Access (Optional)

For public video/image access without authentication:

1. Go to your bucket settings
2. Enable "Public Access"
3. Configure CORS if needed:
```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

### 4. Set Up Custom Domain (Recommended)

1. In R2 bucket settings, click "Connect Domain"
2. Choose a subdomain (e.g., `media.yourdomain.com`)
3. Cloudflare will automatically configure SSL

### 5. Configure Environment Variables

Add the following to your `.env` file:

```bash
# Cloudflare R2 Storage Configuration
R2_ENDPOINT="https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com"
R2_ACCESS_KEY_ID="your_r2_access_key_id"
R2_SECRET_ACCESS_KEY="your_r2_secret_access_key"
R2_BUCKET_NAME="your_bucket_name"
R2_PUBLIC_URL="https://your-public-domain.com"  # or https://pub-xxx.r2.dev
```

**Important**: Replace the placeholder values with your actual credentials.

### 6. Install FFmpeg (For Video Processing)

The application uses FFmpeg for video transcoding and thumbnail generation.

#### On Ubuntu/Debian:
```bash
sudo apt update
sudo apt install ffmpeg
```

#### On macOS:
```bash
brew install ffmpeg
```

#### On Windows:
Download from [ffmpeg.org](https://ffmpeg.org/download.html) and add to PATH.

### 7. Install Dependencies

```bash
npm install
```

This will install:
- `@aws-sdk/client-s3` - S3-compatible client for R2
- `@aws-sdk/lib-storage` - Multipart upload support
- `@aws-sdk/s3-request-presigner` - URL signing
- `multer` - File upload middleware
- `fluent-ffmpeg` - FFmpeg wrapper (already installed)

### 8. Test the Setup

1. Start the server:
```bash
npm run dev
```

2. Upload a test video through the Reels tab
3. Check the R2 bucket to verify files are uploaded
4. Verify video playback with quality selector

## Architecture

### Backend Components

#### 1. R2 Storage Service (`src/services/r2Storage.ts`)
- `uploadToR2()` - Upload buffer to R2
- `deleteFromR2()` - Delete file from R2
- `getPresignedUrl()` - Generate temporary access URLs

#### 2. Video Processor (`src/services/videoProcessor.ts`)
- `processVideo()` - Full video processing pipeline
- `generateThumbnail()` - Extract thumbnail from video
- `transcodeVideo()` - Transcode to multiple qualities
- `processImage()` - Optimize and upload images

#### 3. Upload Middleware (`src/middleware/upload.ts`)
- `uploadVideo` - Single video upload (100MB limit)
- `uploadImage` - Single image upload (10MB limit)
- `uploadMultipleImages` - Multiple images upload (10 images max)

### Frontend Components

#### 1. R2 Upload Utility (`src/utils/r2Upload.ts`)
- `uploadVideoToR2()` - Client-side video upload with progress
- `uploadImageToR2()` - Single image upload
- `uploadMultipleImagesToR2()` - Batch image upload
- `compressImage()` - Client-side image compression

#### 2. Video Player (`src/components/VideoPlayer.tsx`)
- Quality selection dropdown
- Thumbnail display during loading
- Predictive preloading trigger
- Buffer progress indicator

#### 3. Predictive Preload Hook (`src/hooks/usePredictivePreload.ts`)
- `usePredictivePreload()` - Preload next videos
- `useChunkedVideoPreload()` - Chunk-based loading
- `preloadImages()` - Batch image preloading

### API Endpoints

#### Video Upload
```
POST /api/reels/upload-r2
Content-Type: multipart/form-data

Body:
- video: File
- userId: string
- caption: string
- isAnonymous: boolean

Response:
- Reel object with videoQualities, thumbnailUrl, duration
```

#### Image Upload
```
POST /api/images/upload-r2
Content-Type: multipart/form-data

Body:
- image: File

Response:
- url: string (R2 URL)
```

#### Multiple Images Upload
```
POST /api/images/upload-multiple-r2
Content-Type: multipart/form-data

Body:
- images: File[] (max 10)

Response:
- urls: string[] (R2 URLs)
```

## Video Processing Pipeline

When a video is uploaded:

1. **Upload**: Video uploaded to temporary storage
2. **Metadata Extraction**: Get duration, resolution, codec info
3. **Transcoding**:
   - 360p (500kbps) - Low quality for slow connections
   - 720p (2.5Mbps) - Medium quality (default)
   - 1080p (5Mbps) - High quality (if source allows)
4. **Thumbnail Generation**: Extract frame at 1-second mark
5. **R2 Upload**: Upload all variants to R2
6. **Database Save**: Store URLs in MongoDB
7. **Cleanup**: Remove temporary files

## Performance Optimizations

### 1. Predictive Preloading
- Next 3 videos are preloaded when current video reaches 80% playback
- Cached video elements reused for instant playback
- Old videos (2+ positions behind) are removed from cache

### 2. Chunked Streaming
- Videos use HTTP range requests for efficient streaming
- Browser automatically requests only needed portions
- Reduces initial load time and bandwidth usage

### 3. Thumbnail Display
- Lightweight thumbnails shown during video loading
- Provides instant visual feedback
- Reduces perceived loading time

### 4. Client-Side Compression
- Images compressed before upload
- Reduces upload time and bandwidth
- Maintains reasonable quality (85% JPEG)

## Backward Compatibility

The system maintains backward compatibility with existing base64-encoded videos:

- `videoUrl` field: Required field (base64 or R2 URL)
- `videoQualities`: Optional array of quality variants
- `thumbnailUrl`: Optional thumbnail URL

When `videoQualities` exists, the VideoPlayer uses it. Otherwise, it falls back to `videoUrl`.

## Cost Optimization

### Storage Costs
Cloudflare R2 pricing (as of 2024):
- Storage: $0.015 per GB/month
- Class A operations (writes): $4.50 per million
- Class B operations (reads): Free

### Recommendations
1. Enable R2 lifecycle policies to delete old reels after 30-90 days
2. Use thumbnail CDN caching to reduce read operations
3. Consider video compression before upload to reduce storage

## Troubleshooting

### Videos not uploading
1. Check FFmpeg is installed: `ffmpeg -version`
2. Verify R2 credentials in `.env`
3. Check server logs for errors
4. Ensure bucket has write permissions

### Videos not playing
1. Verify R2_PUBLIC_URL is correct
2. Check bucket has public read access
3. Verify CORS settings allow your domain
4. Check browser console for errors

### Slow transcoding
1. Reduce video quality targets
2. Increase server CPU/memory
3. Consider using cloud GPU instances
4. Pre-process videos client-side before upload

## Security Considerations

1. **API Keys**: Never expose R2 credentials in client code
2. **Upload Validation**: Server validates file types and sizes
3. **Rate Limiting**: Prevent abuse with rate limits
4. **Content Moderation**: Consider implementing content scanning
5. **Signed URLs**: Use presigned URLs for temporary access

## Future Enhancements

- [ ] HLS/DASH adaptive streaming
- [ ] WebRTC live streaming
- [ ] AI-powered thumbnail selection
- [ ] Video editing (trim, filters, effects)
- [ ] Automatic caption generation
- [ ] Face detection and blurring
- [ ] Content-aware compression
- [ ] CDN integration for global delivery

## Support

For issues or questions:
1. Check GitHub Issues: https://github.com/emvologiaop/Dsapp/issues
2. Review Cloudflare R2 docs: https://developers.cloudflare.com/r2/
3. FFmpeg documentation: https://ffmpeg.org/documentation.html
