// ==========================================================================
// APPLICATION STATE
// ==========================================================================

const state = {
    releaseNotes: [],       // Raw data fetched from backend
    filteredNotes: [],      // Notes after search and filters are applied
    activeTypeFilter: 'all',// Current type filter ('all' or specific type)
    searchQuery: '',        // Search text
    sortOrder: 'newest',    // 'newest' or 'oldest'
    selectedUpdate: null,   // Selected update object for tweet composer
    theme: 'dark'           // 'dark' or 'light'
};

// ==========================================================================
// DOM ELEMENTS
// ==========================================================================

const DOM = {
    themeToggle: document.getElementById('btn-theme-toggle'),
    btnRefresh: document.getElementById('btn-refresh'),
    btnRefreshText: document.getElementById('btn-refresh-text'),
    refreshIcon: document.getElementById('refresh-icon'),
    refreshSpinner: document.getElementById('refresh-spinner'),
    statusText: document.getElementById('status-text'),
    statusDot: document.querySelector('.status-dot'),
    
    searchInput: document.getElementById('search-input'),
    btnClearSearch: document.getElementById('btn-clear-search'),
    btnClearFilters: document.getElementById('btn-clear-filters'),
    typeFiltersContainer: document.getElementById('type-filters-container'),
    
    statTotalDates: document.getElementById('stat-total-dates'),
    statTotalUpdates: document.getElementById('stat-total-updates'),
    statsBreakdownList: document.getElementById('stats-breakdown-list'),
    
    resultsCountBadge: document.getElementById('results-count-badge'),
    sortSelect: document.getElementById('sort-select'),
    timelineFeed: document.getElementById('timeline-feed'),
    emptyState: document.getElementById('empty-state'),
    errorState: document.getElementById('error-state'),
    errorMessage: document.getElementById('error-message'),
    btnErrorRetry: document.getElementById('btn-error-retry'),
    btnResetAll: document.getElementById('btn-reset-all'),
    
    toast: document.getElementById('toast-notification'),
    toastMessage: document.getElementById('toast-message'),
    
    tweetModal: document.getElementById('tweet-modal'),
    tweetTextarea: document.getElementById('tweet-textarea'),
    btnCloseTweet: document.getElementById('btn-close-tweet'),
    btnTweetCancel: document.getElementById('btn-tweet-cancel'),
    btnTweetSubmit: document.getElementById('btn-tweet-submit'),
    chkIncludeLink: document.getElementById('chk-include-link'),
    chkIncludeTags: document.getElementById('chk-include-tags'),
    charCount: document.getElementById('char-count'),
    charProgress: document.getElementById('char-progress')
};

// Map of release note types to emojis and theme details
const TYPE_CONFIG = {
    'Feature': { emoji: '🚀', class: 'badge-feature', color: '#10b981' },
    'Announcement': { emoji: '📢', class: 'badge-announcement', color: '#8b5cf6' },
    'Issue': { emoji: '⚠️', class: 'badge-issue', color: '#ef4444' },
    'Breaking': { emoji: '💥', class: 'badge-breaking', color: '#f97316' },
    'Change': { emoji: '🔄', class: 'badge-change', color: '#3b82f6' },
    'Deprecation': { emoji: '⏳', class: 'badge-deprecation', color: '#f59e0b' },
    'General': { emoji: '📝', class: 'badge-general', color: '#6b7280' }
};

// ==========================================================================
// INITIALIZATION & EVENT LISTENERS
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    fetchReleaseNotes(false);
    setupEventListeners();
});

function setupEventListeners() {
    // Refresh & Retry
    DOM.btnRefresh.addEventListener('click', () => fetchReleaseNotes(true));
    DOM.btnErrorRetry.addEventListener('click', () => fetchReleaseNotes(true));
    DOM.btnResetAll.addEventListener('click', resetAllFilters);
    
    // Theme Toggle
    DOM.themeToggle.addEventListener('click', toggleTheme);
    
    // Search input
    DOM.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.trim();
        toggleClearSearchButton();
        applyFiltersAndRender();
    });
    DOM.btnClearSearch.addEventListener('click', () => {
        DOM.searchInput.value = '';
        state.searchQuery = '';
        toggleClearSearchButton();
        applyFiltersAndRender();
    });
    
    // Type Filter Chips
    const chips = DOM.typeFiltersContainer.querySelectorAll('.filter-chip');
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            state.activeTypeFilter = chip.getAttribute('data-type');
            
            // Toggle reset/clear filters button
            toggleClearFiltersButton();
            applyFiltersAndRender();
        });
    });
    DOM.btnClearFilters.addEventListener('click', resetAllFilters);
    
    // Sorting
    DOM.sortSelect.addEventListener('change', (e) => {
        state.sortOrder = e.target.value;
        applyFiltersAndRender();
    });
    
    // Tweet Modal Checkboxes & Direct Input
    DOM.chkIncludeLink.addEventListener('change', regenerateTweetText);
    DOM.chkIncludeTags.addEventListener('change', regenerateTweetText);
    DOM.tweetTextarea.addEventListener('input', updateCharCount);
    
    // Close Tweet Modal
    DOM.btnCloseTweet.addEventListener('click', closeTweetComposer);
    DOM.btnTweetCancel.addEventListener('click', closeTweetComposer);
    DOM.tweetModal.addEventListener('click', (e) => {
        if (e.target === DOM.tweetModal) closeTweetComposer();
    });
    
    // Submit Tweet
    DOM.btnTweetSubmit.addEventListener('click', submitTweet);
}

