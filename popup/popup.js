/**
 * Little Elf - Popup Script
 * Manages quick actions and opens sidepanel
 */

// DOM Elements
let elements = {};

/**
 * Initialize the popup
 */
async function init() {
  initElements();
  setupEventListeners();
  await loadState();
  await loadCurrentPage();
  await loadStats();
}

/**
 * Initialize DOM element references
 */
function initElements() {
  elements = {
    status: document.getElementById('status'),
    pageTitle: document.getElementById('pageTitle'),
    pageUrl: document.getElementById('pageUrl'),
    openChat: document.getElementById('openChat'),
    extractNow: document.getElementById('extractNow'),
    charCount: document.getElementById('charCount'),
    headingCount: document.getElementById('headingCount'),
    lastExtract: document.getElementById('lastExtract'),
    enableToggle: document.getElementById('enableToggle'),
    clearData: document.getElementById('clearData'),
    settings: document.getElementById('settings'),
    container: document.querySelector('.popup-container'),
  };
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Open chat sidepanel
  elements.openChat.addEventListener('click', openSidepanel);

  // Extract content now
  elements.extractNow.addEventListener('click', extractContent);

  // Toggle extension
  elements.enableToggle.addEventListener('change', toggleExtension);

  // Clear data
  elements.clearData.addEventListener('click', clearData);

  // Settings (opens options page or shows settings modal)
  elements.settings.addEventListener('click', openSettings);
}

/**
 * Load extension state
 */
async function loadState() {
  try {
    const result = await chrome.storage.local.get(['elfEnabled']);
    const enabled = result.elfEnabled !== false;

    elements.enableToggle.checked = enabled;
    updateStatusDisplay(enabled);

    if (!enabled) {
      elements.container.classList.add('disabled');
    }
  } catch (error) {
    console.error('[Little Elf] Error loading state:', error);
  }
}

/**
 * Load current page info
 */
async function loadCurrentPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab) {
      elements.pageTitle.textContent = tab.title || 'Untitled';
      elements.pageTitle.title = tab.title || '';
      elements.pageUrl.textContent = tab.url || '';
      elements.pageUrl.title = tab.url || '';

      // Check if it's a valid page
      if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        elements.openChat.disabled = true;
        elements.extractNow.disabled = true;
        elements.pageTitle.textContent = 'Cannot access this page';
        elements.pageUrl.textContent = 'Chrome internal pages are not supported';
      }
    }
  } catch (error) {
    console.error('[Little Elf] Error loading page info:', error);
  }
}

/**
 * Load extraction stats
 */
async function loadStats() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.url) return;

    // Skip for internal pages
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      return;
    }

    const result = await chrome.storage.local.get(['extractedContent']);
    const content = result.extractedContent || {};
    const pageData = content[tab.url];

    if (pageData) {
      // Character count
      elements.charCount.textContent = formatNumber(pageData.contentLength || 0);

      // Heading count
      elements.headingCount.textContent = (pageData.headings || []).length;

      // Last extraction time
      if (pageData.extractedAt) {
        elements.lastExtract.textContent = formatTimeAgo(pageData.extractedAt);
      } else if (pageData.timestamp) {
        elements.lastExtract.textContent = formatTimeAgo(pageData.timestamp);
      }
    } else {
      // No data - try to extract from content script directly
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_CONTENT' });
        if (response && response.content) {
          elements.charCount.textContent = formatNumber(response.contentLength || response.content.length);
          elements.headingCount.textContent = (response.headings || []).length;
          elements.lastExtract.textContent = 'Just now';
        } else {
          elements.charCount.textContent = '0';
          elements.headingCount.textContent = '0';
          elements.lastExtract.textContent = 'Never';
        }
      } catch {
        // Content script not ready
        elements.charCount.textContent = '—';
        elements.headingCount.textContent = '—';
        elements.lastExtract.textContent = 'Click Extract';
      }
    }
  } catch (error) {
    console.error('[Little Elf] Error loading stats:', error);
  }
}

/**
 * Open the sidepanel for chat
 */
