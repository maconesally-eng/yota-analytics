// Vercel Serverless Function: Viral Feed with Discovery Modes + VidIQ-Style Scoring
import { google } from 'googleapis';
import cookie from 'cookie';
import crypto from 'crypto';

// Discovery Mode Configurations
const DISCOVERY_MODES = {
    forYou: { windowDays: 7, description: 'Personalized for your region' },
    trending: { windowDays: 1, description: 'Explosive growth in last 24h' },
    weekMovers: { windowDays: 7, description: 'Top performers this week' },
    risingSmall: { windowDays: 7, description: 'Rising small channels (<200K subs)', maxSubs: 200000 },
    wildcard: { windowDays: 7, description: 'Diverse discovery with variety boost' }
};

// Default search queries (used when no specific query provided)
const DEFAULT_QUERIES = [
    'trending video',
    'viral video',
    'popular video'
];

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
        mode = 'forYou',
        query,
        pageToken,
        seed,
    } = req.query;

    // Validate mode
    const modeConfig = DISCOVERY_MODES[mode] || DISCOVERY_MODES.forYou;
    const windowDays = modeConfig.windowDays;

    // User Location Detection
    const userCountry = req.headers['x-vercel-ip-country'] || 'US';

    // Automatic Language Biasing
    const ES_COUNTRIES = ['ES', 'MX', 'AR', 'CO', 'PE', 'VE', 'CL', 'EC', 'GT', 'CU', 'BO', 'DO', 'HN', 'PY', 'SV', 'NI', 'CR', 'PA', 'UY'];
    const MIXED_COUNTRIES = ['PR'];

    let languageMode = 'en';
    let regionCode = userCountry;

    if (MIXED_COUNTRIES.includes(userCountry)) {
        languageMode = 'mixed';
    } else if (ES_COUNTRIES.includes(userCountry)) {
        languageMode = 'es';
    }

    console.log(`FEED: Mode=${mode}, Country=${userCountry}, LangMode=${languageMode}`);

    const now = new Date();
    const publishedAfter = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
    const publishedAfterISO = publishedAfter.toISOString();

    const searchQuery = query || DEFAULT_QUERIES[Math.floor(Math.random() * DEFAULT_QUERIES.length)];
    const youtube = google.youtube({ version: 'v3', auth });

    try {
        let items = [];
        let nextToken = null;

        // Helper for search request
        const fetchSearch = async (lang, q = searchQuery) => {
            return youtube.search.list({
                part: ['id', 'snippet'],
                q: q,
                type: 'video',
                order: 'date',
                publishedAfter: publishedAfterISO,
                maxResults: languageMode === 'mixed' ? 15 : 25,
                relevanceLanguage: lang,
                regionCode: regionCode,
                pageToken: pageToken || undefined
            });
        };

        // Step 1: Search for recent videos
        if (languageMode === 'mixed') {
            const [enRes, esRes] = await Promise.all([
                fetchSearch('en').catch(e => ({ data: { items: [] } })),
                fetchSearch('es').catch(e => ({ data: { items: [] } }))
            ]);

            const allItems = [...(enRes.data.items || []), ...(esRes.data.items || [])];
            const seen = new Set();
            items = allItems.filter(item => {
                const id = item.id.videoId;
                if (!id || seen.has(id)) return false;
                seen.add(id);
                return true;
            });

            nextToken = enRes.data.nextPageToken || esRes.data.nextPageToken || null;
        } else {
            const res = await fetchSearch(languageMode);
            items = res.data.items || [];
            nextToken = res.data.nextPageToken || null;
        }

        const videoIds = items
            .filter(item => item.id.videoId)
            .map(item => item.id.videoId)
            .join(',');

        if (!videoIds) {
            return res.json({ items: [], nextPageToken: null, meta: { mode, regionCode, languageMode } });
        }

        // Step 2: Fetch video statistics
        const statsResponse = await youtube.videos.list({
            part: ['statistics', 'snippet', 'contentDetails'],
            id: videoIds
        });

        // Step 3: Fetch channel info (for country + subscriber count for risingSmall mode)
        const channelIds = [...new Set(statsResponse.data.items.map(i => i.snippet.channelId))];
        let channelData = {};

        if (channelIds.length > 0) {
            try {
                const channelsRes = await youtube.channels.list({
                    part: ['snippet', 'statistics'],
                    id: channelIds.join(',')
                });
                channelsRes.data.items.forEach(c => {
                    channelData[c.id] = {
                        country: c.snippet.country || null,
                        subscriberCount: parseInt(c.statistics.subscriberCount || 0)
                    };
                });
            } catch (e) {
                console.warn('Channel fetch failed', e);
            }
        }

        // Track channel occurrences for wildcard diversity
        const channelOccurrences = {};

        // Step 4: Compute VidIQ-Style Scores
        let videos = statsResponse.data.items.map(item => {
            const publishedAt = new Date(item.snippet.publishedAt);
            const ageHours = Math.max((now - publishedAt) / (1000 * 60 * 60), 1);
            const ageDays = Math.max(ageHours / 24, 0.1);

            const views = parseInt(item.statistics.viewCount || 0);
            const likes = parseInt(item.statistics.likeCount || 0);
            const comments = parseInt(item.statistics.commentCount || 0);

            // Core metrics
            const viewsPerHour = views / ageHours;
            const viewsPerDay = views / ageDays;
            const likeRate = views > 0 ? likes / views : 0;
            const commentRate = views > 0 ? comments / views : 0;
            const engagementRate = views > 0 ? (likes + 2 * comments) / views : 0;

            // Channel data
            const chData = channelData[item.snippet.channelId] || {};
            const channelCountry = chData.country || null;
            const subscriberCount = chData.subscriberCount || 0;
            const isLocal = channelCountry === regionCode;

            // === Mode-Specific Scoring ===
            let score = 0;
            let freshnessBoost = 1.0;
            let diversityFactor = 1.0;
            let aiRelevanceScore = 0;

            switch (mode) {
                case 'trending': // 24h mode
                    freshnessBoost = Math.max(0.6, Math.min(1.4, 1.4 - ageHours / 24));
                    score = viewsPerHour * (1 + 4 * engagementRate) * freshnessBoost;
                    break;

                case 'weekMovers': // 7d mode
                    freshnessBoost = Math.max(0.7, Math.min(1.2, 1.2 - ageDays / 7));
                    score = viewsPerDay * (1 + 3 * engagementRate) * freshnessBoost;
                    break;

                case 'risingSmall': // Small channels
                    score = viewsPerDay * (1 + 4 * engagementRate);
                    break;

                case 'wildcard': // Diversity boosted
                    const channelId = item.snippet.channelId;
                    channelOccurrences[channelId] = (channelOccurrences[channelId] || 0) + 1;
                    diversityFactor = 1 / (1 + (channelOccurrences[channelId] - 1) * 0.6);
                    score = viewsPerDay * (1 + 3 * engagementRate) * diversityFactor;
                    break;

                case 'forYou':
                default:
                    // AI-style relevance scoring
                    aiRelevanceScore = 0.5;
                    if (isLocal) aiRelevanceScore += 0.3;
                    if (ageHours < 48) aiRelevanceScore += 0.2;
                    if (likeRate > 0.05) aiRelevanceScore += 0.1;
                    if (commentRate > 0.005) aiRelevanceScore += 0.1;
                    aiRelevanceScore = Math.min(aiRelevanceScore, 1.0);

                    const rawVelocity = viewsPerDay * (1 + 3 * likeRate + 10 * commentRate);
                    score = rawVelocity * (1 + aiRelevanceScore);
                    break;
            }

            return {
                id: item.id,
                title: item.snippet.title,
                channelTitle: item.snippet.channelTitle,
                channelId: item.snippet.channelId,
                channelCountry,
                subscriberCount,
                thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
                publishedAt: item.snippet.publishedAt,
                views,
                likes,
                comments,
                duration: item.contentDetails.duration,
                // Score breakdown
                scoreBreakdown: {
                    finalScore: Math.round(score),
                    viewsPerHour: Math.round(viewsPerHour),
                    viewsPerDay: Math.round(viewsPerDay),
                    engagementRate: (engagementRate * 100).toFixed(2) + '%',
                    likeRate: (likeRate * 100).toFixed(2) + '%',
                    commentRate: (commentRate * 100).toFixed(3) + '%',
                    freshnessBoost: freshnessBoost.toFixed(2),
                    diversityFactor: diversityFactor.toFixed(2),
                    aiRelevanceScore: aiRelevanceScore.toFixed(2),
                    isLocalMatch: isLocal
                },
                ageHours: Math.round(ageHours * 10) / 10,
                ageDays: Math.round(ageDays * 10) / 10,
                velocityScore: Math.round(score),
                isLocal
            };
        });

        // Step 5: Filter for risingSmall mode
        if (mode === 'risingSmall') {
            const maxSubs = modeConfig.maxSubs || 200000;
            videos = videos.filter(v => v.subscriberCount > 0 && v.subscriberCount < maxSubs);
        }

        // Step 6: Sort by score
        videos.sort((a, b) => b.velocityScore - a.velocityScore);

        // Optional: Shuffle with seed for variety
        if (seed) {
            shuffleWithSeed(videos, parseInt(seed, 10));
        }

        res.json({
            items: videos,
            nextPageToken: nextToken,
            meta: {
                mode,
                modeDescription: modeConfig.description,
                windowDays,
                regionCode,
                languageMode,
                count: videos.length,
                personalized: true
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
