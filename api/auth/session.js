// Vercel Serverless Function: Check Session
import cookie from 'cookie';
import crypto from 'crypto';

export default function handler(req, res) {
    const cookies = cookie.parse(req.headers.cookie || '');
    const sessionToken = cookies.yota_session;

    if (!sessionToken) {
        return res.status(401).json({ authenticated: false });
    }

    try {
        // Decrypt session
        const sessionData = decrypt(sessionToken);
        const session = JSON.parse(sessionData);

        // Check expiry
        if (Date.now() >= session.expiry) {
            return res.status(401).json({ authenticated: false, expired: true });
        }

        // Return user status (NOT the token)
        res.json({
            authenticated: true,
            expiresAt: session.expiry
        });
    } catch (error) {
        res.status(401).json({ authenticated: false, error: 'Invalid session' });
    }
}

function decrypt(text) {
    const decipher = crypto.createDecipher('aes-256-cbc', process.env.COOKIE_SECRET || 'fallback-secret');
    let decrypted = decipher.update(text, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
