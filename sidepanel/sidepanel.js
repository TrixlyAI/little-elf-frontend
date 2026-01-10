/**
 * Little Elf - Sidepanel Chat
 * Main chat interface logic with backend integration
 */

// Configuration
const CONFIG = {
    DEFAULT_API_URL: 'https://little-elf-backend.vercel.app',
    MAX_MESSAGE_LENGTH: 10000,
    DEBOUNCE_DELAY: 300,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,
};

// State
const state = {
    apiUrl: CONFIG.DEFAULT_API_URL,
    openaiKey: null,
    contentId: null,
    assistantId: null,
    threadId: null,
    currentPageUrl: null,
    currentPageTitle: null,
    isProcessing: false,
    isInitialized: false,
    totalTokens: 0,
    messages: [],
};

// DOM Elements
const elements = {};

/**
 * Initialize DOM element references
 */
function initElements() {
    elements.pageInfo = document.getElementById('pageInfo');
    elements.statusIndicator = document.getElementById('statusIndicator');
    elements.statusText = document.getElementById('statusText');
    elements.tokenUsage = document.getElementById('tokenUsage');
    elements.settingsPanel = document.getElementById('settingsPanel');
    elements.settingsBtn = document.getElementById('settingsBtn');
    elements.closeSettings = document.getElementById('closeSettings');
    elements.refreshBtn = document.getElementById('refreshBtn');
    elements.apiUrl = document.getElementById('apiUrl');
    elements.openaiKey = document.getElementById('openaiKey');
    elements.clearConversation = document.getElementById('clearConversation');
    elements.exportChat = document.getElementById('exportChat');
    elements.resetAll = document.getElementById('resetAll');
    elements.assistantStatus = document.getElementById('assistantStatus');
    elements.welcomeScreen = document.getElementById('welcomeScreen');
    elements.setupScreen = document.getElementById('setupScreen');
    elements.setupKeyInput = document.getElementById('setupKeyInput');
    elements.saveKeyBtn = document.getElementById('saveKeyBtn');
    elements.chatContainer = document.getElementById('chatContainer');
    elements.messages = document.getElementById('messages');
    elements.typingIndicator = document.getElementById('typingIndicator');
    elements.messageInput = document.getElementById('messageInput');
    elements.charCounter = document.getElementById('charCounter');
    elements.sendBtn = document.getElementById('sendBtn');
}

/**
 * Initialize the sidepanel
 */
async function init() {
    initElements();
    setupEventListeners();
    setupTabListeners();
    await loadSettings();

    // Check if API key is set
    if (!state.openaiKey) {
        elements.setupScreen.classList.remove('hidden');
    } else {
        elements.setupScreen.classList.add('hidden');
        await initializeForCurrentPage();
    }
}

/**
 * Setup tab change listeners
 */
function setupTabListeners() {
    // Listen for tab switches
    chrome.tabs.onActivated.addListener(() => {
        initializeForCurrentPage();
    });

    // Listen for tab updates (navigation/refresh)
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (changeInfo.status === 'complete' && tab.active) {
            initializeForCurrentPage();
        }
    });
}

/**
 * Save API key from setup screen
 */
async function saveKeyFromSetup() {
    const key = elements.setupKeyInput.value.trim();
    if (!key) {
        showNotification('Please enter a valid API key', 'error');
        return;
    }

    if (!key.startsWith('sk-')) {
        showNotification('Invalid API key format (should start with sk-)', 'error');
        return;
    }

    state.openaiKey = key;
    await chrome.storage.local.set({ openaiKey: key });

    // update settings input too
    elements.openaiKey.value = key;

    elements.setupScreen.classList.add('hidden');
    showNotification('API Key saved successfully');

    await initializeForCurrentPage();
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Settings panel toggle
    elements.settingsBtn.addEventListener('click', toggleSettings);
    elements.closeSettings.addEventListener('click', () => toggleSettings(false));

    // Refresh button
    elements.refreshBtn.addEventListener('click', refreshContext);

    // Settings actions
    elements.clearConversation.addEventListener('click', clearConversation);
    elements.exportChat.addEventListener('click', exportChat);
    elements.resetAll.addEventListener('click', resetAllData);

    // API URL change
    elements.apiUrl.addEventListener('change', saveApiUrl);

    // OpenAI API key change
    elements.openaiKey.addEventListener('change', saveOpenaiKey);

    // Message input
    elements.messageInput.addEventListener('input', handleInputChange);
    elements.messageInput.addEventListener('keydown', handleKeyDown);
    elements.sendBtn.addEventListener('click', sendMessage);

    // Setup screen
    elements.saveKeyBtn.addEventListener('click', saveKeyFromSetup);

    // Quick actions
    document.querySelectorAll('.quick-action-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const prompt = btn.dataset.prompt;
            if (prompt) {
                elements.messageInput.value = prompt;
                handleInputChange();
                sendMessage();
            }
        });
    });

    // Auto-resize textarea
    elements.messageInput.addEventListener('input', autoResizeTextarea);
}

