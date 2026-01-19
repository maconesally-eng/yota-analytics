"""
Yota Analytics — Main Entry Point
Orchestrates: fetch → compute → export
"""

import os
import sys
from datetime import datetime, timezone
from dotenv import load_dotenv

# Add tools to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from tools.fetch_channel import fetch_channel
from tools.fetch_videos import fetch_videos
from tools.compute_metrics import compute_all_insights
from tools.export_payload import export_all


def main():
    """Main orchestration function."""
    load_dotenv()
    
    # Get channel ID from environment
    channel_id = os.getenv("YOUTUBE_CHANNEL_ID")
    
    if not channel_id:
        print("❌ Error: YOUTUBE_CHANNEL_ID not set in .env")
        print("   Please add your channel ID to the .env file")
        print("   Find it at: https://www.youtube.com/account_advanced")
        sys.exit(1)
    
    print("🚀 Yota Analytics — Starting...")
    print(f"   Channel ID: {channel_id}")
    print()
    
    # Step 1: Fetch channel data
    print("📡 Fetching channel data...")
    try:
        channel_data = fetch_channel(channel_id)
        if not channel_data:
            print("❌ Channel not found. Check your channel ID.")
            sys.exit(1)
        print(f"   ✅ Found: {channel_data['name']}")
    except Exception as e:
        print(f"❌ Error fetching channel: {e}")
        sys.exit(1)
    
    # Step 2: Fetch recent videos
    print("📹 Fetching recent videos...")
    try:
        uploads_playlist_id = channel_data.get("uploads_playlist_id")
        if not uploads_playlist_id:
            print("❌ Could not find uploads playlist")
            sys.exit(1)
        
        videos = fetch_videos(uploads_playlist_id, max_results=20)
        print(f"   ✅ Found {len(videos)} videos")
    except Exception as e:
        print(f"❌ Error fetching videos: {e}")
        sys.exit(1)
    
    # Step 3: Compute insights
    print("🧮 Computing insights...")
    insights = compute_all_insights(videos)
    print(f"   ✅ Momentum Score: {insights['momentum_score']} - {insights['momentum_label']}")
    
    # Step 4: Build final payload
    payload = {
        "channel": {
            "name": channel_data["name"],
            "handle": channel_data.get("handle", ""),
            "subscribers": channel_data["subscribers"],
            "total_views": channel_data["total_views"],
            "total_videos": channel_data["total_videos"],
            "created_at": channel_data.get("created_at", "")
        },
        "recent_videos": videos,
        "insights": insights,
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    }
    
    # Step 5: Export
    print("💾 Exporting data...")
    try:
        paths = export_all(payload)
        print(f"   ✅ JSON: {paths['json']}")
        print(f"   ✅ CSV: {paths['csv']}")
    except Exception as e:
        print(f"❌ Error exporting: {e}")
        sys.exit(1)
    
    print()
    print("=" * 50)
    print("🎉 Yota Analytics Complete!")
    print("=" * 50)
    print()
    print(f"📊 Channel: {channel_data['name']}")
    print(f"👥 Subscribers: {channel_data['subscribers']:,}")
    print(f"👁️  Total Views: {channel_data['total_views']:,}")
    print(f"🎬 Videos Analyzed: {len(videos)}")
    print()
    print(f"💫 Momentum: {insights['momentum_score']}/100 — {insights['momentum_label']}")
    print(f"📅 Best Upload Day: {insights['best_upload_day']}")
    print(f"📈 Avg Views/Video: {insights['avg_views_per_video']:,.0f}")
    print()
    print("🌐 Open dashboard/index.html in your browser to view the full dashboard!")
    
    return payload


if __name__ == "__main__":
    main()
