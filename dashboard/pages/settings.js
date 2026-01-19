/**
 * Yota Analytics — Settings Page
 * App configuration and preferences
 */

function renderSettings(container) {
    const recentChannels = window.stateManager.getRecentChannels();

    container.innerHTML = `
        <div class="page-header">
            <h1>⚙️ Settings</h1>
            <p class="page-description">Manage your preferences and data</p>
        </div>
        
        <section class="card settings-section">
            <h3>Recent Channels</h3>
            ${renderRecentChannelsList(recentChannels)}
        </section>
        
        <section class="card settings-section">
            <h3>Data Management</h3>
            <button class="btn btn-danger" id="clear-data-btn">
                🗑️ Clear All Saved Data
            </button>
            <p class="help-text">This will remove all saved searches and recent channels.</p>
        </section>
        
        <section class="card settings-section">
            <h3>About</h3>
            <p>Yota Analytics v1.0</p>
            <p class="help-text">Built for couples, families, and Gen-Z creator teams.</p>
        </section>
    `;

    // Attach event listeners
    setTimeout(() => {
        const clearBtn = document.getElementById('clear-data-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (confirm('Are you sure? This will clear all saved data.')) {
                    window.stateManager.clearAll();
                    alert('All data cleared!');
                    window.router.navigate('/settings');
                }
            });
        }
    }, 0);
}

function renderRecentChannelsList(channels) {
    if (!channels || channels.length === 0) {
        return '<p class="help-text">No recent channels yet.</p>';
    }

    return `
        <div class="recent-channels-list">
            ${channels.map(ch => `
                <div class="recent-channel-item">
                    <div>
                        <strong>${ch.name}</strong>
                        <span class="handle">${ch.handle || ''}</span>
                    </div>
                    <span class="timestamp">${formatTimestamp(ch.timestamp)}</span>
                </div>
            `).join('')}
        </div>
    `;
}

function formatTimestamp(isoString) {
    const date = new Date(isoString);
    const diffMs = new Date() - date;
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
}

window.renderSettings = renderSettings;
