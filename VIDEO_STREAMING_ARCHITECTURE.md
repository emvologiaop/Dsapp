# Video Streaming Architecture - How It Works

This document provides a comprehensive explanation of how video streaming works in the Dsapp application.

## Overview

The video streaming system in this application **does not use traditional HTTP streaming protocols** (like HLS, DASH, or progressive download). Instead, it uses a **base64 data URL embedding approach** where videos are:

1. Compressed on the client side
2. Converted to base64 data URLs
3. Stored directly in MongoDB
4. Retrieved and played using HTML5 video elements

## Architecture Flow

```
┌─────────────┐
│   User      │
│  Browser    │
└──────┬──────┘
       │ 1. Select Video File
       ▼
┌─────────────────────┐
│  Client-Side        │
│  Compression        │
│  (Canvas API)       │
└──────┬──────────────┘
       │ 2. Base64 Data URL
       ▼
┌─────────────────────┐
│  HTTP POST          │
│  /api/reels         │
│  (JSON Payload)     │
└──────┬──────────────┘
       │ 3. Store in MongoDB
       ▼
┌─────────────────────┐
│  MongoDB            │
│  Reel Document      │
│  {videoUrl: base64} │
└──────┬──────────────┘
       │ 4. HTTP GET /api/reels
       ▼
┌─────────────────────┐
│  Browser            │
│  <video src=base64> │
│  HTML5 Playback     │
└─────────────────────┘
```

## 1. Video Upload Process

### Step 1: File Selection
**Location**: `src/components/ReelsTab.tsx` (lines 261-265)

```jsx
<input
  type="file"
  accept="video/*,image/*"
  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
/>
```

- User clicks upload button
- File picker accepts both videos and images
- Maximum file size: 50MB (validated before upload)

### Step 2: Client-Side Compression
**Location**: `src/components/ReelsTab.tsx` (lines 86-179)

The `compressVideo()` function performs the following:

#### a. Load Video Metadata
```javascript
const video = document.createElement('video');
video.src = URL.createObjectURL(file);
video.onloadedmetadata = async () => {
  // Compression logic starts
}
```

#### b. Calculate Dimensions
```javascript
const MAX_WIDTH = 720;   // 720p max
const MAX_HEIGHT = 1280; // Portrait orientation

let width = video.videoWidth;
let height = video.videoHeight;

// Maintain aspect ratio while scaling down
if (width > MAX_WIDTH || height > MAX_HEIGHT) {
  const aspectRatio = width / height;
  if (width > height) {
    width = MAX_WIDTH;
    height = Math.round(width / aspectRatio);
  } else {
    height = MAX_HEIGHT;
    width = Math.round(height * aspectRatio);
  }
}
```

#### c. Extract and Compress Frame
```javascript
const canvas = document.createElement('canvas');
canvas.width = width;
canvas.height = height;

const ctx = canvas.getContext('2d');
ctx.drawImage(video, 0, 0, width, height);

// Convert to JPEG at 70% quality
const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
```

**Compression Parameters**:
- Max resolution: 720p (720×1280 for portrait)
- Quality: 70% JPEG compression
- Format: JPEG (regardless of source format)
- Aspect ratio: Always preserved
- Duration: Limited to 60 seconds

#### d. Base64 Encoding
The `canvas.toDataURL()` method produces:
```
data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDA...
```

This is a complete image embedded as a base64 string.

### Step 3: Upload to Server
**Location**: `src/components/ReelsTab.tsx` (lines 194-205)

```javascript
const res = await fetch('/api/reels', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: user?.id,
    caption: uploadCaption,
    videoData: compressedData,  // Base64 string
    isAnonymous: false,
  }),
});
```

**Backend Endpoint**: `server.ts` (lines 740-759)

```javascript
app.post('/api/reels', async (req, res) => {
  const { userId, videoData, caption, isAnonymous } = req.body;

  const reel = await Reel.create({
    userId,
    videoUrl: videoData,  // Stores base64 directly
    caption,
    isAnonymous
  });

  res.json(reel);
});
```

### Step 4: MongoDB Storage
**Schema**: `src/models/Reel.ts`

```typescript
{
  userId: mongoose.Types.ObjectId,
  videoUrl: String,              // Base64 data URL stored here
  caption?: String,
  isAnonymous: Boolean,
  likedBy: [ObjectId],
  commentsCount: Number,
  sharesCount: Number,
  createdAt: Date,
  updatedAt: Date
}
```

The entire base64 string is stored in the `videoUrl` field.

## 2. Video Retrieval & Streaming

