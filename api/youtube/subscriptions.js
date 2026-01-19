// Vercel Serverless Function: Proxy YouTube Subscriptions
import { google } from 'googleapis';
import cookie from 'cookie';
import crypto from 'crypto';

export default async function handler(req, res) {
    // Get session from cookie
    const cookies = cookie.parse(req.headers.cookie || '');
    const sessionToken = cookies.yota_session;

    if (!sessionToken) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        // Decrypt and get access token
        const sessionData = decrypt(sessionToken);
        const session = JSON.parse(sessionData);

        if (Date.now() >= session.expiry) {
            return res.status(401).json({ error: 'Session expired' });
        }

        // Call YouTube API server-side
        const youtube = google.youtube({
            version: 'v3',
            auth: session.access_token
        });

        const response = await youtube.subscriptions.list({
            part: ['snippet'],
            mine: true,
            maxResults: 50
        });

        // Return data (token never exposed to client)
        res.json(response.data);
    } catch (error) {
        console.error('YouTube API error:', error);
        res.status(500).json({ error: 'Failed to fetch subscriptions' });
    }
}

function decrypt(text) {
    const decipher = crypto.createDecipher('aes-256-cbc', process.env.COOKIE_SECRET || 'fallback-secret');
    let decrypted = decipher.update(text, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
