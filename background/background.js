/**
 * Little Elf - Background Service Worker
 * Manages extension state, sidepanel, and API coordination
 */

// Default configuration
const CONFIG = {
    DEFAULT_API_URL: 'http://localhost:3000',
    MAX_STORED_PAGES: 50,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,
};

// Extension state
let extensionState = {
    enabled: true,
    apiUrl: CONFIG.DEFAULT_API_URL,
    currentTabId: null,
};

/**
 * Initialize extension on install
 */
chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('[Little Elf] Extension installed:', details.reason);

    // Set default state
    await chrome.storage.local.set({
        elfEnabled: true,
        apiUrl: CONFIG.DEFAULT_API_URL,
        extractedContent: {},
        totalTokens: 0,
    });

    // Enable sidepanel
    if (chrome.sidePanel) {
        await chrome.sidePanel.setOptions({
            enabled: true,
        });
    }
});

/**
 * Handle extension icon click - open sidepanel
 */
chrome.action.onClicked.addListener(async (tab) => {
    // The popup will handle the quick actions
    // Sidepanel can be opened via keyboard shortcut or context menu
});

/**
 * Handle keyboard commands
 */
chrome.commands?.onCommand.addListener(async (command, tab) => {
    console.log('[Little Elf] Command received:', command);

    if (command === 'open_sidepanel' && chrome.sidePanel) {
        try {
            await chrome.sidePanel.open({ tabId: tab?.id });
        } catch (error) {
            console.error('[Little Elf] Failed to open sidepanel:', error);
        }
    }
});

/**
 * Handle messages from content script and sidepanel
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[Little Elf] Message received:', message.type);

    switch (message.type) {
        case 'CONTENT_EXTRACTED':
            handleContentExtracted(message.data, sender.tab);
            sendResponse({ success: true });
            break;

        case 'CONTENT_UPDATED':
            handleContentUpdated(sender.tab);
            sendResponse({ success: true });
            break;

        case 'GET_STATE':
            sendResponse({ enabled: extensionState.enabled });
            break;

        case 'STATE_CHANGED':
            handleStateChange(message.enabled);
            sendResponse({ success: true });
            break;

        case 'EXTRACT_NOW':
            triggerExtraction(message.tabId).then(sendResponse);
            return true;

        case 'GET_API_URL':
            chrome.storage.local.get(['apiUrl']).then((result) => {
                sendResponse({ apiUrl: result.apiUrl || CONFIG.DEFAULT_API_URL });
            });
            return true;

        case 'SET_API_URL':
            handleApiUrlChange(message.apiUrl);
            sendResponse({ success: true });
            break;

        case 'OPEN_SIDEPANEL':
            if (chrome.sidePanel && message.tabId) {
                chrome.sidePanel.open({ tabId: message.tabId }).catch(console.error);
            }
            sendResponse({ success: true });
            break;

        default:
            sendResponse({ error: 'Unknown message type' });
    }

    return false;
});

/**
 * Handle extracted content from content script
 */
async function handleContentExtracted(data, tab) {
    if (!data || !data.url) return;

    try {
        // Store in local storage
        const result = await chrome.storage.local.get(['extractedContent']);
        const content = result.extractedContent || {};

        // Store by URL
        content[data.url] = {
            ...data,
            tabId: tab?.id,
            extractedAt: new Date().toISOString(),
        };

        // Limit storage size
        const urls = Object.keys(content);
        if (urls.length > CONFIG.MAX_STORED_PAGES) {
            const sortedUrls = urls.sort((a, b) => {
                return new Date(content[b].extractedAt) - new Date(content[a].extractedAt);
            });

            sortedUrls.slice(CONFIG.MAX_STORED_PAGES).forEach((url) => {
                delete content[url];
            });
        }

        await chrome.storage.local.set({ extractedContent: content });

        console.log('[Little Elf] Content stored:', {
            url: data.url.substring(0, 50),
            contentLength: data.contentLength,
        });

    } catch (error) {
        console.error('[Little Elf] Error storing content:', error);
    }
}

/**
 * Handle content update notification
 */
function handleContentUpdated(tab) {
    // Could notify sidepanel to refresh if needed
    console.log('[Little Elf] Content updated on tab:', tab?.id);
}

/**
 * Handle extension state change
 */
async function handleStateChange(enabled) {
    extensionState.enabled = enabled;
    await chrome.storage.local.set({ elfEnabled: enabled });

    // Update badge
    updateBadge(enabled);

    console.log('[Little Elf] Extension state changed:', enabled ? 'enabled' : 'disabled');
}

/**
 * Handle API URL change
 */
async function handleApiUrlChange(apiUrl) {
    extensionState.apiUrl = apiUrl || CONFIG.DEFAULT_API_URL;
    await chrome.storage.local.set({ apiUrl: extensionState.apiUrl });
    console.log('[Little Elf] API URL changed:', extensionState.apiUrl);
}

/**
 * Trigger content extraction on a tab
 */
async function triggerExtraction(tabId) {
    try {
        // Inject content script if not already injected
        await chrome.scripting.executeScript({
            target: { tabId },
            files: ['content/content.js'],
        });

        // Wait a bit for script to load
        await new Promise(resolve => setTimeout(resolve, 100));

        // Send extraction message
        const response = await chrome.tabs.sendMessage(tabId, { type: 'TRIGGER_EXTRACTION' });
        return response;
    } catch (error) {
        console.error('[Little Elf] Failed to trigger extraction:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update extension badge
 */
function updateBadge(enabled) {
    if (enabled) {
        chrome.action.setBadgeText({ text: '' });
    } else {
        chrome.action.setBadgeText({ text: 'OFF' });
        chrome.action.setBadgeBackgroundColor({ color: '#6b7280' });
    }
}

/**
 * Handle tab updates
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete') return;
    if (!tab.url || tab.url.startsWith('chrome://')) return;

    // Check if extension is enabled
    const result = await chrome.storage.local.get(['elfEnabled']);
    if (result.elfEnabled === false) return;

    // Content script will auto-extract, but we can prepare here
    extensionState.currentTabId = tabId;

    console.log('[Little Elf] Tab updated:', tab.url.substring(0, 50));
});

/**
 * Handle tab activation
 */
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    extensionState.currentTabId = activeInfo.tabId;

    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        if (tab.url && !tab.url.startsWith('chrome://')) {
            // Update sidepanel if open
            chrome.runtime.sendMessage({
                type: 'TAB_CHANGED',
                tabId: activeInfo.tabId,
                url: tab.url,
                title: tab.title,
            }).catch(() => { });
        }
    } catch (error) {
        console.error('[Little Elf] Error on tab activation:', error);
    }
});

/**
 * Load saved state on startup
 */
async function loadState() {
    try {
        const result = await chrome.storage.local.get(['elfEnabled', 'apiUrl']);
        extensionState.enabled = result.elfEnabled !== false;
        extensionState.apiUrl = result.apiUrl || CONFIG.DEFAULT_API_URL;
        updateBadge(extensionState.enabled);
        console.log('[Little Elf] State loaded:', extensionState);
    } catch (error) {
        console.error('[Little Elf] Error loading state:', error);
    }
}

// Initialize
loadState();

console.log('[Little Elf] Background service worker loaded');
