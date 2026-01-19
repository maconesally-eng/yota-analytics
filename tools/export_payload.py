"""
Yota Analytics — Export Payload
Exports analytics data to JSON and CSV formats.
"""

import json
import csv
import os
from datetime import datetime


def export_json(data: dict, output_dir: str = "output") -> str:
    """Export analytics data to JSON file."""
    os.makedirs(output_dir, exist_ok=True)
    filepath = os.path.join(output_dir, "analytics.json")
    
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    return filepath


def export_csv(data: dict, output_dir: str = "output") -> str:
    """Export analytics data to CSV file."""
    os.makedirs(output_dir, exist_ok=True)
    filepath = os.path.join(output_dir, "analytics.csv")
    
    # Flatten data for CSV
    rows = []
    
    # Channel info row
    channel = data.get("channel", {})
    rows.append({
        "type": "channel",
        "name": channel.get("name", ""),
        "value": "",
        "subscribers": channel.get("subscribers", 0),
        "total_views": channel.get("total_views", 0),
        "total_videos": channel.get("total_videos", 0)
    })
    
    # Insights row
    insights = data.get("insights", {})
    rows.append({
        "type": "insights",
        "name": "Momentum Score",
        "value": insights.get("momentum_score", 0),
        "subscribers": "",
        "total_views": "",
        "total_videos": ""
    })
    rows.append({
        "type": "insights",
        "name": "Momentum Label",
        "value": insights.get("momentum_label", ""),
        "subscribers": "",
        "total_views": "",
        "total_videos": ""
    })
    rows.append({
        "type": "insights",
        "name": "Best Upload Day",
        "value": insights.get("best_upload_day", ""),
        "subscribers": "",
        "total_views": "",
        "total_videos": ""
    })
    rows.append({
        "type": "insights",
        "name": "Avg Views/Video",
        "value": insights.get("avg_views_per_video", 0),
        "subscribers": "",
        "total_views": "",
        "total_videos": ""
    })
    
    # Video rows
    for video in data.get("recent_videos", []):
        rows.append({
            "type": "video",
            "name": video.get("title", ""),
            "value": video.get("views", 0),
            "subscribers": "",
            "total_views": "",
            "total_videos": ""
        })
    
    # Write CSV
    fieldnames = ["type", "name", "value", "subscribers", "total_views", "total_videos"]
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    
    return filepath


def export_all(data: dict, output_dir: str = "output") -> dict:
    """Export to all formats and return file paths."""
    return {
        "json": export_json(data, output_dir),
        "csv": export_csv(data, output_dir)
    }


if __name__ == "__main__":
    # Test export
    sample_data = {
        "channel": {"name": "Test Channel", "subscribers": 1000},
        "insights": {"momentum_score": 75, "momentum_label": "Growing nicely"},
        "recent_videos": [{"title": "Test Video", "views": 500}]
    }
    paths = export_all(sample_data)
    print(f"Exported to: {paths}")
