/**
 * Yota Analytics — Authentication (SECURE VERSION)
 * Server-side OAuth with httpOnly cookies
 */

class AuthManager {
    constructor() {
        this.user = null;
        this.checkSession();
    }

    /**
     * Check if user has active session
     */
    async checkSession() {
        try {
            const response = await fetch('/api/auth/session', {
                credentials: 'include' // Send cookies
            });

            if (response.ok) {
                const data = await response.json();
                if (data.authenticated) {
                    // Session is valid, fetch user info if needed
                    this.user = data.user || { name: 'User' };
                    this.dispatchAuthEvent(true);
                }
            }
        } catch (error) {
            console.error('Session check failed:', error);
        }
    }

    /**
     * Sign in with Google (redirects to server)
     */
    signIn() {
        // Redirect to server-side OAuth endpoint
        window.location.href = '/api/auth/signin';
    }

    /**
     * Sign out
     */
    async signOut() {
        try {
            await fetch('/api/auth/signout', {
                method: 'POST',
                credentials: 'include'
            });

            this.user = null;
            this.dispatchAuthEvent(false);

            // Redirect to home
            window.location.href = '/';
        } catch (error) {
            console.error('Sign out failed:', error);
        }
    }

    /**
     * Check if user is signed in
     */
    isSignedIn() {
        return this.user !== null;
    }

    /**
     * Get current user
     */
    getUser() {
        return this.user;
    }

    /**
     * Dispatch auth state change event
     */
    dispatchAuthEvent(signedIn) {
        window.dispatchEvent(new CustomEvent('auth-state-changed', {
            detail: { user: this.user, signedIn }
        }));
    }
}

// Global auth manager instance
window.authManager = new AuthManager();
