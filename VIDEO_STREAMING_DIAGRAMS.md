# Video Streaming Flow Diagrams

This document provides visual representations of the video streaming flow in the application.

## 1. Complete Upload to Playback Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          VIDEO UPLOAD FLOW                                │
└──────────────────────────────────────────────────────────────────────────┘

    ┌─────────┐
    │  User   │
    │ Browser │
    └────┬────┘
         │
         │ 1. Click Upload Button
         │
         ▼
    ┌─────────────────────┐
    │  File Input Dialog  │
    │  Accept: video/*,   │
    │          image/*    │
    └────┬────────────────┘
         │
         │ 2. Select Video File (max 50MB)
         │
         ▼
    ┌─────────────────────┐
    │  File Validation    │
    │  - Check size       │
    │  - Check type       │
    └────┬────────────────┘
         │
         │ 3. Pass to Compression
         │
         ▼
    ┌─────────────────────────────────────────┐
    │         CLIENT-SIDE COMPRESSION          │
    │                                          │
    │  ┌──────────────────────────────────┐  │
    │  │ 1. Create Video Element          │  │
    │  │    video.src = URL.createObject  │  │
    │  └──────────────┬───────────────────┘  │
    │                 │                       │
    │  ┌──────────────▼───────────────────┐  │
    │  │ 2. Load Metadata                 │  │
    │  │    width, height, duration       │  │
    │  └──────────────┬───────────────────┘  │
    │                 │                       │
    │  ┌──────────────▼───────────────────┐  │
    │  │ 3. Calculate Scaled Dimensions   │  │
    │  │    MAX: 720p (720×1280)          │  │
    │  │    Maintain aspect ratio         │  │
    │  └──────────────┬───────────────────┘  │
    │                 │                       │
    │  ┌──────────────▼───────────────────┐  │
    │  │ 4. Create Canvas                 │  │
    │  │    canvas.width = scaledWidth    │  │
    │  │    canvas.height = scaledHeight  │  │
    │  └──────────────┬───────────────────┘  │
    │                 │                       │
    │  ┌──────────────▼───────────────────┐  │
    │  │ 5. Draw Video Frame to Canvas    │  │
    │  │    ctx.drawImage(video, ...)     │  │
    │  └──────────────┬───────────────────┘  │
    │                 │                       │
    │  ┌──────────────▼───────────────────┐  │
    │  │ 6. Convert to JPEG Base64        │  │
    │  │    canvas.toDataURL('image/jpeg',│  │
    │  │                      0.7)         │  │
    │  └──────────────┬───────────────────┘  │
    │                 │                       │
    │                 │ Result: "data:image/ │
    │                 │  jpeg;base64,/9j..." │
    └─────────────────┼───────────────────────┘
                      │
                      │ 4. POST Request
                      │
                      ▼
    ┌──────────────────────────────────────┐
    │       BACKEND API (Express)          │
    │                                      │
    │  POST /api/reels                     │
    │  {                                   │
    │    userId: "...",                    │
    │    videoData: "data:image/...",      │
    │    caption: "My reel",               │
    │    isAnonymous: false                │
    │  }                                   │
    └──────────────┬───────────────────────┘
                   │
                   │ 5. Save to Database
                   │
                   ▼
    ┌──────────────────────────────────────┐
    │         MongoDB Storage              │
    │                                      │
    │  Reel Document:                      │
    │  {                                   │
    │    _id: ObjectId("..."),             │
    │    userId: ObjectId("..."),          │
    │    videoUrl: "data:image/jpeg;...",  │
    │    caption: "My reel",               │
    │    isAnonymous: false,               │
    │    likedBy: [],                      │
    │    commentsCount: 0,                 │
    │    sharesCount: 0,                   │
    │    createdAt: ISODate("..."),        │
    │    updatedAt: ISODate("...")         │
    │  }                                   │
    └──────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────┐
│                        VIDEO PLAYBACK FLOW                                │
└──────────────────────────────────────────────────────────────────────────┘

    ┌─────────┐
    │  User   │
    │ Browser │
    └────┬────┘
         │
         │ 1. Navigate to Reels Tab
         │
         ▼
    ┌─────────────────────┐
    │  React Component    │
    │  fetchReels()       │
    └────┬────────────────┘
         │
         │ 2. GET Request
         │
         ▼
    ┌──────────────────────────────────────┐
    │       BACKEND API (Express)          │
    │                                      │
    │  GET /api/reels?userId=...           │
    │                                      │
    │  1. Query: Reel.find()               │
    │     .sort({createdAt: -1})           │
    │     .limit(30)                       │
    │     .populate('userId')              │
    │                                      │
    │  2. Enrich with:                     │
    │     - likesCount                     │
    │     - isLiked status                 │
    │                                      │
    └──────────────┬───────────────────────┘
                   │
                   │ 3. Return JSON Array
                   │
                   ▼
    ┌──────────────────────────────────────┐
    │  Response: Array of Reels            │
    │  [                                   │
    │    {                                 │
    │      _id: "...",                     │
    │      userId: {                       │
    │        name: "John Doe",             │
    │        username: "johndoe"           │
    │      },                              │
    │      videoUrl: "data:image/jpeg;...",│
    │      caption: "Amazing!",            │
    │      likesCount: 42,                 │
    │      isLiked: true                   │
    │    },                                │
    │    ...                               │
    │  ]                                   │
    └──────────────┬───────────────────────┘
                   │
                   │ 4. Store in State
                   │
                   ▼
    ┌──────────────────────────────────────┐
    │     React State Management           │
    │                                      │
    │  const [reels, setReels] = useState()│
    │  const [currentIndex, setIndex] = ...│
    │  const currentReel = reels[index]    │
    │                                      │
    └──────────────┬───────────────────────┘
                   │
                   │ 5. Render Video Element
                   │
                   ▼
    ┌──────────────────────────────────────┐
    │       HTML5 Video Element            │
    │                                      │
    │  <video                              │
    │    src={currentReel.videoUrl}        │
    │    loop                              │
    │    muted={isMuted}                   │
    │    playsInline                       │
    │  />                                  │
    │                                      │
    │  ┌──────────────────────────────┐   │
    │  │ Browser decodes base64       │   │
    │  │ data URL and plays video     │   │
    │  └──────────────────────────────┘   │
    └──────────────────────────────────────┘
```

## 2. Data Size Transformation

```
┌─────────────────────────────────────────────────────────────┐
│              VIDEO SIZE TRANSFORMATION                       │
└─────────────────────────────────────────────────────────────┘

Original Video File
├── Resolution: 1920×1080 (1080p)
├── Duration: 60 seconds
├── Codec: H.264
├── Format: MP4
└── Size: ~50 MB
        │
        │ CLIENT-SIDE COMPRESSION
        ▼
Compressed Frame
├── Resolution: 720×405 (scaled from 1080p)
├── Duration: Single frame (or 30 FPS extraction)
├── Format: JPEG
├── Quality: 70%
└── Size: ~3-5 MB (as image)
        │
        │ BASE64 ENCODING
        ▼
Base64 String
├── Format: data:image/jpeg;base64,/9j/4AAQSkZ...
├── Overhead: +33% from base64 encoding
└── Size: ~4-7 MB (as text string)
        │
        │ STORE IN MONGODB
        ▼
MongoDB Document
├── Collection: reels
├── Document size: ~5-8 MB (with metadata)
└── Field: videoUrl (string)
        │
        │ RETRIEVE VIA API
        ▼
JSON Response
├── HTTP GET /api/reels
├── Content-Type: application/json
└── Size: ~5-8 MB per reel
        │
        │ RENDER IN BROWSER
        ▼
Browser Memory
├── Decoded from base64
├── Loaded into <video> element
└── Memory: ~5-10 MB (decoded)

TOTAL SIZE REDUCTION: ~50 MB → ~7 MB (86% reduction)
```

## 3. Compression Parameter Details

```
┌──────────────────────────────────────────────────────────────┐
│            COMPRESSION ALGORITHM FLOW                         │
└──────────────────────────────────────────────────────────────┘

Input Video Metadata
├── Width: videoWidth
├── Height: videoHeight
├── Duration: videoDuration
└── FPS: native (30-60 typically)

         │
         ▼
    ┌─────────────────────────┐
    │  Dimension Calculation  │
    └─────────────────────────┘
         │
         ├─► IF width > 720 OR height > 1280
         │   THEN scale down
         │
         ├─► Calculate aspect ratio
         │   aspectRatio = width / height
         │
         ├─► IF landscape (width > height)
         │   ├─► width = 720
         │   └─► height = 720 / aspectRatio
         │
         └─► ELSE IF portrait (height > width)
             ├─► height = 1280
             └─► width = 1280 * aspectRatio

         │
         ▼
    ┌─────────────────────────┐
    │   Canvas Setup          │
    └─────────────────────────┘
         │
         ├─► canvas.width = scaledWidth
         └─► canvas.height = scaledHeight

         │
         ▼
    ┌─────────────────────────┐
    │   Frame Extraction      │
    └─────────────────────────┘
         │
         ├─► IF duration ≤ 0.1 seconds
         │   └─► Extract single frame
         │
         └─► ELSE
             ├─► frameInterval = 1000 / 30 (30 FPS)
             ├─► maxDuration = min(60, duration)
             ├─► FOR time in [0 to maxDuration]
             │   ├─► video.currentTime = time
             │   ├─► Draw frame to canvas
             │   └─► Compress frame
             └─► RETURN first frame as thumbnail

         │
         ▼
    ┌─────────────────────────┐
    │   JPEG Compression      │
    └─────────────────────────┘
         │
         ├─► Format: JPEG
         ├─► Quality: 0.7 (70%)
         └─► Output: data URL

         │
         ▼
    Base64 Data URL
    "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
```

## 4. Player State Machine

```
┌──────────────────────────────────────────────────────────────┐
│              VIDEO PLAYER STATE MACHINE                       │
└──────────────────────────────────────────────────────────────┘

                    ┌─────────────┐
                    │   Initial   │
                    │   State     │
                    └──────┬──────┘
                           │
                           │ Component Mount
                           │
                           ▼
                    ┌─────────────┐
                    │   Loaded    │
                    │  (Paused)   │
                    └──────┬──────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
    User    │      User    │      User    │
    Clicks  │      Clicks  │      Swipes  │
    Play    │      Mute    │      Next    │
            │              │              │
            ▼              ▼              ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │   Playing   │ │   Muted     │ │  Load Next  │
    │   (Audio)   │ │  (Silent)   │ │    Reel     │
    └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
           │               │               │
           │ User Clicks   │ User Clicks   │ Video Loaded
           │ Pause         │ Unmute        │
           │               │               │
           ▼               ▼               ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │   Paused    │ │   Unmuted   │ │   Playing   │
    └─────────────┘ └─────────────┘ └─────────────┘
           │               │               │
           └───────────────┴───────────────┘
                           │
                           │ Video Ends
                           │
                           ▼
                    ┌─────────────┐
                    │   Looping   │
                    │  (Restart)  │
                    └─────────────┘


State Variables:
├── isPlaying: boolean (controls play/pause)
├── isMuted: boolean (controls audio)
├── currentIndex: number (which reel to display)
└── videoRef: HTMLVideoElement (DOM reference)
```

## 5. Network Request Flow

```
┌──────────────────────────────────────────────────────────────┐
│                  NETWORK REQUEST FLOW                         │
└──────────────────────────────────────────────────────────────┘

CLIENT                           SERVER                      DATABASE
  │                                │                             │
  │                                │                             │
  ├─── POST /api/reels ───────────>│                             │
  │    Content-Type: JSON          │                             │
  │    Body: {                     │                             │
  │      videoData: "base64...",   │                             │
  │      caption: "...",           │                             │
  │      userId: "..."             │                             │
  │    }                           │                             │
  │                                │                             │
  │                                ├─── Reel.create() ─────────>│
  │                                │                             │
  │                                │<─── Document Created ───────┤
  │                                │     {_id, videoUrl, ...}    │
  │                                │                             │
  │<─── 200 OK ────────────────────┤                             │
  │     {reel object}              │                             │
  │                                │                             │
  │                                │                             │
  ├─── GET /api/reels?userId=...─>│                             │
  │                                │                             │
  │                                ├─── Reel.find() ───────────>│
  │                                │     .sort({createdAt: -1})  │
  │                                │     .limit(30)              │
  │                                │     .populate('userId')     │
  │                                │                             │
  │                                │<─── Array of Documents ─────┤
  │                                │     [{videoUrl, ...}, ...]  │
  │                                │                             │
  │<─── 200 OK ────────────────────┤                             │
  │     [{                         │                             │
  │       videoUrl: "base64...",   │                             │
  │       likesCount: 42,          │                             │
  │       isLiked: true            │                             │
  │     }, ...]                    │                             │
  │                                │                             │
  │                                │                             │
  ├─── POST /api/reels/:id/like ─>│                             │
  │    Body: {userId: "..."}       │                             │
  │                                │                             │
  │                                ├─── Reel.findByIdAndUpdate ─>│
  │                                │     $addToSet: {            │
  │                                │       likedBy: userId       │
  │                                │     }                       │
  │                                │                             │
  │                                │<─── Updated Document ───────┤
  │                                │                             │
  │<─── 200 OK ────────────────────┤                             │
  │     {message: "Liked"}         │                             │
  │                                │                             │

Request Sizes:
├── POST /api/reels: 5-10 MB (compressed video data)
├── GET /api/reels: 150-300 MB (30 reels × 5-10 MB each)
└── POST /api/reels/:id/like: < 1 KB (just userId)
```

## 6. Memory Usage in Browser

```
┌──────────────────────────────────────────────────────────────┐
│              BROWSER MEMORY FOOTPRINT                         │
└──────────────────────────────────────────────────────────────┘

When Page Loads:
├── React App: ~2-5 MB
├── Dependencies (Socket.IO, etc.): ~1-2 MB
└── Initial State: ~0.1 MB

After Fetching 30 Reels:
├── JSON Response: ~150-300 MB
├── React State (reels array): ~150-300 MB
├── DOM (rendered components): ~5-10 MB
└── Total: ~305-615 MB

When Playing a Reel:
├── Video Element (decoded): ~5-10 MB
├── Canvas Context (if active): ~2-5 MB
├── Event Listeners: ~1 MB
└── Total Additional: ~8-16 MB

TOTAL MEMORY USAGE: ~320-640 MB
(High due to base64 strings stored in memory)

Memory Optimization Strategies (Not Implemented):
├── Lazy loading (only load visible reels)
├── Virtual scrolling (unload off-screen reels)
├── Pagination (load 5-10 at a time instead of 30)
└── Video cleanup (release memory for non-visible videos)
```

## 7. Comparison with Traditional Streaming

```
┌─────────────────────────────────────────────────────────────────────┐
│        TRADITIONAL HLS/DASH VS BASE64 EMBEDDING                      │
└─────────────────────────────────────────────────────────────────────┘

TRADITIONAL STREAMING (HLS/DASH):
──────────────────────────────────────────────────────────────

Upload:
User → Server → Transcode → Multiple Qualities → Segment → CDN

Delivery:
CDN → Manifest File → Client Requests Segments → Progressive Load

Playback:
Browser → Request Segment → Decode → Play → Request Next Segment

Advantages:
✓ Adaptive bitrate (switches quality based on network)
✓ Progressive loading (play before fully downloaded)
✓ Multiple quality levels (360p, 480p, 720p, 1080p)
✓ CDN caching (faster global delivery)
✓ Lower memory usage (only current segment)

Disadvantages:
✗ Complex infrastructure (encoder, segmenter, CDN)
✗ Higher costs (storage, bandwidth, processing)
✗ More HTTP requests (manifest + segments)
✗ Buffering possible (network dependent)


BASE64 EMBEDDING (This Application):
──────────────────────────────────────────────────────────────

Upload:
User → Client Compress → Base64 Encode → MongoDB

Delivery:
MongoDB → Full Base64 String → Client

Playback:
Browser → Decode Base64 → Load Entire Video → Play

Advantages:
✓ Simple architecture (no CDN, encoder, segmenter)
✓ Self-contained (video in document)
✓ Lower infrastructure cost
✓ Immediate playback (no segment requests)
✓ No CORS issues

Disadvantages:
✗ No adaptive bitrate (single quality)
✗ Must load entire video (no progressive)
✗ High memory usage (full video in RAM)
✗ Larger database documents
✗ Not scalable for high traffic


USE CASE COMPARISON:
────────────────────────────────────────────────────────────

Traditional Streaming:
├── Best for: YouTube, Netflix, large platforms
├── Traffic: High volume (millions of users)
├── Videos: Long-form (minutes to hours)
└── Budget: High (infrastructure investment)

Base64 Embedding:
├── Best for: Small apps, MVPs, startups
├── Traffic: Low to medium (thousands of users)
├── Videos: Short-form (seconds to 1 minute)
└── Budget: Low (minimal infrastructure)
```

---

These diagrams provide a visual understanding of how video "streaming" (really video embedding and playback) works in the Dsapp application. The system prioritizes simplicity and cost-effectiveness over advanced streaming features.