/**
 * Load saved settings from storage
 */
async function loadSettings() {
    try {
        const result = await chrome.storage.local.get([
            'apiUrl',
            'openaiKey',
            'totalTokens',
        ]);

        if (result.apiUrl) {
            state.apiUrl = result.apiUrl;
            elements.apiUrl.value = result.apiUrl;
        }

        if (result.openaiKey) {
            state.openaiKey = result.openaiKey;
            elements.openaiKey.value = result.openaiKey;
        }

        if (result.totalTokens) {
            state.totalTokens = result.totalTokens;
            updateTokenDisplay();
        }
    } catch (error) {
        console.error('[Little Elf] Error loading settings:', error);
    }
}

/**
 * Save API URL to storage
 */
async function saveApiUrl() {
    const url = elements.apiUrl.value.trim() || CONFIG.DEFAULT_API_URL;
    state.apiUrl = url;
    await chrome.storage.local.set({ apiUrl: url });
    showNotification('API URL saved');
}

/**
 * Save OpenAI API key to storage
 */
async function saveOpenaiKey() {
    const key = elements.openaiKey.value.trim();
    state.openaiKey = key || null;
    await chrome.storage.local.set({ openaiKey: key || '' });
    showNotification(key ? 'API Key saved' : 'API Key cleared');
}

/**
 * Initialize for the current page
 */
async function initializeForCurrentPage() {
    setStatus('processing', 'Initializing...');

    try {
        // Get current tab info
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab || !tab.url || tab.url.startsWith('chrome://')) {
            setStatus('error', 'Cannot access this page');
            return;
        }

        state.currentPageUrl = tab.url;
        state.currentPageTitle = tab.title || 'Untitled';
        elements.pageInfo.textContent = state.currentPageTitle;
        elements.pageInfo.title = state.currentPageUrl;

        // Reset state for new page
        state.contentId = null;
        state.assistantId = null;
        state.threadId = null;
        state.messages = [];
        elements.messages.innerHTML = '';
        elements.welcomeScreen.classList.remove('hidden');
        elements.chatContainer.classList.remove('visible');

        // Check if we have existing session for this page
        const sessionKey = `session_${hashString(tab.url)}`;
        const existingSession = await chrome.storage.local.get([sessionKey]);

        if (existingSession[sessionKey]) {
            const session = existingSession[sessionKey];
            state.contentId = session.contentId;
            state.assistantId = session.assistantId;
            state.threadId = session.threadId;

            // Load existing messages
            await loadMessages();
            setStatus('connected', 'Ready');
            state.isInitialized = true;
            updateAssistantStatus();
            return;
        }

        // Get page content from content script
        const content = await getPageContent(tab.id);

        if (!content) {
            setStatus('error', 'Failed to extract content');
            return;
        }

        // Store content in backend
        setStatus('processing', 'Storing content...');
        const storeResult = await apiRequest('/api/content/store', 'POST', {
            url: content.url,
            title: content.title,
            description: content.description,
            headings: content.headings,
            content: content.content,
        });

        state.contentId = storeResult.contentId;

        // Create assistant
        setStatus('processing', 'Creating AI assistant...');
        const assistantResult = await apiRequest('/api/assistant/create', 'POST', {
            contentId: state.contentId,
        });

        state.assistantId = assistantResult.assistantId;
        state.threadId = assistantResult.threadId;

        // Save session
        await chrome.storage.local.set({
            [sessionKey]: {
                contentId: state.contentId,
                assistantId: state.assistantId,
                threadId: state.threadId,
                createdAt: new Date().toISOString(),
            },
        });

        setStatus('connected', 'Ready');
        state.isInitialized = true;
        updateAssistantStatus();

    } catch (error) {
        console.error('[Little Elf] Initialization error:', error);
        setStatus('error', error.message || 'Failed to initialize');
    }
}