async function openSidepanel() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab && chrome.sidePanel) {
      await chrome.sidePanel.open({ tabId: tab.id });
      window.close(); // Close popup after opening sidepanel
    } else {
      // Fallback: send message to background
      chrome.runtime.sendMessage({
        type: 'OPEN_SIDEPANEL',
        tabId: tab?.id
      });
    }
  } catch (error) {
    console.error('[Little Elf] Error opening sidepanel:', error);
    alert('Failed to open chat. Please try the keyboard shortcut Ctrl+Shift+L');
  }
}

/**
 * Extract content from current page
 */
async function extractContent() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) return;

    elements.extractNow.disabled = true;
    elements.extractNow.querySelector('.btn-text').textContent = 'Extracting...';

    // Send message to content script
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_EXTRACTION' });

    if (response && response.success) {
      elements.extractNow.querySelector('.btn-text').textContent = 'Extracted!';
      await loadStats(); // Refresh stats
    } else {
      throw new Error(response?.error || 'Extraction failed');
    }

    setTimeout(() => {
      elements.extractNow.disabled = false;
      elements.extractNow.querySelector('.btn-text').textContent = 'Extract Content';
    }, 2000);

  } catch (error) {
    console.error('[Little Elf] Extraction error:', error);
    elements.extractNow.querySelector('.btn-text').textContent = 'Failed';
    elements.extractNow.disabled = false;

    setTimeout(() => {
      elements.extractNow.querySelector('.btn-text').textContent = 'Extract Content';
    }, 2000);
  }
}

/**
 * Toggle extension enabled state
 */
async function toggleExtension() {
  const enabled = elements.enableToggle.checked;

  try {
    await chrome.runtime.sendMessage({ type: 'STATE_CHANGED', enabled });
    updateStatusDisplay(enabled);

    if (enabled) {
      elements.container.classList.remove('disabled');
    } else {
      elements.container.classList.add('disabled');
    }
  } catch (error) {
    console.error('[Little Elf] Error toggling state:', error);
  }
}

/**
 * Update status display
 */
function updateStatusDisplay(enabled) {
  const dot = elements.status.querySelector('.status-dot');
  const text = elements.status.querySelector('.status-text');

  if (enabled) {
    dot.className = 'status-dot active';
    text.textContent = 'Active';
  } else {
    dot.className = 'status-dot disabled';
    text.textContent = 'Disabled';
  }
}

/**
 * Clear all data
 */
async function clearData() {
  if (!confirm('Clear all Little Elf data for this page?')) return;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab && tab.url) {
      const result = await chrome.storage.local.get(['extractedContent']);
      const content = result.extractedContent || {};
      delete content[tab.url];
      await chrome.storage.local.set({ extractedContent: content });

      // Clear session data
      const sessionKey = `session_${hashString(tab.url)}`;
      const messagesKey = `messages_${hashString(tab.url)}`;
      await chrome.storage.local.remove([sessionKey, messagesKey]);

      // Reset stats display
      elements.charCount.textContent = '—';
      elements.headingCount.textContent = '—';
      elements.lastExtract.textContent = '—';

      elements.clearData.textContent = 'Cleared!';
      setTimeout(() => {
        elements.clearData.textContent = 'Clear Data';
      }, 1500);
    }
  } catch (error) {
    console.error('[Little Elf] Error clearing data:', error);
  }
}

/**
 * Open settings
 */
function openSettings() {
  // For now, show simple settings in popup
  // Could open options page: chrome.runtime.openOptionsPage();

  const apiUrl = prompt('API Endpoint (leave empty for default):', 'http://localhost:3000');

  if (apiUrl !== null) {
    chrome.storage.local.set({ apiUrl: apiUrl || 'http://localhost:3000' }).then(() => {
      alert('API URL saved!');
    });
  }
}

/**
 * Utility: Format number
 */
function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

/**
 * Utility: Format time ago
 */
function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
  if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
  return Math.floor(seconds / 86400) + 'd ago';
}

/**
 * Utility: Hash string (simple)
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
