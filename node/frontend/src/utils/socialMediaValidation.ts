/**
 * Utility functions for validating social media profile URLs
 */

export interface PlatformValidator {
  name: string;
  pattern: RegExp;
  example: string;
  message: string;
}

export const socialMediaValidators: Record<string, PlatformValidator> = {
  telegram_url: {
    name: "Telegram",
    pattern: /^https:\/\/(t\.me|telegram\.me)\/[a-zA-Z0-9_]{5,32}$/,
    example: "https://t.me/username",
    message: "Must be a valid Telegram profile URL (e.g., https://t.me/username)"
  },
  bluesky_url: {
    name: "Bluesky", 
    pattern: /^https:\/\/bsky\.app\/profile\/[a-zA-Z0-9._-]+$/,
    example: "https://bsky.app/profile/username.bsky.social",
    message: "Must be a valid Bluesky profile URL (e.g., https://bsky.app/profile/username.bsky.social)"
  },
  twitter_url: {
    name: "X/Twitter",
    pattern: /^https:\/\/(twitter\.com|x\.com)\/[a-zA-Z0-9_]{1,15}$/,
    example: "https://x.com/username",
    message: "Must be a valid X/Twitter profile URL (e.g., https://x.com/username)"
  }
};