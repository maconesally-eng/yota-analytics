"""
Yota Analytics — Fetch Channel
Fetches channel metadata from YouTube Data API v3

Quota cost: 1 unit
"""

import os
import requests
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("YOUTUBE_API_KEY")
BASE_URL = "https://www.googleapis.com/youtube/v3"


def fetch_channel(channel_id: str) -> Optional[dict]:
    """
    Fetch channel metadata from YouTube API.
    
    Args:
        channel_id: YouTube channel ID (UCxxxxxx format)
    
    Returns:
        dict with channel info or None if error
    """
    if not API_KEY:
        raise ValueError("YOUTUBE_API_KEY not found in environment")
    
    if not channel_id:
        raise ValueError("channel_id is required")
    
    url = f"{BASE_URL}/channels"
    params = {
        "key": API_KEY,
        "id": channel_id,
        "part": "snippet,statistics,contentDetails"
    }
    
    response = requests.get(url, params=params, timeout=10)
    
    if response.status_code == 403:
        error_data = response.json()
        raise Exception(f"API quota exceeded or forbidden: {error_data}")
    
    if response.status_code != 200:
        raise Exception(f"API error: {response.status_code} - {response.text}")
    
    data = response.json()
    
    if not data.get("items"):
        return None
    
    item = data["items"][0]
    snippet = item.get("snippet", {})
    stats = item.get("statistics", {})
    content = item.get("contentDetails", {})
    
    return {
        "channel_id": channel_id,
        "name": snippet.get("title", "Unknown"),
        "handle": snippet.get("customUrl", ""),
        "description": snippet.get("description", ""),
        "subscribers": int(stats.get("subscriberCount", 0)),
        "total_views": int(stats.get("viewCount", 0)),
        "total_videos": int(stats.get("videoCount", 0)),
        "created_at": snippet.get("publishedAt", ""),
        "uploads_playlist_id": content.get("relatedPlaylists", {}).get("uploads", "")
    }


if __name__ == "__main__":
    # Test with a channel ID from environment
    test_channel = os.getenv("YOUTUBE_CHANNEL_ID")
    if test_channel:
        result = fetch_channel(test_channel)
        print(f"Channel: {result}")
    else:
        print("Set YOUTUBE_CHANNEL_ID in .env to test")
