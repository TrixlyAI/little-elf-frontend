/**
 * Little Elf - Enhanced Content Script
 * Extracts clean content from web pages with improved cleaning
 */

// Maximum content length to prevent storage issues
const MAX_CONTENT_LENGTH = 50000;

// Selectors for elements to exclude from content extraction
const EXCLUDE_SELECTORS = [
    'script',
    'style',
    'noscript',
    'iframe',
    'nav',
    'footer',
    'header',
    'aside',
    '[role="navigation"]',
    '[role="banner"]',
    '[role="contentinfo"]',
    '[aria-hidden="true"]',
    '.advertisement',
    '.ads',
    '.ad-container',
    '.ad-wrapper',
    '.ad-slot',
    '.sidebar',
    '.comments',
    '.comment-section',
    '.social-share',
    '.social-buttons',
    '.cookie-notice',
    '.cookie-banner',
    '.popup',
    '.modal',
    '.newsletter',
    '.subscribe-form',
    '.related-posts',
    '.recommended',
    '.promo',
    '.sponsor',
    '.widget',
    '#disqus_thread',
    '.share-buttons',
    '.author-bio',
    '.breadcrumbs',
    '.pagination',
    '.tags',
    '.categories',
];

// Selectors for main content areas (prioritized)
const MAIN_CONTENT_SELECTORS = [
    'article',
    '[role="main"]',
    'main',
    '.post-content',
    '.article-content',
    '.entry-content',
    '.content',
    '#content',
    '.post',
    '.article',
];

/**
 * Check if the extension is enabled
 * @returns {Promise<boolean>} Whether the extension is enabled
 */
async function isExtensionEnabled() {
    try {
        const result = await chrome.storage.local.get(['elfEnabled']);
        return result.elfEnabled !== false;
    } catch (error) {
        console.error('[Little Elf] Error checking extension state:', error);
        return true;
    }
}

/**
 * Extract meta description from the page
 * @returns {string} Meta description or empty string
 */
function extractMetaDescription() {
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
        return metaDesc.getAttribute('content') || '';
    }

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) {
        return ogDesc.getAttribute('content') || '';
    }

    const twitterDesc = document.querySelector('meta[name="twitter:description"]');
    if (twitterDesc) {
        return twitterDesc.getAttribute('content') || '';
    }

    return '';
}

/**
 * Extract all headings from the page
 * @returns {Array<Object>} Array of heading objects with level and text
 */
function extractHeadings() {
    const headings = [];
    const headingElements = document.querySelectorAll('h1, h2, h3, h4');

    headingElements.forEach((heading) => {
        const text = heading.textContent?.trim();
        if (text && text.length > 0 && text.length < 200) {
            headings.push({
                level: parseInt(heading.tagName.charAt(1)),
                text: text.substring(0, 200)
            });
        }
    });

    return headings.slice(0, 50); // Limit to 50 headings
}

/**
 * Extract alt text from images
 * @returns {string[]} Array of alt texts
 */
function extractImageAlts() {
    const alts = [];
    const images = document.querySelectorAll('img[alt]');

    images.forEach((img) => {
        const alt = img.getAttribute('alt')?.trim();
        if (alt && alt.length > 10 && alt.length < 200) {
            alts.push(alt);
        }
    });

    return alts.slice(0, 20);
}

/**
 * Extract code blocks from the page
 * @returns {string[]} Array of code snippets
 */
function extractCodeBlocks() {
    const codeBlocks = [];
    const preElements = document.querySelectorAll('pre code, pre');

    preElements.forEach((el) => {
        const code = el.textContent?.trim();
        if (code && code.length > 20 && code.length < 2000) {
            codeBlocks.push(code);
        }
    });

    return codeBlocks.slice(0, 10);
}

/**
 * Find main content area
 * @returns {Element|null} Main content element or null
 */
function findMainContent() {
    for (const selector of MAIN_CONTENT_SELECTORS) {
        const element = document.querySelector(selector);
        if (element && element.textContent.length > 100) {
            return element;
        }
    }
    return null;
}

/**
 * Clone element and remove excluded elements
 * @param {Element} element - Element to clone
 * @returns {Element} Cleaned element clone
 */
function cleanElement(element) {
    const clone = element.cloneNode(true);

    EXCLUDE_SELECTORS.forEach((selector) => {
        try {
            const elements = clone.querySelectorAll(selector);
            elements.forEach((el) => el.remove());
        } catch {
            // Ignore invalid selectors
        }
    });

    return clone;
}

/**
 * Extract clean text content from the page
 * @returns {string} Cleaned text content
 */
function extractCleanContent() {
    try {
        // Try to find main content area first
        let contentElement = findMainContent();

        if (!contentElement) {
            contentElement = document.body;
        }

        const cleanedElement = cleanElement(contentElement);

        // Get text content
        let textContent = cleanedElement.textContent || '';

        // Clean up whitespace
        textContent = textContent
            .replace(/\t/g, ' ')
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/ {2,}/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join('\n')
            .trim();

        // Limit content length
        if (textContent.length > MAX_CONTENT_LENGTH) {
            textContent = textContent.substring(0, MAX_CONTENT_LENGTH);
            const lastPeriod = textContent.lastIndexOf('.');
            if (lastPeriod > MAX_CONTENT_LENGTH - 500) {
                textContent = textContent.substring(0, lastPeriod + 1);
            }
        }

        return textContent;
    } catch (error) {
        console.error('[Little Elf] Error extracting content:', error);
        return '';
    }
}

