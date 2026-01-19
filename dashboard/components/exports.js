/**
 * Yota Analytics — Exports Component
 * Download JSON/CSV export buttons
 */

function renderExports() {
    const container = document.createElement('div');
    container.className = 'exports-container';
    container.innerHTML = `
        <button class="export-btn export-json" id="export-json-btn">
            📥 Download JSON
        </button>
        <button class="export-btn export-csv" id="export-csv-btn">
            📥 Download CSV
        </button>
    `;

    // Attach event listeners
    setTimeout(() => {
        const jsonBtn = document.getElementById('export-json-btn');
        const csvBtn = document.getElementById('export-csv-btn');

        if (jsonBtn) {
            jsonBtn.addEventListener('click', downloadJSON);
        }

        if (csvBtn) {
            csvBtn.addEventListener('click', downloadCSV);
        }
    }, 0);

    return container.outerHTML;
}

function downloadJSON() {
    const data = window.stateManager.getAnalyticsData();

    if (!data) {
        alert('No analytics data to export. Please load a channel first.');
        return;
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yota-analytics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function downloadCSV() {
    const data = window.stateManager.getAnalyticsData();

    if (!data) {
        alert('No analytics data to export. Please load a channel first.');
        return;
    }

    // Simple CSV generation
    let csv = 'Type,Name,Value,Additional\n';

    // Channel info
    csv += `Channel,${data.channel.name},${data.channel.subscribers} subscribers,${data.channel.total_views} views\n`;

    // Insights
    csv += `Insight,Momentum Score,${data.insights.momentum_score},${data.insights.momentum_label}\n`;
    csv += `Insight,Best Upload Day,${data.insights.best_upload_day},\n`;
    csv += `Insight,Avg Views/Video,${data.insights.avg_views_per_video},\n`;

    // Videos
    data.recent_videos.forEach(video => {
        csv += `Video,"${video.title}",${video.views},${video.engagement_rate}% engagement\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yota-analytics-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// Export
window.renderExports = renderExports;
