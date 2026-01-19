"""
Yota Analytics — Compute Trends
Calculate trend scores for videos and channels

Trend Score Formula:
trend_score = (velocity * 0.5) + (engagement * 0.3) + (recency * 0.2)
Range: 0-100
"""

from datetime import datetime, timezone
from typing import Optional


def compute_trend_score(video: dict) -> float:
    """
    Calculate trend score for a video.
    
    Args:
        video: Video dict with views, likes, comments, published_at
    
    Returns:
        Trend score (0-100)
    """
    # Extract data
    views = video.get('views', 0)
    likes = video.get('likes', 0)
    comments = video.get('comments', 0)
    published_at = video.get('published_at', '')
    
    if not published_at or views == 0:
        return 0.0
    
    # Calculate days since publish
    try:
        published_date = datetime.fromisoformat(published_at.replace('Z', '+00:00'))
        now = datetime.now(timezone.utc)
        days_since_publish = max((now - published_date).days, 0) + 1
    except:
        return 0.0
    
    # 1. View Velocity (50% weight)
    velocity = views / days_since_publish
    # Normalize: 10K views/day = max score
    velocity_normalized = min(velocity / 10000, 1.0) * 50
    
    # 2. Engagement Rate (30% weight)
    engagement_rate = (likes + comments) / views if views > 0 else 0
    # Normalize: 10% engagement = max score
    engagement_normalized = min(engagement_rate * 10, 1.0) * 30
    
    # 3. Recency Boost (20% weight)
    if days_since_publish <= 7:
        recency_score = 20  # 2x boost for < 7 days
    elif days_since_publish <= 14:
        recency_score = 15  # 1.5x boost for < 14 days
    else:
        recency_score = 10  # 1x baseline
    
    # Final score
    trend_score = velocity_normalized + engagement_normalized + recency_score
    
    return round(trend_score, 2)


def rank_videos_by_trend(videos: list[dict]) -> list[dict]:
    """
    Rank videos by trend score (highest first).
    
    Args:
        videos: List of video dicts
    
    Returns:
        Sorted list with trend_score added to each video
    """
    # Add trend scores
    for video in videos:
        video['trend_score'] = compute_trend_score(video)
    
    # Sort by score (descending)
    sorted_videos = sorted(videos, key=lambda v: v['trend_score'], reverse=True)
    
    return sorted_videos


def aggregate_channel_trend(channel_videos: list[dict]) -> float:
    """
    Calculate aggregate trend score for a channel.
    
    Args:
        channel_videos: List of videos from the same channel
    
    Returns:
        Average trend score across all videos
    """
    if not channel_videos:
        return 0.0
    
    scores = [compute_trend_score(v) for v in channel_videos]
    avg_score = sum(scores) / len(scores)
    
    return round(avg_score, 2)


def explain_trend(video: dict) -> str:
    """
    Generate human-readable explanation for why video is trending.
    
    Args:
        video: Video dict with trend_score already computed
    
    Returns:
        Explanation string
    """
    score = video.get('trend_score', 0)
    views = video.get('views', 0)
    likes = video.get('likes', 0)
    comments = video.get('comments', 0)
    published_at = video.get('published_at', '')
    
    # Calculate components
    try:
        published_date = datetime.fromisoformat(published_at.replace('Z', '+00:00'))
        now = datetime.now(timezone.utc)
        days = max((now - published_date).days, 0) + 1
    except:
        days = 1
    
    velocity = views / days
    engagement_rate = ((likes + comments) / views * 100) if views > 0 else 0
    
    # Build explanation
    parts = []
    
    # Velocity
    if velocity > 50000:
        parts.append("🚀 Explosive growth")
    elif velocity > 20000:
        parts.append("📈 High velocity")
    elif velocity > 5000:
        parts.append("⬆️ Strong momentum")
    else:
        parts.append("📊 Steady growth")
    
    # Engagement
    if engagement_rate > 5:
        parts.append("💬 Very engaged audience")
    elif engagement_rate > 3:
        parts.append("👍 Good engagement")
    
    # Recency
    if days <= 3:
        parts.append("🔥 Just published")
    elif days <= 7:
        parts.append("🆕 Fresh content")
    
    return " • ".join(parts)


def get_trending_channels(videos: list[dict]) -> list[dict]:
    """
    Group videos by channel and rank channels by trend.
    
    Args:
        videos: List of trending videos
    
    Returns:
        List of channel dicts with aggregated scores
    """
    # Group by channel
    channels_map = {}
    
    for video in videos:
        channel_id = video.get('channel_id', '')
        channel_name = video.get('channel_name', 'Unknown')
        
        if not channel_id:
            continue
        
        if channel_id not in channels_map:
            channels_map[channel_id] = {
                'channel_id': channel_id,
                'channel_name': channel_name,
                'videos': [],
                'trend_score': 0
            }
        
        channels_map[channel_id]['videos'].append(video)
    
    # Calculate scores
    channels = list(channels_map.values())
    for channel in channels:
        channel['trend_score'] = aggregate_channel_trend(channel['videos'])
        channel['video_count'] = len(channel['videos'])
    
    # Sort by score
    channels.sort(key=lambda c: c['trend_score'], reverse=True)
    
    return channels


if __name__ == "__main__":
    # Test with sample data
    test_video = {
        'title': 'Test Video',
        'views': 120000,
        'likes': 5000,
        'comments': 800,
        'published_at': '2026-01-16T10:00:00Z'  # 3 days ago
    }
    
    score = compute_trend_score(test_video)
    explanation = explain_trend({**test_video, 'trend_score': score})
    
    print(f"Trend Score: {score}/100")
    print(f"Explanation: {explanation}")
    
    # Expected: ~84 score
    # Velocity: 120K/3 = 40K/day → 50 points (maxed)
    # Engagement: 5.8K/120K = 4.8% → 14.4 points
    # Recency: <7 days → 20 points
    # Total: ~84 points
