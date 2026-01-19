// Vercel Serverless Function: Search Autosuggest
import { google } from 'googleapis';
import cookie from 'cookie';
import crypto from 'crypto';

export default async function handler(req, res) {
    const cookies = cookie.parse(req.headers.cookie || '');
    const sessionToken = cookies.yota_session;
    const vipKey = req.headers['x-vip-key'];

    let auth = null;

    // VIP Bypass or Session Auth
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

    const { q } = req.query;
    if (!q || q.length < 1) {
        return res.json({ suggestions: [] });
    }

    try {
        const youtube = google.youtube({ version: 'v3', auth });

        // Fetch suggestions (mix of channels and videos)
        const searchResponse = await youtube.search.list({
            part: ['snippet'],
            q: q,
            type: 'video,channel',
            maxResults: 8,
            relevanceLanguage: 'en',
            regionCode: 'US'
        });

        const suggestions = searchResponse.data.items.map(item => {
            const isChannel = item.id.kind === 'youtube#channel';
            return {
                label: item.snippet.title,
                type: isChannel ? 'channel' : 'video',
                id: isChannel ? item.id.channelId : item.id.videoId,
                thumbnail: item.snippet.thumbnails.default?.url
            };
        });

        res.json({ suggestions });
    } catch (error) {
        console.error('Suggest API error:', error);
        res.status(500).json({ error: 'Failed to fetch suggestions' });
    }
}

function decrypt(text) {
    const decipher = crypto.createDecipher('aes-256-cbc', process.env.COOKIE_SECRET || 'fallback-secret');
    let decrypted = decipher.update(text, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
