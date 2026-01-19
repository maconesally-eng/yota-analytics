// Vercel Serverless Function: Advanced Search with Multi-Query + VidIQ Scoring
import { google } from 'googleapis';
import cookie from 'cookie';
import crypto from 'crypto';

export default async function handler(req, res) {
    const cookies = cookie.parse(req.headers.cookie || '');
    const sessionToken = cookies.yota_session;
    const vipKey = req.headers['x-vip-key'];

    let auth = null;

    // Auth
    if (vipKey && vipKey === process.env.VIP_ACCESS_KEY) {
        auth = process.env.YOUTUBE_API_KEY;
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

    const { q, windowDays = '7', mode = 'weekMovers' } = req.query;
    if (!q) {
        return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const userCountry = req.headers['x-vercel-ip-country'] || 'US';
    const windowDaysInt = parseInt(windowDays, 10) || 7;

    console.log(`Advanced Search: q="${q}", mode=${mode}, window=${windowDaysInt}d`);

    try {
        // Step 1: Get AI Search Plan
        const planUrl = `${getBaseUrl(req)}/api/ai/search-plan?q=${encodeURIComponent(q)}`;
        const planHeaders = {};
        if (vipKey) planHeaders['x-vip-key'] = vipKey;
        if (req.headers.cookie) planHeaders['cookie'] = req.headers.cookie;

        let searchPlan = null;
        try {
            const planRes = await fetch(planUrl, { headers: planHeaders });
            if (planRes.ok) {
                searchPlan = await planRes.json();
                console.log('AI Plan received:', searchPlan.intentSummary);
            }
        } catch (e) {
            console.warn('AI Plan fetch failed, using fallback', e);
        }

        // Fallback plan if AI failed
        if (!searchPlan) {
            searchPlan = {
                queries: [q],
                suggestedWindowDays: windowDaysInt,
                suggestedMode: mode,
                intentSummary: 'Direct search',
                languageHint: null
            };
        }

        const effectiveWindowDays = searchPlan.suggestedWindowDays || windowDaysInt;
        const effectiveMode = searchPlan.suggestedMode || mode;
        const queries = searchPlan.queries || [q];

        const now = new Date();
        const publishedAfter = new Date(now.getTime() - effectiveWindowDays * 24 * 60 * 60 * 1000);
        const publishedAfterISO = publishedAfter.toISOString();

        const youtube = google.youtube({ version: 'v3', auth });

        // Step 2: Execute searches in parallel
        const searchPromises = queries.slice(0, 5).map(query => {
            const searchParams = {
                part: ['id', 'snippet'],
                q: query,
                type: 'video',
                order: 'date',
                publishedAfter: publishedAfterISO,
                maxResults: 15,
                regionCode: userCountry
            };
            // Only add relevanceLanguage if we have a language hint
            if (searchPlan.languageHint) {
                searchParams.relevanceLanguage = searchPlan.languageHint;
            }
            return youtube.search.list(searchParams).catch(e => {
                console.warn(`Search failed for "${query}":`, e.message);
                return { data: { items: [] } };
            });
        });

        const searchResults = await Promise.all(searchPromises);

        // Step 3: Merge and dedupe
        const seen = new Set();
        const allItems = [];
        searchResults.forEach(result => {
            (result.data.items || []).forEach(item => {
                const videoId = item.id.videoId;
                if (videoId && !seen.has(videoId)) {
                    seen.add(videoId);
                    allItems.push(item);
                }
            });
        });

        console.log(`Merged ${allItems.length} unique videos from ${queries.length} queries`);

        if (allItems.length === 0) {
            return res.json({
                items: [],
                searchPlan,
                meta: { mode: effectiveMode, windowDays: effectiveWindowDays, queriesExecuted: queries.length }
            });
        }

        // Step 4: Fetch statistics (limit to 50 IDs - YouTube API max)
        const videoIds = allItems.slice(0, 50).map(i => i.id.videoId).join(',');
        const statsResponse = await youtube.videos.list({
            part: ['statistics', 'snippet', 'contentDetails'],
            id: videoIds
        });

        // Step 5: Fetch channel data
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

        // Step 6: Compute VidIQ-Style Scores
        const videos = statsResponse.data.items.map(item => {
            const publishedAt = new Date(item.snippet.publishedAt);
            const ageHours = Math.max((now - publishedAt) / (1000 * 60 * 60), 1);
            const ageDays = Math.max(ageHours / 24, 0.1);

            const views = parseInt(item.statistics.viewCount || 0);
            const likes = parseInt(item.statistics.likeCount || 0);
            const comments = parseInt(item.statistics.commentCount || 0);

            const viewsPerHour = views / ageHours;
            const viewsPerDay = views / ageDays;
            const likeRate = views > 0 ? likes / views : 0;
            const commentRate = views > 0 ? comments / views : 0;
            const engagementRate = views > 0 ? (likes + 2 * comments) / views : 0;

            const chData = channelData[item.snippet.channelId] || {};
            const channelCountry = chData.country || null;
            const subscriberCount = chData.subscriberCount || 0;
            const isLocal = channelCountry === userCountry;

            // Mode-specific scoring
            let score = 0;
            let freshnessBoost = 1.0;

            if (effectiveMode === 'trending') {
                freshnessBoost = Math.max(0.6, Math.min(1.4, 1.4 - ageHours / 24));
                score = viewsPerHour * (1 + 4 * engagementRate) * freshnessBoost;
            } else {
                freshnessBoost = Math.max(0.7, Math.min(1.2, 1.2 - ageDays / 7));
                score = viewsPerDay * (1 + 3 * engagementRate) * freshnessBoost;
            }

            // AI relevance boost (simple keyword matching)
            let aiRelevanceScore = 0;
            const titleLower = item.snippet.title.toLowerCase();
            (searchPlan.mustInclude || []).forEach(keyword => {
                if (titleLower.includes(keyword.toLowerCase())) {
                    aiRelevanceScore += 0.1;
                }
            });
            if (isLocal) aiRelevanceScore += 0.1;
            aiRelevanceScore = Math.min(aiRelevanceScore, 0.5);

            // Final score: 80% base + 20% AI
            const finalScore = score * 0.8 + score * aiRelevanceScore * 0.2;

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
                scoreBreakdown: {
                    finalScore: Math.round(finalScore),
                    baseScore: Math.round(score),
                    viewsPerHour: Math.round(viewsPerHour),
                    viewsPerDay: Math.round(viewsPerDay),
                    engagementRate: (engagementRate * 100).toFixed(2) + '%',
                    likeRate: (likeRate * 100).toFixed(2) + '%',
                    commentRate: (commentRate * 100).toFixed(3) + '%',
                    freshnessBoost: freshnessBoost.toFixed(2),
                    aiRelevanceScore: aiRelevanceScore.toFixed(2),
                    isLocalMatch: isLocal
                },
                ageHours: Math.round(ageHours * 10) / 10,
                ageDays: Math.round(ageDays * 10) / 10,
                velocityScore: Math.round(finalScore),
                isLocal
            };
        });

        // Sort by final score
        videos.sort((a, b) => b.velocityScore - a.velocityScore);

        res.json({
            items: videos,
            searchPlan,
            meta: {
                mode: effectiveMode,
                windowDays: effectiveWindowDays,
                regionCode: userCountry,
                queriesExecuted: queries.length,
                totalResults: videos.length
            }
        });
    } catch (error) {
        console.error('Advanced Search error:', error);
        res.status(500).json({ error: 'Search failed', details: error.message });
    }
}

function getBaseUrl(req) {
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;
    return `${protocol}://${host}`;
}

function decrypt(text) {
    const decipher = crypto.createDecipher('aes-256-cbc', process.env.COOKIE_SECRET || 'fallback-secret');
    let decrypted = decipher.update(text, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