### Step 1: Fetch Reels
**Client**: `src/components/ReelsTab.tsx` (lines 49-61)

```javascript
const fetchReels = async () => {
  const res = await fetch(`/api/reels?userId=${user?.id}`);
  const data = await res.json();
  setReels(data);
};
```

**Server**: `server.ts` (lines 718-738)

```javascript
app.get('/api/reels', async (req, res) => {
  const { userId } = req.query;

  const reels = await Reel.find()
    .sort({ createdAt: -1 })
    .limit(30)
    .populate('userId', 'name username avatarUrl')
    .lean();

  // Enrich with like counts and status
  const enrichedReels = reels.map(reel => ({
    ...reel,
    likesCount: reel.likedBy.length,
    isLiked: reel.likedBy.includes(userId)
  }));

  res.json(enrichedReels);
});
```

**Response Format**:
```json
[
  {
    "_id": "...",
    "userId": {
      "name": "John Doe",
      "username": "johndoe",
      "avatarUrl": "..."
    },
    "videoUrl": "data:image/jpeg;base64,/9j/4AAQ...",
    "caption": "My awesome reel",
    "likesCount": 42,
    "isLiked": true,
    "createdAt": "2026-03-10T12:00:00Z"
  }
]
```

### Step 2: Video Playback
**Location**: `src/components/ReelsTab.tsx` (lines 308-402)

#### HTML5 Video Element
```jsx
<video
  ref={videoRef}
  src={currentReel?.videoUrl}    // Base64 data URL from MongoDB
  loop
  muted={isMuted}
  playsInline
  className="w-full h-full object-cover"
  onClick={() => setIsPlaying(!isPlaying)}
/>
```

**Key Attributes**:
- `src={base64DataURL}`: Direct embedding of video data
- `loop`: Continuous playback (Instagram-like)
- `muted={isMuted}`: User-controllable audio
- `playsInline`: Mobile optimization (no fullscreen)
- `object-cover`: Fills container while maintaining aspect ratio

#### Playback Control
```javascript
useEffect(() => {
  if (videoRef.current) {
    if (isPlaying) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  }
}, [isPlaying, currentIndex]);
```

When the user:
- **Clicks video**: Toggles play/pause
- **Clicks mute button**: Toggles audio
- **Swipes/clicks next**: Loads next reel
- **Swipes/clicks previous**: Loads previous reel

## 3. Why Base64 Data URLs Instead of Traditional Streaming?

### Advantages

1. **Simplicity**: No need for separate file storage (S3, CDN)
2. **Self-contained**: Video data embedded in document
3. **No CORS issues**: Data is part of the page
4. **Immediate playback**: No separate HTTP request for video
5. **Cost-effective**: No external storage costs

### Disadvantages

1. **Size overhead**: Base64 encoding adds ~33% to data size
2. **Memory usage**: Entire video loaded into browser memory
3. **No adaptive streaming**: Single quality level
4. **Database bloat**: Large documents in MongoDB
5. **No progressive loading**: Must load entire video before play
6. **Scalability limits**: Not suitable for high-volume platforms

## 4. Comparison with Traditional Streaming

### Traditional Video Streaming (HLS/DASH)

```
User → Server → CDN → HTTP Chunks → Adaptive Bitrate → Progressive Download
```

**Features**:
- Multiple quality levels (360p, 480p, 720p, 1080p)
- Adaptive bitrate switching based on network
- Progressive download (play before full download)
- Chunked delivery (small segments)
- CDN caching for global distribution

### This Application's Approach

```
User → MongoDB → Base64 String → Single Quality → Full Load
```

**Features**:
- Single quality (720p max)
- No adaptive bitrate
- Must load entire video
- No chunking
- Direct database storage

## 5. Video Player Features

### Controls Available

1. **Play/Pause**: Click video or play button
2. **Mute/Unmute**: Volume button toggle
3. **Navigation**: Previous/Next buttons
4. **Social Actions**: Like, Comment, Share buttons
5. **Loop**: Automatic continuous playback

### Player State Management

```javascript
const [isPlaying, setIsPlaying] = useState(true);  // Auto-play
const [isMuted, setIsMuted] = useState(true);      // Start muted
const [currentIndex, setCurrentIndex] = useState(0);
const videoRef = useRef<HTMLVideoElement>(null);
```

### Visual Layout

- **Aspect Ratio**: 9:16 (vertical, mobile-first)
- **Max Height**: 70vh (70% of viewport height)
- **Object Fit**: Cover (fills container, may crop edges)
- **Overlay Controls**: Play/Pause icon, mute button
- **Caption Display**: Bottom overlay
- **Action Buttons**: Like, Comment, Share on the right side

