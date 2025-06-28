/**
 * Memoria - Content Script (with Event Dispatching)
 *
 * This version adds the crucial step of dispatching an 'input' event after
 * pasting text, which makes modern web frameworks recognize the change.
 */

console.log("%cMemoria Content Script Loaded ", "color: #1DB954; font-weight: bold;");

const SITE_CONFIGS = {
  "grok.com": {
    turnContainerSelector: 'div.group.flex-col.items-start',
    messageContentSelector: 'div.response-content-markdown',
    buttonGroupSelector: 'div.action-buttons',
    // More robust selector using aria-label
    inputBoxSelector: 'textarea[aria-label="Ask Grok anything"]', 
    buttonStyle: { backgroundColor: "#5E5CE6", color: "white", padding: "4px 12px", fontSize: "14px" }
  },
  "aistudio.google.com": {
    turnContainerSelector: 'ms-chat-turn.ng-star-inserted',
    assistantMessageIdentifier: '[data-turn-role="Model"]',
    messageContentSelector: 'ms-cmark-node',
    buttonGroupSelector: 'div.turn-footer',
    inputBoxSelector: 'textarea[placeholder*="Start typing"]',
    buttonStyle: { backgroundColor: "#1a73e8", color: "white", padding: "8px 12px", fontSize: "13px" }
  }
};
const currentConfig = SITE_CONFIGS[window.location.hostname];

function createSaveButton(style) {
    // ... (This function is unchanged)
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

// --- UPDATED Message Listener ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "PASTE_TEXT") {
        const textToPaste = message.payload.text;
        const inputBox = document.querySelector(currentConfig.inputBoxSelector);

        if (inputBox) {
            // 1. Set the value
            inputBox.value = textToPaste;
            
            // 2. CRUCIAL: Dispatch an 'input' event to notify the framework
            const event = new Event('input', { bubbles: true });
            inputBox.dispatchEvent(event);

            // 3. Optional: Focus the input box for better UX
            inputBox.focus();

            sendResponse({ status: "success" });
        } else {
            console.error("[Memoria] Could not find the input box with selector:", currentConfig.inputBoxSelector);
            sendResponse({ status: "error", message: "Input box not found." });
        }
    }
    // Keep the message channel open for the asynchronous response
    return true;
});


// --- Main Execution ---
if (currentConfig) {
    console.log(`[Memoria] Polling started for ${window.location.hostname}.`);
    setInterval(processPage, 1500);
}