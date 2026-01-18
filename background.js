// Configuration
const CHATGPT_URLS = [
    "https://chatgpt.com/",
    "https://chat.openai.com/"
];

const DEFAULT_TIMEOUT = 15000; // 15 seconds
const RETRY_INTERVAL = 500; // 500ms between attempts (increased for reliability)
const MAX_RETRIES = 8; // Increased number of attempts

// Multiple selectors for compatibility with different ChatGPT versions
const TEXTAREA_SELECTORS = [
    // Modern ChatGPT selectors (2024)
    'textarea[data-id="root"]',
    'div[contenteditable="true"][data-id="root"]',
    '[role="textbox"][contenteditable="true"]',
    '[contenteditable="true"][data-id="root"]',
    // Alternative selectors
    'textarea[placeholder*="Message"]',
    'textarea[placeholder*="Сообщение"]',
    'textarea[placeholder*="message"]',
    // Legacy selectors
    'div#prompt-textarea',
    'textarea#prompt-textarea',
    '[data-testid="textbox"]',
    // General fallback selectors
    'textarea[rows]',
    'textarea',
    '[contenteditable="true"]'
];

// Create context menu item on installation
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "send-to-chatgpt",
        title: "Отправить выделенный текст в ChatGPT",
        contexts: ["selection"]
    });
});

// Context menu click handler
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "send-to-chatgpt" && info.selectionText) {
        const text = info.selectionText.trim();
        if (text) {
            openChatWithText(text);
        }
    }
});

// Extension icon click handler
chrome.action.onClicked.addListener(async (tab) => {
    try {
        const [result] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => window.getSelection().toString()
        });
        const selectedText = (result && result.result) ? result.result.trim() : "";
        if (selectedText) {
            openChatWithText(selectedText);
        } else {
            // If no text is selected, just open ChatGPT
            openChatWithText("");
        }
    } catch (error) {
        console.error("Error getting selected text:", error);
        openChatWithText("");
    }
});

/**
 * Opens ChatGPT and inserts text
 * @param {string} text - Text to insert
 */
async function openChatWithText(text) {
    try {
        // Use current ChatGPT URL
        const chatTab = await chrome.tabs.create({ url: CHATGPT_URLS[0] });

        if (text) {
            // Wait for page load and insert text
            chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
                if (tabId === chatTab.id && info.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(listener);

                    // Give page time to fully load and initialize React components
                    setTimeout(() => {
                        insertTextWithRetry(chatTab.id, text);
                    }, 2000);
                }
            });
        }
    } catch (error) {
        console.error("Error opening ChatGPT:", error);
    }
}

/**
 * Inserts text with retry attempts
 * @param {number} tabId - Tab ID
 * @param {string} text - Text to insert
 */
async function insertTextWithRetry(tabId, text) {
    let attempts = 0;

    while (attempts < MAX_RETRIES) {
        try {
            const result = await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: insertTextIntoChatGPT,
                args: [text, TEXTAREA_SELECTORS]
            });

            if (result && result[0] && result[0].result === true) {
                // Successfully inserted
                console.log("Text successfully inserted into ChatGPT");
                return;
            }
        } catch (error) {
            console.log(`Attempt ${attempts + 1} failed:`, error.message);
        }

        attempts++;
        if (attempts < MAX_RETRIES) {
            // Exponential backoff between attempts
            await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL * attempts));
        }
    }

    // If all attempts failed
    console.error("Failed to insert text after all attempts");
    try {
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: () => {
                console.warn("Extension could not automatically insert text. Please insert it manually.");
            }
        });
    } catch (error) {
        console.error("Error showing notification:", error);
    }
}

/**
 * Inserts text into ChatGPT input field (executes on page)
 * All helper functions are embedded inside for access in page context
 * Uses function expressions for proper Chrome serialization
 * @param {string} selectedText - Text to insert
 * @param {string[]} selectors - Array of selectors to find input field
 * @returns {boolean} - true if successful, false if failed
 */
