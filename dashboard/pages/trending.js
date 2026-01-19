/**
 * Yota Analytics — Trending Page
 * Discover trending videos and channels by niche
 */

const NICHES = [
    { id: 'couples', label: 'Couples', query: 'couples vlog' },
    { id: 'family', label: 'Family', query: 'family content' },
    { id: 'pregnancy', label: 'Pregnancy', query: 'pregnancy journey' },
    { id: 'marriage', label: 'Marriage', query: 'marriage advice' },
    { id: 'datenight', label: 'Date Night', query: 'date ideas' }
];

let currentNiche = 'couples';

// State for caching trending results in memory
const trendingCache = {};

async function renderTrending(container) {
    container.innerHTML = `
        <div class="page-header">
            <h1>🔥 Trending</h1>
            <p class="page-description">Discover what's heating up in your niche</p>
        </div>
        
        <!-- Niche Selector -->
        <div class="niche-selector">
            <h3>Select Niche:</h3>
            <div class="niche-buttons">
                ${NICHES.map(niche => `
                    <button 
                        class="niche-btn ${niche.id === currentNiche ? 'active' : ''}" 
                        data-niche="${niche.id}"
                        onclick="selectNiche('${niche.id}')"
                    >
                        ${niche.label}
                    </button>
                `).join('')}
            </div>
        </div>

        <!-- Content Area -->
        <div id="trending-content">
            <div class="loading-state">
                <div class="loader"></div>
                <p>Analyzing trends for ${getCurrentNicheLabel()}...</p>
            </div>
        </div>
    `;

    // Check auth
    if (!window.authManager || !window.authManager.isSignedIn()) {
        renderAuthPrompt(document.getElementById('trending-content'));
        return;
    }

    await loadAndRenderVideos(currentNiche);
}

function renderAuthPrompt(container) {
    container.innerHTML = `
        <div class="empty-state">
            <p class="empty-icon">🔒</p>
            <h2>Sign in to Discover Trends</h2>
            <p>We need your permission to access YouTube search functionality.</p>
            <button class="sign-in-btn" onclick="handleSignIn()">Sign in with Google</button>
        </div>
    `;
}

async function loadAndRenderVideos(nicheId) {
    const container = document.getElementById('trending-content');
    if (!container) return;

    // Use cache if available
    if (trendingCache[nicheId]) {
        renderVideos(trendingCache[nicheId], container);
        return;
    }

    container.innerHTML = `
        <div class="loading-state">
            <div class="loader"></div>
            <p>Scanning YouTube for rising ${getCurrentNicheLabel()} content...</p>
            <small style="color: #aaa; display: block; margin-top: 8px;">Analyzing velocity, engagement, and recency</small>
        </div>
    `;

    try {
        const niche = NICHES.find(n => n.id === nicheId);
        const response = await fetch(`/api/youtube/search?q=${encodeURIComponent(niche.query)}`);

        if (!response.ok) throw new Error('Failed to fetch trending videos');

        const data = await response.json();
        const videos = data.items || [];

        // Cache properly
        trendingCache[nicheId] = videos;

        renderVideos(videos, container);

    } catch (error) {
        console.error('Trending error:', error);
        container.innerHTML = `
            <div class="empty-state">
                <p class="empty-icon">⚠️</p>
                <h2>Unable to Load Trends</h2>
                <p>Something went wrong while scanning for trends. Please try again.</p>
                <button class="action-btn" onclick="loadAndRenderVideos('${nicheId}')">Try Again</button>
            </div>
        `;
    }
}

function renderVideos(videos, container) {
    if (videos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No trending videos found for this niche right now.</p>
            </div>
        `;
        return;
    }

    const videoCards = videos.map((video, index) => `
        <div class="video-card trend-card">
            <div class="trend-rank">#${index + 1}</div>
            <img src="${video.thumbnail}" alt="${video.title}" class="video-thumb">
            <div class="video-info">
                <h3 class="video-title">${video.title}</h3>
                <p class="channel-name">${video.channelTitle}</p>
                
                <div class="trend-stats">
                    <span class="score-badge ${getScoreClass(video.trendScore)}">
                        🔥 ${video.trendScore}/100
                    </span>
                    <span class="view-count">${window.formatNumber(video.views)} views</span>
                </div>
                
                <div class="trend-explanation">
                    💡 ${video.trendExplanation}
                </div>
                
                <a href="https://www.youtube.com/watch?v=${video.id}" target="_blank" class="watch-link">
                    Watch on YouTube ↗
                </a>
            </div>
        </div>
    `).join('');

    container.innerHTML = `
        <div class="trending-grid">
            ${videoCards}
        </div>
        
        <div class="trend-legend card" style="margin-top: 3rem;">
             <h3>📈 How Trend Scores Work</h3>
             <div class="legend-grid">
                 <div class="legend-item">
                     <strong>View Velocity (50%)</strong>
                     <p>Views per day since publish</p>
                 </div>
                 <div class="legend-item">
                     <strong>Engagement Rate (30%)</strong>
                     <p>(Likes + Comments) / Views</p>
                 </div>
                 <div class="legend-item">
                     <strong>Recency Boost (20%)</strong>
                     <p>Bonus for content < 1 week old</p>
                 </div>
             </div>
        </div>
    `;
}

function getScoreClass(score) {
    if (score >= 80) return 'score-high';
    if (score >= 50) return 'score-med';
    return 'score-low';
}

function selectNiche(nicheId) {
    currentNiche = nicheId;

    // Update button states
    document.querySelectorAll('.niche-btn').forEach(btn => {
        if (btn.getAttribute('data-niche') === nicheId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    loadAndRenderVideos(nicheId);
}

function getCurrentNicheLabel() {
    const niche = NICHES.find(n => n.id === currentNiche);
    return niche ? niche.label : '';
}

// Export
window.renderTrending = renderTrending;
window.selectNiche = selectNiche;
