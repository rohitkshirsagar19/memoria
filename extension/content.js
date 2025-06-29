/**
 * Memoria - Content Script (v14 - Final with Corrected AI Studio Selector)
 *
 * This version uses the correct `aria-label` selector for the Google AI Studio
 * input box to ensure the paste functionality works reliably.
 */

console.log("%cMemoria Content Script Loaded (v14 - Final).", "color: #4285F4; font-weight: bold;");

const SITE_CONFIGS = {
  // --- Grok Configuration ---
  "grok.com": {
    turnContainerSelector: 'div.group.flex-col.items-start',
    messageContentSelector: 'div.response-content-markdown',
    buttonGroupSelector: 'div.action-buttons',
    inputBoxSelector: 'textarea[aria-label="Ask Grok anything"]',
    buttonStyle: { backgroundColor: "#5E5CE6", color: "white", padding: "4px 12px", fontSize: "14px" }
  },
  
  // --- Google AI Studio Configuration ---
  "aistudio.google.com": {
    turnContainerSelector: 'ms-chat-turn.ng-star-inserted',
    assistantMessageIdentifier: '[data-turn-role="Model"]',
    messageContentSelector: 'ms-cmark-node',
    buttonGroupSelector: 'div.turn-footer',
    // THIS IS THE CORRECTED SELECTOR
    inputBoxSelector: 'textarea[aria-label="Type something or tab to choose an example prompt"]', 
    buttonStyle: { backgroundColor: "#1a73e8", color: "white", padding: "8px 12px", fontSize: "13px" }
  }
};

const currentConfig = SITE_CONFIGS[window.location.hostname];

// --- Core Functions (Unchanged) ---

function createSaveButton(style) {
    const button = document.createElement("button");
    button.innerHTML = "💾 Save Memory";
    button.title = "Save this response to Memoria";
    Object.assign(button.style, {
        border: "none", borderRadius: "8px", fontWeight: "500", marginLeft: "8px", cursor: "pointer",
        transition: "background-color 0.2s", ...style
    });
    return button;
}

function processPage() {
    if (!currentConfig) return;
    const allTurnContainers = document.querySelectorAll(currentConfig.turnContainerSelector);
    for (const turnElement of allTurnContainers) {
        if (turnElement.dataset.memoriaProcessed === "true") continue;
        const isAssistantTurn = currentConfig.assistantMessageIdentifier ? turnElement.querySelector(currentConfig.assistantMessageIdentifier) : true;
        if (!isAssistantTurn) {
            turnElement.dataset.memoriaProcessed = "true";
            continue;
        }
        turnElement.dataset.memoriaProcessed = "true";
        const buttonGroup = turnElement.querySelector(currentConfig.buttonGroupSelector);
        if (buttonGroup) {
            const saveButton = createSaveButton(currentConfig.buttonStyle);
            saveButton.addEventListener("click", (e) => {
                e.stopPropagation();
                const contentElement = turnElement.querySelector(currentConfig.messageContentSelector);
                if (contentElement) {
                    const messageText = contentElement.textContent.trim();
                    chrome.runtime.sendMessage({ type: "SAVE_MEMORY", payload: { content: messageText } });
                    saveButton.innerHTML = "✅ Saved!";
                    saveButton.disabled = true;
                    saveButton.style.backgroundColor = "#00A86B";
                    saveButton.style.cursor = "default";
                }
            });
            buttonGroup.prepend(saveButton);
        }
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "PASTE_TEXT") {
        const textToPaste = message.payload.text;
        const inputBox = document.querySelector(currentConfig.inputBoxSelector);
        if (inputBox) {
            inputBox.value = textToPaste;
            inputBox.dispatchEvent(new Event('input', { bubbles: true }));
            inputBox.focus();
            sendResponse({ status: "success" });
        } else {
            console.error("[Memoria] Could not find the input box with selector:", currentConfig.inputBoxSelector);
            sendResponse({ status: "error", message: "Input box not found." });
        }
    }
    return true;
});

// --- Main Execution ---
if (currentConfig) {
    console.log(`[Memoria] Polling started for ${window.location.hostname}.`);
    setInterval(processPage, 1500);
}