"""
Yota Analytics — Fetch Videos
Fetches recent videos from YouTube Data API v3

Quota cost: ~2 units (playlistItems.list + videos.list)
"""

import os
import requests
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("YOUTUBE_API_KEY")
BASE_URL = "https://www.googleapis.com/youtube/v3"


def fetch_videos(uploads_playlist_id: str, max_results: int = 20) -> list[dict]:
    """
    Fetch recent videos from a channel's uploads playlist.
    
    Args:
        uploads_playlist_id: The uploads playlist ID (UUxxxxxx format)
        max_results: Maximum number of videos to fetch (default 20)
    
    Returns:
        list of video dicts with metadata
    """
    if not API_KEY:
        raise ValueError("YOUTUBE_API_KEY not found in environment")
    
    if not uploads_playlist_id:
        raise ValueError("uploads_playlist_id is required")
    
    # Step 1: Get video IDs from playlist
    playlist_url = f"{BASE_URL}/playlistItems"
    playlist_params = {
        "key": API_KEY,
        "playlistId": uploads_playlist_id,
        "part": "contentDetails",
        "maxResults": min(max_results, 50)
    }
    
    playlist_response = requests.get(playlist_url, params=playlist_params, timeout=10)
    
    if playlist_response.status_code != 200:
        raise Exception(f"Playlist API error: {playlist_response.status_code}")
    
    playlist_data = playlist_response.json()
    video_ids = [
        item["contentDetails"]["videoId"]
        for item in playlist_data.get("items", [])
    ]
    
    if not video_ids:
        return []
    
    # Step 2: Get video details
    videos_url = f"{BASE_URL}/videos"
    videos_params = {
        "key": API_KEY,
        "id": ",".join(video_ids),
        "part": "snippet,statistics"
    }
    
    videos_response = requests.get(videos_url, params=videos_params, timeout=10)
    
    if videos_response.status_code != 200:
        raise Exception(f"Videos API error: {videos_response.status_code}")
    
    videos_data = videos_response.json()
    
    videos = []
    for item in videos_data.get("items", []):
        snippet = item.get("snippet", {})
        stats = item.get("statistics", {})
        
        views = int(stats.get("viewCount", 0))
        likes = int(stats.get("likeCount", 0))
        comments = int(stats.get("commentCount", 0))
        
        # Calculate engagement rate
        engagement_rate = 0.0
        if views > 0:
            engagement_rate = round(((likes + comments) / views) * 100, 2)
        
        videos.append({
            "video_id": item["id"],
            "title": snippet.get("title", "Untitled"),
            "published_at": snippet.get("publishedAt", ""),
            "views": views,
            "likes": likes,
            "comments": comments,
            "engagement_rate": engagement_rate
        })
    
    return videos


if __name__ == "__main__":
    # Test with a playlist ID
    print("Use fetch_channel.py first to get uploads_playlist_id")
