import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, ShieldCheck, Copy, ExternalLink, RefreshCw } from 'lucide-react';
import { FriendlyCard } from '../FriendlyCard';
import { getTelegramHandle, getTelegramProfileUrl } from '../../utils/telegram';

interface TelegramAuthProps {
  onComplete: () => void;
  initialCode?: string;
}

export const TelegramAuth: React.FC<TelegramAuthProps> = ({ onComplete, initialCode }) => {
  const [authCode, setAuthCode] = useState(initialCode || '');
  const [isVerifying, setIsVerifying] = useState(false);
  const [copied, setCopied] = useState(false);
  const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME;
  const botHandle = getTelegramHandle(botUsername);
  const botUrl = getTelegramProfileUrl(botUsername);

  useEffect(() => {
    if (!initialCode) {
      // Generate a unique 6-digit code if not provided
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setAuthCode(code);
    }
  }, [initialCode]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(authCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      // Poll backend to see if bot has updated the user's telegramChatId
      const response = await fetch(`/api/auth/verify-telegram/${authCode}`);
      
      let data;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(text || "Server returned non-JSON response");
      }
      
      if (data.verified) {
        onComplete();
      } else {
        alert(`Verification still pending. Please make sure you've sent the code to ${botHandle}`);
      }
    } catch (error) {
      console.error("Verification error:", error);
      alert("An error occurred during verification.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="w-full max-w-md px-6 py-12 flex flex-col h-full items-center text-center">
      <div className="mb-8 space-y-2">
        <div className="w-20 h-20 bg-neon-blue/10 rounded-full flex items-center justify-center mx-auto border border-neon-blue/20">
          <Send className="w-10 h-10 text-neon-blue" />
        </div>
        <h2 className="text-3xl font-bold tracking-tighter text-neon-blue">Link Telegram</h2>
        <p className="text-white/40">Sync your notifications & auth</p>
      </div>

      <FriendlyCard className="w-full space-y-6">
        <div className="space-y-4">
          <p className="text-sm text-white/60">
            1. Open <span className="text-neon-blue font-bold">{botHandle}</span> on Telegram
          </p>
          <a
            href={botUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs bg-white/5 border border-white/10 px-4 py-2 rounded-full hover:bg-white/10 transition-all"
          >
            Open Bot <ExternalLink size={14} />
          </a>
          
          <p className="text-sm text-white/60">
            2. Send this unique code to the bot:
          </p>
          
          <div className="relative group">
            <div className="bg-black/40 border-2 border-dashed border-neon-blue/30 rounded-2xl py-6 text-4xl font-mono tracking-widest text-neon-blue">
              {authCode}
            </div>
            <button
              onClick={copyToClipboard}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-all"
            >
              {copied ? <ShieldCheck className="text-emerald-400" size={20} /> : <Copy size={20} />}
            </button>
          </div>
        </div>

        <div className="pt-4">
          <button
            onClick={handleVerify}
            disabled={isVerifying}
            className="w-full py-4 bg-neon-blue text-black font-bold rounded-2xl neon-glow flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Verifying...
              </>
            ) : (
              "I've Sent the Code"
            )}
          </button>
        </div>
      </FriendlyCard>

      <p className="mt-8 text-xs text-white/30 max-w-xs">
        Linking Telegram allows you to receive real-time DM alerts and recover your account securely.
      </p>
    </div>
  );
};
