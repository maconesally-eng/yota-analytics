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

function renderTrending(container) {
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
        
        <!-- Manual Discover Instructions -->
        <div class="trending-instructions card">
            <h3>🔧 Discover Trending Content</h3>
            <p>To find trending ${getCurrentNicheLabel()} content, run:</p>
            <div class="code-block">
                <code>python tools/discover_trending.py ${currentNiche}</code>
                <button class="copy-btn" onclick="copyToClipboard('python tools/discover_trending.py ${currentNiche}')">
                    📋 Copy
                </button>
            </div>
            <p class="help-text">
                This will search for trending videos, compute trend scores, and cache results for 6 hours.
            </p>
            <div class="quota-warning">
                ⚠️ <strong>Quota:</strong> Uses 100+ units per discovery. Results are cached for 6 hours.
            </div>
        </div>
        
        <!-- Example: What You'll Get -->
        <div class="example-results card">
            <h3>📊 What You'll See</h3>
            <p class="help-text">Terminal output will show:</p>
            
            <div class="example-video">
                <div class="example-rank">#1</div>
                <div class="example-content">
                    <strong>Example: Best Couples Vlog 2026</strong>
                    <div class="example-meta">
                        <span>Channel: LoveStory</span>
                        <span>🔥 Trend Score: 87/100</span>
                    </div>
                    <div class="example-stats">
                        📊 120,000 views
                    </div>
                    <div class="example-explanation">
                        💡 🚀 Explosive growth • 💬 Very engaged audience • 🔥 Just published
                    </div>
                </div>
            </div>
            
            <p class="help-text" style="margin-top: 1rem;">
                Plus: Top trending channels, aggregated scores, and cache info.
            </p>
        </div>
        
        <!-- Trend Score Legend -->
        <div class="trend-legend card">
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
                    <p>2x for &lt;7 days, 1.5x for &lt;14 days</p>
                </div>
            </div>
            <div class="score-ranges">
                <span class="score-badge score-high">80-100: 🔥 On fire</span>
                <span class="score-badge score-med">50-79: 📈 Rising</span>
                <span class="score-badge score-low">0-49: 📊 Steady</span>
            </div>
        </div>
    `;
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

    // Update command
    const codeBlock = document.querySelector('.trending-instructions code');
    if (codeBlock) {
        codeBlock.textContent = `python tools/discover_trending.py ${nicheId}`;
    }

    // Update copy button
    const copyBtn = document.querySelector('.trending-instructions .copy-btn');
    if (copyBtn) {
        copyBtn.onclick = () => copyToClipboard(`python tools/discover_trending.py ${nicheId}`);
    }

    // Update description
    const description = document.querySelector('.trending-instructions p');
    if (description) {
        description.textContent = `To find trending ${getCurrentNicheLabel()} content, run:`;
    }
}

function getCurrentNicheLabel() {
    const niche = NICHES.find(n => n.id === currentNiche);
    return niche ? niche.label : '';
}

// Export
window.renderTrending = renderTrending;
window.selectNiche = selectNiche;
