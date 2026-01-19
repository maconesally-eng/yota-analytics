# VERCEL ENVIRONMENT VARIABLES SETUP

⚠️ **IMPORTANT:** Set these in Vercel Dashboard, NOT in code

## Steps to Configure

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select project: **yota-analytics**
3. Go to **Settings** → **Environment Variables**
4. Add the following variables for **Production** environment:

## Required Variables

### OAuth Credentials
```
Name: GOOGLE_CLIENT_ID
Value: [Your Google Cloud OAuth Client ID - find in .env.local]
```

```
Name: GOOGLE_CLIENT_SECRET
Value: [Your Google Cloud OAuth Client Secret - find in .env.local]
```

### Application URLs
```
Name: NEXTAUTH_URL
Value: https://yota-analytics.vercel.app
```

```
Name: NODE_ENV
Value: production
```

### Cookie Secret
```
Name: COOKIE_SECRET
Value: [Generate with: openssl rand -base64 32]
```

## Security Checklist

- [ ] All variables set in Vercel Dashboard (NOT in code)
- [ ] `.env.local` is gitignored
- [ ] No secrets in `.env.production` (template only)
- [ ] Verify Google OAuth redirect URIs match:
  - `https://yota-analytics.vercel.app/api/auth/callback`
- [ ] Redeploy after setting environment variables

## Verification

After deployment, check:
```bash
# Should NOT see any secrets in git
git log --all --full-history --source -- '*env*'

# Should see .env.local in gitignore
cat .gitignore | grep env.local
```

🔒 **This file is safe to commit** - it contains configuration instructions, not actual secrets.
