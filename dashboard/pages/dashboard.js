/**
 * Yota Analytics — Dashboard Page
 * Main analytics dashboard view
 */

async function renderDashboard(container) {
    // 1. Check for Authentication
    const isSignedIn = window.authManager && window.authManager.isSignedIn();

    let data = null;
    let isDemo = false;
    let isLive = false;

    // 2. If signed in, prioritize LIVE data
    if (isSignedIn) {
        container.innerHTML = `
            <div class="loading-state">
                <div class="loader"></div>
                <p>Fetching live analytics from your YouTube channel...</p>
            </div>
        `;
        data = await window.liveAnalytics.fetchFullDashboardData();
        if (data) {
            isLive = true;
            // Update state so other components can use it
            window.stateManager.setAnalyticsData(data);
        }
    }

    // 3. Fallback to State/File data if not live
    if (!data) {
        data = window.stateManager.getAnalyticsData();

        if (!data || data.isLive) { // If stored data is old live data, try to refresh or use file
            try {
                const response = await fetch('../output/analytics.json');
                if (response.ok) {
                    data = await response.json();
                }
            } catch (error) {
                console.log('No production data found.');
            }
        }
    }

    // 4. Fallback to Demo Data
    if (!data) {
        try {
            const demoResponse = await fetch('./demo-data.json');
            if (demoResponse.ok) {
                data = await demoResponse.json();
                isDemo = true;
            }
        } catch (error) {
            console.error('Error loading demo data:', error);
        }
    }

    if (!data) {
        container.innerHTML = `
            <div class="empty-state">
                <p class="empty-icon">📊</p>
                <h2>No Analytics Data</h2>
                <p>Sign in with Google or run <code>python main.py</code> locally.</p>
            </div>
        `;
        return;
    }

    // Render dashboard
    const banner = isLive ? `
        <div class="live-banner">
            📡 <strong>Live Data</strong> — Connected to your YouTube channel.
        </div>
    ` : isDemo ? `
        <div class="demo-banner">
            🎭 <strong>Demo Mode</strong> — This is sample data. Sign in with Google to see your real channel analytics.
        </div>
    ` : '';

    container.innerHTML = `
        ${demoBanner}
        ${renderChannelCard(data.channel)}
        ${renderMomentumCard(data.insights)}
        ${renderinsightsGrid(data.insights)}
        ${renderBestVideoCard(data.insights)}
        ${renderRecentVideos(data.recent_videos)}
        ${renderFooter(data.generated_at)}
    `;
}

function renderChannelCard(channel) {
    return `
        <section class="card channel-card">
            <h2>${channel.name}</h2>
            <p class="handle">${channel.handle || ''}</p>
            <div class="stats-row">
                <div class="stat">
                    <span class="stat-value">${formatNumber(channel.subscribers)}</span>
                    <span class="stat-label">Subscribers</span>
                </div>
                <div class="stat">
                    <span class="stat-value">${formatNumber(channel.total_views)}</span>
                    <span class="stat-label">Total Views</span>
                </div>
                <div class="stat">
                    <span class="stat-value">${formatNumber(channel.total_videos)}</span>
                    <span class="stat-label">Videos</span>
                </div>
            </div>
        </section>
    `;
}

function renderMomentumCard(insights) {
    const score = insights.momentum_score || 50;
    return `
        <section class="card momentum-card">
            <h3>Your Momentum</h3>
            <div class="momentum-display">
                <div class="momentum-circle">
                    <span class="momentum-score">${score}</span>
                    <span class="momentum-max">/100</span>
                </div>
                <p class="momentum-label">${insights.momentum_label}</p>
            </div>
            <div class="momentum-bar">
                <div class="momentum-fill" style="width: ${score}%"></div>
            </div>
        </section>
    `;
}

function renderinsightsGrid(insights) {
    return `
        <section class="insights-grid">
            <div class="card insight-card">
                <span class="insight-icon">📅</span>
                <h4>Best Upload Day</h4>
                <p class="insight-value">${insights.best_upload_day || 'N/A'}</p>
            </div>
            <div class="card insight-card">
                <span class="insight-icon">👁️</span>
                <h4>Avg Views/Video</h4>
                <p class="insight-value">${formatNumber(Math.round(insights.avg_views_per_video || 0))}</p>
            </div>
            <div class="card insight-card">
                <span class="insight-icon">💬</span>
                <h4>Avg Engagement</h4>
                <p class="insight-value">${(insights.avg_engagement_rate || 0).toFixed(1)}%</p>
            </div>
            <div class="card insight-card">
                <span class="insight-icon">🎬</span>
                <h4>Upload Pace</h4>
                <p class="insight-value">${insights.upload_consistency || 'N/A'}</p>
            </div>
        </section>
    `;
}

function renderBestVideoCard(insights) {
    return `
        <section class="card best-video-card">
            <h3>⭐ Top Performing Video</h3>
            <p class="best-video-title">${insights.best_performing_video || 'No videos yet'}</p>
        </section>
    `;
}

function renderRecentVideos(videos) {
    if (!videos || videos.length === 0) {
        return '<section class="card"><p>No recent videos found.</p></section>';
    }

    const videoItems = videos.slice(0, 10).map(video => `
        <div class="video-item">
            <span class="video-title">${escapeHtml(video.title)}</span>
            <span class="video-views">${formatNumber(video.views)} views</span>
        </div>
    `).join('');

    return `
        <section class="card videos-card">
            <h3>Recent Videos</h3>
            <div class="videos-list">${videoItems}</div>
        </section>
    `;
}

function renderFooter(generatedAt) {
    return `
        <footer class="footer">
            <p>Generated ${formatDate(generatedAt)}</p>
            <p class="footer-tagline">Keep creating together 💜</p>
        </footer>
    `;
}

// Utility functions
function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
}

function formatDate(isoString) {
    if (!isoString) return 'just now';
    const date = new Date(isoString);
    const diffMs = new Date() - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export
window.renderDashboard = renderDashboard;
