# Yota Analytics — Metrics SOP

> Standard Operating Procedures for metric calculations.
> All formulas are deterministic and documented here before implementation.

---

## 1. Core Metrics

### Engagement Rate
```
engagement_rate = ((likes + comments) / views) * 100
```
- Returns percentage (0-100+)
- If views = 0, return 0

### Average Views Per Video
```
avg_views = total_views / total_videos
```
- If total_videos = 0, return 0

### Upload Consistency
```
videos_per_week = video_count / weeks_since_first_upload
```
- Displayed as: "X.X videos/week"

---

## 2. Insight Metrics

### Best Upload Day
- Count videos by day of week (Monday-Sunday)
- Return day with highest count
- Tie-breaker: earliest day in week

### Momentum Score (1-100)
Measures recent growth trajectory:
```python
def momentum_score(recent_views: list[int]) -> int:
    """
    recent_views: list of view counts for last N videos (newest first)
    """
    if len(recent_views) < 2:
        return 50  # Neutral
    
    # Calculate trend direction
    older_avg = sum(recent_views[len(recent_views)//2:]) / (len(recent_views)//2)
    newer_avg = sum(recent_views[:len(recent_views)//2]) / (len(recent_views)//2)
    
    if older_avg == 0:
        return 50
    
    growth_ratio = newer_avg / older_avg
    
    # Map to 1-100 scale
    # 0.5x = 25, 1.0x = 50, 2.0x = 75, 4.0x = 100
    score = 50 + (growth_ratio - 1) * 25
    return max(1, min(100, int(score)))
```

### Momentum Labels
| Score Range | Label |
|-------------|-------|
| 1-20 | "Needs attention" |
| 21-40 | "Slowing down" |
| 41-60 | "Steady pace" |
| 61-80 | "Growing nicely" |
| 81-100 | "On fire!" |

---

## 3. Edge Cases

### New Channel (0 videos)
- Return all metrics as 0 or "N/A"
- Momentum score: 50 (neutral)
- Momentum label: "Just getting started"

### Private/Unlisted Videos
- API won't return these
- Calculate based on public videos only

### Very Old Channels
- Only analyze last 20 videos for momentum
- Full history for total counts

---

## 4. Rate Limit Handling

### Quota Budget Per Run
| Call | Cost | Max/Run |
|------|------|---------|
| channels.list | 1 | 1 |
| playlistItems.list | 1 | 1 |
| videos.list | 1 | 1 |
| **Total** | — | **~3** |

### Retry Logic
1. On 403 (quota exceeded): Stop, log error, do not retry
2. On 5xx: Retry up to 3 times with exponential backoff
3. On network error: Retry up to 2 times

---

## 5. Tone Guidelines

All displayed text must be:
- Supportive, not alarming
- Action-oriented
- No jargon

**Examples:**
- ❌ "Your views dropped 40%"
- ✅ "Your recent videos are finding their rhythm"
- ❌ "Low engagement rate: 2.1%"
- ✅ "Your audience is starting to engage — keep going!"
