# Yota Analytics

> **⚠️ SECURITY NOTICE:** This application is currently in **DEMO MODE ONLY**. OAuth authentication is disabled on the public deployment due to security limitations. See [SECURITY_REPORT.md](./SECURITY_REPORT.md) for details.

A complete YouTube analytics platform for couples, families, and Gen-Z creator teams.

**Live Demo:** [yota-analytics.vercel.app](https://yota-analytics.vercel.app/) (Demo data only)  
**Repository:** [GitHub](https://github.com/maconesally-eng/yota-analytics.git)

---

## 🚨 Security Status

**Current Architecture:** Client-side only (no backend)  
**OAuth Status:** ❌ Disabled on production (insecure implementation)  
**Production Ready:** ❌ NO - Demo mode only

### Known Security Issues
- OAuth tokens would be stored in localStorage (XSS vulnerability)
- All API calls happen client-side (token exposure)
- No rate limiting
- No server-side session management

**For Production Use:**
- ✅ Must implement backend (Vercel Serverless Functions or Next.js)
- ✅ Must move auth server-side with httpOnly cookies
- ✅ Must proxy all YouTube API calls through backend

See [SECURITY_REPORT.md](./SECURITY_REPORT.md) for comprehensive security audit.

---

## Features

### Milestones Delivered

| # | Milestone | Features |
|---|-----------|----------|
| 1 | App Shell | Sidebar navigation, routing, state management |
| 2 | Universal Search | 3 search modes (channels/videos/all) |
| 3 | Trend Engine | Trend Score formula, 5 niche presets |
| 4 | Outlier Detection | Median baseline, pattern extraction |
| 5 | Growth Toolkit | Best Time to Post, Channel Audit |
| 6 | Auth (Demo) | OAuth integration (localhost only) |

---

## Quick Start

### Local Development (Safe)

```bash
# 1. Clone repository
git clone https://github.com/maconesally-eng/yota-analytics.git
cd yota-analytics

# 2. Set up Python environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# 3. Configure API key
cp .env.example .env
# Edit .env and add your YOUTUBE_API_KEY

# 4. Generate analytics
python main.py

# 5. Start dashboard
python -m http.server 5173 --directory dashboard

# 6. Open browser
open http://localhost:5173
```

**Note:** OAuth authentication works on localhost. For production use, backend implementation is required.

---

## Project Structure

```
yota-analytics/
├── main.py                 # Core analytics pipeline
├── tools/                  # 11 specialized Python tools
│   ├── fetch_channel.py
│   ├── search.py
│   ├── discover_trending.py
│   ├── detect_outliers.py
│   └── ...
├── dashboard/              # Frontend (vanilla JS)
│   ├── index.html
│   ├── auth.js            # ⚠️ Client-side OAuth (demo only)
│   ├── pages/
│   └── components/
├── output/                 # Generated analytics (gitignored)
├── SECURITY_REPORT.md      # Security audit findings
└── vercel.json            # Deployment config
```

---

## Tools Overview

### Core Analytics (`main.py`)
- Fetches channel metadata + last 20 videos
- Computes momentum score, engagement, best upload day
- **Quota:** ~3 units

### Search (`tools/search.py`)
```bash
python tools/search.py "couples vlog" video
```
**Quota:** 100 units/search

### Trending (`tools/discover_trending.py`)
```bash
python tools/discover_trending.py couples
```
**Quota:** 100+ units (cached 6 hours)

### Outliers (`tools/detect_outliers.py`)
```bash
python tools/detect_outliers.py
```
**Quota:** 0 (uses cached data)

### Channel Audit (`tools/channel_audit.py`) 
```bash
python tools/channel_audit.py
```
**Quota:** 0 (uses cached data)

---

## Deployment

**Platform:** Vercel  
**URL:** [yota-analytics.vercel.app](https://yota-analytics.vercel.app/)

**Current State:**
- ✅ Deploys successfully
- ✅ Demo data shows correctly
- ⚠️ OAuth disabled (security)
- ⚠️ No backend (static site only)

**For Production:**
1. Implement Vercel Serverless Functions for `/api/*` routes
2. Move OAuth flow server-side
3. Add session management with httpOnly cookies
4. Proxy all YouTube API calls through backend
5. Add rate limiting middleware

---

## Environment Variables

### Local Development
```bash
# .env
YOUTUBE_API_KEY=your_key_here
```

### Production (When Backend Implemented)
```bash
# Vercel Environment Variables
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://yota-analytics.vercel.app
```

---

## Contributing

**Security First:** All contributions must follow security best practices. No PRs that:
- Store tokens in localStorage
- Make YouTube API calls from client
- Skip input validation
- Disable security headers

**Before Contributing:**
1. Read [SECURITY_REPORT.md](./SECURITY_REPORT.md)
2. Discuss backend architecture in issues
3. Write tests for security-critical code

---

## License

MIT License - See LICENSE file

---

## Support

**Issues:** [GitHub Issues](https://github.com/maconesally-eng/yota-analytics/issues)  
**Security:** Please report security vulnerabilities privately

---

**Built with:** Python • Vanilla JavaScript • YouTube Data API v3  
**Deployed on:** Vercel
