/**
 * Yota Analytics — Main App
 * App initialization and routing setup
 */

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    // Render sidebar
    const sidebarContainer = document.getElementById('sidebar-container');
    if (sidebarContainer) {
        sidebarContainer.innerHTML = window.renderSidebar();
    }

    // Render exports buttons
    const exportsContainer = document.getElementById('exports-container');
    if (exportsContainer) {
        exportsContainer.innerHTML = window.renderExports();
    }

    // Register routes
    window.router.register('/dashboard', async () => {
        const content = document.getElementById('app-content');
        await window.renderDashboard(content);
    });

    window.router.register('/search', () => {
        const content = document.getElementById('app-content');
        window.renderSearch(content);
    });

    window.router.register('/trending', () => {
        const content = document.getElementById('app-content');
        window.renderTrending(content);
    });

    window.router.register('/settings', () => {
        const content = document.getElementById('app-content');
        window.renderSettings(content);
    });

    // Initialize routing (will trigger initial page load)
    window.router.handleRoute();
});
