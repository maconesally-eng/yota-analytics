/**
 * Yota Analytics — Search Bar with Autosuggest
 * Debounced live suggestions from YouTube API
 */

let suggestTimeout = null;
let suggestionsVisible = false;

function renderSearchBar(containerId = 'search-bar-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="search-bar-wrapper">
            <input type="text" id="autosuggest-input" class="search-input" placeholder="Search YouTube..." autocomplete="off">
            <button id="autosuggest-btn" class="btn btn-primary">🔍</button>
            <div id="suggestions-dropdown" class="suggestions-dropdown hidden"></div>
        </div>
    `;

    setupSearchBarListeners();
}

function setupSearchBarListeners() {
    const input = document.getElementById('autosuggest-input');
    const btn = document.getElementById('autosuggest-btn');
    const dropdown = document.getElementById('suggestions-dropdown');

    if (!input || !btn || !dropdown) return;

    // Debounced input handler
    input.addEventListener('input', () => {
        clearTimeout(suggestTimeout);
        const query = input.value.trim();

        if (query.length < 2) {
            hideSuggestions();
            return;
        }

        suggestTimeout = setTimeout(() => {
            fetchSuggestions(query);
        }, 250);
    });

    // Enter key triggers search
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            hideSuggestions();
            triggerSearch(input.value.trim());
        }
    });

    // Button click triggers search
    btn.addEventListener('click', () => {
        hideSuggestions();
        triggerSearch(input.value.trim());
    });

    // Click outside hides suggestions
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-bar-wrapper')) {
            hideSuggestions();
        }
    });
}

async function fetchSuggestions(query) {
    const dropdown = document.getElementById('suggestions-dropdown');
    if (!dropdown) return;

    const vipKey = localStorage.getItem('yota_vip_key');
    const headers = {};
    if (vipKey) headers['x-vip-key'] = vipKey;

    try {
        const response = await fetch(`/api/youtube/suggest?q=${encodeURIComponent(query)}`, { headers });
        if (!response.ok) throw new Error('Suggest failed');

        const data = await response.json();
        renderSuggestions(data.suggestions);
    } catch (error) {
        console.error('Suggest error:', error);
        hideSuggestions();
    }
}

function renderSuggestions(suggestions) {
    const dropdown = document.getElementById('suggestions-dropdown');
    if (!dropdown) return;

    if (!suggestions || suggestions.length === 0) {
        hideSuggestions();
        return;
    }

    dropdown.innerHTML = suggestions.map(s => `
        <div class="suggestion-item" data-type="${s.type}" data-id="${s.id}">
            <img src="${s.thumbnail}" class="suggestion-thumb" alt="">
            <div class="suggestion-info">
                <span class="suggestion-label">${s.label}</span>
                <span class="suggestion-type">${s.type === 'channel' ? '📺 Channel' : '🎬 Video'}</span>
            </div>
        </div>
    `).join('');

    dropdown.classList.remove('hidden');
    suggestionsVisible = true;

    // Click handlers for each suggestion
    dropdown.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
            const input = document.getElementById('autosuggest-input');
            input.value = item.querySelector('.suggestion-label').textContent;
            hideSuggestions();
            triggerSearch(input.value);
        });
    });
}

function hideSuggestions() {
    const dropdown = document.getElementById('suggestions-dropdown');
    if (dropdown) {
        dropdown.classList.add('hidden');
        dropdown.innerHTML = '';
    }
    suggestionsVisible = false;
}

function triggerSearch(query) {
    if (!query) return;
    // Navigate to search page with query
    window.router.navigate('/search?q=' + encodeURIComponent(query));
}

window.renderSearchBar = renderSearchBar;
