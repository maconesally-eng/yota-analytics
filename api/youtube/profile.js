// Vercel Serverless Function: Proxy YouTube Channel Profile
import { google } from 'googleapis';
import cookie from 'cookie';
import crypto from 'crypto';

export default async function handler(req, res) {
    const cookies = cookie.parse(req.headers.cookie || '');
    const sessionToken = cookies.yota_session;

    if (!sessionToken) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const sessionData = decrypt(sessionToken);
        const session = JSON.parse(sessionData);

        if (Date.now() >= session.expiry) {
            return res.status(401).json({ error: 'Session expired' });
        }

        const youtube = google.youtube({
            version: 'v3',
            auth: session.access_token
        });

        const response = await youtube.channels.list({
            part: ['snippet', 'statistics'],
            mine: true
        });

        if (!response.data.items || response.data.items.length === 0) {
            return res.status(404).json({ error: 'Channel not found' });
        }

        const channel = response.data.items[0];
        res.json({
            id: channel.id,
            name: channel.snippet.title,
            handle: channel.snippet.customUrl,
            avatar: channel.snippet.thumbnails.default.url,
            subscribers: channel.statistics.subscriberCount,
            views: channel.statistics.viewCount,
            videos: channel.statistics.videoCount
        });
    } catch (error) {
        console.error('YouTube API error:', error);
        res.status(500).json({ error: 'Failed to fetch channel profile' });
    }
}

function decrypt(text) {
    const decipher = crypto.createDecipher('aes-256-cbc', process.env.COOKIE_SECRET || 'fallback-secret');
    let decrypted = decipher.update(text, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
