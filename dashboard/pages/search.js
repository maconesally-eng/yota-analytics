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

    // TODO: Call Python search API
    // For now, show instructions to run search manually
    setTimeout(() => {
        hideLoading();
        showSearchInstructions(query);
    }, 500);
}

function showSearchInstructions(query) {
    const container = document.getElementById('results-container');
    const empty = document.getElementById('search-empty');

    if (empty) empty.classList.add('hidden');
    if (container) container.classList.remove('hidden');

    const channelsTab = document.getElementById('channels-tab');
    if (channelsTab) {
        channelsTab.innerHTML = `
            <div class="search-instructions">
                <h3>🔧 Manual Search Required</h3>
                <p>To search YouTube, run this command:</p>
                <div class="code-block">
                    <code>python tools/search.py "${escapeHtml(query)}" ${currentSearchMode}</code>
                    <button class="copy-btn" onclick="copyToClipboard('python tools/search.py \\"${escapeHtml(query)}\\" ${currentSearchMode}')">
                        📋 Copy
                    </button>
                </div>
                <p class="help-text">
                    This will search YouTube and return results in your terminal.
                    Future milestone will integrate this into the dashboard automatically.
                </p>
                <div class="quota-warning">
                    ⚠️ <strong>Note:</strong> Search costs 100 API units per query (only 100 searches/day)
                </div>
            </div>
        `;
    }

    document.getElementById('channels-count').textContent = '?';
    document.getElementById('videos-count').textContent = '?';
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
