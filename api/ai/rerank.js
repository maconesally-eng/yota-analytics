// Vercel Serverless Function: AI Rerank with Gemini API
// Max 20% weight in final scoring; falls back to baseScore if AI fails
import cookie from 'cookie';
import crypto from 'crypto';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'POST required' });
    }

    const cookies = cookie.parse(req.headers.cookie || '');
    const sessionToken = cookies.yota_session;
    const vipKey = req.headers['x-vip-key'];

    // Auth check
    if (!vipKey || vipKey !== process.env.VIP_ACCESS_KEY) {
        if (!sessionToken) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        try {
            const sessionData = decrypt(sessionToken);
            const session = JSON.parse(sessionData);
            if (Date.now() >= session.expiry) {
                return res.status(401).json({ error: 'Session expired' });
            }
        } catch (e) {
            return res.status(401).json({ error: 'Invalid session' });
        }
    }

    const { videos, intentSummary, userCountry, sessionSignals } = req.body;

    if (!videos || !Array.isArray(videos) || videos.length === 0) {
        return res.status(400).json({ error: 'videos array required' });
    }

    console.log(`AI Rerank: Processing ${videos.length} videos`);

    // If no Gemini API key, return neutral scores
    if (!GEMINI_API_KEY) {
        console.log('No GEMINI_API_KEY, returning neutral AI scores');
        return res.json({
            scores: videos.map(v => ({ videoId: v.id, aiRelevanceScore: 0.5 })),
            source: 'neutral-fallback'
        });
    }

    try {
        const scores = await rerankWithGemini(videos, intentSummary, userCountry, sessionSignals);
        return res.json({
            scores,
            source: 'gemini'
        });
    } catch (e) {
        console.error('Gemini rerank failed:', e.message);
        // Fallback: neutral AI scores
        return res.json({
            scores: videos.map(v => ({ videoId: v.id, aiRelevanceScore: 0.5 })),
            source: 'error-fallback',
            error: e.message
        });
    }
}

async function rerankWithGemini(videos, intentSummary, userCountry, sessionSignals) {
    // Limit to top 20 for API efficiency
    const subset = videos.slice(0, 20);

    const videoSummaries = subset.map((v, i) => ({
        idx: i,
        id: v.id,
        title: (v.title || '').slice(0, 80),
        channel: v.channelTitle,
        views: v.views,
        age: v.ageHours < 24 ? `${Math.round(v.ageHours)}h` : `${Math.round(v.ageDays)}d`,
        engagement: v.scoreBreakdown?.engagementRate || '0%'
    }));

    const prompt = `You are a video recommendation AI. Rank these videos by relevance.

User Intent: "${intentSummary || 'general discovery'}"
User Country: ${userCountry || 'US'}
${sessionSignals?.blockedChannels?.length ? `Blocked Channels: ${sessionSignals.blockedChannels.join(', ')}` : ''}
${sessionSignals?.themeDislikes?.length ? `Disliked Themes: ${sessionSignals.themeDislikes.join(', ')}` : ''}

Videos:
${JSON.stringify(videoSummaries, null, 1)}

Return ONLY a JSON array of objects with videoId and score (0.0 to 1.0):
[{"videoId": "abc123", "aiRelevanceScore": 0.85}, ...]

Score meaning:
- 1.0: Perfect match for intent
- 0.7-0.9: Good match
- 0.4-0.6: Neutral
- 0.1-0.3: Poor match
- 0.0: Should be filtered (blocked channel, disliked theme)`;

    const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 800
            }
        })
    });

    if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
        throw new Error('Empty Gemini response');
    }

    // Parse JSON
    let jsonText = text.trim();
    if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    }

    const aiScores = JSON.parse(jsonText);

    // Map back to full video list (unscored videos get 0.5)
    const scoreMap = new Map(aiScores.map(s => [s.videoId, s.aiRelevanceScore]));

    return videos.map(v => ({
        videoId: v.id,
        aiRelevanceScore: scoreMap.get(v.id) ?? 0.5
    }));
}

function decrypt(text) {
    const decipher = crypto.createDecipher('aes-256-cbc', process.env.COOKIE_SECRET || 'fallback-secret');
    let decrypted = decipher.update(text, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
