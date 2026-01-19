/**
 * Yota Analytics — Swipe Feed Page
 * Mobile-first viral content discovery
 */

const FEED_NICHES = [
    { id: 'family', label: '👨‍👩‍👧 Family' },
    { id: 'babies', label: '👶 Babies' },
    { id: 'couples', label: '💑 Couples' },
    { id: 'comedy', label: '😂 Comedy' },
    { id: 'pranks', label: '🎭 Pranks' },
    { id: 'tech', label: '💻 Tech' }
];

const FEED_WINDOWS = [
    { days: 1, label: '24h' },
    { days: 7, label: '7 days' },
    { days: 30, label: '30 days' }
];

let currentFeedNiche = 'family';
let currentWindowDays = 7;
let feedItems = [];
let currentCardIndex = 0;
let shownVideoIds = new Set();
let nextPageToken = null;

function renderFeed(container) {
    container.innerHTML = `
        <div class="feed-container">
            <!-- Filters Panel -->
            <div class="feed-filters">
                <div class="filter-group">
                    <label>Niche</label>
                    <div class="filter-chips" id="niche-chips">
                        ${FEED_NICHES.map(n => `
                            <button class="chip ${n.id === currentFeedNiche ? 'active' : ''}" data-niche="${n.id}">
                                ${n.label}
                            </button>
                        `).join('')}
                    </div>
                </div>
                <div class="filter-group">
                    <label>Recency</label>
                    <div class="filter-chips" id="window-chips">
                        ${FEED_WINDOWS.map(w => `
                            <button class="chip ${w.days === currentWindowDays ? 'active' : ''}" data-days="${w.days}">
                                ${w.label}
                            </button>
                        `).join('')}
                    </div>
                </div>
                <button class="btn btn-secondary" id="refresh-feed-btn">🔄 Refresh</button>
            </div>

            <!-- Feed Cards -->
            <div class="feed-cards" id="feed-cards">
                <div class="feed-loading">
                    <p>🔍 Scanning YouTube...</p>
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
    // Niche chips
    document.querySelectorAll('#niche-chips .chip').forEach(chip => {
        chip.addEventListener('click', () => {
            currentFeedNiche = chip.dataset.niche;
            document.querySelectorAll('#niche-chips .chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            resetAndLoadFeed();
        });
    });

    // Window chips
    document.querySelectorAll('#window-chips .chip').forEach(chip => {
        chip.addEventListener('click', () => {
            currentWindowDays = parseInt(chip.dataset.days, 10);
            document.querySelectorAll('#window-chips .chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
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
            // Swipe up
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

    container.innerHTML = '<div class="feed-loading"><p>🔍 Scanning YouTube...</p></div>';

    const vipKey = localStorage.getItem('yota_vip_key');
    const headers = {};
    if (vipKey) headers['x-vip-key'] = vipKey;

    const seed = Date.now(); // New seed for variety
    let url = `/api/youtube/feed?niche=${currentFeedNiche}&windowDays=${currentWindowDays}&seed=${seed}`;
    if (nextPageToken) url += `&pageToken=${nextPageToken}`;

    try {
        const response = await fetch(url, { headers });
        if (!response.ok) throw new Error('Feed fetch failed');

        const data = await response.json();
        feedItems = data.items.filter(v => !shownVideoIds.has(v.id));
        nextPageToken = data.nextPageToken;

        // Mark as shown
        feedItems.forEach(v => shownVideoIds.add(v.id));

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
        container.innerHTML = '<div class="feed-empty"><p>No videos found for this filter.</p></div>';
        return;
    }

    const video = feedItems[currentCardIndex];
    const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;

    container.innerHTML = `
        <div class="feed-card" onclick="window.open('${videoUrl}', '_blank')">
            <img class="feed-card-thumb" src="${video.thumbnail}" alt="${video.title}">
            <div class="feed-card-overlay">
                <div class="feed-card-meta">
                    <span class="velocity-badge">⚡ ${formatNumber(video.viewsPerDay)}/day</span>
                    <span class="age-badge">${formatAge(video.ageDays)}</span>
                </div>
                <h2 class="feed-card-title">${video.title}</h2>
                <p class="feed-card-channel">${video.channelTitle}</p>
                <div class="feed-card-stats">
                    <span>👁️ ${formatNumber(video.views)}</span>
                    <span>👍 ${formatNumber(video.likes)}</span>
                    <span>💬 ${formatNumber(video.comments)}</span>
                </div>
            </div>
        </div>
        <div class="feed-nav">
            <button class="btn btn-icon" ${currentCardIndex === 0 ? 'disabled' : ''} onclick="showPrevCard()">⬆️</button>
            <span>${currentCardIndex + 1} / ${feedItems.length}</span>
            <button class="btn btn-icon" ${currentCardIndex >= feedItems.length - 1 ? 'disabled' : ''} onclick="showNextCard()">⬇️</button>
        </div>
    `;
}

function showNextCard() {
    if (currentCardIndex < feedItems.length - 1) {
        currentCardIndex++;
        renderCurrentCard();
    } else if (nextPageToken) {
        loadFeed(); // Load more
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
    if (days < 1) return 'Today';
    if (days < 2) return 'Yesterday';
    if (days < 7) return Math.round(days) + ' days ago';
    return Math.round(days / 7) + ' weeks ago';
}

// Expose for onclick handlers
window.showNextCard = showNextCard;
window.showPrevCard = showPrevCard;
window.renderFeed = renderFeed;
