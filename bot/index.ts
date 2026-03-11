import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { User } from '../src/models/User.js';
import { Ad } from '../src/models/Ad.js';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;

export function initBot(io?: any) {
  if (!token) {
    console.warn("TELEGRAM_BOT_TOKEN not found. Bot will not start.");
    return null;
  }

  const bot = new TelegramBot(token, { polling: true });

  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(
      chatId,
      "Welcome to DDU Social Bot! 🚀\n\n" +
      "Please send me the 6-digit verification code from the web app to link your account.\n\n" +
      "Available commands:\n" +
      "/help - Show available commands\n" +
      "/contact - Contact the developer\n" +
      "/support - Get technical support"
    );
  });

  // Help command
  bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(
      chatId,
      "📱 *DDU Social Bot Commands*\n\n" +
      "/start - Get started and link your account\n" +
      "/help - Show this help message\n" +
      "/contact - Contact the developer\n" +
      "/support - Get technical support\n" +
      "/ads - View latest advertisements\n\n" +
      "You can also send your 6-digit verification code to link your account.",
      { parse_mode: 'Markdown' }
    );
  });

  // Contact developer command
  bot.onText(/\/contact/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(
      chatId,
      "👨‍💻 *Contact the Developer*\n\n" +
      "Need to reach out to the development team?\n\n" +
      "Telegram: @Dev_Envologia\n" +
      "Email: Envologia01@gmail.com\n\n" +
      "For technical issues and support, use /support",
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '📱 Message Developer', url: 'https://t.me/Dev_Envologia' }
          ]]
        }
      }
    );
  });

  // Support command
  bot.onText(/\/support/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(
      chatId,
      "🆘 *Technical Support*\n\n" +
      "Experiencing technical issues?\n\n" +
      "Contact @Dev_Envologia for:\n" +
      "• Bug reports\n" +
      "• Technical problems\n" +
      "• Feature requests\n" +
      "• Account issues\n\n" +
      "Email: Envologia01@gmail.com",
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '📧 Email Support', url: 'mailto:Envologia01@gmail.com' },
            { text: '💬 Telegram', url: 'https://t.me/Dev_Envologia' }
          ]]
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
        $or: [
          { startDate: { $exists: false } },
          { startDate: { $lte: now } }
        ],
        $or: [
          { endDate: { $exists: false } },
          { endDate: { $gte: now } }
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

  // Handle callback queries for ad clicks
  bot.on('callback_query', async (query) => {
    const chatId = query.message?.chat.id;
    const data = query.data;

    if (data && data.startsWith('ad_click_')) {
      const adId = data.replace('ad_click_', '');

      try {
        const ad = await Ad.findById(adId);
        if (ad) {
          ad.clicks += 1;
          await ad.save();
        }

        // Answer the callback query
        bot.answerCallbackQuery(query.id, {
          text: '✅ Opening link...',
          show_alert: false
        });
      } catch (error) {
        console.error('Error tracking ad click:', error);
        bot.answerCallbackQuery(query.id);
      }
    }
  });

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (text && /^\d{6}$/.test(text)) {
      try {
        const user = await User.findOneAndUpdate(
          { telegramAuthCode: text },
          { telegramChatId: chatId.toString() },
          { new: true }
        );
        if (user) {
          bot.sendMessage(chatId, `✅ Account linked successfully, ${user.name}! You will now receive DDU Social notifications here.`);
        } else {
          bot.sendMessage(chatId, "❌ Invalid verification code. Please check the web app and try again.");
        }
      } catch (error) {
        console.error("Bot verification error:", error);
        bot.sendMessage(chatId, "⚠️ An error occurred while linking your account. Please try again later.");
      }
    } else if (text?.toLowerCase().includes('reset password')) {
      bot.sendMessage(chatId, "🔐 Password Reset Requested.\n\nPlease provide your registered email address to receive an OTP.");
    } else if (text?.toLowerCase().includes('@')) {
      const otp = crypto.randomInt(100000, 1000000).toString();
      bot.sendMessage(chatId, `🔑 Your DDU Social Password Reset OTP is: ${otp}\n\nUse this code in the web app to reset your password.`);
    } else if (text?.toLowerCase().includes('support') || text?.toLowerCase().includes('help')) {
      bot.sendMessage(
        chatId,
        "For help, use /help\nFor support, use /support\nTo contact developer, use /contact"
      );
    }
  });

  console.log("Telegram Bot initialized");
  return bot;
}
