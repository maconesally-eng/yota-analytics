/**
 * Yota Analytics — Recommendations Engine
 * Generate personalized YouTube recommendations based on user's interests
 */

class RecommendationsEngine {
    constructor(authManager) {
        this.authManager = authManager;
        this.cache = {
            recommendations: null,
            timestamp: null,
            ttl: 60 * 60 * 1000 // 1 hour
        };
    }

    /**
     * Generate personalized recommendations
     */
    async generateRecommendations() {
        // Check cache first
        if (this.cache.recommendations &&
            this.cache.timestamp &&
            Date.now() - this.cache.timestamp < this.cache.ttl) {
            console.log('Using cached recommendations');
            return this.cache.recommendations;
        }

        try {
            const accessToken = await this.authManager.getAccessToken();

            // 1. Get user's subscribed channels
            const subscriptions = await this.fetchSubscriptions(accessToken);

            // 2. Extract niches from channel names
            const niches = this.extractNiches(subscriptions);

            // 3. Find trending videos in those niches
            const recommendations = await this.findTrendingInNiches(niches);

            // Cache results
            this.cache.recommendations = recommendations;
            this.cache.timestamp = Date.now();

            return recommendations;
        } catch (error) {
            console.error('Error generating recommendations:', error);
            return [];
        }
    }

    /**
     * Fetch user's YouTube subscriptions
     */
    async fetchSubscriptions(accessToken) {
        try {
            const response = await fetch(
                'https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&mine=true&maxResults=50',
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            return data.items || [];
        } catch (error) {
            console.error('Error fetching subscriptions:', error);
            return [];
        }
    }

    /**
     * Extract niche keywords from channel names and descriptions
     */
    extractNiches(subscriptions) {
        const nicheKeywords = {
            'couples': ['couple', 'relationship', 'boyfriend', 'girlfriend', 'partner'],
            'family': ['family', 'mom', 'dad', 'parent', 'kids', 'children'],
            'pregnancy': ['pregnancy', 'pregnant', 'baby', 'expecting'],
            'vlog': ['vlog', 'daily', 'life', 'routine'],
            'gaming': ['gaming', 'gameplay', 'game', 'gamer'],
            'fitness': ['fitness', 'workout', 'gym', 'health'],
            'cooking': ['cooking', 'recipe', 'food', 'chef'],
            'travel': ['travel', 'adventure', 'explore', 'trip']
        };

        const nicheScores = {};

        // Score each niche based on subscription matches
        subscriptions.forEach(sub => {
            const channelName = sub.snippet?.title?.toLowerCase() || '';
            const description = sub.snippet?.description?.toLowerCase() || '';
            const combined = `${channelName} ${description}`;

            Object.entries(nicheKeywords).forEach(([niche, keywords]) => {
                const matches = keywords.filter(kw => combined.includes(kw)).length;
                nicheScores[niche] = (nicheScores[niche] || 0) + matches;
            });
        });

        // Return top 3 niches
        const topNiches = Object.entries(nicheScores)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([niche]) => niche);

        console.log('Detected niches:', topNiches);
        return topNiches.length > 0 ? topNiches : ['vlog']; // Default to 'vlog' if no matches
    }

    /**
     * Find trending videos in user's niches
     */
    async findTrendingInNiches(niches) {
        const allRecommendations = [];

        for (const niche of niches) {
            try {
                // Use our existing discover_trending.py logic
                // For now, simulate with search results
                const videos = await this.searchNiche(niche);
                allRecommendations.push(...videos);
            } catch (error) {
                console.error(`Error searching niche ${niche}:`, error);
            }
        }

        // Remove duplicates and rank by relevance
        const unique = this.deduplicateVideos(allRecommendations);

        return unique.slice(0, 10);
    }

    /**
     * Search for trending content in a niche
     */
    async searchNiche(niche) {
        // This would call your Python backend or YouTube API directly
        // For demo, return mock data
        console.log(`Searching niche: ${niche}`);

        // In production, you'd call:
        // const response = await fetch(`/api/trending/${niche}`);
        // return await response.json();

        return []; // Mock for now
    }

    /**
     * Remove duplicate videos
     */
    deduplicateVideos(videos) {
        const seen = new Set();
        return videos.filter(video => {
            const id = video.video_id || video.id;
            if (seen.has(id)) {
                return false;
            }
            seen.add(id);
            return true;
        });
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.recommendations = null;
        this.cache.timestamp = null;
    }
}

// Global recommendations engine instance
window.recommendationsEngine = new RecommendationsEngine(window.authManager);
