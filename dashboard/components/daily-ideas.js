/**
 * Daily Ideas Widget
 * Suggests video topics with "Viral Prediction" scores
 */

const DAILY_IDEAS_CACHE_KEY = 'yota_daily_ideas';
const DAILY_IDEAS_CACHE_TIME = 1000 * 60 * 60 * 24; // 24 hours

class DailyIdeasWidget {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
    }

    async render() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="card daily-ideas-card">
                <div class="card-header">
                    <h3>💡 Daily Ideas</h3>
                    <span class="beta-badge">BETA</span>
                </div>
                <div id="ideas-list" class="ideas-list">
                    <div class="loader-sm"></div>
                </div>
            </div>
        `;

        const ideas = await this.getDailyIdeas();
        this.renderIdeas(ideas);
    }

    async getDailyIdeas() {
        // 1. Check Cache
        const cached = localStorage.getItem(DAILY_IDEAS_CACHE_KEY);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < DAILY_IDEAS_CACHE_TIME) {
                return data;
            }
        }

        // 2. Fetch Fresh Ideas (Mocked for now using Trending API logic)
        // In a real app, this would use the user's niche keywords.
        // For now, we'll fetch 'AI Tools' and 'Tech' trends as a default.
        try {
            const niches = ['tech', 'ai tools', 'productivity'];
            const randomNiche = niches[Math.floor(Math.random() * niches.length)];

            const response = await fetch(`/api/youtube/search?q=${encodeURIComponent(randomNiche)}`);
            if (!response.ok) throw new Error('Failed to fetch ideas');

            const data = await response.json();
            const videos = data.items || [];

            // Transform trending videos into "Ideas"
            const ideas = videos.slice(0, 3).map(v => ({
                title: `Review: ${v.title}`,
                prediction: this.calculatePrediction(v.trendScore),
                score: v.trendScore
            }));

            // Cache
            localStorage.setItem(DAILY_IDEAS_CACHE_KEY, JSON.stringify({
                data: ideas,
                timestamp: Date.now()
            }));

            return ideas;

        } catch (error) {
            console.error('Daily Ideas Error:', error);
            return [];
        }
    }

    calculatePrediction(trendScore) {
        if (trendScore >= 80) return { label: 'Very High', class: 'pred-very-high' };
        if (trendScore >= 50) return { label: 'High', class: 'pred-high' };
        return { label: 'Medium', class: 'pred-medium' };
    }

    renderIdeas(ideas) {
        const listContainer = this.container.querySelector('#ideas-list');

        if (ideas.length === 0) {
            listContainer.innerHTML = '<p class="text-muted">No ideas available today. Check back tomorrow!</p>';
            return;
        }

        listContainer.innerHTML = ideas.map(idea => `
            <div class="idea-item">
                <div class="idea-content">
                    <p class="idea-title">${this.cleanTitle(idea.title)}</p>
                    <div class="prediction-badge ${idea.prediction.class}">
                        ${idea.prediction.label} Prediction
                    </div>
                </div>
                <button class="save-idea-btn" title="Save Idea">🔖</button>
            </div>
        `).join('');
    }

    cleanTitle(title) {
        // Remove common clutter from titles to make them look like "Ideas"
        return title.replace(/\|.*/, '').replace(/\(.*\)/, '').trim();
    }
}

// Export
window.DailyIdeasWidget = DailyIdeasWidget;
