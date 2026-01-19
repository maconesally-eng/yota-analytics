"""
Yota Analytics — Compute Metrics
Pure Python metric calculations, no API calls.

All formulas match architecture/metrics_sop.md
"""

from datetime import datetime
from collections import Counter
from typing import Optional


def compute_avg_views(videos: list[dict]) -> float:
    """Calculate average views per video."""
    if not videos:
        return 0.0
    total_views = sum(v.get("views", 0) for v in videos)
    return round(total_views / len(videos), 2)


def compute_avg_engagement(videos: list[dict]) -> float:
    """Calculate average engagement rate across videos."""
    if not videos:
        return 0.0
    rates = [v.get("engagement_rate", 0) for v in videos]
    return round(sum(rates) / len(rates), 2)


def find_best_video(videos: list[dict]) -> Optional[str]:
    """Find the best performing video by views."""
    if not videos:
        return None
    best = max(videos, key=lambda v: v.get("views", 0))
    return best.get("title", "Unknown")


def find_best_upload_day(videos: list[dict]) -> str:
    """Find the most common upload day."""
    if not videos:
        return "N/A"
    
    days = []
    for video in videos:
        published = video.get("published_at", "")
        if published:
            try:
                dt = datetime.fromisoformat(published.replace("Z", "+00:00"))
                days.append(dt.strftime("%A"))  # Full day name
            except ValueError:
                continue
    
    if not days:
        return "N/A"
    
    day_counts = Counter(days)
    # Sort by count descending, then by day order for ties
    day_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    best_day = max(day_counts.keys(), key=lambda d: (day_counts[d], -day_order.index(d)))
    return best_day


def compute_upload_consistency(videos: list[dict]) -> str:
    """Calculate videos per week upload rate."""
    if not videos or len(videos) < 2:
        return "N/A"
    
    # Get date range
    dates = []
    for video in videos:
        published = video.get("published_at", "")
        if published:
            try:
                dt = datetime.fromisoformat(published.replace("Z", "+00:00"))
                dates.append(dt)
            except ValueError:
                continue
    
    if len(dates) < 2:
        return "N/A"
    
    oldest = min(dates)
    newest = max(dates)
    weeks = max(1, (newest - oldest).days / 7)
    videos_per_week = len(dates) / weeks
    
    return f"{videos_per_week:.1f} videos/week"


def compute_momentum_score(videos: list[dict]) -> int:
    """
    Calculate momentum score (1-100) based on recent view trends.
    Higher = newer videos performing better than older ones.
    """
    if not videos or len(videos) < 2:
        return 50  # Neutral
    
    # Sort by published date, newest first
    sorted_videos = sorted(
        videos,
        key=lambda v: v.get("published_at", ""),
        reverse=True
    )
    
    views = [v.get("views", 0) for v in sorted_videos]
    
    if len(views) < 2:
        return 50
    
    mid = len(views) // 2
    newer_avg = sum(views[:mid]) / mid if mid > 0 else 0
    older_avg = sum(views[mid:]) / (len(views) - mid) if (len(views) - mid) > 0 else 0
    
    if older_avg == 0:
        return 50 if newer_avg == 0 else 75
    
    growth_ratio = newer_avg / older_avg
    
    # Map to 1-100 scale
    score = 50 + (growth_ratio - 1) * 25
    return max(1, min(100, int(score)))


def get_momentum_label(score: int) -> str:
    """Get human-readable momentum label."""
    if score <= 20:
        return "Needs attention"
    elif score <= 40:
        return "Finding your rhythm"
    elif score <= 60:
        return "Steady pace"
    elif score <= 80:
        return "Growing nicely"
    else:
        return "On fire! 🔥"


def compute_all_insights(videos: list[dict]) -> dict:
    """Compute all insight metrics from video data."""
    momentum = compute_momentum_score(videos)
    
    return {
        "avg_views_per_video": compute_avg_views(videos),
        "avg_engagement_rate": compute_avg_engagement(videos),
        "best_performing_video": find_best_video(videos),
        "best_upload_day": find_best_upload_day(videos),
        "upload_consistency": compute_upload_consistency(videos),
        "momentum_score": momentum,
        "momentum_label": get_momentum_label(momentum)
    }


if __name__ == "__main__":
    # Test with sample data
    sample_videos = [
        {"title": "Video 1", "views": 1000, "engagement_rate": 5.0, "published_at": "2024-01-15T10:00:00Z"},
        {"title": "Video 2", "views": 1500, "engagement_rate": 6.0, "published_at": "2024-01-08T10:00:00Z"},
    ]
    insights = compute_all_insights(sample_videos)
    print(f"Insights: {insights}")
