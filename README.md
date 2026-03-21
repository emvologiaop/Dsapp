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

### Telegram Bot Integration 🤖
- **Account Linking**: Link your DDU Social account to Telegram
- **Real-time Notifications**: Receive notifications via Telegram
- **Developer Contact**: Direct access to support via `/contact` and `/support` commands
- **Advertisement System**: View and interact with platform ads via `/ads` command
- **Password Reset**: Reset your password through the bot
- **Help Commands**: Comprehensive `/help` system for easy navigation

See [TELEGRAM_ADS.md](TELEGRAM_ADS.md) for complete Telegram ad system documentation.

### Admin Panel 🛡️
- **User Management**: View, ban, and unban users
- **Content Moderation**: Delete inappropriate posts
- **Advertisement Management**: Create, edit, and track ads for Telegram bot
- **Analytics Dashboard**: Platform statistics and insights
- **Ad Performance Tracking**: Monitor impressions, clicks, and CTR

See [ADMIN_SETUP.md](ADMIN_SETUP.md) for admin user setup instructions.
See [ADMIN_PANEL.md](ADMIN_PANEL.md) for admin panel documentation.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Development Guidelines

### For Contributors: Avoiding Merge Conflicts

If you're experiencing merge conflicts or want to prevent them:

- **Quick Start**: See [QUICK_START.md](QUICK_START.md) for immediate resolution steps
- **Detailed Guide**: See [MERGE_CONFLICT_RESOLUTION_GUIDE.md](MERGE_CONFLICT_RESOLUTION_GUIDE.md) for strategies
- **Best Practices**: See [DEVELOPMENT_WORKFLOW.md](DEVELOPMENT_WORKFLOW.md) for coding guidelines
- **PR Priority**: See [.github/PR_PRIORITY.md](.github/PR_PRIORITY.md) for merge coordination
- **Git Setup**: Run `./setup-git-config.sh` to configure helpful Git aliases

**Key Points**:
- Keep PRs small (1-3 files, <200 lines)
- Check open PRs before modifying `server.ts` or `src/App.tsx`
- Merge in priority order: Infrastructure → Features → Enhancements
- Update your branch regularly with `git sync`

## Roadmap and ideas

Open **Settings → Roadmap** in the app to see a curated list of feature ideas and enhancements (with impact, status, and upvotes). Use the form there to quickly propose new improvements without leaving the product.