// ==========================================================================
// CORE BUSINESS LOGIC: FETCH & PARSE NOTES
// ==========================================================================

async function fetchReleaseNotes(forceRefresh = false) {
    showLoadingState();
    
    try {
        const url = `/api/release-notes${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }
        
        const res = await response.json();
        
        if (!res.success) {
            throw new Error(res.error || 'Unknown error occurred while fetching feed.');
        }
        
        state.releaseNotes = res.data;
        
        // Update Status indicator
        const updateTimeStr = new Date(res.last_updated * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        DOM.statusText.textContent = `Updated at ${updateTimeStr}`;
        DOM.statusDot.className = 'status-dot green';
        
        // Render Notes
        applyFiltersAndRender();
        
        // Show success toast on manual refresh
        if (forceRefresh) {
            showToast('Feed refreshed successfully');
        }
        
    } catch (err) {
        console.error('Error fetching release notes:', err);
        DOM.statusText.textContent = 'Failed to load';
        DOM.statusDot.className = 'status-dot yellow';
        
        // Only show full-screen error if we have no data at all
        if (state.releaseNotes.length === 0) {
            DOM.errorMessage.textContent = err.message;
            DOM.timelineFeed.classList.add('hidden');
            DOM.emptyState.classList.add('hidden');
            DOM.errorState.classList.remove('hidden');
            DOM.resultsCountBadge.textContent = 'Error';
        } else {
            showToast(`Fetch error: ${err.message}. Using cache.`);
        }
    } finally {
        hideLoadingState();
    }
}

// ==========================================================================
// FILTERING & RENDER ENGINE
// ==========================================================================

function applyFiltersAndRender() {
    // Hide error/empty states first
    DOM.errorState.classList.add('hidden');
    DOM.timelineFeed.classList.remove('hidden');
    
    // 1. Filter and deep copy structure
    let filtered = [];
    
    state.releaseNotes.forEach(entry => {
        // Filter updates inside the entry
        const matchingUpdates = entry.updates.filter(update => {
            // Type filter matching
            const matchesType = (state.activeTypeFilter === 'all' || update.type.toLowerCase() === state.activeTypeFilter.toLowerCase());
            
            // Search matching (case-insensitive in plain text or type)
            const matchesSearch = !state.searchQuery || 
                update.text.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
                update.type.toLowerCase().includes(state.searchQuery.toLowerCase());
                
            return matchesType && matchesSearch;
        });
        
        if (matchingUpdates.length > 0) {
            filtered.push({
                ...entry,
                updates: matchingUpdates
            });
        }
    });
    
    // 2. Sort entries by date
    filtered.sort((a, b) => {
        const dateA = new Date(a.updated || a.date);
        const dateB = new Date(b.updated || b.date);
        return state.sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
    
    state.filteredNotes = filtered;
    
    // 3. Render statistics & timelines
    renderStats();
    renderTimeline();
    
    // Toggle Reset buttons
    toggleClearFiltersButton();
}

function renderStats() {
    // Computes statistics based on matching entries
    const datesCount = state.filteredNotes.length;
    let updatesCount = 0;
    
    // Build type counter map
    const counts = {};
    Object.keys(TYPE_CONFIG).forEach(k => counts[k] = 0);
    
    state.filteredNotes.forEach(entry => {
        updatesCount += entry.updates.length;
        entry.updates.forEach(up => {
            const t = up.type || 'General';
            counts[t] = (counts[t] || 0) + 1;
        });
    });
    
    DOM.statTotalDates.textContent = datesCount;
    DOM.statTotalUpdates.textContent = updatesCount;
    DOM.resultsCountBadge.textContent = `${updatesCount} update${updatesCount === 1 ? '' : 's'}`;
    
    // Render stats breakdown list
    DOM.statsBreakdownList.innerHTML = '';
    
    Object.entries(counts)
        .filter(([_, count]) => count > 0)
        .sort((a, b) => b[1] - a[1]) // sort by frequency
        .forEach(([type, count]) => {
            const config = TYPE_CONFIG[type] || TYPE_CONFIG['General'];
            const row = document.createElement('div');
            row.className = 'stat-row';
            row.innerHTML = `
                <span class="stat-row-lbl">
                    <span class="stat-dot-indicator" style="background-color: ${config.color}"></span>
                    ${type}
                </span>
                <span class="stat-row-val">${count}</span>
            `;
            DOM.statsBreakdownList.appendChild(row);
        });
}

function renderTimeline() {
    DOM.timelineFeed.innerHTML = '';
    
    if (state.filteredNotes.length === 0) {
        DOM.timelineFeed.classList.add('hidden');
        DOM.emptyState.classList.remove('hidden');
        return;
    }
    
    DOM.emptyState.classList.add('hidden');
    
    state.filteredNotes.forEach(entry => {
        const entryEl = document.createElement('div');
        entryEl.className = 'timeline-entry';
        
        // Node dot
        const dot = document.createElement('div');
        dot.className = 'timeline-dot';
        entryEl.appendChild(dot);
        
        // Date Header
        const dateHeader = document.createElement('h3');
        dateHeader.className = 'timeline-date';
        dateHeader.textContent = entry.date;
        entryEl.appendChild(dateHeader);
        
        // List of update cards
        const listContainer = document.createElement('div');
        listContainer.className = 'timeline-update-list';
        
        entry.updates.forEach((update, idx) => {
            const config = TYPE_CONFIG[update.type] || TYPE_CONFIG['General'];
            const card = document.createElement('article');
            card.className = 'update-card';
            
            // Unique identifier for links
            const cardId = `${entry.date.replace(/[\s,]+/g, '_')}_${idx}`;
            card.id = cardId;
            
            card.innerHTML = `
                <div class="update-card-header">
                    <span class="badge ${config.class}">${config.emoji} ${update.type}</span>
                </div>
                <div class="update-card-content">
                    ${update.html}
                </div>
                <div class="update-card-footer">
                    <button class="btn-card-action btn-copy-link" data-link="${entry.link}" title="Copy link to Google Cloud Release page">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                        </svg>
                        Copy Link
                    </button>
                    <button class="btn-card-action btn-tweet" title="Compose a Tweet about this update">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        Tweet Note
                    </button>
                </div>
            `;
            
            // Link copy action
            card.querySelector('.btn-copy-link').addEventListener('click', (e) => {
                navigator.clipboard.writeText(entry.link).then(() => {
                    showToast('Link copied to clipboard!');
                }).catch(err => {
                    console.error('Copy failed', err);
                    showToast('Failed to copy link');
                });
            });
            
            // Tweet trigger action
            card.querySelector('.btn-tweet').addEventListener('click', () => {
                openTweetComposer(entry, update);
            });
            
            listContainer.appendChild(card);
        });
        
        entryEl.appendChild(listContainer);
        DOM.timelineFeed.appendChild(entryEl);
    });
}

// ==========================================================================
// TWEET COMPOSER SYSTEM
// ==========================================================================

function openTweetComposer(entry, update) {
    state.selectedUpdate = { entry, update };
    DOM.chkIncludeLink.checked = true;
    DOM.chkIncludeTags.checked = true;
    
    regenerateTweetText();
    
    // Show Modal
    DOM.tweetModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // prevent scroll
    DOM.tweetTextarea.focus();
}

function closeTweetComposer() {
    DOM.tweetModal.classList.add('hidden');
    document.body.style.overflow = ''; // restore scroll
    state.selectedUpdate = null;
}

function regenerateTweetText() {
    if (!state.selectedUpdate) return;
    
    const { entry, update } = state.selectedUpdate;
    const config = TYPE_CONFIG[update.type] || TYPE_CONFIG['General'];
    
    // 1. Build Header
    // e.g. "🚀 BQ Feature (June 15): "
    const shortDate = entry.date.split(',')[0].trim(); // "June 15"
    const header = `${config.emoji} BigQuery ${update.type} (${shortDate}): `;
    
    // 2. Prep metadata variables
    const linkStr = DOM.chkIncludeLink.checked ? `\n\nRead more: ${entry.link}` : '';
    const tagStr = DOM.chkIncludeTags.checked ? '\n\n#BigQuery #GCP' : '';
    
    // 3. Compute limits for text truncation
    // Base length max: 280
    // URL links are computed as 23 characters on X.
    let staticLen = header.length + tagStr.length;
    if (DOM.chkIncludeLink.checked) {
        staticLen += 13 + 23; // "\n\nRead more: " (13 chars) + URL (23 chars)
    }
    
    const maxBodyLen = 280 - staticLen - 4; // safety gap
    let cleanBody = update.text.replace(/\s+/g, ' ').trim();
    
    if (cleanBody.length > maxBodyLen) {
        cleanBody = cleanBody.substring(0, maxBodyLen - 3) + '...';
    }
    
    // 4. Assemble
    const fullTweet = `${header}${cleanBody}${linkStr}${tagStr}`;
    DOM.tweetTextarea.value = fullTweet;
    
    updateCharCount();
}

function getTweetLength(text) {
    // X/Twitter URL counting logic: URLs are mapped to 23 chars
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = text.match(urlRegex) || [];
    let length = text.replace(urlRegex, '').length;
    length += urls.length * 23;
    return length;
}

function updateCharCount() {
    const text = DOM.tweetTextarea.value;
    const count = getTweetLength(text);
    
    DOM.charCount.textContent = count;
    
    // Set visual indicators
    const percent = Math.min((count / 280) * 100, 100);
    DOM.charProgress.style.width = `${percent}%`;
    
    // Color states
    if (count > 280) {
        DOM.charProgress.className = 'char-progress-fill danger';
        DOM.charCount.style.color = '#ef4444';
        DOM.btnTweetSubmit.disabled = true;
        DOM.btnTweetSubmit.style.opacity = '0.5';
        DOM.btnTweetSubmit.style.cursor = 'not-allowed';
    } else if (count >= 240) {
        DOM.charProgress.className = 'char-progress-fill warning';
        DOM.charCount.style.color = '#f59e0b';
        DOM.btnTweetSubmit.disabled = false;
        DOM.btnTweetSubmit.style.opacity = '1';
        DOM.btnTweetSubmit.style.cursor = 'pointer';
    } else {
        DOM.charProgress.className = 'char-progress-fill';
        DOM.charCount.style.color = 'inherit';
        DOM.btnTweetSubmit.disabled = false;
        DOM.btnTweetSubmit.style.opacity = '1';
        DOM.btnTweetSubmit.style.cursor = 'pointer';
    }
}

function submitTweet() {
    const text = DOM.tweetTextarea.value;
    if (getTweetLength(text) > 280) return;
    
    const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(twitterIntentUrl, '_blank', 'noopener,noreferrer');
    
    closeTweetComposer();
    showToast('Redirected to X (Twitter)!');
}

// ==========================================================================
// INTERACTIVE UTILITIES (THEME, STATE, TOAST)
// ==========================================================================

function initTheme() {
    const savedTheme = localStorage.getItem('bq-notes-theme') || 'dark';
    state.theme = savedTheme;
    document.body.className = `theme-${savedTheme}`;
}

function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.body.className = `theme-${state.theme}`;
    localStorage.setItem('bq-notes-theme', state.theme);
}

function resetAllFilters() {
    DOM.searchInput.value = '';
    state.searchQuery = '';
    toggleClearSearchButton();
    
    const chips = DOM.typeFiltersContainer.querySelectorAll('.filter-chip');
    chips.forEach(c => c.classList.remove('active'));
    chips[0].classList.add('active'); // set back to 'all'
    state.activeTypeFilter = 'all';
    toggleClearFiltersButton();
    
    applyFiltersAndRender();
}

function toggleClearSearchButton() {
    if (state.searchQuery) {
        DOM.btnClearSearch.classList.remove('hidden');
    } else {
        DOM.btnClearSearch.classList.add('hidden');
    }
}

function toggleClearFiltersButton() {
    if (state.activeTypeFilter !== 'all') {
        DOM.btnClearFilters.classList.remove('hidden');
    } else {
        DOM.btnClearFilters.classList.add('hidden');
    }
}

function showLoadingState() {
    DOM.btnRefresh.disabled = true;
    DOM.refreshIcon.classList.add('spinning');
    DOM.refreshSpinner.classList.remove('hidden');
    DOM.btnRefreshText.textContent = 'Syncing...';
    
    // Toggle status indicators
    DOM.statusText.textContent = 'Synchronizing feed...';
    DOM.statusDot.className = 'status-dot yellow';
}

function hideLoadingState() {
    DOM.btnRefresh.disabled = false;
    DOM.refreshIcon.classList.remove('spinning');
    DOM.refreshSpinner.classList.add('hidden');
    DOM.btnRefreshText.textContent = 'Refresh';
}

let toastTimeout;
function showToast(message) {
    clearTimeout(toastTimeout);
    DOM.toastMessage.textContent = message;
    DOM.toast.classList.remove('hidden');
    
    toastTimeout = setTimeout(() => {
        DOM.toast.classList.add('hidden');
    }, 3000);
}
