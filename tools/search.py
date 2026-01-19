"""
Yota Analytics — Search Tool
Search YouTube channels, videos, and hashtags via API

Quota cost: 100 units per search (expensive!)
"""

import os
import requests
from typing import Optional, Literal
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("YOUTUBE_API_KEY")
BASE_URL = "https://www.googleapis.com/youtube/v3"

SearchType = Literal['channel', 'video', 'all']


def search_youtube(
    query: str,
    search_type: SearchType = 'video',
    max_results: int = 20
) -> dict:
    """
    Search YouTube via Data API v3.
    
    Args:
        query: Search term (e.g., "couples vlog" or "#couples")
        search_type: 'channel', 'video', or 'all'
        max_results: Max results to return (default 20, max 50)
    
    Returns:
        {
            'channels': [...],
            'videos': [...],
            'quota_used': 100
        }
    
    Raises:
        ValueError: If API key missing or invalid params
        Exception: If API error occurs
    """
    if not API_KEY:
        raise ValueError("YOUTUBE_API_KEY not found in environment")
    
    if not query:
        raise ValueError("query is required")
    
    if max_results > 50:
        max_results = 50
    
    # Determine search API type parameter
    api_type = None
    if search_type == 'channel':
        api_type = 'channel'
    elif search_type == 'video':
        api_type = 'video'
    # 'all' means no type filter
    
    # Call search.list API
    url = f"{BASE_URL}/search"
    params = {
        "key": API_KEY,
        "q": query,
        "part": "snippet",
        "maxResults": max_results,
        "order": "relevance"
    }
    
    if api_type:
        params["type"] = api_type
    
    response = requests.get(url, params=params, timeout=10)
    
    if response.status_code == 403:
        error_data = response.json()
        raise Exception(f"API quota exceeded or forbidden: {error_data}")
    
    if response.status_code != 200:
        raise Exception(f"API error: {response.status_code} - {response.text}")
    
    data = response.json()
    
    # Parse results
    channels = []
    videos = []
    
    for item in data.get("items", []):
        snippet = item.get("snippet", {})
        item_type = item["id"].get("kind", "")
        
        if item_type == "youtube#channel":
            channels.append({
                "channel_id": item["id"]["channelId"],
                "name": snippet.get("title", "Unknown"),
                "description": snippet.get("description", ""),
                "thumbnail": snippet.get("thumbnails", {}).get("default", {}).get("url", ""),
                "published_at": snippet.get("publishedAt", "")
            })
        
        elif item_type == "youtube#video":
            videos.append({
                "video_id": item["id"]["videoId"],
                "title": snippet.get("title", "Untitled"),
                "channel_name": snippet.get("channelTitle", "Unknown"),
                "channel_id": snippet.get("channelId", ""),
                "description": snippet.get("description", ""),
                "thumbnail": snippet.get("thumbnails", {}).get("medium", {}).get("url", ""),
                "published_at": snippet.get("publishedAt", "")
            })
    
    # Enrich channel data with subscriber counts (if channels found)
    if channels:
        channels = _enrich_channels(channels)
    
    # Enrich video data with view counts (if videos found)
    if videos:
        videos = _enrich_videos(videos)
    
    return {
        "channels": channels,
        "videos": videos,
        "quota_used": 100  # search.list always costs 100 units
    }


def _enrich_channels(channels: list[dict]) -> list[dict]:
    """Fetch subscriber counts for channels."""
    channel_ids = [ch["channel_id"] for ch in channels]
    
    url = f"{BASE_URL}/channels"
    params = {
        "key": API_KEY,
        "id": ",".join(channel_ids),
        "part": "statistics,snippet"
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        if response.status_code == 200:
            data = response.json()
            
            # Create lookup map
            stats_map = {}
            for item in data.get("items", []):
                channel_id = item["id"]
                stats = item.get("statistics", {})
                snippet = item.get("snippet", {})
                stats_map[channel_id] = {
                    "subscribers": int(stats.get("subscriberCount", 0)),
                    "handle": snippet.get("customUrl", "")
                }
            
            # Merge stats into channels
            for channel in channels:
                if channel["channel_id"] in stats_map:
                    channel.update(stats_map[channel["channel_id"]])
    
    except Exception as e:
        print(f"Warning: Could not enrich channels: {e}")
    
    return channels


def _enrich_videos(videos: list[dict]) -> list[dict]:
    """Fetch view counts for videos."""
    video_ids = [v["video_id"] for v in videos]
    
    url = f"{BASE_URL}/videos"
    params = {
        "key": API_KEY,
        "id": ",".join(video_ids),
        "part": "statistics"
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        if response.status_code == 200:
            data = response.json()
            
            # Create lookup map
            stats_map = {}
            for item in data.get("items", []):
                video_id = item["id"]
                stats = item.get("statistics", {})
                stats_map[video_id] = {
                    "views": int(stats.get("viewCount", 0)),
                    "likes": int(stats.get("likeCount", 0)),
                    "comments": int(stats.get("commentCount", 0))
                }
            
            # Merge stats into videos
            for video in videos:
                if video["video_id"] in stats_map:
                    video.update(stats_map[video["video_id"]])
    
    except Exception as e:
        print(f"Warning: Could not enrich videos: {e}")
    
    return videos


if __name__ == "__main__":
    import sys
    
    # Test search
    query = sys.argv[1] if len(sys.argv) > 1 else "couples vlog"
    search_type = sys.argv[2] if len(sys.argv) > 2 else "all"
    
    print(f"Searching for: {query} (type: {search_type})")
    results = search_youtube(query, search_type, max_results=5)
    
    print(f"\nFound {len(results['channels'])} channels, {len(results['videos'])} videos")
    print(f"Quota used: {results['quota_used']} units")
    
    if results['channels']:
        print("\nChannels:")
        for ch in results['channels'][:3]:
            print(f"  - {ch['name']} ({ch.get('subscribers', '?')} subs)")
    
    if results['videos']:
        print("\nVideos:")
        for v in results['videos'][:3]:
            print(f"  - {v['title']} ({v.get('views', '?')} views)")
