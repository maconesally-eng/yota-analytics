/**
 * Yota Analytics — Session Learning Manager
 * Handles "Not Interested" / "Save" signals for personalized ranking
 */

const SESSION_STORAGE_KEY = 'yota_session_learning';

// Initialize or load session state
function getSessionLearning() {
    try {
        const stored = localStorage.getItem(SESSION_STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.warn('Failed to load session learning:', e);
    }

    return {
        hiddenVideoIds: [],
        blockedChannelIds: [],
        channelNotInterestedCount: {}, // channelId -> count (block after 2)
        themeDislikes: [],
        savedVideoIds: [],
        likedThemes: [],
        lastUpdated: null
    };
}

// Save session state
function saveSessionLearning(session) {
    session.lastUpdated = Date.now();
    try {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch (e) {
        console.warn('Failed to save session learning:', e);
    }
}

// Mark video as "Not Interested"
function markNotInterested(videoId, channelId, theme) {
    const session = getSessionLearning();

    // Hide this video
    if (!session.hiddenVideoIds.includes(videoId)) {
        session.hiddenVideoIds.push(videoId);
    }

    // Track channel not-interested count
    if (channelId) {
        const count = (session.channelNotInterestedCount[channelId] || 0) + 1;
        session.channelNotInterestedCount[channelId] = count;

        // Auto-block channel after 2 not-interested actions
        if (count >= 2 && !session.blockedChannelIds.includes(channelId)) {
            session.blockedChannelIds.push(channelId);
            console.log(`Auto-blocked channel: ${channelId}`);
        }
    }

    // Track theme dislikes
    if (theme && theme !== 'general' && !session.themeDislikes.includes(theme)) {
        session.themeDislikes.push(theme);
    }

    saveSessionLearning(session);
    return session;
}

// Save video
function saveVideo(videoId, theme) {
    const session = getSessionLearning();

    if (!session.savedVideoIds.includes(videoId)) {
        session.savedVideoIds.push(videoId);
    }

    // Track liked themes
    if (theme && theme !== 'general' && !session.likedThemes.includes(theme)) {
        session.likedThemes.push(theme);
    }

    saveSessionLearning(session);
    return session;
}

// Unblock channel (manual)
function unblockChannel(channelId) {
    const session = getSessionLearning();
    session.blockedChannelIds = session.blockedChannelIds.filter(id => id !== channelId);
    delete session.channelNotInterestedCount[channelId];
    saveSessionLearning(session);
    return session;
}

// Check if video should be hidden
function isVideoHidden(videoId, channelId) {
    const session = getSessionLearning();
    if (session.hiddenVideoIds.includes(videoId)) return true;
    if (channelId && session.blockedChannelIds.includes(channelId)) return true;
    return false;
}

// Get session signals for AI rerank
function getSessionSignals() {
    const session = getSessionLearning();
    return {
        blockedChannels: session.blockedChannelIds,
        themeDislikes: session.themeDislikes,
        likedThemes: session.likedThemes
    };
}

// Filter videos based on session learning
function filterVideosBySession(videos) {
    const session = getSessionLearning();
    return videos.filter(v => {
        if (session.hiddenVideoIds.includes(v.id)) return false;
        if (v.channelId && session.blockedChannelIds.includes(v.channelId)) return false;
        return true;
    });
}

// Apply session-based score adjustments
function applySessionPenalties(videos) {
    const session = getSessionLearning();

    return videos.map(v => {
        let multiplier = 1.0;

        // Penalize disliked themes (-30%)
        if (v.theme && session.themeDislikes.includes(v.theme)) {
            multiplier *= 0.7;
        }

        // Boost liked themes (+20%)
        if (v.theme && session.likedThemes.includes(v.theme)) {
            multiplier *= 1.2;
        }

        // Penalize channels with 1 not-interested (-20%)
        if (v.channelId && session.channelNotInterestedCount[v.channelId] === 1) {
            multiplier *= 0.8;
        }

        return {
            ...v,
            velocityScore: Math.round(v.velocityScore * multiplier),
            sessionMultiplier: multiplier
        };
    });
}

// Clear all session learning
function clearSessionLearning() {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    console.log('Session learning cleared');
}

// Export for use in other modules
window.YotaSession = {
    getSessionLearning,
    markNotInterested,
    saveVideo,
    unblockChannel,
    isVideoHidden,
    getSessionSignals,
    filterVideosBySession,
    applySessionPenalties,
    clearSessionLearning
};
