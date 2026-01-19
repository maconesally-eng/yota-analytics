// Vercel Serverless Function: Unified AI Router
// Consolidates search-plan, rerank, and theme-label into single endpoint
// Usage: /api/ai?action=search-plan|rerank|theme-label
import cookie from 'cookie';
import crypto from 'crypto';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// ====== AUTH HELPER ======
function authenticate(req) {
    const cookies = cookie.parse(req.headers.cookie || '');
    const sessionToken = cookies.yota_session;
    const vipKey = req.headers['x-vip-key'];

    if (vipKey && vipKey === process.env.VIP_ACCESS_KEY) {
        return { authenticated: true };
    }

    if (sessionToken) {
        try {
            const sessionData = decrypt(sessionToken);
            const session = JSON.parse(sessionData);
            if (Date.now() >= session.expiry) {
                return { authenticated: false, error: 'Session expired' };
            }
            return { authenticated: true };
        } catch (e) {
            return { authenticated: false, error: 'Invalid session' };
        }
    }

    return { authenticated: false, error: 'Not authenticated' };
}

function decrypt(text) {
    const decipher = crypto.createDecipher('aes-256-cbc', process.env.COOKIE_SECRET || 'fallback-secret');
    let decrypted = decipher.update(text, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

// ====== MAIN HANDLER ======
export default async function handler(req, res) {
    const auth = authenticate(req);
    if (!auth.authenticated) {
        return res.status(401).json({ error: auth.error });
    }

    const { action } = req.query;

    switch (action) {
        case 'search-plan':
            return handleSearchPlan(req, res);
        case 'rerank':
            return handleRerank(req, res);
        case 'theme-label':
            return handleThemeLabel(req, res);
        default:
            return res.status(400).json({
                error: 'Invalid action',
                validActions: ['search-plan', 'rerank', 'theme-label']
            });
    }
}

// ====== SEARCH PLAN ======
const TIME_PATTERNS = {
    '24h': /\b(today|24\s*h(our)?s?|last\s*day)\b/i,
    '7d': /\b(this\s*week|last\s*week|7\s*days?|week)\b/i
};

const MODE_HINTS = {
    trending: /\b(trending|viral|blowing\s*up|exploding)\b/i,
    risingSmall: /\b(small\s*(channel|creator)?|underrated|hidden\s*gem|rising)\b/i,
    wildcard: /\b(random|discover|surprise|mix)\b/i
};

const TOPIC_EXPANSIONS = {
    'family': ['family vlog', 'family content'],
    'baby': ['baby vlog', 'newborn', 'baby milestones'],
    'comedy': ['comedy skit', 'funny video'],
    'prank': ['prank video', 'prank reaction'],
    'tech': ['tech review', 'gadget review']
};

async function handleSearchPlan(req, res) {
    const { q, userCountry = 'US' } = req.query;
    if (!q) {
        return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    console.log(`AI Search Plan: "${q}"`);

    // Try Gemini first
    if (GEMINI_API_KEY) {
        try {
            const prompt = `You are a YouTube search optimizer. Given: "${q}"
User Country: ${userCountry}

Return ONLY JSON:
{"intentSummary":"...", "suggestedMode":"auto|24h|7d|small|wildcard", "queries":["q1","q2","q3"], "mustInclude":["kw1"], "mustAvoid":[], "languageHint":"en|es|null"}`;

            const geminiRes = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.3, maxOutputTokens: 500 }
                })
            });

            if (geminiRes.ok) {
                const data = await geminiRes.json();
                let text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
                if (text.startsWith('```')) text = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
                const plan = JSON.parse(text);
                return res.json({ ...plan, originalQuery: q, source: 'gemini', timestamp: new Date().toISOString() });
            }
        } catch (e) {
            console.warn('Gemini failed:', e.message);
        }
    }

    // Fallback
    const queryLower = q.toLowerCase();
    let suggestedMode = TIME_PATTERNS['24h'].test(queryLower) ? '24h' : '7d';
    if (MODE_HINTS.risingSmall.test(queryLower)) suggestedMode = 'small';
    if (MODE_HINTS.trending.test(queryLower)) suggestedMode = '24h';

    const queries = [q];
    for (const [topic, expansions] of Object.entries(TOPIC_EXPANSIONS)) {
        if (queryLower.includes(topic)) expansions.forEach(e => queries.push(e));
    }

    res.json({
        intentSummary: `Topics: ${q.split(' ').slice(0, 3).join(', ')}`,
        suggestedMode,
        queries: queries.slice(0, 5),
        mustInclude: q.split(' ').filter(w => w.length > 3).slice(0, 3),
        mustAvoid: [],
        languageHint: null,
        originalQuery: q,
        source: 'fallback',
        timestamp: new Date().toISOString()
    });
}