function insertTextIntoChatGPT(selectedText, selectors) {
    // Helper function: modern text insertion method (function expression)
    const insertTextModern = function (element, text) {
        try {
            // Determine element type
            const isContentEditable = element.contentEditable === 'true' || element.isContentEditable;
            const isTextarea = element.tagName === 'TEXTAREA';
            const isInput = element.tagName === 'INPUT';

            if (isContentEditable) {
                // For contenteditable elements (main type in ChatGPT)
                element.focus();

                // Synchronous insertion for contenteditable
                try {
                    // Clear content
                    element.textContent = '';
                    element.innerHTML = '';

                    // Set text
                    element.textContent = text;

                    // Set cursor to end
                    const selection = window.getSelection();
                    const range = document.createRange();
                    range.selectNodeContents(element);
                    range.collapse(false);
                    selection.removeAllRanges();
                    selection.addRange(range);

                    // Dispatch events to trigger ChatGPT handlers
                    try {
                        const inputEvent = new InputEvent('input', {
                            bubbles: true,
                            cancelable: true,
                            inputType: 'insertText',
                            data: text
                        });
                        element.dispatchEvent(inputEvent);
                    } catch (e) {
                        // Fallback if InputEvent is not supported
                        element.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                    element.dispatchEvent(new Event('change', { bubbles: true }));

                    // Additionally trigger keydown/keyup for full compatibility
                    try {
                        element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true }));
                        element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, cancelable: true }));
                    } catch (e) {
                        // Ignore KeyboardEvent errors
                    }
                } catch (err) {
                    console.error("Error inserting into contenteditable:", err);
                    return false;
                }
                return true;

            } else if (isTextarea || isInput) {
                // For textarea and input elements
                element.focus();
                element.value = text;

                // Dispatch events
                const inputEvent = new InputEvent('input', {
                    bubbles: true,
                    cancelable: true,
                    inputType: 'insertText',
                    data: text
                });
                element.dispatchEvent(inputEvent);
                element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));

                // Set cursor to end
                try {
                    element.setSelectionRange(text.length, text.length);
                } catch (e) {
                    // Ignore setSelectionRange errors for some elements
                }
                return true;
            } else {
                // Fallback for other elements
                element.textContent = text;
                element.dispatchEvent(new Event('input', { bubbles: true }));
                return true;
            }
        } catch (error) {
            console.error("Error in insertTextModern:", error);
            return false;
        }
    };

    // Main function logic
    try {
        // Authorization check - embedded directly in code to avoid serialization issues
        let isAuthorized = true;
        try {
            const sendButton = document.querySelector('button[data-testid="send-button"]') ||
                document.querySelector('button[aria-label*="Send"]') ||
                document.querySelector('button[aria-label*="Отправить"]');
            const sidebar = document.querySelector('nav') ||
                document.querySelector('[data-testid="sidebar"]');
            const loginForm = document.querySelector('form[action*="login"]') ||
                document.querySelector('a[href*="login"]');
            isAuthorized = (sendButton || sidebar) && !loginForm;
        } catch (authError) {
            // On error, assume user may be authorized
            isAuthorized = true;
        }

        if (!isAuthorized) {
            console.warn("User is not authorized. Please log in to ChatGPT.");
            // Don't block, but warn - user may log in later
        }

        // Search for input field using various selectors
        let textarea = null;
        let foundSelector = null;

        // First try precise selectors
        for (const selector of selectors) {
            try {
                textarea = document.querySelector(selector);
                if (textarea && textarea.offsetParent !== null) { // Check that element is visible
                    foundSelector = selector;
                    console.log(`Found input field by selector: ${selector}`);
                    break;
                }
            } catch (e) {
                // Ignore selector errors
                continue;
            }
        }

        // If not found, try more aggressive search
        if (!textarea) {
            // Search for all contenteditable elements
            const allContentEditable = document.querySelectorAll('[contenteditable="true"]');
            for (let i = 0; i < allContentEditable.length; i++) {
                const el = allContentEditable[i];
                // Check that element is visible and in bottom part of page (usually where input field is)
                if (el.offsetParent !== null && el.getBoundingClientRect().bottom > window.innerHeight * 0.5) {
                    textarea = el;
                    foundSelector = 'contenteditable (auto-search)';
                    console.log('Found input field via contenteditable auto-search');
                    break;
                }
            }
        }

        // If still not found, try last textarea on page
        if (!textarea) {
            const allTextareas = document.querySelectorAll('textarea');
            if (allTextareas.length > 0) {
                textarea = allTextareas[allTextareas.length - 1]; // Take last one
                foundSelector = 'textarea (last)';
                console.log('Found input field as last textarea');
            }
        }

        if (!textarea) {
            console.warn("Input field not found. Available elements:", {
                textareas: document.querySelectorAll('textarea').length,
                contentEditable: document.querySelectorAll('[contenteditable="true"]').length,
                isAuthorized: isAuthorized,
                url: window.location.href
            });
            return false;
        }

        // Focus on element and insert text
        try {
            textarea.focus();

            // Small delay to ensure focus before insertion
            // Use synchronous approach with minimal delay
            const result = insertTextModern(textarea, selectedText);

            if (result) {
                console.log(`Text successfully inserted (selector: ${foundSelector})`);
                // Check result after small delay (asynchronously, without blocking return)
                setTimeout(function () {
                    const currentText = textarea.textContent || textarea.value || '';
                    const textStart = selectedText.substring(0, Math.min(20, selectedText.length));
                    if (currentText.includes(textStart)) {
                        console.log("✓ Confirmed: text is present in input field");
                    } else {
                        console.warn("⚠ Text may not be fully inserted");
                    }
                }, 300);
            }

            return result;
        } catch (error) {
            console.error("Error focusing/inserting:", error);
            return false;
        }
    } catch (error) {
        console.error("Error inserting text:", error);
        return false;
    }
}
