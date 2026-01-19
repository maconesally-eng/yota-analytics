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
            
            <div class="sidebar-footer">
                <p class="version">v1.0</p>
            </div>
        </aside>
    `;
}

// Export for use in main app
window.renderSidebar = renderSidebar;
