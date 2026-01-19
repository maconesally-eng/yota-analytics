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

        <!-- Developer Mode -->
        <section class="card settings-section dev-mode-section">
            <h3>👨‍💻 Developer Mode (VIP)</h3>
            <p class="help-text">Enter your VIP Key to bypass search limits.</p>
            <div class="input-group" style="margin-top: 1rem;">
                <input type="password" id="vip-key-input" class="search-input" placeholder="Enter VIP Key" style="border: 1px solid var(--border-color);">
                <button id="save-vip-btn" class="btn btn-primary">Save Key</button>
            </div>
            <p id="vip-status" class="status-msg hidden" style="margin-top:0.5rem;"></p>
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

        // VIP Key Logic
        const vipInput = document.getElementById('vip-key-input');
        const saveVipBtn = document.getElementById('save-vip-btn');
        const statusMsg = document.getElementById('vip-status');

        if (vipInput && saveVipBtn) {
            // Load existing
            const existingKey = localStorage.getItem('yota_vip_key');
            if (existingKey) {
                vipInput.value = existingKey;
                statusMsg.textContent = '✅ VIP Access Active';
                statusMsg.classList.remove('hidden');
                statusMsg.style.color = 'var(--accent-green)';
            }

            saveVipBtn.addEventListener('click', () => {
                const key = vipInput.value.trim();
                if (key) {
                    localStorage.setItem('yota_vip_key', key);
                    statusMsg.textContent = '✅ VIP Key Saved';
                    statusMsg.classList.remove('hidden');
                    statusMsg.style.color = 'var(--accent-green)';
                } else {
                    localStorage.removeItem('yota_vip_key');
                    statusMsg.textContent = '❌ VIP Key Removed';
                    statusMsg.classList.remove('hidden');
                    statusMsg.style.color = 'var(--accent-red)';
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
