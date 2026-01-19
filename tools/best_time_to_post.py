"""
Yota Analytics — Best Time to Post
Analyze channel's upload history to find optimal days

Uses channel's OWN performance data, not generic industry stats
"""

from datetime import datetime
from collections import defaultdict
import json
import os


def analyze_upload_timing(videos: list[dict]) -> dict:
    """
    Find best upload days based on channel's performance.
    
    Args:
        videos: List of videos with 'published_at' and 'views'
    
    Returns:
        {
            'best_days': ['Wednesday', 'Saturday'],
            'day_stats': {...},
            'recommendation': str
        }
    """
    if not videos:
        return {
            'best_days': [],
            'day_stats': {},
            'recommendation': 'Not enough data to analyze'
        }
    
    # Group by weekday
    day_data = defaultdict(lambda: {'views': [], 'videos': []})
    
    for video in videos:
        published_at = video.get('published_at', '')
        views = video.get('views', 0)
        title = video.get('title', '')
        
        if not published_at:
            continue
        
        try:
            # Parse date
            date = datetime.fromisoformat(published_at.replace('Z', '+00:00'))
            weekday = date.strftime('%A')  # Monday, Tuesday, etc.
            
            day_data[weekday]['views'].append(views)
            day_data[weekday]['videos'].append(title)
        
        except:
            continue
    
    # Calculate stats per day
    day_stats = {}
    
    for day, data in day_data.items():
        if data['views']:
            avg_views = sum(data['views']) / len(data['views'])
            day_stats[day] = {
                'avg_views': int(avg_views),
                'video_count': len(data['views']),
                'total_views': sum(data['views'])
            }
    
    # Rank days by avg views
    ranked_days = sorted(
        day_stats.items(),
        key=lambda x: x[1]['avg_views'],
        reverse=True
    )
    
    # Top 2 days
    best_days = [day for day, _ in ranked_days[:2]]
    
    # Build recommendation
    if len(best_days) >= 2:
        recommendation = f"Upload on {best_days[0]} or {best_days[1]} for best performance"
    elif len(best_days) == 1:
        recommendation = f"Upload on {best_days[0]} consistently"
    else:
        recommendation = "Need more upload history to recommend"
    
    return {
        'best_days': best_days,
        'day_stats': day_stats,
        'recommendation': recommendation,
        'total_videos_analyzed': len(videos)
    }


def load_analytics_data(path: str = "output/analytics.json") -> dict:
    """Load analytics data from JSON file."""
    if not os.path.exists(path):
        raise FileNotFoundError(f"Analytics file not found: {path}")
    
    with open(path, 'r') as f:
        return json.load(f)


if __name__ == "__main__":
    print("\n📅 BEST TIME TO POST ANALYSIS\n")
    
    try:
        # Load data
        data = load_analytics_data()
        videos = data.get('recent_videos', [])
        channel_name = data.get('channel', {}).get('name', 'Your Channel')
        
        print(f"Analyzing: {channel_name}")
        print(f"Videos: {len(videos)}\n")
        
        # Analyze
        result = analyze_upload_timing(videos)
        
        # Display results
        print("📊 PERFORMANCE BY DAY:\n")
        
        # Sort by weekday order
        weekday_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        
        for day in weekday_order:
            if day in result['day_stats']:
                stats = result['day_stats'][day]
                is_best = day in result['best_days']
                marker = "⭐" if is_best else "  "
                
                print(f"{marker} {day:10} - {stats['avg_views']:>6,} avg views  ({stats['video_count']} videos)")
        
        print(f"\n🔥 TOP DAYS:")
        for i, day in enumerate(result['best_days'], 1):
            stats = result['day_stats'][day]
            print(f"   {i}. {day} - {stats['avg_views']:,} avg views")
        
        print(f"\n💡 RECOMMENDATION:")
        print(f"   {result['recommendation']}")
        
    except FileNotFoundError:
        print("❌ Error: No analytics data found")
        print("   Run 'python main.py' first to generate analytics")
    except Exception as e:
        print(f"❌ Error: {e}")
