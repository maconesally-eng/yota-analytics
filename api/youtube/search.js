// Vercel Serverless Function: Proxy YouTube Search & Trend Analysis
import { google } from 'googleapis';
import cookie from 'cookie';
import crypto from 'crypto';

export default async function handler(req, res) {
    const cookies = cookie.parse(req.headers.cookie || '');
    const sessionToken = cookies.yota_session;
    const vipKey = req.headers['x-vip-key'];

    console.log('DEBUG: Search Request from ' + (req.headers['x-forwarded-for'] || 'unknown'));
    console.log('DEBUG: Headers - VIP:', vipKey ? 'PRESENT' : 'MISSING');
    console.log('DEBUG: Env - VIP Key:', process.env.VIP_ACCESS_KEY ? 'CONFIGURED' : 'MISSING');
    console.log('DEBUG: Env - API Key:', process.env.YOUTUBE_API_KEY ? 'CONFIGURED' : 'MISSING');

    let auth = null;

    // A. Check for VIP Bypass (Dev Mode)
    if (vipKey && vipKey === process.env.VIP_ACCESS_KEY) {
        console.log('⚡ VIP Access Granted');
        auth = process.env.YOUTUBE_API_KEY; // Use API Key for server-side search
        if (!auth) {
            console.error('CRITICAL: VIP Access granted but YOUTUBE_API_KEY is MISSING in environment variables.');
        } else {
            console.log('DEBUG: Using Server-Side YOUTUBE_API_KEY');
        }
    }
    // B. Standard User Auth
    else if (sessionToken) {
        try {
            const sessionData = decrypt(sessionToken);
            const session = JSON.parse(sessionData);
            if (Date.now() >= session.expiry) {
                console.log('DEBUG: Session Expired');
                return res.status(401).json({ error: 'Session expired' });
            }
            auth = session.access_token;
            console.log('DEBUG: Using User OAuth Token');
        } catch (e) {
            console.error('DEBUG: Session Decrypt Error', e);
            return res.status(401).json({ error: 'Invalid session' });
        }
    } else {
        console.log('DEBUG: No Auth Method (No VIP Key matched, No Session)');
        return res.status(401).json({
            error: 'Not authenticated',
            debug: {
                vipHeaderSent: !!vipKey,
                vipKeyMatch: vipKey === process.env.VIP_ACCESS_KEY,
                envVipConfigured: !!process.env.VIP_ACCESS_KEY
            }
        });
    }

    const { q } = req.query;
    if (!q) {
        return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    try {
        const youtube = google.youtube({
            version: 'v3',
            auth: auth
        });

        // 1. Search for videos
        const searchResponse = await youtube.search.list({
            part: ['id', 'snippet'],
            q: q,
            type: 'video',
            maxResults: 20,
            order: 'viewCount', // Get popular videos to find trends
            relevanceLanguage: 'en',
            regionCode: 'US'
        });

        const videoIds = searchResponse.data.items.map(item => item.id.videoId).join(',');

        if (!videoIds) {
            return res.json({ items: [] });
        }

        // 2. Fetch statistics for these videos
        const statsResponse = await youtube.videos.list({
            part: ['statistics', 'snippet', 'contentDetails'],
            id: videoIds
        });

        // 3. Compute Trend Scores
        const videos = statsResponse.data.items.map(item => {
            const video = {
                id: item.id,
                title: item.snippet.title,
                channelTitle: item.snippet.channelTitle,
                thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
                publishedAt: item.snippet.publishedAt,
                views: parseInt(item.statistics.viewCount || 0),
                likes: parseInt(item.statistics.likeCount || 0),
                comments: parseInt(item.statistics.commentCount || 0),
                duration: item.contentDetails.duration
            };

            video.trendScore = computeTrendScore(video);
            video.trendExplanation = explainTrend(video);

            return video;
        });

        // 4. Sort by Trend Score
        videos.sort((a, b) => b.trendScore - a.trendScore);

        res.json({ items: videos });
    } catch (error) {
        console.error('YouTube API error:', error);
        res.status(500).json({ error: 'Failed to fetch trending data' });
    }
}

function decrypt(text) {
    const decipher = crypto.createDecipher('aes-256-cbc', process.env.COOKIE_SECRET || 'fallback-secret');
    let decrypted = decipher.update(text, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

// --- Trend Algorithm (Ported from tools/compute_trends.py) ---

function computeTrendScore(video) {
    if (!video.publishedAt || video.views === 0) return 0;

    const publishedDate = new Date(video.publishedAt);
    const now = new Date();
    // Ensure at least 1 day to avoid division by zero
    const daysSincePublish = Math.max((now - publishedDate) / (1000 * 60 * 60 * 24), 1);

    // 1. View Velocity (50% weight)
    const velocity = video.views / daysSincePublish;
    // Normalize: 10K views/day = max score (50 points)
    const velocityNormalized = Math.min(velocity / 10000, 1.0) * 50;

    // 2. Engagement Rate (30% weight)
    const engagementRate = ((video.likes + video.comments) / video.views);
    // Normalize: 10% engagement = max score (30 points)
    const engagementNormalized = Math.min(engagementRate * 10, 1.0) * 30;

    // 3. Recency Boost (20% weight)
    let recencyScore = 10;
    if (daysSincePublish <= 7) recencyScore = 20;
    else if (daysSincePublish <= 14) recencyScore = 15;

    return Math.round(velocityNormalized + engagementNormalized + recencyScore);
}

function explainTrend(video) {
    if (!video.publishedAt) return '';

    const publishedDate = new Date(video.publishedAt);
    const now = new Date();
    const days = Math.max((now - publishedDate) / (1000 * 60 * 60 * 24), 1);

    const velocity = video.views / days;
    const engagementRate = (video.views > 0) ? ((video.likes + video.comments) / video.views * 100) : 0;

    const parts = [];

    // Velocity
    if (velocity > 50000) parts.push("🚀 Explosive growth");
    else if (velocity > 20000) parts.push("📈 High velocity");
    else if (velocity > 5000) parts.push("⬆️ Strong momentum");
    else parts.push("📊 Steady growth");

    // Engagement
    if (engagementRate > 5) parts.push("💬 Very engaged audience");
    else if (engagementRate > 3) parts.push("👍 Good engagement");

    // Recency
    if (days <= 3) parts.push("🔥 Just published");
    else if (days <= 7) parts.push("🆕 Fresh content");

    return parts.join(" • ");
}
