// Vercel Serverless Function: AI Theme Labeling
// Classifies videos by theme and format for diversity + session learning
import cookie from 'cookie';
import crypto from 'crypto';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// Heuristic theme detection keywords
const THEME_KEYWORDS = {
    'family': ['family', 'mom', 'dad', 'parent', 'kid', 'child'],
    'baby': ['baby', 'newborn', 'infant', 'toddler', 'pregnancy'],
    'comedy': ['funny', 'comedy', 'laugh', 'hilarious', 'humor'],
    'prank': ['prank', 'scare', 'trick', 'joke', 'gotcha'],
    'couple': ['couple', 'boyfriend', 'girlfriend', 'relationship', 'dating', 'wife', 'husband'],
    'tech': ['tech', 'gadget', 'review', 'unboxing', 'iphone', 'android', 'computer'],
    'gaming': ['game', 'gaming', 'gamer', 'playthrough', 'gameplay'],
    'beauty': ['makeup', 'beauty', 'skincare', 'tutorial', 'haul'],
    'food': ['cook', 'recipe', 'food', 'eating', 'mukbang', 'restaurant'],
    'travel': ['travel', 'trip', 'vacation', 'adventure', 'explore']
};

const FORMAT_KEYWORDS = {
    'vlog': ['vlog', 'day in', 'week in', 'routine'],
    'short': ['short', 'shorts', '#short', 'tiktok'],
    'skit': ['skit', 'acting', 'roleplay'],
    'challenge': ['challenge', 'try not to', 'vs', 'competition'],
    'podcast': ['podcast', 'episode', 'interview', 'talk'],
    'clip': ['clip', 'moment', 'highlight', 'best of']
};

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

    const { videos } = req.body;

    if (!videos || !Array.isArray(videos)) {
        return res.status(400).json({ error: 'videos array required' });
    }

    console.log(`Theme Label: Processing ${videos.length} videos`);

    // Use heuristic labeling (fast, no API cost)
    const labels = videos.map(v => {
        const text = `${v.title || ''} ${v.description || ''}`.toLowerCase();

        // Detect theme
        let theme = 'general';
        for (const [t, keywords] of Object.entries(THEME_KEYWORDS)) {
            if (keywords.some(k => text.includes(k))) {
                theme = t;
                break;
            }
        }

        // Detect format
        let format = 'video';
        for (const [f, keywords] of Object.entries(FORMAT_KEYWORDS)) {
            if (keywords.some(k => text.includes(k))) {
                format = f;
                break;
            }
        }

        return {
            videoId: v.id,
            theme,
            format,
            source: 'heuristic'
        };
    });

    // Optionally enhance with Gemini for ambiguous cases
    if (GEMINI_API_KEY && videos.length <= 10) {
        try {
            const aiLabels = await labelWithGemini(videos);
            if (aiLabels) {
                // Merge AI labels (prefer AI over heuristic)
                const aiMap = new Map(aiLabels.map(l => [l.videoId, l]));
                labels.forEach((l, i) => {
                    const ai = aiMap.get(l.videoId);
                    if (ai) {
                        labels[i] = { ...l, ...ai, source: 'gemini' };
                    }
                });
            }
        } catch (e) {
            console.warn('Gemini theme labeling failed:', e.message);
        }
    }

    res.json({ labels });
}

async function labelWithGemini(videos) {
    const summaries = videos.slice(0, 10).map(v => ({
        id: v.id,
        title: (v.title || '').slice(0, 60)
    }));

    const prompt = `Classify these YouTube videos by theme and format.

Videos:
${JSON.stringify(summaries)}

Return ONLY a JSON array:
[{"videoId": "...", "theme": "family|baby|comedy|prank|couple|tech|gaming|beauty|food|travel|general", "format": "vlog|short|skit|challenge|podcast|clip|video"}]`;

    const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 500 }
        })
    });

    if (!response.ok) return null;

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    let jsonText = text.trim();
    if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    }

    return JSON.parse(jsonText);
}

function decrypt(text) {
    const decipher = crypto.createDecipher('aes-256-cbc', process.env.COOKIE_SECRET || 'fallback-secret');
    let decrypted = decipher.update(text, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
