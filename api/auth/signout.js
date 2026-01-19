// Vercel Serverless Function: Sign Out
import cookie from 'cookie';

export default function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Clear session cookie
    res.setHeader('Set-Cookie', cookie.serialize('yota_session', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 0, // Expire immediately
        path: '/'
    }));

    res.json({ success: true });
}
