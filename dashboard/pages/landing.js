/**
 * Yota Analytics — Hero Landing Page
 * Clean, simple entry point with CTAs
 */

function renderLanding(container) {
    container.innerHTML = `
        <div class="landing-hero">
            <div class="hero-content">
                <h1 class="hero-title">Find what's trending <span class="accent">this week</span> in your niche</h1>
                <p class="hero-subtitle">Fresh videos from the last 7 days, ranked by velocity — not old view monsters.</p>
                
                <div class="hero-ctas">
                    <button class="btn btn-primary btn-large" onclick="window.router.navigate('/feed')">
                        🔥 Open Feed
                    </button>
                    <button class="btn btn-secondary btn-large" onclick="window.router.navigate('/search')">
                        🔍 Search
                    </button>
                </div>

                <div class="hero-cards-preview">
                    <div class="preview-card">
                        <div class="preview-thumb"></div>
                        <div class="preview-meta">
                            <span class="preview-badge">⚡ 50K/day</span>
                            <span class="preview-time">2 days ago</span>
                        </div>
                    </div>
                    <div class="preview-card">
                        <div class="preview-thumb"></div>
                        <div class="preview-meta">
                            <span class="preview-badge">🔥 120K/day</span>
                            <span class="preview-time">1 day ago</span>
                        </div>
                    </div>
                    <div class="preview-card">
                        <div class="preview-thumb"></div>
                        <div class="preview-meta">
                            <span class="preview-badge">🚀 200K/day</span>
                            <span class="preview-time">3 hours ago</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

window.renderLanding = renderLanding;