/**
 * Get page content from content script
 */
async function getPageContent(tabId) {
    return new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, { type: 'GET_PAGE_CONTENT' }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('[Little Elf] Content script error:', chrome.runtime.lastError);
                resolve(null);
            } else {
                resolve(response);
            }
        });
    });
}

/**
 * Make API request with retry logic
 */
async function apiRequest(endpoint, method = 'GET', body = null, retries = CONFIG.RETRY_ATTEMPTS) {
    const url = `${state.apiUrl}${endpoint}`;

    const headers = {
        'Content-Type': 'application/json',
    };

    // Add OpenAI API key if available
    if (state.openaiKey) {
        headers['X-OpenAI-Key'] = state.openaiKey;
    }

    const options = {
        method,
        headers,
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await fetch(url, options);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `API error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            if (attempt < retries && !error.message.includes('API error')) {
                console.warn(`[Little Elf] Retry ${attempt + 1}/${retries}:`, error);
                await sleep(CONFIG.RETRY_DELAY * (attempt + 1));
                continue;
            }
            throw error;
        }
    }
}

/**
 * Send a chat message with streaming response
 */
async function sendMessage() {
    const message = elements.messageInput.value.trim();

    if (!message || state.isProcessing || !state.isInitialized) {
        return;
    }

    if (!state.threadId) {
        showError('No active chat session. Please refresh.');
        return;
    }

    // Clear input
    elements.messageInput.value = '';
    handleInputChange();
    autoResizeTextarea();

    // Add user message to UI
    addMessage('user', message);

    // Hide welcome screen, show chat
    elements.welcomeScreen.classList.add('hidden');
    elements.chatContainer.classList.add('visible');

    // Show typing indicator
    state.isProcessing = true;
    setStatus('processing', 'Thinking...');
    elements.typingIndicator.classList.add('visible');
    scrollToBottom();

    // Create streaming message element
    const streamingEl = createStreamingMessage();

    try {
        console.log('[Little Elf] Streaming message with:', {
            threadId: state.threadId,
            contentId: state.contentId,
        });

        // Use streaming endpoint
        const headers = {
            'Content-Type': 'application/json',
        };

        // Add OpenAI API key if provided
        if (state.openaiKey) {
            headers['X-OpenAI-Key'] = state.openaiKey;
        }

        const response = await fetch(`${state.apiUrl}/api/chat/stream`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                threadId: state.threadId,
                message: message,
                contentId: state.contentId,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Stream request failed');
        }

        // Hide typing indicator when stream starts
        elements.typingIndicator.classList.remove('visible');
        setStatus('processing', 'Responding...');

        // Process the stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));

                        if (data.type === 'text') {
                            fullResponse += data.content;
                            updateStreamingMessage(streamingEl, fullResponse);
                            scrollToBottom();
                        } else if (data.type === 'done') {
                            // Finalize the message
                            finalizeStreamingMessage(streamingEl, fullResponse);

                            // Save to state
                            state.messages.push({
                                role: 'assistant',
                                content: fullResponse,
                                timestamp: new Date().toISOString()
                            });
                            saveMessages();
                        } else if (data.type === 'error') {
                            throw new Error(data.content);
                        }
                    } catch (parseError) {
                        // Ignore parse errors from incomplete chunks
                    }
                }
            }
        }

        setStatus('connected', 'Ready');

    } catch (error) {
        console.error('[Little Elf] Stream error:', error);
        elements.typingIndicator.classList.remove('visible');

        // Remove streaming message if it exists
        if (streamingEl && streamingEl.parentNode) {
            streamingEl.remove();
        }

        addMessage('error', `Error: ${error.message}`);
        setStatus('error', 'Message failed');
    } finally {
        state.isProcessing = false;
    }
}

/**
 * Create a streaming message element
 */
function createStreamingMessage() {
    const messageEl = document.createElement('div');
    messageEl.className = 'message assistant streaming';

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    messageEl.innerHTML = `
        <div class="message-content"></div>
        <div class="message-meta">
            <span class="timestamp">${timestamp}</span>
            <button class="copy-btn" onclick="copyMessage(this)" title="Copy">Copy</button>
        </div>
    `;

    elements.messages.appendChild(messageEl);
    return messageEl;
}

/**
 * Update streaming message content
 */
function updateStreamingMessage(messageEl, content) {
    const contentEl = messageEl.querySelector('.message-content');
    if (contentEl) {
        contentEl.innerHTML = formatMessageContent(content);
    }
}

/**
 * Finalize streaming message (remove cursor animation)
 */
function finalizeStreamingMessage(messageEl, content) {
    messageEl.classList.remove('streaming');
    const contentEl = messageEl.querySelector('.message-content');
    if (contentEl) {
        contentEl.innerHTML = formatMessageContent(content);
    }
}

/**
 * Add a message to the chat
 */
function addMessage(role, content) {
    const messageEl = document.createElement('div');
    messageEl.className = `message ${role}`;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Format content (basic markdown for code blocks)
    const formattedContent = formatMessageContent(content);

    messageEl.innerHTML = `
    <div class="message-content">${formattedContent}</div>
    <div class="message-meta">
      <span class="timestamp">${timestamp}</span>
      <button class="copy-btn" onclick="copyMessage(this)" title="Copy">Copy</button>
    </div>
  `;

    elements.messages.appendChild(messageEl);

    // Save to state
    state.messages.push({ role, content, timestamp: new Date().toISOString() });
    saveMessages();

    scrollToBottom();
}

/**
 * Format message content with basic markdown
 */
function formatMessageContent(content) {
    // Escape HTML
    let formatted = content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Code blocks
    formatted = formatted.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');

    // Inline code
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Italic
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Line breaks
    formatted = formatted.replace(/\n/g, '<br>');

    return formatted;
}

/**
 * Copy message to clipboard
 */
window.copyMessage = function (btn) {
    const content = btn.closest('.message').querySelector('.message-content').textContent;
    navigator.clipboard.writeText(content).then(() => {
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = originalText, 1500);
    });
};

/**
 * Load messages from storage
 */
async function loadMessages() {
    const sessionKey = `messages_${hashString(state.currentPageUrl)}`;
    const result = await chrome.storage.local.get([sessionKey]);

    if (result[sessionKey] && result[sessionKey].length > 0) {
        state.messages = result[sessionKey];

        // Show chat container
        elements.welcomeScreen.classList.add('hidden');
        elements.chatContainer.classList.add('visible');

        // Render messages
        elements.messages.innerHTML = '';
        state.messages.forEach(msg => {
            const messageEl = document.createElement('div');
            messageEl.className = `message ${msg.role}`;

            const timestamp = new Date(msg.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
            });

            messageEl.innerHTML = `
        <div class="message-content">${formatMessageContent(msg.content)}</div>
        <div class="message-meta">
          <span class="timestamp">${timestamp}</span>
          <button class="copy-btn" onclick="copyMessage(this)" title="Copy">Copy</button>
        </div>
      `;

            elements.messages.appendChild(messageEl);
        });

        scrollToBottom();
    }
}

/**
 * Save messages to storage
 */
async function saveMessages() {
    const sessionKey = `messages_${hashString(state.currentPageUrl)}`;
    await chrome.storage.local.set({ [sessionKey]: state.messages });
}

/**
 * Handle input change
 */
function handleInputChange() {
    const length = elements.messageInput.value.length;
    elements.charCounter.textContent = `${length}/${CONFIG.MAX_MESSAGE_LENGTH}`;

    // Update character counter styling
    elements.charCounter.classList.remove('warning', 'limit');
    if (length > CONFIG.MAX_MESSAGE_LENGTH * 0.9) {
        elements.charCounter.classList.add('limit');
    } else if (length > CONFIG.MAX_MESSAGE_LENGTH * 0.7) {
        elements.charCounter.classList.add('warning');
    }

    // Enable/disable send button
    elements.sendBtn.disabled = length === 0 || length > CONFIG.MAX_MESSAGE_LENGTH || state.isProcessing;
}

/**
 * Handle keyboard shortcuts
 */
function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

/**
 * Auto-resize textarea
 */
function autoResizeTextarea() {
    const textarea = elements.messageInput;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}

/**
 * Scroll to bottom of chat
 */
function scrollToBottom() {
    elements.chatContainer.scrollTop = elements.chatContainer.scrollHeight;
}

/**
 * Set status indicator
 */
function setStatus(type, text) {
    elements.statusIndicator.className = 'status-indicator';
    elements.statusIndicator.classList.add(type);
    elements.statusText.textContent = text;
}

/**
 * Update token display
 */
function updateTokenDisplay() {
    if (state.totalTokens > 0) {
        elements.tokenUsage.textContent = `${formatNumber(state.totalTokens)} tokens used`;
    }
}

/**
 * Update assistant status display
 */
function updateAssistantStatus() {
    const statusEl = elements.assistantStatus;

    if (state.assistantId) {
        statusEl.classList.add('active');
        statusEl.innerHTML = `
      <span class="label">✓ Assistant active</span>
      <br><small>ID: ${state.assistantId.substring(0, 20)}...</small>
    `;
    } else {
        statusEl.classList.remove('active');
        statusEl.innerHTML = '<span class="label">No assistant created</span>';
    }
}

/**
 * Toggle settings panel
 */
function toggleSettings(show) {
    if (typeof show === 'boolean') {
        elements.settingsPanel.classList.toggle('visible', show);
    } else {
        elements.settingsPanel.classList.toggle('visible');
    }
}

/**
 * Refresh context for current page
 */
async function refreshContext() {
    setStatus('processing', 'Refreshing...');

    try {
        // Clear current session
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const sessionKey = `session_${hashString(tab.url)}`;
        const messagesKey = `messages_${hashString(tab.url)}`;

        await chrome.storage.local.remove([sessionKey, messagesKey]);

        // Reset state
        state.contentId = null;
        state.assistantId = null;
        state.threadId = null;
        state.messages = [];
        state.isInitialized = false;

        // Clear UI
        elements.messages.innerHTML = '';
        elements.welcomeScreen.classList.remove('hidden');
        elements.chatContainer.classList.remove('visible');

        // Re-initialize
        await initializeForCurrentPage();

    } catch (error) {
        console.error('[Little Elf] Refresh error:', error);
        setStatus('error', 'Refresh failed');
    }
}

/**
 * Clear conversation
 */
async function clearConversation() {
    if (!confirm('Clear all messages for this page?')) return;

    const messagesKey = `messages_${hashString(state.currentPageUrl)}`;
    await chrome.storage.local.remove([messagesKey]);

    state.messages = [];
    elements.messages.innerHTML = '';
    elements.welcomeScreen.classList.remove('hidden');
    elements.chatContainer.classList.remove('visible');

    toggleSettings(false);
    showNotification('Conversation cleared');
}

/**
 * Export chat as markdown
 */
function exportChat() {
    if (state.messages.length === 0) {
        showNotification('No messages to export');
        return;
    }

    let markdown = `# Little Elf Chat Export\n`;
    markdown += `**Page:** ${state.currentPageTitle}\n`;
    markdown += `**URL:** ${state.currentPageUrl}\n`;
    markdown += `**Date:** ${new Date().toLocaleString()}\n\n`;
    markdown += `---\n\n`;

    state.messages.forEach(msg => {
        const role = msg.role === 'user' ? '👤 You' : '🧝 Little Elf';
        const time = new Date(msg.timestamp).toLocaleString();
        markdown += `### ${role}\n`;
        markdown += `*${time}*\n\n`;
        markdown += `${msg.content}\n\n`;
    });

    // Download file
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `little-elf-chat-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);

    toggleSettings(false);
    showNotification('Chat exported');
}

/**
 * Reset all data
 */
async function resetAllData() {
    if (!confirm('This will delete all Little Elf data. Are you sure?')) return;

    await chrome.storage.local.clear();

    state.contentId = null;
    state.assistantId = null;
    state.threadId = null;
    state.messages = [];
    state.totalTokens = 0;
    state.isInitialized = false;

    elements.messages.innerHTML = '';
    elements.welcomeScreen.classList.remove('hidden');
    elements.chatContainer.classList.remove('visible');
    updateTokenDisplay();
    updateAssistantStatus();

    toggleSettings(false);
    showNotification('All data reset');

    // Re-initialize
    await initializeForCurrentPage();
}

/**
 * Show notification
 */
function showNotification(message) {
    // Simple notification - you could enhance this
    console.log('[Little Elf]', message);
}

/**
 * Show error message
 */
function showError(message) {
    console.error('[Little Elf]', message);
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

/**
 * Utility: Format number
 */
function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

/**
 * Utility: Sleep
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