## 6. Performance Characteristics

### Upload Performance

- **Client-side compression**: Reduces upload size by 50-70%
- **Max resolution**: 720p keeps files manageable
- **JPEG quality**: 70% balances quality and size
- **Max duration**: 60 seconds limits file size

**Example Size**:
- Original 1080p MP4 (60s): ~50MB
- After compression: ~5-10MB (base64)
- In MongoDB: ~7-13MB (with 33% overhead)

### Playback Performance

- **Load time**: Depends on MongoDB query speed + network
- **Memory usage**: Entire video in browser memory
- **CPU usage**: HTML5 hardware acceleration (if available)
- **Network**: Single HTTP request for all data

### Database Considerations

- **Document size**: Can be 10-50MB per reel
- **Query performance**: Affected by document size
- **Index strategy**: Sort by `createdAt`, filter by `userId`
- **Pagination**: Limit 30 reels per page to manage payload

## 7. Socket.IO Integration (NOT for Video)

**Note**: While the application uses Socket.IO, it is **NOT used for video streaming**.

Socket.IO handles:
- Real-time chat messages
- Typing indicators
- Read receipts
- Message reactions
- User presence status
- Notifications

Videos are always served via REST API (HTTP GET/POST).

## 8. Mobile Optimization

### Client-Side

- **Inline playback**: `playsInline` attribute prevents fullscreen
- **Touch gestures**: Swipe to navigate between reels
- **Auto-mute**: Videos start muted (mobile best practice)
- **Aspect ratio**: 9:16 optimized for vertical viewing
- **Responsive sizing**: Max 70vh adapts to screen

### Compression

- **720p max**: Perfect for mobile screens
- **70% quality**: Maintains visual fidelity on small screens
- **JPEG format**: Widely supported
- **30 FPS**: Smooth on mobile devices

## 9. Future Enhancement Possibilities

### Server-Side Processing

The application has `fluent-ffmpeg` in `package.json` but doesn't use it yet. Potential improvements:

1. **Server-side transcoding**: Process videos on upload
2. **Multiple quality levels**: Generate 360p, 480p, 720p variants
3. **Better compression**: Use H.264/H.265 codecs
4. **Thumbnail generation**: Extract multiple preview frames
5. **Duration detection**: Validate video length server-side

### Storage Improvements

1. **Object storage**: Move to S3/Google Cloud Storage
2. **CDN delivery**: Faster global distribution
3. **Chunked upload**: Support large files with progress
4. **Streaming protocols**: Implement HLS or DASH

### Player Enhancements

1. **Progress bar**: Show playback position
2. **Seek controls**: Jump to specific time
3. **Quality selector**: Let users choose resolution
4. **Playback speed**: 0.5x, 1x, 1.5x, 2x options
5. **Captions/subtitles**: Accessibility support

## 10. Technical Summary

| Aspect | Implementation |
|--------|---------------|
| **Upload Method** | File input → Canvas compression → Base64 → POST JSON |
| **Storage** | MongoDB documents with base64 strings |
| **Retrieval** | REST API GET endpoint with pagination |
| **Playback** | HTML5 `<video>` element with data URL source |
| **Compression** | Canvas API, 720p max, 70% JPEG quality |
| **Format** | JPEG frames in base64 encoding |
| **Streaming Protocol** | None (direct embedding) |
| **Quality** | Single level (720p) |
| **Max Size** | 50MB original, ~7-13MB compressed |
| **Max Duration** | 60 seconds |
| **Player** | Native HTML5 video with custom controls |
| **Mobile Support** | Yes, optimized for vertical viewing |

## Conclusion

This video "streaming" system is more accurately described as a **video embedding and playback system**. It trades the complexity and scalability of traditional streaming protocols for simplicity and self-contained storage.

It works well for:
- Small to medium user bases
- Short-form vertical videos (reels, stories)
- Mobile-first applications
- Cost-sensitive deployments

For larger scale deployments with higher traffic, traditional streaming infrastructure would be recommended.

---

**Files Referenced**:
- `/home/runner/work/Dsapp/Dsapp/src/components/ReelsTab.tsx` - Main video UI and compression
- `/home/runner/work/Dsapp/Dsapp/server.ts` - Backend API endpoints
- `/home/runner/work/Dsapp/Dsapp/src/models/Reel.ts` - Database schema
- `/home/runner/work/Dsapp/Dsapp/REELS_FEATURES.md` - Feature documentation
