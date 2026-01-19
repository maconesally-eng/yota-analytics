// Vercel Serverless Function: OAuth Callback
import { google } from 'googleapis';
import cookie from 'cookie';
import crypto from 'crypto';

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXTAUTH_URL}/api/auth/callback`
);

export default async function handler(req, res) {
    const { code } = req.query;

    if (!code) {
        return res.status(400).json({ error: 'Missing code' });
    }

    try {
        // Exchange code for tokens
        const { tokens } = await oauth2Client.getToken(code);

        // Encrypt access token for cookie (basic encryption)
        const sessionToken = encrypt(JSON.stringify({
            access_token: tokens.access_token,
            expiry: Date.now() + (tokens.expiry_date || 3600000)
        }));

        // Set httpOnly secure cookie
        res.setHeader('Set-Cookie', cookie.serialize('yota_session', sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 3600, // 1 hour
            path: '/'
        }));

        // Redirect back to dashboard
        res.redirect('/#/dashboard');
    } catch (error) {
        console.error('OAuth error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
}

// Simple encryption (use proper encryption in production)
function encrypt(text) {
    const cipher = crypto.createCipher('aes-256-cbc', process.env.COOKIE_SECRET || 'fallback-secret');
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}
