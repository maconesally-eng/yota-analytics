/**
 * Yota Analytics — State Manager
 * Handles application state persistence and management
 */

class StateManager {
    constructor() {
        this.STORAGE_KEYS = {
            CURRENT_CHANNEL: 'yota_current_channel',
            RECENT_CHANNELS: 'yota_recent_channels',
            SAVED_SEARCHES: 'yota_saved_searches',
            ANALYTICS_DATA: 'yota_analytics_data'
        };
    }

    // Current channel (session-based)
    setCurrentChannel(channelData) {
        sessionStorage.setItem(
            this.STORAGE_KEYS.CURRENT_CHANNEL,
            JSON.stringify(channelData)
        );
    }

    getCurrentChannel() {
        const data = sessionStorage.getItem(this.STORAGE_KEYS.CURRENT_CHANNEL);
        return data ? JSON.parse(data) : null;
    }

    // Recent channels (persistent, max 10)
    addRecentChannel(channelId, name, handle) {
        let recent = this.getRecentChannels();

        // Remove if already exists
        recent = recent.filter(c => c.channelId !== channelId);

        // Add to beginning
        recent.unshift({
            channelId,
            name,
            handle,
            timestamp: new Date().toISOString()
        });

        // Keep only 10 most recent
        recent = recent.slice(0, 10);

        localStorage.setItem(
            this.STORAGE_KEYS.RECENT_CHANNELS,
            JSON.stringify(recent)
        );
    }

    getRecentChannels() {
        const data = localStorage.getItem(this.STORAGE_KEYS.RECENT_CHANNELS);
        return data ? JSON.parse(data) : [];
    }

    // Saved searches (persistent)
    addSavedSearch(query, type) {
        let searches = this.getSavedSearches();

        const newSearch = {
            id: Date.now().toString(),
            query,
            type, // 'channel', 'keyword', or 'hashtag'
            timestamp: new Date().toISOString()
        };

        searches.unshift(newSearch);

        localStorage.setItem(
            this.STORAGE_KEYS.SAVED_SEARCHES,
            JSON.stringify(searches)
        );

        return newSearch.id;
    }

    getSavedSearches() {
        const data = localStorage.getItem(this.STORAGE_KEYS.SAVED_SEARCHES);
        return data ? JSON.parse(data) : [];
    }

    removeSavedSearch(id) {
        let searches = this.getSavedSearches();
        searches = searches.filter(s => s.id !== id);

        localStorage.setItem(
            this.STORAGE_KEYS.SAVED_SEARCHES,
            JSON.stringify(searches)
        );
    }

    // Analytics data (session-based)
    setAnalyticsData(data) {
        sessionStorage.setItem(
            this.STORAGE_KEYS.ANALYTICS_DATA,
            JSON.stringify(data)
        );
    }

    getAnalyticsData() {
        const data = sessionStorage.getItem(this.STORAGE_KEYS.ANALYTICS_DATA);
        return data ? JSON.parse(data) : null;
    }

    // Clear all data
    clearAll() {
        Object.values(this.STORAGE_KEYS).forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });
    }
}

// Export singleton instance
window.stateManager = new StateManager();
