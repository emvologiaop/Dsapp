import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, ShieldCheck, Copy, ExternalLink, RefreshCw } from 'lucide-react';
import { FriendlyCard } from '../FriendlyCard';
import { getTelegramHandle, getTelegramDeepLink, getTelegramProfileUrl } from '../../utils/telegram';

interface TelegramAuthProps {
  onComplete: (userData?: any) => void;
  initialCode?: string;
}

export const TelegramAuth: React.FC<TelegramAuthProps> = ({ onComplete, initialCode }) => {
  const [authCode, setAuthCode] = useState(initialCode || '');
  const [isVerifying, setIsVerifying] = useState(false);
  const [copied, setCopied] = useState(false);
  const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME;
  const botHandle = getTelegramHandle(botUsername);
  const botUrl = authCode
    ? getTelegramDeepLink(authCode, botUsername)
    : getTelegramProfileUrl(botUsername);

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
        onComplete(data.user);
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
        <p className="text-muted-foreground">Telegram linking is required to finish registration and secure your authentication.</p>
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
            className="inline-flex items-center gap-2 text-xs bg-muted border border-border px-4 py-2 rounded-full hover:bg-muted/80 transition-all"
          >
            Open Bot &amp; Send Code <ExternalLink size={14} />
          </a>
          
          <p className="text-sm text-muted-foreground">
            2. Tap <strong>Start</strong> in Telegram — the bot will verify your code automatically. Or copy the code below and send it manually:
          </p>
          
          <div className="relative group">
            <div className="bg-muted/60 border-2 border-dashed border-neon-blue/30 rounded-2xl py-6 text-4xl font-mono tracking-widest text-neon-blue">
              {authCode}
            </div>
            <button
              onClick={copyToClipboard}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-background/80 border border-border rounded-lg hover:bg-muted transition-all"
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

      <p className="mt-8 text-xs text-muted-foreground max-w-xs">
        This Telegram step is mandatory for secure sign-in, account recovery, and optional real-time notification delivery.
      </p>
    </div>
  );
};
