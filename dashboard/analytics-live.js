/**
 * Yota Analytics — Live Analytics Engine
 * Computes analytics on-the-fly from YouTube API data
 */

class LiveAnalytics {
    /**
     * Fetch and compute full dashboard data for authenticated user
     */
    async fetchFullDashboardData() {
        try {
            // 1. Fetch Profile
            const profileResponse = await fetch('/api/youtube/profile', { credentials: 'include' });
            if (!profileResponse.ok) throw new Error('Failed to fetch profile');
            const profile = await profileResponse.json();

            // 2. Fetch Videos
            const videosResponse = await fetch('/api/youtube/videos', { credentials: 'include' });
            if (!videosResponse.ok) throw new Error('Failed to fetch videos');
            const videosData = await videosResponse.json();
            const videos = videosData.items || [];

            // 3. Compute Insights
            const insights = this.computeInsights(videos);

            return {
                channel: {
                    name: profile.name,
                    handle: profile.handle,
                    subscribers: parseInt(profile.subscribers),
                    total_views: parseInt(profile.views),
                    total_videos: parseInt(profile.videos),
                    channel_id: profile.id
                },
                insights: insights,
                recent_videos: videos.slice(0, 10),
                generated_at: new Date().toISOString(),
                isLive: true
            };
        } catch (error) {
            console.error('Live analytics error:', error);
            return null;
        }
    }

    /**
     * Compute insights from a list of videos
     */
    computeInsights(videos) {
        if (!videos || videos.length === 0) {
            return {
                momentum_score: 0,
                momentum_label: 'Needs Data',
                best_upload_day: 'N/A',
                avg_views_per_video: 0,
                avg_engagement_rate: 0,
                upload_consistency: 'Unknown',
                best_performing_video: 'None'
            };
        }

        // 1. Average Views
        const totalViews = videos.reduce((sum, v) => sum + v.views, 0);
        const avgViews = totalViews / videos.length;

        // 2. Momentum Score
        // Compare avg of last 5 videos vs avg of last 20
        const last5 = videos.slice(0, 5);
        const last20 = videos.slice(0, 20);
        const avgLast5 = last5.reduce((sum, v) => sum + v.views, 0) / Math.max(last5.length, 1);
        const avgLast20 = last20.reduce((sum, v) => sum + v.views, 0) / Math.max(last20.length, 1);

        let momentumScore = 50;
        if (avgLast20 > 0) {
            momentumScore = Math.min(Math.round((avgLast5 / avgLast20) * 50), 100);
        }

        const momentumLabel = momentumScore > 70 ? 'High Growth' : momentumScore > 40 ? 'Steady' : 'Needs Push';

        // 3. Best Upload Day
        const dayCounts = {};
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        videos.forEach(v => {
            const day = days[new Date(v.publishedAt).getDay()];
            if (!dayCounts[day]) dayCounts[day] = { totalViews: 0, count: 0 };
            dayCounts[day].totalViews += v.views;
            dayCounts[day].count += 1;
        });

        let bestDay = 'N/A';
        let maxAvg = 0;
        Object.keys(dayCounts).forEach(day => {
            const avg = dayCounts[day].totalViews / dayCounts[day].count;
            if (avg > maxAvg) {
                maxAvg = avg;
                bestDay = day;
            }
        });

        // 4. Engagement Rate
        const totalEngagement = videos.reduce((sum, v) => sum + v.likes + v.comments, 0);
        const avgEngagement = totalViews > 0 ? (totalEngagement / totalViews) * 100 : 0;

        // 5. Best Video
        const bestVideo = videos.reduce((prev, current) => (prev.views > current.views) ? prev : current);

        // 6. Consistency
        // Calculate weeks covered
        const oldest = new Date(videos[videos.length - 1].publishedAt);
        const newest = new Date(videos[0].publishedAt);
        const weeks = Math.max(Math.ceil((newest - oldest) / (7 * 24 * 60 * 60 * 1000)), 1);
        const uploadsPerWeek = videos.length / weeks;
        const consistency = uploadsPerWeek >= 2 ? 'Daily/Frequent' : uploadsPerWeek >= 1 ? 'Weekly' : 'Sporadic';

        return {
            momentum_score: momentumScore,
            momentum_label: momentumLabel,
            best_upload_day: bestDay,
            avg_views_per_video: avgViews,
            avg_engagement_rate: avgEngagement,
            upload_consistency: consistency,
            best_performing_video: bestVideo.title
        };
    }
}

window.liveAnalytics = new LiveAnalytics();
