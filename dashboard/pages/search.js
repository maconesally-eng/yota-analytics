/**
 * Yota Analytics — Search Page
 * Universal search for channels, videos, and hashtags
 */

let searchDebounceTimer = null;
let currentSearchMode = 'video';
let searchResults = null;

async function renderSearch(container) {
    container.innerHTML = `
        <div class="page-header">
            <h1>🔍 Search</h1>
            <p class="page-description">Find channels, videos, and hashtags</p>
        </div>
        
        <!-- Search Bar -->
        <div class="search-bar-container">
            <div class="search-input-wrapper">
                <input 
                    type="text" 
                    id="search-input" 
                    class="search-input" 
                    placeholder="Search channels, keywords, or #hashtags..."
                    autocomplete="off"
                />
                <button id="search-btn" class="search-btn">🔍</button>
            </div>
            
            <div class="search-mode-selector">
                <label class="search-mode-option">
                    <input type="radio" name="search-mode" value="channel" />
                    <span>Channels</span>
                </label>
                <label class="search-mode-option">
                    <input type="radio" name="search-mode" value="video" checked />
                    <span>Videos</span>
                </label>
                <label class="search-mode-option">
                    <input type="radio" name="search-mode" value="all" />
                    <span>All</span>
                </label>
            </div>
        </div>
        
        <!-- Search Stats -->
        <div id="search-stats" class="search-stats hidden"></div>
        
        <!-- Results Tabs -->
        <div id="results-container" class="results-container hidden">
            <div class="results-tabs">
                <button class="tab-btn active" data-tab="channels">
                    Channels (<span id="channels-count">0</span>)
                </button>
                <button class="tab-btn" data-tab="videos">
                    Videos (<span id="videos-count">0</span>)
                </button>
            </div>
            
            <div class="tab-content">
                <div id="channels-tab" class="tab-pane active"></div>
                <div id="videos-tab" class="tab-pane hidden"></div>
            </div>
        </div>
        
        <!-- Loading State -->
        <div id="search-loading" class="search-loading hidden">
            <div class="spinner"></div>
            <p>Searching...</p>
        </div>
        
        <!-- Empty State -->
        <div id="search-empty" class="search-empty">
            <p class="empty-icon">🔍</p>
            <h3>Start searching</h3>
            <p>Try searching for "couples vlog" or "#family"</p>
        </div>
    `;

    // Attach event listeners
    setupSearchListeners();
}

function setupSearchListeners() {
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const modeRadios = document.querySelectorAll('input[name="search-mode"]');

    // Debounced search on input
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(() => {
                performSearch(e.target.value);
            }, 500);
        });

        // Immediate search on Enter key
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                clearTimeout(searchDebounceTimer);
                performSearch(e.target.value);
            }
        });
    }

    // Search button click
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            const query = searchInput.value.trim();
            if (query) {
                performSearch(query);
            }
        });
    }

    // Mode selector
    modeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentSearchMode = e.target.value;
            // Re-search if we have results
            if (searchResults && searchInput.value.trim()) {
                performSearch(searchInput.value.trim());
            }
        });
    });

    // Tab switching
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-tab');
            switchTab(tab);
        });
    });
}

async function performSearch(query) {
    if (!query.trim()) {
        showEmptyState();
        return;
    }

    showLoading();

    try {
        // Construct API URL based on mode
        let url = `/api/youtube/search?q=${encodeURIComponent(query)}`;
        if (currentSearchMode !== 'all') {
            url += `&type=${currentSearchMode}`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error('Search failed');

        const data = await response.json();
        searchResults = data.items || [];

        hideLoading();
        renderResults(searchResults);

    } catch (error) {
        console.error('Search error:', error);
        showErrorState();
    }
}

function renderResults(results) {
    const container = document.getElementById('results-container');
    const empty = document.getElementById('search-empty');
    if (empty) empty.classList.add('hidden');
    if (container) container.classList.remove('hidden');

    const channels = results.filter(item => item.id.kind === 'youtube#channel');
    const videos = results.filter(item => item.id.kind === 'youtube#video');

    // Update counts
    document.getElementById('channels-count').textContent = channels.length;
    document.getElementById('videos-count').textContent = videos.length;

    // Render Tabs
    renderChannelsTab(channels);
    renderVideosTab(videos);

    // Auto-switch to tab with results
    if (currentSearchMode === 'channel' || (channels.length > 0 && videos.length === 0)) {
        switchTab('channels');
    } else {
        switchTab('videos');
    }
}

function renderChannelsTab(channels) {
    const container = document.getElementById('channels-tab');
    if (channels.length === 0) {
        container.innerHTML = '<p class="text-muted" style="text-align:center; padding: 2rem;">No channels found.</p>';
        return;
    }

    container.innerHTML = channels.map(channel => `
        <div class="channel-result-item card">
            <img src="${channel.snippet.thumbnails.default.url}" class="channel-thumb-u" alt="${channel.snippet.title}">
            <div class="channel-info">
                <h3>${escapeHtml(channel.snippet.title)}</h3>
                <p class="text-muted">${escapeHtml(channel.snippet.description)}</p>
            </div>
            <a href="https://youtube.com/channel/${channel.id.channelId}" target="_blank" class="btn">View Channel ↗</a>
        </div>
    `).join('');
}

function renderVideosTab(videos) {
    const container = document.getElementById('videos-tab');
    if (videos.length === 0) {
        container.innerHTML = '<p class="text-muted" style="text-align:center; padding: 2rem;">No videos found.</p>';
        return;
    }

    container.innerHTML = `<div class="videos-grid">` + videos.map(video => `
        <div class="video-card">
            <img src="${video.snippet.thumbnails.medium.url}" alt="${video.snippet.title}" class="video-thumb">
            <div class="video-info">
                <h3 class="video-title">${escapeHtml(video.snippet.title)}</h3>
                <p class="channel-name">${escapeHtml(video.snippet.channelTitle)}</p>
                <div class="video-meta">
                    <span>${new Date(video.snippet.publishedAt).toLocaleDateString()}</span>
                </div>
                <a href="https://www.youtube.com/watch?v=${video.id.videoId}" target="_blank" class="watch-link">Watch ↗</a>
            </div>
        </div>
    `).join('') + `</div>`;
}

function showErrorState() {
    const container = document.getElementById('search-loading');
    container.classList.remove('hidden');
    container.innerHTML = `
        <p class="error-message">⚠️ Search failed. Please try again.</p>
        <button class="btn" onclick="performSearch(document.getElementById('search-input').value)">Retry</button>
    `;
}

function switchTab(tab) {
    // Update buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.getAttribute('data-tab') === tab) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Update panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.add('hidden');
    });
    document.getElementById(`${tab}-tab`).classList.remove('hidden');
}

function showLoading() {
    document.getElementById('search-loading').classList.remove('hidden');
    document.getElementById('search-empty').classList.add('hidden');
    document.getElementById('results-container').classList.add('hidden');
}

function hideLoading() {
    document.getElementById('search-loading').classList.add('hidden');
}

function showEmptyState() {
    document.getElementById('search-empty').classList.remove('hidden');
    document.getElementById('results-container').classList.add('hidden');
    document.getElementById('search-loading').classList.add('hidden');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('Command copied to clipboard!');
    });
}

// Export
window.renderSearch = renderSearch;
window.copyToClipboard = copyToClipboard;
