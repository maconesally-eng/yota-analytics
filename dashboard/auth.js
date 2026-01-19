/**
 * Yota Analytics — Authentication
 * Google OAuth 2.0 integration using Google Identity Services (GIS)
 */

const AUTH_CONFIG = {
    // Replace with your actual Client ID from Google Cloud Console
    CLIENT_ID: 'YOUR_CLIENT_ID.apps.googleusercontent.com',
    SCOPES: 'https://www.googleapis.com/auth/youtube.readonly',
    DISCOVERY_DOCS: ['https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest']
};

class AuthManager {
    constructor() {
        this.accessToken = null;
        this.tokenExpiry = null;
        this.user = null;
        this.tokenClient = null;

        // Load from localStorage if exists
        this.loadFromStorage();
    }

    /**
     * Initialize Google Identity Services
     */
    async initialize() {
        // Wait for Google Identity Services to load
        return new Promise((resolve) => {
            const checkGIS = setInterval(() => {
                if (window.google?.accounts) {
                    clearInterval(checkGIS);

                    // Initialize token client for OAuth 2.0
                    this.tokenClient = google.accounts.oauth2.initTokenClient({
                        client_id: AUTH_CONFIG.CLIENT_ID,
                        scope: AUTH_CONFIG.SCOPES,
                        callback: (response) => {
                            this.handleTokenResponse(response);
                        },
                    });

                    resolve();
                }
            }, 100);
        });
    }

    /**
     * Sign in with Google
     */
    signIn() {
        // SECURITY: Disable OAuth in production until backend is implemented
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            alert('⚠️ SECURITY NOTICE\n\nOAuth is disabled on the public demo site due to security limitations.\n\nReason: This app currently stores tokens in localStorage (insecure).\n\nTo use authentication:\n1. Clone the repository\n2. Run locally: python -m http.server 5173\n3. Or wait for backend implementation\n\nSee SECURITY_REPORT.md for details.');
            return;
        }

        if (!this.tokenClient) {
            console.error('Token client not initialized');
            return;
        }

        // Request access token
        this.tokenClient.requestAccessToken({ prompt: 'consent' });
    }

    /**
     * Handle OAuth token response
     */
    async handleTokenResponse(response) {
        if (response.error) {
            console.error('Auth error:', response.error);
            return;
        }

        this.accessToken = response.access_token;
        this.tokenExpiry = Date.now() + (response.expires_in * 1000);

        // Fetch user info
        await this.fetchUserInfo();

        // Save to storage
        this.saveToStorage();

        // Trigger auth state change event
        window.dispatchEvent(new CustomEvent('auth-state-changed', {
            detail: { user: this.user, signedIn: true }
        }));
    }

    /**
     * Fetch user profile info
     */
    async fetchUserInfo() {
        try {
            const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.user = {
                    id: data.id,
                    name: data.name,
                    email: data.email,
                    avatar: data.picture
                };
            }
        } catch (error) {
            console.error('Error fetching user info:', error);
        }
    }

    /**
     * Sign out
     */
    signOut() {
        // Revoke token
        if (this.accessToken) {
            google.accounts.oauth2.revoke(this.accessToken, () => {
                console.log('Token revoked');
            });
        }

        this.accessToken = null;
        this.tokenExpiry = null;
        this.user = null;

        localStorage.removeItem('yota_auth');

        // Trigger auth state change event
        window.dispatchEvent(new CustomEvent('auth-state-changed', {
            detail: { user: null, signedIn: false }
        }));
    }

    /**
     * Check if user is signed in and token is valid
     */
    isSignedIn() {
        if (!this.accessToken || !this.tokenExpiry) {
            return false;
        }

        // Check if token is expired
        if (Date.now() >= this.tokenExpiry) {
            console.log('Token expired');
            this.signOut();
            return false;
        }

        return true;
    }

    /**
     * Get access token (with auto-refresh if needed)
     */
    async getAccessToken() {
        if (!this.isSignedIn()) {
            throw new Error('Not signed in');
        }

        // If token expires in < 5 minutes, refresh it
        if (this.tokenExpiry - Date.now() < 5 * 60 * 1000) {
            console.log('Token expiring soon, refreshing...');
            await new Promise((resolve) => {
                this.tokenClient.callback = (response) => {
                    this.handleTokenResponse(response);
                    resolve();
                };
                this.tokenClient.requestAccessToken({ prompt: '' });
            });
        }

        return this.accessToken;
    }

    /**
     * Save auth state to localStorage
     */
    saveToStorage() {
        const authData = {
            accessToken: this.accessToken,
            tokenExpiry: this.tokenExpiry,
            user: this.user
        };
        localStorage.setItem('yota_auth', JSON.stringify(authData));
    }

    /**
     * Load auth state from localStorage
     */
    loadFromStorage() {
        const stored = localStorage.getItem('yota_auth');
        if (stored) {
            try {
                const authData = JSON.parse(stored);
                this.accessToken = authData.accessToken;
                this.tokenExpiry = authData.tokenExpiry;
                this.user = authData.user;

                // Check if still valid
                if (!this.isSignedIn()) {
                    localStorage.removeItem('yota_auth');
                }
            } catch (error) {
                console.error('Error loading auth from storage:', error);
            }
        }
    }

    /**
     * Get current user
     */
    getUser() {
        return this.user;
    }
}

// Global auth manager instance
window.authManager = new AuthManager();

// Initialize when page loads
window.addEventListener('DOMContentLoaded', () => {
    window.authManager.initialize();
});
