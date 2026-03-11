import TelegramBot from 'node-telegram-bot-api';
import * as dotenv from 'dotenv';
import * as crypto from 'crypto';
import { User } from '../src/models/User.js';
import { Ad } from '../src/models/Ad.js';
import { Notification } from '../src/models/Notification.js';
import { Message } from '../src/models/Message.js';
import { Post } from '../src/models/Post.js';
import { connectDB } from '../src/db.js';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const appBaseUrl = process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);
const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL ||
  (appBaseUrl ? `${appBaseUrl}/api/telegram/webhook` : undefined);
const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
const useWebhook = Boolean(webhookUrl);

// Admin Configuration
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'Envologia01@gmail.com';
const ADMIN_TELEGRAM_USERNAME = process.env.ADMIN_TELEGRAM_USERNAME || '@dev_envologia';
const ADMIN_TELEGRAM_USER_ID = process.env.ADMIN_TELEGRAM_USER_ID || '6882100039';

// Helper function to get user from telegram chat ID
async function getUserFromTelegram(chatId: number) {
  return await User.findOne({ telegramChatId: chatId.toString() });
}

// Helper function to format date
function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

// Create main menu keyboard
function getMainMenuKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '📊 My Stats', callback_data: 'menu_stats' },
        { text: '🔔 Notifications', callback_data: 'menu_notifications' }
      ],
      [
        { text: '💬 Messages', callback_data: 'menu_messages' },
        { text: '🔥 Trending', callback_data: 'menu_trending' }
      ],
      [
        { text: '📢 Ads', callback_data: 'menu_ads' },
        { text: '👤 My Profile', callback_data: 'menu_profile' }
      ],
      [
        { text: '❓ Help', callback_data: 'menu_help' }
      ]
    ]
  };
}

