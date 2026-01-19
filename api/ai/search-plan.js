// Vercel Serverless Function: AI Search Plan with Gemini API
// Interprets natural language queries and generates optimized search strategies
import cookie from 'cookie';
import crypto from 'crypto';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// Fallback keyword patterns (used when Gemini unavailable)
const TIME_PATTERNS = {
    '24h': /\b(today|24\s*h(our)?s?|last\s*day)\b/i,
    '7d': /\b(this\s*week|last\s*week|7\s*days?|week)\b/i,
    '30d': /\b(this\s*month|last\s*month|30\s*days?|month)\b/i
};

const LANGUAGE_PATTERNS = {
    'es': /\b(spanish|español|espanol|latino|latina|mexico|spain)\b/i,
    'en': /\b(english|american|british)\b/i
};

const MODE_HINTS = {
    trending: /\b(trending|viral|blowing\s*up|exploding)\b/i,
    risingSmall: /\b(small\s*(channel|creator)?|underrated|hidden\s*gem|rising)\b/i,
    wildcard: /\b(random|discover|surprise|mix)\b/i
};

const TOPIC_EXPANSIONS = {
    'family': ['family vlog', 'family content', 'family youtube'],
    'baby': ['baby vlog', 'newborn', 'infant content', 'baby milestones'],
    'newborn': ['newborn vlog', 'new baby', 'baby first week'],
    'comedy': ['comedy skit', 'funny video', 'humor content'],
    'prank': ['prank video', 'prank reaction', 'funny prank'],
    'couple': ['couples vlog', 'relationship content', 'couple goals'],
    'tech': ['tech review', 'technology video', 'gadget review']
};

export default async function handler(req, res) {
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

    const { q, userCountry = 'US' } = req.query;
    if (!q) {
        return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    console.log(`AI Search Plan: Processing query "${q}" for ${userCountry}`);

    // Try Gemini API first
    if (GEMINI_API_KEY) {
        try {
            const geminiPlan = await callGemini(q, userCountry);
            if (geminiPlan) {
                console.log('Gemini AI plan generated successfully');
                return res.json({
                    ...geminiPlan,
                    originalQuery: q,
                    timestamp: new Date().toISOString(),
                    source: 'gemini'
                });
            }
        } catch (e) {
            console.warn('Gemini API failed, falling back to keyword expansion:', e.message);
        }
    }

    // Fallback: Keyword-based expansion
    const fallbackPlan = generateFallbackPlan(q);
    console.log('Using keyword fallback plan');

    res.json({
        ...fallbackPlan,
        originalQuery: q,
        timestamp: new Date().toISOString(),
        source: 'fallback'
    });
}

async function callGemini(query, userCountry) {
    const prompt = `You are a YouTube search optimizer. Given the user query, generate an optimized search plan.

User Query: "${query}"
User Country: ${userCountry}

Return ONLY valid JSON (no markdown, no code blocks) with this schema:
{
  "intentSummary": "brief description of what user wants",
  "suggestedMode": "auto|24h|7d|small|wildcard",
  "queries": ["query1", "query2", "query3", "query4", "query5"],
  "mustInclude": ["keyword1", "keyword2"],
  "mustAvoid": [],
  "languageHint": "en|es|mixed|null"
}

Rules:
- suggestedMode: use "24h" for trending/viral requests, "7d" for general, "small" for underrated creators, "wildcard" for discovery
- queries: generate 3-6 diverse search queries that capture the intent
- mustInclude: key terms that should appear in results
- languageHint: detect language preference from query`;

    const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 500
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

    // Parse JSON from response (handle potential markdown wrapping)
    let jsonText = text.trim();
    if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    }

    return JSON.parse(jsonText);
}

function generateFallbackPlan(q) {
    const queryLower = q.toLowerCase();

    // Detect time window
    let suggestedWindowDays = 7;
    if (TIME_PATTERNS['24h'].test(queryLower)) {
        suggestedWindowDays = 1;
    } else if (TIME_PATTERNS['30d'].test(queryLower)) {
        suggestedWindowDays = 30;
    }

    // Detect language hint
    let languageHint = null;
    if (LANGUAGE_PATTERNS['es'].test(queryLower)) {
        languageHint = 'es';
    } else if (LANGUAGE_PATTERNS['en'].test(queryLower)) {
        languageHint = 'en';
    }

    // Detect suggested mode
    let suggestedMode = suggestedWindowDays === 1 ? '24h' : '7d';
    if (MODE_HINTS.risingSmall.test(queryLower)) {
        suggestedMode = 'small';
    } else if (MODE_HINTS.wildcard.test(queryLower)) {
        suggestedMode = 'wildcard';
    } else if (MODE_HINTS.trending.test(queryLower)) {
        suggestedMode = '24h';
    }

    // Clean query
    let cleanQuery = q
        .replace(TIME_PATTERNS['24h'], '')
        .replace(TIME_PATTERNS['7d'], '')
        .replace(TIME_PATTERNS['30d'], '')
        .replace(LANGUAGE_PATTERNS['es'], '')
        .replace(LANGUAGE_PATTERNS['en'], '')
        .replace(MODE_HINTS.trending, '')
        .replace(MODE_HINTS.risingSmall, '')
        .replace(MODE_HINTS.wildcard, '')
        .replace(/\s+/g, ' ')
        .trim();

    // Expand queries
    const queries = [cleanQuery];
    for (const [topic, expansions] of Object.entries(TOPIC_EXPANSIONS)) {
        if (queryLower.includes(topic)) {
            expansions.forEach(exp => {
                if (!queries.includes(exp)) queries.push(exp);
            });
        }
    }

    if (cleanQuery.length > 3) {
        queries.push(cleanQuery + ' vlog');
        queries.push(cleanQuery + ' 2024');
    }

    const mustInclude = cleanQuery.split(' ')
        .filter(w => w.length > 3)
        .slice(0, 3);

    return {
        intentSummary: `Topics: ${mustInclude.join(', ')} • ${suggestedMode === '24h' ? 'Trending' : 'This week'}`,
        suggestedMode,
        suggestedWindowDays,
        queries: queries.slice(0, 5),
        mustInclude,
        mustAvoid: [],
        languageHint
    };
}

function decrypt(text) {
    const decipher = crypto.createDecipher('aes-256-cbc', process.env.COOKIE_SECRET || 'fallback-secret');
    let decrypted = decipher.update(text, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
