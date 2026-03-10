# Advanced Chat Features - Instagram-like Messaging

This document describes the advanced chat features implemented in the application, inspired by Instagram's messaging system.

## Features Implemented

### 1. **Message Reactions** 🎉
- Click the emoji button (😊) on hover to add reactions to any message
- 8 common emoji reactions available: ❤️ 😂 😮 😢 😡 👍 🔥 🎉
- Double-tap/double-click any message to quickly add a heart (❤️) reaction
- Reactions are displayed below messages with counts
- Click the same emoji again to remove your reaction

### 2. **Message Replies/Threading** 💬
- Click the reply button (↩️) on hover to reply to a specific message
- Reply context is shown above your message
- The original message preview appears when replying
- Cancel reply by clicking the × button

### 3. **Typing Indicators** ⌨️
- See "typing..." when the other person is composing a message
- Animated typing bubbles with smooth animations
- Automatically stops after 2 seconds of inactivity

### 4. **Read Receipts** ✓✓
- Message status indicators:
  - Single check (✓): Message sent
  - Double gray checks (✓✓): Message delivered
  - Double blue checks (✓✓): Message seen/read
- Automatic read receipts when viewing messages
- ReadAt timestamp tracked in database

### 5. **Online/Offline Status** 🟢
- Green indicator dot shows when user is online
- Header displays "Active now" when online, "Offline" when not
- Real-time presence tracking via WebSocket connections

### 6. **Message Deletion** 🗑️
- Unsend your own messages by clicking the trash button
- Messages are soft-deleted (marked with deletedAt timestamp)
- Deleted messages are removed from both users' views
- Only the sender can delete their own messages

### 7. **Enhanced UI/UX** ✨
- Smooth animations using Framer Motion
- Message bubbles with rounded corners and gradients
- User avatars with initials
- Hover effects on messages reveal action buttons
- Instagram-style message layout and colors
- Improved message input with better placeholder text
- Disabled send button when input is empty

### 8. **User Avatars** 👤
- Gradient avatars with user initials
- Avatars shown for received messages
- Avatar grouping (only shows for first message in a sequence)

## Technical Implementation

### Backend (server.ts)
- Socket.IO event handlers for all features
- Online user tracking with Map<userId, socketId>
- Message status updates (sent → delivered → seen)
- Reaction management (add/remove)
- Typing indicator broadcasting
- User presence tracking

### Frontend (ChatRoom.tsx)
- React hooks for state management
- Real-time Socket.IO listeners
- Optimistic UI updates
- Framer Motion animations
- Responsive layout with Tailwind CSS

### Database (Message.ts)
- Extended Message schema with:
  - `reactions`: Array of { userId, emoji, createdAt }
  - `replyToId`: Reference to replied message
  - `status`: 'sent' | 'delivered' | 'seen'
  - `readAt`: Timestamp when message was read
  - `deletedAt`: Soft delete timestamp
  - `deletedBy`: User who deleted the message

## Usage

1. **Send a message**: Type and press Enter or click the send button
2. **React to a message**: Hover over a message and click the emoji button
3. **Quick like**: Double-click any message to add a heart
4. **Reply**: Hover over a message and click the reply button
5. **Delete**: Hover over your own message and click the trash button
6. **See typing**: Watch for "typing..." indicator when other user types
7. **Check status**: Look for check marks next to your sent messages

## Socket Events

### Client → Server
- `join_chat`: Join user's personal room
- `typing`: Broadcast typing status
- `send_private_message`: Send a new message
- `message_read`: Mark messages as read
- `add_reaction`: Add emoji reaction to message
- `remove_reaction`: Remove reaction from message
- `delete_message`: Soft delete a message

### Server → Client
- `user_status`: User online/offline status
- `user_typing`: Typing indicator
- `receive_private_message`: New message received
- `message_status`: Message status update
- `message_reaction`: Reaction added/removed
- `message_deleted`: Message was deleted

## Browser Support

Works in all modern browsers supporting:
- WebSocket/Socket.IO
- ES6+ JavaScript
- CSS Grid/Flexbox
- Canvas API (for image compression)

## Future Enhancements

Potential additions:
- Message search functionality
- Group chats
- Voice messages
- Video/audio calls
- Message forwarding
- Message pinning
- Gif/sticker support
- Link previews
- File attachments (PDF, documents)
