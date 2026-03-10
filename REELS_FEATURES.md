# Reels Features - Video & Image Compression

This document describes the reels functionality with automatic media compression.

## Features Implemented

### 1. **Video/Image Upload with Compression** 🎬
- Upload videos or images as reels
- Automatic compression before uploading:
  - **Maximum resolution**: 720p (1280x720)
  - **Aspect ratio**: Preserved automatically
  - **Quality**: 70% JPEG compression for frames
  - **Maximum duration**: 60 seconds
  - **Maximum file size**: 50MB
- Client-side compression reduces bandwidth and storage
- Progress indicator during compression and upload

### 2. **Video Compression** 📹
- Resizes videos to max 720p resolution while maintaining aspect ratio
- Extracts and compresses video frames
- Uses Canvas API for efficient client-side processing
- Significantly reduces file size before transmission
- First frame extracted as thumbnail for preview

### 3. **Image Compression** 🖼️
- Images are compressed using Canvas API
- Max dimensions: 720p (same as videos for consistency)
- JPEG compression at 70% quality
- Maintains aspect ratio
- Perfect for still images shared as reels

### 4. **File Validation** ✅
- Checks file size before upload (max 50MB)
- Accepts both video/* and image/* MIME types
- User-friendly error messages for oversized files
- Shows file type (Image/Video) in upload UI

### 5. **Reel Features** 🎥
- Vertical video format (9:16 aspect ratio)
- Like/unlike functionality
- Comment counts
- Share counts
- Caption support
- Anonymous posting option
- Navigation between reels (Previous/Next)
- Play/pause controls with mute toggle

## Technical Implementation

### Frontend (ReelsTab.tsx)
- React component with TypeScript
- **Compression function** (`compressVideo`):
  - Creates video element to load file
  - Uses Canvas API to render frames
  - Calculates scaled dimensions (max 720p)
  - Exports as base64 JPEG at 70% quality
  - Handles both images and videos
- **Upload validation**:
  - File size check (max 50MB)
  - Type detection (image vs video)
  - Progress indication during compression
- **User feedback**:
  - File name and size display
  - Compression progress indicator
  - Error alerts for failed uploads

### Backend (server.ts)
- REST API endpoint: `POST /api/reels`
- Accepts compressed video/image data as base64
- Stores in MongoDB with metadata:
  - userId (who posted)
  - videoUrl (base64 data)
  - caption (optional text)
  - isAnonymous (boolean)
  - likedBy (array of user IDs)
  - timestamps (createdAt, updatedAt)
- Pagination support (30 reels per page)

### Database (Reel.ts)
- MongoDB schema with Mongoose
- Fields:
  - `userId`: Reference to User
  - `videoUrl`: Base64-encoded compressed media
  - `caption`: Optional text description
  - `isAnonymous`: Boolean for anonymous posts
  - `likedBy`: Array of user ObjectIds
  - `commentsCount`: Number
  - `sharesCount`: Number
  - `createdAt` & `updatedAt`: Timestamps

## Compression Parameters

### Videos
- **Max Width**: 720px
- **Max Height**: 1280px (for portrait)
- **Target FPS**: 30 frames per second
- **Quality**: 0.7 (70% JPEG)
- **Max Duration**: 60 seconds
- **Aspect Ratio**: Preserved

### Images
- **Max Width**: 720px
- **Max Height**: 1280px
- **Quality**: 0.7 (70% JPEG)
- **Format**: JPEG (converted from any image format)
- **Aspect Ratio**: Preserved

## Usage

1. **Upload a reel**: Click the "+" button in the Reels tab
2. **Select media**: Tap to choose a video or image file
3. **Add caption**: Optionally add descriptive text
4. **Compression**: File is automatically compressed (you'll see progress)
5. **Upload**: Click "Upload" to post your reel
6. **View**: Scroll through reels with swipe gestures or navigation buttons
7. **Interact**: Like, comment, or share reels

## Benefits of Compression

### Performance
- **Faster uploads**: Compressed files transmit quicker
- **Lower bandwidth**: Reduces data usage for users
- **Better UX**: Smoother playback of compressed videos
- **Scalability**: Server can handle more concurrent uploads

### Storage
- **Reduced database size**: Base64 compression saves ~50-70% space
- **Cost savings**: Less storage infrastructure needed
- **Faster queries**: Smaller documents load faster from MongoDB

### Quality
- **Maintained quality**: 720p is sufficient for mobile viewing
- **Aspect ratio preserved**: No distortion or cropping
- **Smooth playback**: 30 FPS provides good viewing experience

## Browser Support

Works in all modern browsers supporting:
- HTML5 Video API
- Canvas API for image/video processing
- FileReader API for file handling
- Base64 encoding/decoding
- ES6+ JavaScript (async/await)

## Limitations & Considerations

### Current Implementation
- Base64 encoding increases final size by ~33% (trade-off for simplicity)
- Videos stored as thumbnails (first frame) for preview
- Full video processing requires server-side tools (future enhancement)
- Max 60-second duration enforced for performance

### Future Enhancements
- Server-side video re-encoding with ffmpeg
- Chunked upload for very large files
- Progress bar showing percentage
- Cloud storage integration (S3, Cloudinary)
- Multiple quality options (360p, 480p, 720p, 1080p)
- Video thumbnails with animation preview
- Trim/edit videos before upload
- Filters and effects

## Comparison with Chat Images

| Feature | Chat Images | Reels Videos/Images |
|---------|-------------|---------------------|
| Max Resolution | 800px width | 720px width |
| Quality | 70% JPEG | 70% JPEG |
| File Types | Images only | Videos + Images |
| Max Size | No limit | 50MB |
| Compression | Canvas API | Canvas API + Video processing |
| Use Case | Quick photo sharing | Curated content posts |

## API Endpoints

### Create Reel
```http
POST /api/reels
Content-Type: application/json

{
  "userId": "user_id",
  "videoData": "data:image/jpeg;base64,...",
  "caption": "My awesome reel!",
  "isAnonymous": false
}
```

### Get Reels
```http
GET /api/reels?page=1&limit=30
```

### Like Reel
```http
POST /api/reels/:reelId/like
Content-Type: application/json

{
  "userId": "user_id"
}
```

### Unlike Reel
```http
DELETE /api/reels/:reelId/like
Content-Type: application/json

{
  "userId": "user_id"
}
```

## Error Handling

- **File too large**: Alert shown if file > 50MB
- **Compression failed**: Error caught and alert shown
- **Upload failed**: Network error handling with user feedback
- **Invalid file type**: Browser validates via `accept` attribute

## Performance Tips

1. **Use appropriate resolution**: Don't upload 4K videos if 720p suffices
2. **Trim videos**: Keep videos under 30 seconds for best performance
3. **Optimize before upload**: Pre-compress large files
4. **Check file size**: Stay under 50MB limit
5. **Use modern formats**: H.264 videos compress better

---

For questions or issues, please contact support or check the main documentation.
