/**
 * Yota Analytics — Router
 * Hash-based routing system
 */

class Router {
    constructor() {
        this.routes = {};
        this.currentRoute = null;

        // Listen for hash changes
        window.addEventListener('hashchange', () => this.handleRoute());

        // Handle initial load
        window.addEventListener('DOMContentLoaded', () => this.handleRoute());
    }

    /**
     * Register a route
     * @param {string} path - Route path (e.g., '/dashboard')
     * @param {Function} handler - Function to call when route is accessed
     */
    register(path, handler) {
        this.routes[path] = handler;
    }

    /**
     * Navigate to a route programmatically
     * @param {string} path - Route path to navigate to
     */
    navigate(path) {
        window.location.hash = path;
    }

    /**
     * Get current route path from hash
     * @returns {string} Current route path
     */
    getCurrentPath() {
        const hash = window.location.hash.slice(1); // Remove #
        return hash || '/dashboard'; // Default to dashboard
    }

    /**
     * Handle route change
     */
    handleRoute() {
        const path = this.getCurrentPath();
        this.currentRoute = path;

        // Find matching route
        const handler = this.routes[path] || this.routes['/dashboard'];

        if (handler) {
            handler();
        } else {
            console.error(`No route handler for: ${path}`);
        }

        // Update active nav item
        this.updateActiveNav(path);
    }

    /**
     * Update active state in navigation
     * @param {string} path - Current active path
     */
    updateActiveNav(path) {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            const itemPath = item.getAttribute('data-route');
            if (itemPath === path) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }
}

// Export singleton instance
window.router = new Router();
