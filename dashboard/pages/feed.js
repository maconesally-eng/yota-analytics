/**
 * Yota Analytics — Swipe Feed Page
 * Discovery Modes with VidIQ-Style Scoring + Session Learning
 */

const DISCOVERY_MODES = [
    { id: 'forYou', label: '✨ For You', icon: '✨', desc: 'Personalized' },
    { id: 'trending', label: '🔥 Trending (24h)', icon: '🔥', desc: 'views/hour' },
    { id: 'weekMovers', label: '📈 Week Movers', icon: '📈', desc: 'views/day' },
    { id: 'risingSmall', label: '🌱 Rising Small', icon: '🌱', desc: '<200K subs' },
    { id: 'wildcard', label: '🎲 Wildcard', icon: '🎲', desc: 'Diverse' }
];

let currentMode = 'forYou';
let feedItems = [];
let currentCardIndex = 0;
let shownVideoIds = new Set();
let nextPageToken = null;

function renderFeed(container) {
    container.innerHTML = `
        <div class="feed-container">
            <!-- Discovery Mode Selector -->
            <div class="feed-filters">
                <div class="filter-row">
                    <div class="filter-group discovery-modes">
                        <label>Discovery Mode</label>
                        <div class="mode-selector" id="mode-selector">
                            ${DISCOVERY_MODES.map(m => `
                                <button class="mode-btn ${m.id === currentMode ? 'active' : ''}" data-mode="${m.id}" title="${m.desc}">
                                    <span class="mode-icon">${m.icon}</span>
                                    <span class="mode-label">${m.label.replace(/^[^\s]+\s/, '')}</span>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <div class="filter-row">
                    <div class="filter-group personalization-group">
                       <span id="personalized-badge" class="badge-pill">
                           <span class="pulse-dot"></span> Detecting Region...
                       </span>
                    </div>
                    <button class="btn btn-secondary icon-only" id="refresh-feed-btn" title="Refresh Feed">🔄</button>
                </div>
            </div>

            <!-- Feed Cards -->
            <div class="feed-cards" id="feed-cards">
                <div class="feed-loading">
                    <p>🔍 Discovering content...</p>
                </div>
            </div>

            <!-- Swipe Hint (Mobile) -->
            <div class="swipe-hint" id="swipe-hint">
                ⬆️ Swipe up for more
            </div>
        </div>
    `;

    setupFeedListeners();
    loadFeed();
}

function setupFeedListeners() {
    // Mode selector
    document.querySelectorAll('#mode-selector .mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentMode = btn.dataset.mode;
            document.querySelectorAll('#mode-selector .mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            resetAndLoadFeed();
        });
    });

    // Refresh button
    document.getElementById('refresh-feed-btn')?.addEventListener('click', () => {
        shownVideoIds.clear();
        resetAndLoadFeed();
    });

    // Mobile swipe detection
    const cardsContainer = document.getElementById('feed-cards');
    let touchStartY = 0;
    cardsContainer?.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
    });
    cardsContainer?.addEventListener('touchend', (e) => {
        const touchEndY = e.changedTouches[0].clientY;
        if (touchStartY - touchEndY > 50) {
            showNextCard();
        }
    });
}

function resetAndLoadFeed() {
    feedItems = [];
    currentCardIndex = 0;
    nextPageToken = null;
    loadFeed();
}

async function loadFeed() {
    const container = document.getElementById('feed-cards');
    if (!container) return;

    container.innerHTML = '<div class="feed-loading"><p>🔍 Discovering content...</p></div>';

    const vipKey = localStorage.getItem('yota_vip_key');
    const headers = {};
    if (vipKey) headers['x-vip-key'] = vipKey;

    const seed = Date.now();
    let url = `/api/youtube/feed?mode=${currentMode}&seed=${seed}`;
    if (nextPageToken) url += `&pageToken=${nextPageToken}`;

    try {
        const response = await fetch(url, { headers });
        if (!response.ok) throw new Error('Feed fetch failed');

        let data = await response.json();

        // Update badges
        const badgeEl = document.getElementById('personalized-badge');
        if (badgeEl && data.meta) {
            const region = data.meta.regionCode || 'US';
            const flag = getFlagEmoji(region);
            const modeDesc = data.meta.modeDescription || 'Personalized';
            badgeEl.innerHTML = `<span class="pulse-dot"></span> ${flag} ${region} • ${modeDesc}`;
        }

        // Apply session learning (filter & penalties)
        let videos = data.items;
        if (window.YotaSession) {
            videos = window.YotaSession.filterVideosBySession(videos);
            videos = window.YotaSession.applySessionPenalties(videos);
            // Re-sort after penalties
            videos.sort((a, b) => b.velocityScore - a.velocityScore);
        }

        // Dedup
        const newItems = videos.filter(v => !shownVideoIds.has(v.id));
        feedItems = newItems;
        nextPageToken = data.nextPageToken;
        newItems.forEach(v => shownVideoIds.add(v.id));

        currentCardIndex = 0;
        renderCurrentCard();
    } catch (error) {
        console.error('Feed error:', error);
        container.innerHTML = `
            <div class="feed-error">
                <p>😢 Couldn't load feed</p>
                <button class="btn" onclick="loadFeed()">Retry</button>
            </div>
        `;
    }
}

function renderCurrentCard() {
    const container = document.getElementById('feed-cards');
    if (!container) return;

    if (feedItems.length === 0) {
        container.innerHTML = '<div class="feed-empty"><p>No videos found for this mode.</p></div>';
        return;
    }

    const video = feedItems[currentCardIndex];
    const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;
    const countryFlag = video.channelCountry ? ` ${getFlagEmoji(video.channelCountry)}` : '';
    const sb = video.scoreBreakdown || {};

    // Velocity label based on mode
    const velocityLabel = currentMode === 'trending'
        ? `${formatNumber(sb.viewsPerHour || 0)}/hr`
        : `${formatNumber(sb.viewsPerDay || 0)}/day`;

    // Age label for verification
    const ageLabel = video.ageHours < 24
        ? `${Math.round(video.ageHours)}h ago`
        : formatAge(video.ageDays);

    container.innerHTML = `
        <div class="feed-card">
            <img class="feed-card-thumb" src="${video.thumbnail}" alt="${video.title}" onclick="window.open('${videoUrl}', '_blank')">
            <div class="feed-card-overlay">
                <div class="feed-card-meta">
                    <span class="velocity-badge">⚡ ${velocityLabel}</span>
                    <span class="age-badge">⏰ ${ageLabel}</span>
                    <span class="score-badge" title="VidIQ Score">🎯 ${formatNumber(video.velocityScore)}</span>
                </div>
                <h2 class="feed-card-title" onclick="window.open('${videoUrl}', '_blank')">${video.title}</h2>
                <p class="feed-card-channel">${video.channelTitle}${countryFlag}</p>
                <div class="feed-card-stats">
                    <span>👁️ ${formatNumber(video.views)}</span>
                    <span>👍 ${formatNumber(video.likes)}</span>
                    <span>💬 ${formatNumber(video.comments)}</span>
                </div>
                
                <!-- Session Learning Actions -->
                <div class="feed-card-actions">
                    <button class="action-btn save-btn" onclick="handleSaveVideo('${video.id}', '${video.theme || 'general'}')" title="Save">
                        💾 Save
                    </button>
                    <button class="action-btn not-interested-btn" onclick="handleNotInterested('${video.id}', '${video.channelId}', '${video.theme || 'general'}')" title="Not Interested">
                        👎 Not Interested
                    </button>
                </div>
                
                <!-- Score Breakdown (Expandable) -->
                <details class="score-breakdown">
                    <summary>📊 Why this ranks</summary>
                    <div class="breakdown-content">
                        <div class="breakdown-row"><span>Views/Hour</span><span>${formatNumber(sb.viewsPerHour || 0)}</span></div>
                        <div class="breakdown-row"><span>Views/Day</span><span>${formatNumber(sb.viewsPerDay || 0)}</span></div>
                        <div class="breakdown-row"><span>Engagement</span><span>${sb.engagementRate || '0%'}</span></div>
                        <div class="breakdown-row"><span>Like Rate</span><span>${sb.likeRate || '0%'}</span></div>
                        <div class="breakdown-row"><span>Freshness</span><span>${sb.freshnessBoost || '1.00'}x</span></div>
                        ${sb.diversityFactor && sb.diversityFactor !== '1.00' ? `<div class="breakdown-row"><span>Diversity</span><span>${sb.diversityFactor}x</span></div>` : ''}
                        ${sb.isLocalMatch ? '<div class="breakdown-row highlight"><span>🎯 Local Match</span><span>+Boost</span></div>' : ''}
                        ${video.sessionMultiplier && video.sessionMultiplier !== 1 ? `<div class="breakdown-row"><span>Session</span><span>${video.sessionMultiplier.toFixed(2)}x</span></div>` : ''}
                    </div>
                </details>
            </div>
        </div>
        <div class="feed-nav">
            <button class="btn btn-icon" ${currentCardIndex === 0 ? 'disabled' : ''} onclick="showPrevCard()">⬆️</button>
            <span>${currentCardIndex + 1} / ${feedItems.length}</span>
            <button class="btn btn-icon" ${currentCardIndex >= feedItems.length - 1 ? 'disabled' : ''} onclick="showNextCard()">⬇️</button>
        </div>
    `;
}

function handleNotInterested(videoId, channelId, theme) {
    if (window.YotaSession) {
        window.YotaSession.markNotInterested(videoId, channelId, theme);
        // Show feedback
        showToast('Hidden from feed');
        // Move to next card
        feedItems = feedItems.filter(v => v.id !== videoId);
        if (currentCardIndex >= feedItems.length) currentCardIndex = Math.max(0, feedItems.length - 1);
        renderCurrentCard();
    }
}

function handleSaveVideo(videoId, theme) {
    if (window.YotaSession) {
        window.YotaSession.saveVideo(videoId, theme);
        showToast('Saved!');
    }
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

function showNextCard() {
    if (currentCardIndex < feedItems.length - 1) {
        currentCardIndex++;
        renderCurrentCard();
    } else if (nextPageToken) {
        loadFeed();
    }
}

function showPrevCard() {
    if (currentCardIndex > 0) {
        currentCardIndex--;
        renderCurrentCard();
    }
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function formatAge(days) {
    if (days < 0.1) return 'Just now';
    if (days < 1) return Math.round(days * 24) + 'h ago';
    if (days < 2) return 'Yesterday';
    if (days < 7) return Math.round(days) + 'd ago';
    return Math.round(days / 7) + 'w ago';
}

function getFlagEmoji(countryCode) {
    if (!countryCode || countryCode.length !== 2) return '🌍';
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
}

// Expose for onclick handlers
window.showNextCard = showNextCard;
window.showPrevCard = showPrevCard;
window.renderFeed = renderFeed;
window.loadFeed = loadFeed;
window.handleNotInterested = handleNotInterested;
window.handleSaveVideo = handleSaveVideo;