export function initBot(io?: any) {
  if (!token) {
    console.warn("TELEGRAM_BOT_TOKEN not found. Bot will not start.");
    return null;
  }

  const bot = new TelegramBot(token, { polling: !useWebhook });

  // Log polling/webhook errors to aid debugging
  bot.on('polling_error', (error) => {
    console.error('Telegram bot polling error:', error.message);
  });

  bot.on('webhook_error', (error) => {
    console.error('Telegram bot webhook error:', error.message);
  });

  // Log admin configuration on startup
  console.log("Telegram Bot initializing with admin config:");
  console.log(`  Admin Email: ${ADMIN_EMAIL}`);
  console.log(`  Admin Telegram: ${ADMIN_TELEGRAM_USERNAME}`);
  console.log(`  Admin User ID: ${ADMIN_TELEGRAM_USER_ID}`);
  console.log(`  Webhook mode: ${useWebhook ? `enabled (${webhookUrl})` : 'disabled (polling)'}`);

  // Ensure DB connectivity and set webhook if configured
  (async () => {
    try {
      await connectDB();
      console.log('Telegram bot database connection ready');
    } catch (error) {
      console.error('Telegram bot database connection failed:', error);
    }

    if (useWebhook && webhookUrl) {
      try {
        await bot.setWebHook(webhookUrl, webhookSecret ? { secret_token: webhookSecret } : undefined);
        console.log(`Telegram webhook set: ${webhookUrl}`);
      } catch (error) {
        console.error('Failed to set Telegram webhook:', error);
      }
    } else {
      try {
        await bot.deleteWebHook();
        console.log('Telegram bot polling enabled');
      } catch (error) {
        console.error('Failed to clear Telegram webhook for polling:', error);
      }
    }
  })();

  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;

    try {
      const user = await getUserFromTelegram(chatId);

      if (user) {
        // User is linked, show main menu
        bot.sendMessage(
          chatId,
          `🎉 Welcome back, *${user.name}*!\n\n` +
          "Ready to dive into DDU Social? Pick an option below:",
          {
            parse_mode: 'Markdown',
            reply_markup: getMainMenuKeyboard()
          }
        );
      } else {
        // User not linked, show linking instructions
        bot.sendMessage(
          chatId,
          "🚀 *Welcome to DDU Social Bot!*\n\n" +
          "Your campus social hub is now in your pocket. To get started:\n\n" +
          "1️⃣ Open the DDU Social web app\n" +
          "2️⃣ Get your 6-digit verification code\n" +
          "3️⃣ Send it here to link your account\n\n" +
          "Once linked, you'll get instant notifications, check stats, view trending posts, and much more!\n\n" +
          "Need help? Use /help",
          { parse_mode: 'Markdown' }
        );
      }
    } catch (error) {
      console.error('Error handling /start command:', error);
      bot.sendMessage(
        chatId,
        "⚠️ Sorry, something went wrong. Please try again later or contact /support"
      );
    }
  });

  // Help command
  bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(
      chatId,
      "📱 *DDU Social Bot - Commands*\n\n" +
      "*Main Commands:*\n" +
      "/start - Show main menu\n" +
      "/menu - Open interactive menu\n" +
      "/help - Show this help message\n\n" +
      "*Social:*\n" +
      "/stats - View your statistics\n" +
      "/profile [@username] - View profile\n" +
      "/trending - See trending posts\n\n" +
      "*Communication:*\n" +
      "/notifications - Check notifications\n" +
      "/unread - View unread messages\n\n" +
      "*Other:*\n" +
      "/ads - View advertisements\n" +
      "/contact - Contact developer\n" +
      "/support - Report bugs or suggest features\n\n" +
      "💡 Tip: Use /support to report bugs or share feature ideas directly with the dev team!",
      { parse_mode: 'Markdown' }
    );
  });

  // Menu command - show main menu
  bot.onText(/\/menu/, async (msg) => {
    const chatId = msg.chat.id;
    const user = await getUserFromTelegram(chatId);

    if (!user) {
      bot.sendMessage(
        chatId,
        "⚠️ Please link your account first by sending your 6-digit verification code from the web app."
      );
      return;
    }

    bot.sendMessage(
      chatId,
      `📱 *Main Menu*\n\nHey ${user.name}, what would you like to do?`,
      {
        parse_mode: 'Markdown',
        reply_markup: getMainMenuKeyboard()
      }
    );
  });

  // Stats command
  bot.onText(/\/stats/, async (msg) => {
    const chatId = msg.chat.id;

    try {
      const user = await getUserFromTelegram(chatId);
      if (!user) {
        bot.sendMessage(
          chatId,
          "⚠️ Please link your account first by sending your 6-digit verification code."
        );
        return;
      }

      // Get user's posts and stats
      const posts = await Post.find({ userId: user._id, isDeleted: false });
      const totalLikes = posts.reduce((sum, post) => sum + post.likedBy.length, 0);
      const totalComments = posts.reduce((sum, post) => sum + post.commentsCount, 0);
      const totalShares = posts.reduce((sum, post) => sum + post.sharesCount, 0);

      const accountAge = Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24));

      const statsMessage =
        `📊 *Your DDU Social Stats*\n\n` +
        `👤 *${user.name}* ${user.isVerified ? '✓' : ''}\n` +
        `@${user.username}\n\n` +
        `*Account:*\n` +
        `• Member for ${accountAge} days\n` +
        `• Role: ${user.role}\n\n` +
        `*Following:*\n` +
        `• Followers: ${user.followerIds?.length || 0}\n` +
        `• Following: ${user.followingIds?.length || 0}\n\n` +
        `*Content:*\n` +
        `• Posts: ${posts.length}\n` +
        `• Total Likes: ${totalLikes}\n` +
        `• Total Comments: ${totalComments}\n` +
        `• Total Shares: ${totalShares}\n\n` +
        `🎯 Engagement Rate: ${posts.length > 0 ? Math.round((totalLikes + totalComments) / posts.length) : 0} per post`;

      bot.sendMessage(chatId, statsMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '🔙 Back to Menu', callback_data: 'menu_main' }
          ]]
        }
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      bot.sendMessage(
        chatId,
        "⚠️ Failed to load your stats. Please try again later."
      );
    }
  });

  // Notifications command
  bot.onText(/\/notifications/, async (msg) => {
    const chatId = msg.chat.id;

    try {
      const user = await getUserFromTelegram(chatId);
      if (!user) {
        bot.sendMessage(
          chatId,
          "⚠️ Please link your account first by sending your 6-digit verification code."
        );
        return;
      }

      const notifications = await Notification.find({ userId: user._id })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('relatedUserId', 'name username');

      if (notifications.length === 0) {
        bot.sendMessage(
          chatId,
          "🔔 *Notifications*\n\nNo notifications yet. Start connecting with others!",
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const unreadCount = notifications.filter(n => !n.isRead).length;
      let notifText = `🔔 *Your Notifications* (${unreadCount} unread)\n\n`;

      notifications.slice(0, 8).forEach((notif, idx) => {
        const icon = notif.isRead ? '○' : '●';
        const typeEmoji = {
          'like': '❤️',
          'follow': '👥',
          'comment': '💬',
          'share': '🔄',
          'message': '✉️'
        }[notif.type] || '🔔';

        notifText += `${icon} ${typeEmoji} ${notif.content}\n`;
        notifText += `   ${formatDate(notif.createdAt)}\n\n`;
      });

      if (notifications.length > 8) {
        notifText += `\n_...and ${notifications.length - 8} more_`;
      }

      bot.sendMessage(chatId, notifText, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '✓ Mark All Read', callback_data: 'notif_mark_read' },
            { text: '🔙 Menu', callback_data: 'menu_main' }
          ]]
        }
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      bot.sendMessage(
        chatId,
        "⚠️ Failed to load notifications. Please try again later."
      );
    }
  });

  // Unread messages command
  bot.onText(/\/unread/, async (msg) => {
    const chatId = msg.chat.id;

    try {
      const user = await getUserFromTelegram(chatId);
      if (!user) {
        bot.sendMessage(
          chatId,
          "⚠️ Please link your account first by sending your 6-digit verification code."
        );
        return;
      }

      const unreadMessages = await Message.find({
        receiverId: user._id,
        isRead: false,
        deletedAt: { $exists: false }
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('senderId', 'name username');

      if (unreadMessages.length === 0) {
        bot.sendMessage(
          chatId,
          "💬 *Messages*\n\nNo unread messages. You're all caught up!",
          { parse_mode: 'Markdown' }
        );
        return;
      }

      let messageText = `💬 *Unread Messages* (${unreadMessages.length})\n\n`;

      unreadMessages.slice(0, 5).forEach((msg: any) => {
        const sender = msg.senderId;
        const preview = msg.text.length > 50 ? msg.text.substring(0, 50) + '...' : msg.text;
        messageText += `📨 From *${sender.name}* (@${sender.username})\n`;
        messageText += `   "${preview}"\n`;
        messageText += `   ${formatDate(msg.createdAt)}\n\n`;
      });

      if (unreadMessages.length > 5) {
        messageText += `\n_...and ${unreadMessages.length - 5} more messages_`;
      }

      messageText += `\n💡 Open the web app to read and reply to messages.`;

      bot.sendMessage(chatId, messageText, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '🔙 Back to Menu', callback_data: 'menu_main' }
          ]]
        }
      });
    } catch (error) {
      console.error('Error fetching unread messages:', error);
      bot.sendMessage(
        chatId,
        "⚠️ Failed to load messages. Please try again later."
      );
    }
  });

  // Profile command
  bot.onText(/\/profile(?:\s+@?(\w+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const requestedUsername = match?.[1];

    try {
      const currentUser = await getUserFromTelegram(chatId);
      if (!currentUser) {
        bot.sendMessage(
          chatId,
          "⚠️ Please link your account first by sending your 6-digit verification code."
        );
        return;
      }

      // If no username provided, show own profile
      const targetUser = requestedUsername
        ? await User.findOne({ username: requestedUsername })
        : currentUser;

      if (!targetUser) {
        bot.sendMessage(
          chatId,
          "❌ User not found. Please check the username and try again."
        );
        return;
      }

      const posts = await Post.find({ userId: targetUser._id, isDeleted: false });
      const isOwnProfile = targetUser._id.toString() === currentUser._id.toString();

      let profileText = `👤 *Profile*\n\n`;
      profileText += `*${targetUser.name}* ${targetUser.isVerified ? '✓' : ''}\n`;
      profileText += `@${targetUser.username}\n\n`;

      if (targetUser.bio) {
        profileText += `${targetUser.bio}\n\n`;
      }

      profileText += `*Stats:*\n`;
      profileText += `• Posts: ${posts.length}\n`;
      profileText += `• Followers: ${targetUser.followerIds?.length || 0}\n`;
      profileText += `• Following: ${targetUser.followingIds?.length || 0}\n\n`;

      if (targetUser.department) {
        profileText += `🎓 ${targetUser.department}\n`;
      }
      if (targetUser.location) {
        profileText += `📍 ${targetUser.location}\n`;
      }

      const keyboard: any = { inline_keyboard: [] };

      if (!isOwnProfile) {
        const isFollowing = currentUser.followingIds?.some(id => id.toString() === targetUser._id.toString());
        keyboard.inline_keyboard.push([
          { text: isFollowing ? '✓ Following' : '➕ Follow', callback_data: `profile_follow_${targetUser._id}` }
        ]);
      }

      keyboard.inline_keyboard.push([
        { text: '🔙 Back to Menu', callback_data: 'menu_main' }
      ]);

      bot.sendMessage(chatId, profileText, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      bot.sendMessage(
        chatId,
        "⚠️ Failed to load profile. Please try again later."
      );
    }
  });

  // Trending command
  bot.onText(/\/trending/, async (msg) => {
    const chatId = msg.chat.id;

    try {
      const user = await getUserFromTelegram(chatId);
      if (!user) {
        bot.sendMessage(
          chatId,
          "⚠️ Please link your account first by sending your 6-digit verification code."
        );
        return;
      }

      // Get posts from last 7 days, sorted by engagement
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const trendingPosts = await Post.find({
        isDeleted: false,
        createdAt: { $gte: sevenDaysAgo }
      })
        .populate('userId', 'name username isVerified')
        .sort({ likedBy: -1 })
        .limit(5);

      if (trendingPosts.length === 0) {
        bot.sendMessage(
          chatId,
          "🔥 *Trending Posts*\n\nNo trending posts at the moment. Be the first to post!",
          { parse_mode: 'Markdown' }
        );
        return;
      }

      let trendingText = `🔥 *Trending on DDU Social*\n\n`;
      trendingText += `Top posts from the last 7 days:\n\n`;

      trendingPosts.forEach((post: any, idx) => {
        const author = post.userId;
        const engagement = post.likedBy.length + post.commentsCount + post.sharesCount;
        const contentPreview = post.content.length > 80
          ? post.content.substring(0, 80) + '...'
          : post.content;

        trendingText += `${idx + 1}. *${author.name}* ${author.isVerified ? '✓' : ''} @${author.username}\n`;
        trendingText += `   ${contentPreview}\n`;
        trendingText += `   ❤️ ${post.likedBy.length} 💬 ${post.commentsCount} 🔄 ${post.sharesCount}\n`;
        trendingText += `   ${formatDate(post.createdAt)}\n\n`;
      });

      trendingText += `\n💡 Open the web app to interact with these posts!`;

      bot.sendMessage(chatId, trendingText, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '🔄 Refresh', callback_data: 'menu_trending' },
            { text: '🔙 Menu', callback_data: 'menu_main' }
          ]]
        }
      });
    } catch (error) {
      console.error('Error fetching trending posts:', error);
      bot.sendMessage(
        chatId,
        "⚠️ Failed to load trending posts. Please try again later."
      );
    }
  });

  // Contact developer command
  bot.onText(/\/contact/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(
      chatId,
      "👨‍💻 *Contact the Developer*\n\n" +
      "Need to reach out to the development team?\n\n" +
      `Telegram: ${ADMIN_TELEGRAM_USERNAME}\n` +
      `Email: ${ADMIN_EMAIL}\n\n` +
      "For technical issues and support, use /support",
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '📱 Message Developer', url: `https://t.me/${ADMIN_TELEGRAM_USERNAME.replace('@', '')}` }
          ]]
        }
      }
    );
  });

  // Support command - Report bugs or add suggestions
  bot.onText(/\/support/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(
      chatId,
      "🆘 *Technical Support*\n\n" +
      "Need help or want to contribute?\n\n" +
      `📞 Contact ${ADMIN_TELEGRAM_USERNAME} for:\n` +
      "• 🐛 Bug reports\n" +
      "• 💡 Feature suggestions\n" +
      "• 🔧 Technical problems\n" +
      "• 🔐 Account issues\n\n" +
      "Use the buttons below to directly reach the developer:",
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🐛 Report Bug', url: `https://t.me/${ADMIN_TELEGRAM_USERNAME.replace('@', '')}` }
            ],
            [
              { text: '💡 Suggest Feature', url: `https://t.me/${ADMIN_TELEGRAM_USERNAME.replace('@', '')}` }
            ],
            [
              { text: '💬 General Support', url: `https://t.me/${ADMIN_TELEGRAM_USERNAME.replace('@', '')}` }
            ]
          ]
        }
      }
    );
  });

  // Ads command - View active advertisements
  bot.onText(/\/ads/, async (msg) => {
    const chatId = msg.chat.id;

    try {
      const now = new Date();
      const activeAds = await Ad.find({
        isActive: true,
        $and: [
          {
            $or: [
              { startDate: { $exists: false } },
              { startDate: { $lte: now } }
            ]
          },
          {
            $or: [
              { endDate: { $exists: false } },
              { endDate: { $gte: now } }
            ]
          }
        ]
      })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('createdBy', 'name');

      if (activeAds.length === 0) {
        bot.sendMessage(
          chatId,
          "📢 *No Active Advertisements*\n\nThere are no advertisements available at this time.",
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Send a header message
      bot.sendMessage(
        chatId,
        `📢 *Active Advertisements* (${activeAds.length})\n\n` +
        "Here are the latest ads from DDU Social:",
        { parse_mode: 'Markdown' }
      );

      // Send each ad as a separate message
      for (const ad of activeAds) {
        // Increment impressions
        ad.impressions += 1;
        await ad.save();

        let message = `*${ad.title}*\n\n${ad.content}`;

        const keyboard: any = { inline_keyboard: [] };

        if (ad.linkUrl) {
          keyboard.inline_keyboard.push([
            { text: '🔗 Learn More', url: ad.linkUrl, callback_data: `ad_click_${ad._id}` }
          ]);
        }

        if (ad.imageUrl) {
          // Send photo with caption
          await bot.sendPhoto(chatId, ad.imageUrl, {
            caption: message,
            parse_mode: 'Markdown',
            reply_markup: keyboard.inline_keyboard.length > 0 ? keyboard : undefined
          });
        } else {
          // Send text message
          await bot.sendMessage(chatId, message, {
            parse_mode: 'Markdown',
            reply_markup: keyboard.inline_keyboard.length > 0 ? keyboard : undefined
          });
        }

        // Small delay between ads to avoid flooding
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error('Error fetching ads:', error);
      bot.sendMessage(
        chatId,
        "⚠️ Sorry, there was an error fetching advertisements. Please try again later."
      );
    }
  });

  // Handle callback queries for ad clicks and menu navigation
  bot.on('callback_query', async (query) => {
    const chatId = query.message?.chat.id;
    const data = query.data;

    if (!chatId || !data) return;

    try {
      // Handle ad clicks
      if (data.startsWith('ad_click_')) {
        const adId = data.replace('ad_click_', '');
        const ad = await Ad.findById(adId);
        if (ad) {
          ad.clicks += 1;
          await ad.save();
        }
        bot.answerCallbackQuery(query.id, {
          text: '✅ Opening link...',
          show_alert: false
        });
        return;
      }

      // Handle menu navigation
      const user = await getUserFromTelegram(chatId);
      if (!user && !data.startsWith('menu_help')) {
        bot.answerCallbackQuery(query.id, {
          text: '⚠️ Please link your account first',
          show_alert: true
        });
        return;
      }

      switch (data) {
        case 'menu_main':
          bot.editMessageText(
            `📱 *Main Menu*\n\nHey ${user?.name}, what would you like to do?`,
            {
              chat_id: chatId,
              message_id: query.message?.message_id,
              parse_mode: 'Markdown',
              reply_markup: getMainMenuKeyboard()
            }
          );
          bot.answerCallbackQuery(query.id);
          break;

        case 'menu_stats':
          // Trigger stats command
          bot.answerCallbackQuery(query.id, { text: '📊 Loading stats...' });
          if (query.message) {
            bot.onText(/\/stats/, async (msg) => { }); // Trigger will be handled by command
            const fakeMsg: any = { chat: { id: chatId }, text: '/stats' };
            bot.emit('message', fakeMsg);
          }
          break;

        case 'menu_notifications':
          bot.answerCallbackQuery(query.id, { text: '🔔 Loading notifications...' });
          const fakeNotifMsg: any = { chat: { id: chatId }, text: '/notifications' };
          bot.emit('message', fakeNotifMsg);
          break;

        case 'menu_messages':
          bot.answerCallbackQuery(query.id, { text: '💬 Loading messages...' });
          const fakeMsgMsg: any = { chat: { id: chatId }, text: '/unread' };
          bot.emit('message', fakeMsgMsg);
          break;

        case 'menu_trending':
          bot.answerCallbackQuery(query.id, { text: '🔥 Loading trending...' });
          const fakeTrendMsg: any = { chat: { id: chatId }, text: '/trending' };
          bot.emit('message', fakeTrendMsg);
          break;

        case 'menu_ads':
          bot.answerCallbackQuery(query.id, { text: '📢 Loading ads...' });
          const fakeAdsMsg: any = { chat: { id: chatId }, text: '/ads' };
          bot.emit('message', fakeAdsMsg);
          break;

        case 'menu_profile':
          bot.answerCallbackQuery(query.id, { text: '👤 Loading profile...' });
          const fakeProfileMsg: any = { chat: { id: chatId }, text: '/profile' };
          bot.emit('message', fakeProfileMsg);
          break;

        case 'menu_help':
          bot.answerCallbackQuery(query.id, { text: '❓ Loading help...' });
          const fakeHelpMsg: any = { chat: { id: chatId }, text: '/help' };
          bot.emit('message', fakeHelpMsg);
          break;

        case 'notif_mark_read':
          if (user) {
            await Notification.updateMany(
              { userId: user._id, isRead: false },
              { $set: { isRead: true } }
            );
            bot.answerCallbackQuery(query.id, {
              text: '✓ All notifications marked as read',
              show_alert: true
            });
            // Refresh the notifications view
            const fakeRefreshMsg: any = { chat: { id: chatId }, text: '/notifications' };
            bot.emit('message', fakeRefreshMsg);
          }
          break;

        default:
          if (data.startsWith('profile_follow_')) {
            // Handle follow/unfollow
            const targetUserId = data.replace('profile_follow_', '');
            if (user) {
              const targetUser = await User.findById(targetUserId);
              if (targetUser) {
                const isFollowing = user.followingIds?.some(id => id.toString() === targetUserId);
                if (isFollowing) {
                  // Unfollow
                  user.followingIds = user.followingIds?.filter(id => id.toString() !== targetUserId) || [];
                  targetUser.followerIds = targetUser.followerIds?.filter(id => id.toString() !== user._id.toString()) || [];
                  bot.answerCallbackQuery(query.id, {
                    text: `Unfollowed ${targetUser.name}`,
                    show_alert: false
                  });
                } else {
                  // Follow
                  user.followingIds = [...(user.followingIds || []), targetUser._id];
                  targetUser.followerIds = [...(targetUser.followerIds || []), user._id];
                  bot.answerCallbackQuery(query.id, {
                    text: `Now following ${targetUser.name}!`,
                    show_alert: false
                  });
                }
                await user.save();
                await targetUser.save();
                // Refresh profile
                const fakeProfileRefresh: any = { chat: { id: chatId }, text: `/profile ${targetUser.username}` };
                bot.emit('message', fakeProfileRefresh);
              }
            }
          } else {
            bot.answerCallbackQuery(query.id);
          }
      }
    } catch (error) {
      console.error('Error handling callback query:', error);
      bot.answerCallbackQuery(query.id, {
        text: '⚠️ An error occurred',
        show_alert: true
      });
    }
  });

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Skip if it's a command (starts with /)
    if (text?.startsWith('/')) return;

    // Check for 6-digit verification code
    if (text && /^\d{6}$/.test(text)) {
      try {
        const user = await User.findOneAndUpdate(
          { telegramAuthCode: text },
          { telegramChatId: chatId.toString() },
          { new: true }
        );

        if (user) {
          bot.sendMessage(
            chatId,
            `✅ *Account linked successfully!*\n\n` +
            `Welcome, ${user.name}! 🎉\n\n` +
            `You'll now receive instant notifications for:\n` +
            `• New messages 💬\n` +
            `• Likes and comments ❤️\n` +
            `• New followers 👥\n` +
            `• Trending posts 🔥\n\n` +
            `Use /menu to explore all features!`,
            {
              parse_mode: 'Markdown',
              reply_markup: getMainMenuKeyboard()
            }
          );
        } else {
          bot.sendMessage(
            chatId,
            "❌ *Invalid verification code*\n\n" +
            "The code you entered is incorrect or expired.\n\n" +
            "Please:\n" +
            "1. Go to the DDU Social web app\n" +
            "2. Get a new 6-digit code\n" +
            "3. Send it here\n\n" +
            "Need help? Use /support",
            { parse_mode: 'Markdown' }
          );
        }
      } catch (error) {
        console.error("Bot verification error:", error);
        bot.sendMessage(
          chatId,
          "⚠️ *Connection Error*\n\n" +
          "We're having trouble linking your account right now.\n\n" +
          "Please try again in a few moments. If the problem persists, contact /support",
          { parse_mode: 'Markdown' }
        );
      }
    }
    // Check for password reset requests
    else if (text?.toLowerCase().includes('reset password')) {
      bot.sendMessage(
        chatId,
        "🔐 *Password Reset*\n\n" +
        "To reset your password:\n\n" +
        "1. Open the DDU Social web app\n" +
        "2. Click 'Forgot Password'\n" +
        "3. Follow the instructions\n\n" +
        "You'll receive an OTP to reset your password.\n\n" +
        "Need help? Use /support",
        { parse_mode: 'Markdown' }
      );
    }
    // General help keywords
    else if (text?.toLowerCase().includes('support') || text?.toLowerCase().includes('help')) {
      bot.sendMessage(
        chatId,
        "💡 *Quick Help*\n\n" +
        "Here are the main commands:\n\n" +
        "/help - Full command list\n" +
        "/menu - Interactive menu\n" +
        "/support - Contact support\n" +
        "/start - Get started\n\n" +
        "Or choose an option from the menu below:",
        {
          parse_mode: 'Markdown',
          reply_markup: getMainMenuKeyboard()
        }
      );
    }
    // If user sends something else, check if they're linked
    else if (text) {
      const user = await getUserFromTelegram(chatId);
      if (!user) {
        bot.sendMessage(
          chatId,
          "👋 Hi there!\n\n" +
          "To use DDU Social Bot, please link your account first by sending your 6-digit verification code from the web app.\n\n" +
          "Don't have an account? Visit the DDU Social web app to sign up!\n\n" +
          "Use /help for more information."
        );
      } else {
        // User is linked but sent unknown text
        bot.sendMessage(
          chatId,
          `Hey ${user.name}! 👋\n\n` +
          "I didn't understand that. Try using /menu or /help to see what I can do!",
          {
            reply_markup: getMainMenuKeyboard()
          }
        );
      }
    }
  });

  console.log("Telegram Bot initialized");
  return bot;
}
