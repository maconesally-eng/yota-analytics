"""
Yota Analytics — Detect Outliers
Find videos that significantly outperform channel baseline

Outlier = video with views >= 1.8x median views
"""

import statistics
from collections import Counter
from typing import Optional


# Common stopwords to filter from keyword extraction
STOPWORDS = {
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'is', 'was', 'are', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'can', 'cant', 'our', 'we', 'us',
    'my', 'me', 'i', 'you', 'he', 'she', 'it', 'they', 'them', 'this',
    'that', 'these', 'those', 'what', 'which', 'who', 'when', 'where',
    'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
    'other', 'some', 'such', 'no', 'not', 'only', 'own', 'same', 'so',
    'than', 'too', 'very', 'just'
}

# Format detection patterns
FORMAT_PATTERNS = {
    'Q&A': ['q&a', 'questions', 'answers', 'ask me', 'ama'],
    'Vlog': ['vlog', 'day in', 'daily', 'life', 'routine'],
    'Challenge': ['challenge', 'try', 'trying', 'attempt', 'vs'],
    'Tutorial': ['how to', 'tutorial', 'guide', 'tips', 'learn'],
    'Storytime': ['storytime', 'story', 'happened', 'time i', 'time we'],
    'Announcement': ['announcement', 'news', 'update', 'reveal', 'surprise'],
    'Reaction': ['reaction', 'react', 'reacting', 'respond'],
    'Review': ['review', 'unboxing', 'haul', 'first impression']
}


def compute_baseline(videos: list[dict]) -> dict:
    """
    Calculate baseline metrics for a channel.
    
    Args:
        videos: List of video dicts with 'views' field
    
    Returns:
        {
            'median_views': int,
            'mean_views': int,
            'std_dev': float,
            'total_videos': int
        }
    """
    if not videos:
        return {
            'median_views': 0,
            'mean_views': 0,
            'std_dev': 0,
            'total_videos': 0
        }
    
    views = [v.get('views', 0) for v in videos]
    
    return {
        'median_views': int(statistics.median(views)),
        'mean_views': int(statistics.mean(views)),
        'std_dev': round(statistics.stdev(views), 2) if len(views) > 1 else 0,
        'total_videos': len(videos)
    }


def detect_outliers(videos: list[dict], threshold: float = 1.8) -> list[dict]:
    """
    Find videos that outperform baseline by threshold.
    
    Args:
        videos: List of channel videos
        threshold: Outlier ratio (default 1.8x median)
    
    Returns:
        List of outlier videos with 'outlier_ratio' added
    """
    if not videos:
        return []
    
    baseline = compute_baseline(videos)
    median_views = baseline['median_views']
    
    if median_views == 0:
        return []
    
    outlier_cutoff = median_views * threshold
    outliers = []
    
    for video in videos:
        views = video.get('views', 0)
        if views >= outlier_cutoff:
            ratio = round(views / median_views, 2)
            outlier = {**video, 'outlier_ratio': ratio}
            outliers.append(outlier)
    
    # Sort by ratio (highest first)
    outliers.sort(key=lambda v: v['outlier_ratio'], reverse=True)
    
    return outliers


def extract_keywords(titles: list[str], top_n: int = 5) -> list[tuple]:
    """
    Extract common keywords from titles.
    
    Args:
        titles: List of video titles
        top_n: Number of top keywords to return
    
    Returns:
        List of (word, count) tuples
    """
    all_words = []
    
    for title in titles:
        # Split and clean
        words = title.lower().replace('!', '').replace('?', '').split()
        
        # Filter stopwords and short words
        meaningful = [w for w in words 
                     if w not in STOPWORDS and len(w) > 2]
        
        all_words.extend(meaningful)
    
    # Count frequency
    counter = Counter(all_words)
    
    return counter.most_common(top_n)


def detect_formats(titles: list[str]) -> list[str]:
    """
    Detect common formats in titles.
    
    Args:
        titles: List of video titles
    
    Returns:
        List of detected format names
    """
    detected = []
    
    for format_name, keywords in FORMAT_PATTERNS.items():
        # Check if any title contains format keywords
        for title in titles:
            title_lower = title.lower()
            if any(kw in title_lower for kw in keywords):
                detected.append(format_name)
                break  # Only count format once
    
    return detected


def extract_patterns(outliers: list[dict], all_videos: list[dict]) -> dict:
    """
    Extract common patterns from outlier videos.
    
    Args:
        outliers: List of outlier videos
        all_videos: All videos (for comparison)
    
    Returns:
        {
            'common_keywords': [(word, count), ...],
            'detected_formats': [format_name, ...],
            'pattern_summary': str
        }
    """
    if not outliers:
        return {
            'common_keywords': [],
            'detected_formats': [],
            'pattern_summary': 'No outliers found'
        }
    
    # Extract titles
    outlier_titles = [o.get('title', '') for o in outliers]
    
    # Get keywords
    keywords = extract_keywords(outlier_titles, top_n=5)
    
    # Detect formats
    formats = detect_formats(outlier_titles)
    
    # Build summary
    summary_parts = []
    
    if keywords:
        top_words = ', '.join([f'"{w}"' for w, _ in keywords[:3]])
        summary_parts.append(f"Common words: {top_words}")
    
    if formats:
        formats_str = ', '.join(formats)
        summary_parts.append(f"Formats: {formats_str}")
    
    summary = ' • '.join(summary_parts) if summary_parts else 'No clear pattern detected'
    
    return {
        'common_keywords': keywords,
        'detected_formats': formats,
        'pattern_summary': summary
    }


if __name__ == "__main__":
    # Test with sample data
    test_videos = [
        {'title': 'Our Daily Vlog', 'views': 10000},
        {'title': 'Q&A with Fans', 'views': 12000},
        {'title': 'Morning Routine', 'views': 15000},
        {'title': 'MUST WATCH: Big News!', 'views': 45000},  # Outlier
        {'title': 'Couples Challenge', 'views': 18000},
        {'title': 'Day in Our Life', 'views': 20000},
        {'title': 'Q&A: You Asked, We Answered', 'views': 38000},  # Outlier
    ]
    
    print("📊 OUTLIER DETECTION TEST\n")
    
    # Compute baseline
    baseline = compute_baseline(test_videos)
    print(f"Baseline:")
    print(f"  Median: {baseline['median_views']:,} views")
    print(f"  Mean: {baseline['mean_views']:,} views")
    print(f"  Threshold (1.8x): {int(baseline['median_views'] * 1.8):,} views")
    print()
    
    # Detect outliers
    outliers = detect_outliers(test_videos, threshold=1.8)
    print(f"🔥 Found {len(outliers)} outliers:\n")
    
    for outlier in outliers:
        print(f"  {outlier['title']}")
        print(f"    {outlier['views']:,} views ({outlier['outlier_ratio']}x baseline)")
        print()
    
    # Extract patterns
    if outliers:
        patterns = extract_patterns(outliers, test_videos)
        print(f"💡 Patterns:")
        print(f"  {patterns['pattern_summary']}")
        if patterns['common_keywords']:
            print(f"\n  Top keywords:")
            for word, count in patterns['common_keywords']:
                print(f"    - {word}: {count}x")
