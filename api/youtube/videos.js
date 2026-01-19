// Vercel Serverless Function: Proxy YouTube Videos
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

        // First, get the "Uploads" playlist ID for the authenticated channel
        const channelResponse = await youtube.channels.list({
            part: ['contentDetails'],
            mine: true
        });

        const uploadsPlaylistId = channelResponse.data.items[0].contentDetails.relatedPlaylists.uploads;

        // Then, fetch videos from that playlist
        const response = await youtube.playlistItems.list({
            part: ['snippet', 'contentDetails'],
            playlistId: uploadsPlaylistId,
            maxResults: 50
        });

        // Fetch detailed statistics for these videos (views, likes, etc.)
        const videoIds = response.data.items.map(item => item.contentDetails.videoId).join(',');
        const statsResponse = await youtube.videos.list({
            part: ['statistics', 'snippet'],
            id: videoIds
        });

        const videos = statsResponse.data.items.map(item => ({
            id: item.id,
            title: item.snippet.title,
            publishedAt: item.snippet.publishedAt,
            views: parseInt(item.statistics.viewCount),
            likes: parseInt(item.statistics.likeCount || 0),
            comments: parseInt(item.statistics.commentCount || 0)
        }));

        res.json({ items: videos });
    } catch (error) {
        console.error('YouTube API error:', error);
        res.status(500).json({ error: 'Failed to fetch videos' });
    }
}

function decrypt(text) {
    const decipher = crypto.createDecipher('aes-256-cbc', process.env.COOKIE_SECRET || 'fallback-secret');
    let decrypted = decipher.update(text, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
