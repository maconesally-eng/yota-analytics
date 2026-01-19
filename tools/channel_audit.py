"""
Yota Analytics — Channel Audit
Automated audit with 3 issues + 3 actions

Checks: Upload consistency, engagement, title length, timing, momentum
"""

from datetime import datetime
import json
import os
import statistics


def load_analytics_data(path: str = "output/analytics.json") -> dict:
    """Load analytics data from JSON file."""
    if not os.path.exists(path):
        raise FileNotFoundError(f"Analytics file not found: {path}")
    
    with open(path, 'r') as f:
        return json.load(f)


def audit_upload_consistency(videos: list[dict]) -> dict:
    """Check if uploads are regular."""
    if len(videos) < 3:
        return {
            'passed': False,
            'issue': 'Not enough upload history',
            'fix': 'Upload at least 1 video per week to build momentum'
        }
    
    # Calculate days between uploads
    dates = []
    for video in videos:
        published_at = video.get('published_at', '')
        if published_at:
            try:
                date = datetime.fromisoformat(published_at.replace('Z', '+00:00'))
                dates.append(date)
            except:
                pass
    
    if len(dates) < 3:
        return {'passed': False, 'issue': 'Inconsistent upload dates', 'fix': 'Upload regularly'}
    
    dates.sort()
    gaps = [(dates[i] - dates[i-1]).days for i in range(1, len(dates))]
    avg_gap = statistics.mean(gaps)
    std_gap = statistics.stdev(gaps) if len(gaps) > 1 else 0
    
    # Check consistency
    if std_gap > avg_gap * 0.5:  # High variance
        return {
            'passed': False,
            'issue': f'Inconsistent uploads (varies {min(gaps)}-{max(gaps)} days)',
            'fix': f'Upload every {int(avg_gap)} days consistently'
        }
    
    return {
        'passed': True,
        'issue': None,
        'fix': None,
        'info': f'Uploading every {int(avg_gap)} days'
    }


def audit_engagement_rate(insights: dict) -> dict:
    """Check if engagement rate is healthy."""
    eng_rate = insights.get('avg_engagement_rate', 0)
    
    if eng_rate < 2:
        return {
            'passed': False,
            'issue': f'Low engagement rate ({eng_rate:.1f}% - target is 3%+)',
            'fix': 'Add strong CTAs in first 30 seconds of videos'
        }
    elif eng_rate < 3:
        return {
            'passed': False,
            'issue': f'Below-average engagement ({eng_rate:.1f}%)',
            'fix': 'Ask questions to encourage comments and likes'
        }
    
    return {
        'passed': True,
        'issue': None,
        'fix': None,
        'info': f'Healthy engagement: {eng_rate:.1f}%'
    }


def audit_title_length(videos: list[dict]) -> dict:
    """Check if titles are optimized length."""
    short_titles = 0
    long_titles = 0
    
    for video in videos:
        title = video.get('title', '')
        length = len(title)
        
        if length < 30:
            short_titles += 1
        elif length > 70:
            long_titles += 1
    
    if short_titles > len(videos) * 0.4:
        return {
            'passed': False,
            'issue': f'{short_titles} titles too short (<30 chars)',
            'fix': 'Write more descriptive titles (40-60 characters ideal)'
        }
    
    if long_titles > len(videos) * 0.4:
        return {
            'passed': False,
            'issue': f'{long_titles} titles too long (>70 chars)',
            'fix': 'Shorten titles to 40-60 characters for better visibility'
        }
    
    return {
        'passed': True,
        'issue': None,
        'fix': None,
        'info': 'Title lengths optimized'
    }


def audit_momentum(insights: dict) -> dict:
    """Check if momentum score is healthy."""
    momentum = insights.get('momentum_score', 50)
    
    if momentum < 30:
        return {
            'passed': False,
            'issue': f'Low momentum ({momentum}/100)',
            'fix': 'Recent videos underperforming - try new formats or topics'
        }
    elif momentum < 50:
        return {
            'passed': False,
            'issue': f'Below-average momentum ({momentum}/100)',
            'fix': 'Experiment with trending topics in your niche'
        }
    
    return {
        'passed': True,
        'issue': None,
        'fix': None,
        'info': f'Good momentum: {momentum}/100'
    }


def run_channel_audit(data: dict) -> dict:
    """
    Run full channel audit.
    
    Returns:
        {
            'checks_run': int,
            'checks_passed': int,
            'issues': [...],
            'fixes': [...],
            'strengths': [...]
        }
    """
    videos = data.get('recent_videos', [])
    insights = data.get('insights', {})
    
    # Run all checks
    checks = [
        audit_upload_consistency(videos),
        audit_engagement_rate(insights),
        audit_title_length(videos),
        audit_momentum(insights)
    ]
    
    # Separate issues from strengths
    issues = []
    fixes = []
    strengths = []
    
    for check in checks:
        if not check['passed']:
            if check['issue']:
                issues.append(check['issue'])
            if check['fix']:
                fixes.append(check['fix'])
        else:
            if check.get('info'):
                strengths.append(check['info'])
    
    return {
        'checks_run': len(checks),
        'checks_passed': sum(1 for c in checks if c['passed']),
        'issues': issues[:3],  # Top 3
        'fixes': fixes[:3],    # Top 3
        'strengths': strengths
    }


if __name__ == "__main__":
    print("\n🔍 CHANNEL AUDIT\n")
    
    try:
        # Load data
        data = load_analytics_data()
        channel_name = data.get('channel', {}).get('name', 'Your Channel')
        
        print(f"Auditing: {channel_name}\n")
        
        # Run audit
        result = run_channel_audit(data)
        
        # Display results
        print(f"Checks completed: {result['checks_passed']}/{result['checks_run']} passed\n")
        
        if result['issues']:
            print("❌ TOP ISSUES:\n")
            for i, issue in enumerate(result['issues'], 1):
                print(f"   {i}. {issue}")
            print()
        
        if result['fixes']:
            print("✅ RECOMMENDED ACTIONS:\n")
            for i, fix in enumerate(result['fixes'], 1):
                print(f"   {i}. {fix}")
            print()
        
        if result['strengths']:
            print("💪 STRENGTHS:\n")
            for strength in result['strengths']:
                print(f"   ✓ {strength}")
            print()
        
        if not result['issues']:
            print("🎉 No major issues found! Keep up the great work.\n")
        
    except FileNotFoundError:
        print("❌ Error: No analytics data found")
        print("   Run 'python main.py' first to generate analytics")
    except Exception as e:
        print(f"❌ Error: {e}")
