// Vercel Serverless Function: Viral Feed with Recency + Velocity Scoring
import { google } from 'googleapis';
import cookie from 'cookie';
import crypto from 'crypto';

// Niche query mapping
const NICHE_QUERIES = {
    family: 'family vlog',
    babies: 'new baby vlog',
    comedy: 'comedy skit',
    pranks: 'prank video',
    couples: 'couples vlog',
    tech: 'tech review'
};

export default async function handler(req, res) {
    const cookies = cookie.parse(req.headers.cookie || '');
    const sessionToken = cookies.yota_session;
    const vipKey = req.headers['x-vip-key'];

    console.log('FEED: Request received');

    let auth = null;

    // VIP Bypass or Session Auth
    if (vipKey && vipKey === process.env.VIP_ACCESS_KEY) {
        auth = process.env.YOUTUBE_API_KEY;
        console.log('FEED: VIP Access Granted');
    } else if (sessionToken) {
        try {
            const sessionData = decrypt(sessionToken);
            const session = JSON.parse(sessionData);
            if (Date.now() >= session.expiry) {
                return res.status(401).json({ error: 'Session expired' });
            }
            auth = session.access_token;
        } catch (e) {
            return res.status(401).json({ error: 'Invalid session' });
        }
    } else {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    // Parse query params
    const {
        niche = 'family',
        windowDays = '7',
        pageToken,
        seed,
        regionCode = 'US',
        languageMode = 'en' // 'en', 'es', 'mixed'
    } = req.query;

    const windowDaysInt = parseInt(windowDays, 10) || 7;

    // Calculate publishedAfter date
    const now = new Date();
    const publishedAfter = new Date(now.getTime() - windowDaysInt * 24 * 60 * 60 * 1000);
    const publishedAfterISO = publishedAfter.toISOString();

    const query = NICHE_QUERIES[niche] || NICHE_QUERIES.family;
    const youtube = google.youtube({ version: 'v3', auth });

    try {
        let items = [];
        let nextToken = null;

        // Helper for search request
        const fetchSearch = async (lang) => {
            return youtube.search.list({
                part: ['id', 'snippet'],
                q: query,
                type: 'video',
                order: 'date',
                publishedAfter: publishedAfterISO,
                maxResults: languageMode === 'mixed' ? 15 : 25, // Fetch fewer per lang if mixed
                relevanceLanguage: lang,
                regionCode: regionCode,
                pageToken: pageToken || undefined
            });
        };

        // Step 1: Search for recent videos based on language mode
        if (languageMode === 'mixed') {
            // Parallel fetch for English and Spanish
            const [enRes, esRes] = await Promise.all([
                fetchSearch('en').catch(e => ({ data: { items: [] } })),
                fetchSearch('es').catch(e => ({ data: { items: [] } }))
            ]);

            // Merge and dedupe by videoId
            const allItems = [...(enRes.data.items || []), ...(esRes.data.items || [])];
            const seen = new Set();
            items = allItems.filter(item => {
                const id = item.id.videoId;
                if (!id || seen.has(id)) return false;
                seen.add(id);
                return true;
            });

            // For pagination in mixed mode, we just use the EN token for simplicity or null
            // A true robust mixed pagination is complex; simplified here for MVP
            nextToken = enRes.data.nextPageToken || null;

        } else {
            // Single language mode
            const res = await fetchSearch(languageMode);
            items = res.data.items || [];
            nextToken = res.data.nextPageToken || null;
        }

        const videoIds = items
            .filter(item => item.id.videoId)
            .map(item => item.id.videoId)
            .join(',');

        if (!videoIds) {
            return res.json({ items: [], nextPageToken: null });
        }

        // Step 2: Fetch statistics for scoring
        const statsResponse = await youtube.videos.list({
            part: ['statistics', 'snippet', 'contentDetails'],
            id: videoIds
        });

        // Optional: Fetch Channel details for Country (Best effort)
        const channelIds = [...new Set(statsResponse.data.items.map(i => i.snippet.channelId))];
        let channelCountries = {};

        if (channelIds.length > 0) {
            try {
                const channelsRes = await youtube.channels.list({
                    part: ['snippet'],
                    id: channelIds.join(',')
                });
                channelsRes.data.items.forEach(c => {
                    if (c.snippet.country) {
                        channelCountries[c.id] = c.snippet.country;
                    }
                });
            } catch (e) {
                console.warn('Channel country fetch failed', e);
            }
        }

        // Step 3: Compute Velocity Score
        const videos = statsResponse.data.items.map(item => {
            const publishedAt = new Date(item.snippet.publishedAt);
            const ageDays = Math.max((now - publishedAt) / (1000 * 60 * 60 * 24), 1);

            const views = parseInt(item.statistics.viewCount || 0);
            const likes = parseInt(item.statistics.likeCount || 0);
            const comments = parseInt(item.statistics.commentCount || 0);

            const viewsPerDay = views / ageDays;
            const likeRate = views > 0 ? likes / views : 0;
            const commentRate = views > 0 ? comments / views : 0;

            // Velocity Score Formula
            const velocityScore = viewsPerDay * (1 + 3 * likeRate + 2 * commentRate);

            return {
                id: item.id,
                title: item.snippet.title,
                channelTitle: item.snippet.channelTitle,
                channelId: item.snippet.channelId,
                channelCountry: channelCountries[item.snippet.channelId] || null,
                thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
                publishedAt: item.snippet.publishedAt,
                views,
                likes,
                comments,
                duration: item.contentDetails.duration,
                ageDays: Math.round(ageDays * 10) / 10,
                velocityScore: Math.round(velocityScore),
                viewsPerDay: Math.round(viewsPerDay)
            };
        });

        // Step 4: Sort by Velocity Score (highest first)
        videos.sort((a, b) => b.velocityScore - a.velocityScore);

        // Optional: Shuffle with seed for variety on refresh
        if (seed) {
            shuffleWithSeed(videos, parseInt(seed, 10));
        }

        res.json({
            items: videos,
            nextPageToken: nextToken,
            meta: {
                niche,
                windowDays: windowDaysInt,
                regionCode,
                languageMode,
                count: videos.length
            }
        });
    } catch (error) {
        console.error('FEED API error:', error);
        res.status(500).json({ error: 'Failed to fetch feed', details: error.message });
    }
}

function decrypt(text) {
    const decipher = crypto.createDecipher('aes-256-cbc', process.env.COOKIE_SECRET || 'fallback-secret');
    let decrypted = decipher.update(text, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

// Simple seeded shuffle (Fisher-Yates with seed)
function shuffleWithSeed(array, seed) {
    let m = array.length, t, i;
    while (m) {
        seed = (seed * 9301 + 49297) % 233280;
        i = Math.floor((seed / 233280) * m--);
        t = array[m];
        array[m] = array[i];
        array[i] = t;
    }
    return array;
}
