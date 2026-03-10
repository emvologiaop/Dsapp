import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { User } from '../src/models/User.js';

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
    bot.sendMessage(chatId, "Welcome to DDU Social Bot! 🚀\n\nPlease send me the 6-digit verification code from the web app to link your account.");
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
    } else if (text?.toLowerCase().includes('support')) {
      bot.sendMessage(chatId, "Contact @Dev_Envologia for technical issues.");
    }
  });

  console.log("Telegram Bot initialized");
  return bot;
}
