"""
Yota Analytics — Discover Trending
Find trending videos in a niche using YouTube search + trend scoring

Quota cost: 100+ units per discovery
Cache: 6 hours
"""

import os
import json
from datetime import datetime, timedelta
from typing import Optional
from dotenv import load_dotenv

from tools.search import search_youtube
from tools.compute_trends import rank_videos_by_trend, explain_trend, get_trending_channels

load_dotenv()


def discover_trending(niche: str, max_results: int = 20) -> dict:
    """
    Discover trending videos in a niche.
    
    Args:
        niche: Keyword/niche (e.g., 'couples', 'family')
        max_results: Max videos to analyze (default 20)
    
    Returns:
        {
            'niche': str,
            'videos': [...],  # Sorted by trend score
            'channels': [...],  # Aggregated channel scores
            'generated_at': '...',
            'cache_until': '...',
            'quota_used': int
        }
    """
    print(f"🔍 Searching for trending '{niche}' content...")
    
    # Search YouTube for videos
    search_results = search_youtube(
        query=niche,
        search_type='video',
        max_results=max_results
    )
    
    videos = search_results.get('videos', [])
    quota_used = search_results.get('quota_used', 100)
    
    if not videos:
        return {
            'niche': niche,
            'videos': [],
            'channels': [],
            'generated_at': datetime.now().isoformat(),
            'cache_until': (datetime.now() + timedelta(hours=6)).isoformat(),
            'quota_used': quota_used
        }
    
    print(f"📊 Analyzing {len(videos)} videos for trends...")
    
    # Rank by trend score
    trending_videos = rank_videos_by_trend(videos)
    
    # Add explanations
    for video in trending_videos:
        video['trend_explanation'] = explain_trend(video)
    
    # Get trending channels
    trending_channels = get_trending_channels(trending_videos)
    
    # Build result
    result = {
        'niche': niche,
        'videos': trending_videos[:max_results],  # Top N
        'channels': trending_channels[:10],  # Top 10 channels
        'generated_at': datetime.now().isoformat(),
        'cache_until': (datetime.now() + timedelta(hours=6)).isoformat(),
        'quota_used': quota_used
    }
    
    return result


def save_trending_cache(niche: str, data: dict, output_dir: str = "output"):
    """Save trending results to cache file."""
    os.makedirs(output_dir, exist_ok=True)
    
    cache_file = f"{output_dir}/trending_{niche}.json"
    
    with open(cache_file, 'w') as f:
        json.dump(data, f, indent=2)
    
    print(f"💾 Cached trending data: {cache_file}")
    return cache_file


def load_trending_cache(niche: str, output_dir: str = "output") -> Optional[dict]:
    """Load trending results from cache if still valid."""
    cache_file = f"{output_dir}/trending_{niche}.json"
    
    try:
        with open(cache_file, 'r') as f:
            data = json.load(f)
        
        # Check if cache is still valid
        cache_until = datetime.fromisoformat(data['cache_until'])
        if datetime.now() < cache_until:
            print(f"✅ Using cached data (valid until {cache_until.strftime('%H:%M')})")
            return data
        else:
            print("⏰ Cache expired")
            return None
    
    except FileNotFoundError:
        print("📭 No cache found")
        return None
    except Exception as e:
        print(f"⚠️ Cache load error: {e}")
        return None


if __name__ == "__main__":
    import sys
    
    # Get niche from args
    niche = sys.argv[1] if len(sys.argv) > 1 else "couples"
    
    print(f"\n🔥 Discovering Trending: {niche.upper()}\n")
    
    # Try to load cache first
    cached = load_trending_cache(niche)
    
    if cached:
        result = cached
        print("(Using cached results)\n")
    else:
        # Discover trending
        result = discover_trending(niche, max_results=20)
        
        # Save to cache
        save_trending_cache(niche, result)
    
    # Display results
    print(f"\n🔥 TOP TRENDING VIDEOS IN '{niche.upper()}':\n")
    
    for i, video in enumerate(result['videos'][:10], 1):
        print(f"{i}. {video['title']}")
        print(f"   Channel: {video['channel_name']}")
        print(f"   🔥 Trend Score: {video['trend_score']}/100")
        print(f"   📊 {video.get('views', 0):,} views")
        print(f"   💡 {video['trend_explanation']}")
        print()
    
    print(f"\n📈 TOP TRENDING CHANNELS:\n")
    
    for i, channel in enumerate(result['channels'][:5], 1):
        print(f"{i}. {channel['channel_name']}")
        print(f"   🔥 Avg Score: {channel['trend_score']}/100")
        print(f"   🎬 {channel['video_count']} trending videos")
        print()
    
    print(f"\n💰 Quota used: {result['quota_used']} units")
    print(f"🕐 Cache valid until: {datetime.fromisoformat(result['cache_until']).strftime('%Y-%m-%d %H:%M')}")