// ====== RERANK ======
async function handleRerank(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'POST required' });
    }

    const { videos, intentSummary, userCountry, sessionSignals } = req.body || {};
    if (!videos || !Array.isArray(videos)) {
        return res.status(400).json({ error: 'videos array required' });
    }

    console.log(`AI Rerank: ${videos.length} videos`);

    if (!GEMINI_API_KEY) {
        return res.json({ scores: videos.map(v => ({ videoId: v.id, aiRelevanceScore: 0.5 })), source: 'neutral' });
    }

    try {
        const subset = videos.slice(0, 20).map((v, i) => ({
            idx: i, id: v.id, title: (v.title || '').slice(0, 80), channel: v.channelTitle
        }));

        const prompt = `Rank videos by relevance for: "${intentSummary || 'general'}"
${sessionSignals?.blockedChannels?.length ? `Blocked: ${sessionSignals.blockedChannels.join(', ')}` : ''}
Videos: ${JSON.stringify(subset)}
Return ONLY JSON array: [{"videoId":"...", "aiRelevanceScore":0.0-1.0}, ...]`;

        const geminiRes = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.2, maxOutputTokens: 800 }
            })
        });

        if (geminiRes.ok) {
            const data = await geminiRes.json();
            let text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
            if (text.startsWith('```')) text = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
            const aiScores = JSON.parse(text);
            const scoreMap = new Map(aiScores.map(s => [s.videoId, s.aiRelevanceScore]));
            return res.json({
                scores: videos.map(v => ({ videoId: v.id, aiRelevanceScore: scoreMap.get(v.id) ?? 0.5 })),
                source: 'gemini'
            });
        }
    } catch (e) {
        console.error('Rerank error:', e.message);
    }

    res.json({ scores: videos.map(v => ({ videoId: v.id, aiRelevanceScore: 0.5 })), source: 'fallback' });
}

// ====== THEME LABEL ======
const THEME_KEYWORDS = {
    'family': ['family', 'mom', 'dad', 'parent', 'kid'],
    'baby': ['baby', 'newborn', 'infant', 'toddler'],
    'comedy': ['funny', 'comedy', 'laugh', 'humor'],
    'prank': ['prank', 'scare', 'trick', 'joke'],
    'tech': ['tech', 'gadget', 'review', 'unboxing'],
    'gaming': ['game', 'gaming', 'gamer', 'gameplay']
};

async function handleThemeLabel(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'POST required' });
    }

    const { videos } = req.body || {};
    if (!videos || !Array.isArray(videos)) {
        return res.status(400).json({ error: 'videos array required' });
    }

    const labels = videos.map(v => {
        const text = `${v.title || ''} ${v.description || ''}`.toLowerCase();
        let theme = 'general';
        for (const [t, keywords] of Object.entries(THEME_KEYWORDS)) {
            if (keywords.some(k => text.includes(k))) { theme = t; break; }
        }
        return { videoId: v.id, theme, format: text.includes('vlog') ? 'vlog' : 'video', source: 'heuristic' };
    });

    res.json({ labels });
}
