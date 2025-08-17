"""
Validation utilities for social media URLs
"""
import re
import typing


class SocialMediaValidator:
    """Validator for social media profile URLs"""
    
    VALIDATORS = {
        'telegram_url': {
            'pattern': r'^https://(t\.me|telegram\.me)/[a-zA-Z0-9_]{5,32}$',
            'message': 'Must be a valid Telegram profile URL (e.g., https://t.me/username)',
            'example': 'https://t.me/username'
        },
        'bluesky_url': {
            'pattern': r'^https://bsky\.app/profile/[a-zA-Z0-9._-]+$',
            'message': 'Must be a valid Bluesky profile URL (e.g., https://bsky.app/profile/username.bsky.social)',
            'example': 'https://bsky.app/profile/username.bsky.social'
        },
        'twitter_url': {
            'pattern': r'^https://(twitter\.com|x\.com)/[a-zA-Z0-9_]{1,15}$',
            'message': 'Must be a valid X/Twitter profile URL (e.g., https://x.com/username)',
            'example': 'https://x.com/username'
        }
    }
    
    @classmethod
    def validate_url(cls, url: str, platform: str) -> str:
        """Validate a social media URL for a specific platform"""
        if not url or url == "":
            return url  # Empty is allowed
            
        validator = cls.VALIDATORS.get(platform)
        if not validator:
            return url  # No validator defined, pass through
            
        pattern = validator['pattern']
        if not re.match(pattern, url):
            from rest_framework import serializers
            raise serializers.ValidationError(validator['message'])
            
        return url
