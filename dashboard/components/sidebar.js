/**
 * Yota Analytics — Sidebar Component
 * Navigation sidebar for the app
 */

function renderSidebar() {
    return `
        <aside class="sidebar">
            <div class="sidebar-header">
                <span class="logo-icon">📊</span>
                <span class="logo-text">Yota</span>
            </div>
            
            <nav class="sidebar-nav">
                <a href="#/dashboard" class="nav-item" data-route="/dashboard">
                    <span class="nav-icon">📈</span>
                    <span class="nav-label">Dashboard</span>
                </a>
                <a href="#/search" class="nav-item" data-route="/search">
                    <span class="nav-icon">🔍</span>
                    <span class="nav-label">Search</span>
                </a>
                <a href="#/trending" class="nav-item" data-route="/trending">
                    <span class="nav-icon">🔥</span>
                    <span class="nav-label">Trending</span>
                </a>
                <a href="#/settings" class="nav-item" data-route="/settings">
                    <span class="nav-icon">⚙️</span>
                    <span class="nav-label">Settings</span>
                </a>
            </nav>
            
            <!-- Auth Section -->
            <div class="sidebar-auth" id="sidebar-auth">
                <!-- Will be populated by renderSidebarAuth() -->
            </div>
        </aside>
    `;
}

function renderSidebarAuth() {
    const authContainer = document.getElementById('sidebar-auth');
    if (!authContainer) return;

    if (window.authManager && window.authManager.isSignedIn()) {
        const user = window.authManager.getUser();
        authContainer.innerHTML = `
            <div class="user-profile">
                <img src="${user.avatar}" alt="${user.name}" class="user-avatar" />
                <div class="user-info">
                    <strong class="user-name">${user.name}</strong>
                    <button class="sign-out-btn" onclick="handleSignOut()">Sign out</button>
                </div>
            </div>
        `;
    } else {
        authContainer.innerHTML = `
            <button class="sign-in-btn" onclick="handleSignIn()">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                    <path d="M9.003 18c2.43 0 4.467-.806 5.956-2.18L12.05 13.56c-.806.54-1.837.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9.003 18z" fill="#34A853"/>
                    <path d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.96H.957C.347 6.175 0 7.55 0 9.002c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                    <path d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.427 0 9.003 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29c.708-2.127 2.692-3.71 5.036-3.71z" fill="#EA4335"/>
                </svg>
                Sign in with Google
            </button>
        `;
    }
}

function handleSignIn() {
    if (window.authManager) {
        window.authManager.signIn();
    }
}

function handleSignOut() {
    if (window.authManager) {
        window.authManager.signOut();
    }
}

// Listen for auth state changes
window.addEventListener('auth-state-changed', () => {
    renderSidebarAuth();
});

// Initial render
window.addEventListener('load', () => {
    // Check multiple times as authManager might be initializing
    const checkAuth = setInterval(() => {
        if (window.authManager) {
            renderSidebarAuth();
            if (window.authManager.isSignedIn()) {
                clearInterval(checkAuth);
            }
        }
    }, 100);

    // Stop checking after 2 seconds anyway
    setTimeout(() => clearInterval(checkAuth), 2000);
});

// Export for use in main app
window.renderSidebar = renderSidebar;
window.handleSignIn = handleSignIn;
window.handleSignOut = handleSignOut;