/**
 * Extract structured content for better RAG performance
 * @returns {string} Structured content
 */
function extractStructuredContent() {
    const sections = [];

    // Main text content
    const mainContent = extractCleanContent();
    sections.push(mainContent);

    // Add image descriptions
    const imageAlts = extractImageAlts();
    if (imageAlts.length > 0) {
        sections.push('\n\n[Images on this page:]\n' + imageAlts.join('\n'));
    }

    // Add code blocks summary
    const codeBlocks = extractCodeBlocks();
    if (codeBlocks.length > 0) {
        sections.push('\n\n[Code examples on this page:]\n' + codeBlocks.slice(0, 5).join('\n---\n'));
    }

    let fullContent = sections.join('');

    // Ensure we don't exceed max length
    if (fullContent.length > MAX_CONTENT_LENGTH) {
        fullContent = fullContent.substring(0, MAX_CONTENT_LENGTH);
    }

    return fullContent;
}

/**
 * Extract all page data into a structured object
 * @returns {Object} Structured page data
 */
function extractPageData() {
    const url = window.location.href;
    const title = document.title || 'Untitled';
    const description = extractMetaDescription();
    const headings = extractHeadings();
    const content = extractStructuredContent();
    const timestamp = new Date().toISOString();

    return {
        url,
        title,
        description,
        headings,
        content,
        timestamp,
        contentLength: content.length
    };
}

/**
 * Send extracted data to the background script
 * @param {Object} data - Extracted page data
 */
async function sendToBackground(data) {
    try {
        await chrome.runtime.sendMessage({
            type: 'CONTENT_EXTRACTED',
            data: data
        });
        console.log('[Little Elf] Content sent to background:', {
            url: data.url,
            contentLength: data.contentLength,
            headingsCount: data.headings.length
        });
    } catch (error) {
        console.error('[Little Elf] Error sending to background:', error);
    }
}

/**
 * Main extraction function
 */
async function runExtraction() {
    const enabled = await isExtensionEnabled();
    if (!enabled) {
        console.log('[Little Elf] Extension is disabled, skipping extraction');
        return null;
    }

    const url = window.location.href;
    if (url.startsWith('chrome://') ||
        url.startsWith('chrome-extension://') ||
        url.startsWith('about:') ||
        url.startsWith('edge://') ||
        url.startsWith('file://') ||
        url.startsWith('moz-extension://')) {
        console.log('[Little Elf] Skipping internal URL:', url);
        return null;
    }

    console.log('[Little Elf] Starting content extraction...');

    try {
        const pageData = extractPageData();
        await sendToBackground(pageData);
        return pageData;
    } catch (error) {
        console.error('[Little Elf] Extraction failed:', error);
        return null;
    }
}

/**
 * Listen for messages from background script and sidepanel
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[Little Elf] Received message:', message.type);

    switch (message.type) {
        case 'TRIGGER_EXTRACTION':
            runExtraction().then((data) => {
                sendResponse({ success: true, data });
            }).catch((error) => {
                sendResponse({ success: false, error: error.message });
            });
            return true;

        case 'GET_PAGE_CONTENT':
            // Directly return page content for sidepanel
            try {
                const pageData = extractPageData();
                sendResponse(pageData);
            } catch (error) {
                sendResponse(null);
            }
            return true;

        case 'CHECK_READY':
            sendResponse({ ready: true });
            return true;

        default:
            return false;
    }
});

/**
 * Observe page changes for dynamic content
 */
function observePageChanges() {
    let debounceTimer = null;

    const observer = new MutationObserver((mutations) => {
        // Debounce updates
        if (debounceTimer) clearTimeout(debounceTimer);

        debounceTimer = setTimeout(async () => {
            // Check if significant content changed
            const significantChange = mutations.some(mutation => {
                return mutation.addedNodes.length > 5 ||
                    mutation.removedNodes.length > 5 ||
                    (mutation.target.tagName === 'ARTICLE') ||
                    (mutation.target.tagName === 'MAIN');
            });

            if (significantChange) {
                console.log('[Little Elf] Significant content change detected');
                // Notify background of content update
                chrome.runtime.sendMessage({ type: 'CONTENT_UPDATED' }).catch(() => { });
            }
        }, 2000);
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });
}

// Run extraction when document is ready
if (document.readyState === 'complete') {
    setTimeout(() => {
        runExtraction();
        observePageChanges();
    }, 500);
} else {
    window.addEventListener('load', () => {
        setTimeout(() => {
            runExtraction();
            observePageChanges();
        }, 500);
    });
}

console.log('[Little Elf] Enhanced content script loaded');
