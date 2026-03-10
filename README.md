<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/65c92b19-8cd2-4e0d-9004-44c63a87f07f

## Features

### Advanced Instagram-like Chat 💬
- **Message Reactions**: React with emojis (❤️ 😂 😮 😢 😡 👍 🔥 🎉) or double-tap to like
- **Message Replies**: Thread conversations by replying to specific messages
- **Typing Indicators**: See when someone is typing in real-time
- **Read Receipts**: Check marks show sent/delivered/seen status
- **Online Status**: Real-time presence tracking with "Active now" indicator
- **Image Sharing**: Send photos with automatic compression (800px max, 70% JPEG quality)
- **Message Deletion**: Unsend your messages
- **Smooth Animations**: Instagram-style UI with Framer Motion animations

See [CHAT_FEATURES.md](CHAT_FEATURES.md) for complete chat documentation.

### Reels with Video/Image Compression 🎬
- **Upload Videos & Images**: Share content as reels
- **Automatic Compression**: Videos/images compressed to 720p max resolution
- **Quality Optimization**: 70% JPEG quality for optimal size/quality balance
- **File Validation**: Max 50MB with user-friendly error messages
- **Like, Comment, Share**: Full social interaction features
- **Vertical Format**: Optimized 9:16 aspect ratio for mobile viewing

See [REELS_FEATURES.md](REELS_FEATURES.md) for complete reels documentation.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Roadmap and ideas

Open **Settings → Roadmap** in the app to see a curated list of feature ideas and enhancements (with impact, status, and upvotes). Use the form there to quickly propose new improvements without leaving the product.
