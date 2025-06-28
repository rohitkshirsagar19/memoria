/**
 * Memoria - Content Script (v12 - Correct Multi-Site Implementation)
 *
 * This version corrects previous errors and uses robust, two-step selectors
 * for both Grok and Google AI Studio, powered by the reliable polling method.
 */

console.log("%cMemoria Content Script Loaded (v12 - Final Multi-Site).", "color: #1DB954; font-weight: bold;");

// --- Configuration for All Supported Sites ---
const SITE_CONFIGS = {
  
  // --- Grok Configuration ---
  "grok.com": {
    // A general container for any message turn.
    turnContainerSelector: 'div.group.flex-col', 
    // A specific selector inside the turn that ONLY exists for AI messages.
    assistantMessageIdentifier: 'div.response-content-markdown',
    // Where to grab the text from.
    messageContentSelector: 'div.response-content-markdown',
    // Where to inject the button.
    buttonGroupSelector: 'div.action-buttons',
    buttonStyle: {
        backgroundColor: "#5E5CE6", // Grok-like purple
        color: "white",
        padding: "4px 12px",
        fontSize: "14px",
    }
  },
  
  // --- Google AI Studio Configuration ---
  "aistudio.google.com": {
    // A general container for any message turn.
    turnContainerSelector: 'ms-chat-turn',
    // A specific selector inside the turn that ONLY exists for AI messages.
    assistantMessageIdentifier: '[data-turn-role="Model"]',
    // Where to grab the text from.
    messageContentSelector: 'ms-cmark-node',
    // Where to inject the button.
    buttonGroupSelector: 'div.turn-footer',
    buttonStyle: {
        backgroundColor: "#1a73e8", // Google Blue
        color: "white",
        padding: "8px 12px",
        fontSize: "13px",
    }
  }
};

const currentConfig = SITE_CONFIGS[window.location.hostname];

// --- Core Functions ---

function createSaveButton(style) {
    const button = document.createElement("button");
    button.innerHTML = "💾 Save Memory";
    button.title = "Save this response to Memoria";
    
    // Apply styles from config
    Object.assign(button.style, {
        border: "none",
        borderRadius: "8px",
        fontWeight: "500",
        marginLeft: "8px",
        cursor: "pointer",
        transition: "background-color 0.2s",
        ...style // Site-specific styles
    });

    return button;
}

function processPage() {
  if (!currentConfig) return;

  const allTurnContainers = document.querySelectorAll(currentConfig.turnContainerSelector);
  
  for (const turnElement of allTurnContainers) {
    if (turnElement.dataset.memoriaProcessed === "true") {
      continue;
    }

    // Check if this turn is an AI message by looking for the identifier.
    const isAssistantTurn = turnElement.querySelector(currentConfig.assistantMessageIdentifier);
    
    if (!isAssistantTurn) {
        // Mark non-AI turns so we don't check them again.
        turnElement.dataset.memoriaProcessed = "true";
        continue;
    }

    // This is an AI turn, so we mark it and proceed.
    turnElement.dataset.memoriaProcessed = "true";
    console.log(`[Memoria] Found new AI message turn on ${window.location.hostname}:`, turnElement);

    const buttonGroup = turnElement.querySelector(currentConfig.buttonGroupSelector);
    if (buttonGroup) {
      console.log("%c[Memoria] Found action buttons, injecting...", "color: green;");
      const saveButton = createSaveButton(currentConfig.buttonStyle);

      saveButton.addEventListener("click", (e) => {
        e.stopPropagation();
        const contentElement = turnElement.querySelector(currentConfig.messageContentSelector);
        if (contentElement) {
          const messageText = contentElement.textContent.trim();
          console.log("Saving to memory:", messageText);
          
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

// --- Main Execution ---
if (currentConfig) {
    console.log(`[Memoria] Polling started for ${window.location.hostname}.`);
    setInterval(processPage, 1000);
}