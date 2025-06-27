/**
 * Memoria - Content Script (v10 - Grok Final)
 *
 * This script targets grok.com. It uses a reliable polling method
 * to find AI message containers and injects the "Save" button into the action bar.
 */

console.log("%cMemoria Content Script Loaded (v10 - Grok).", "color: #4B0082; font-weight: bold;");

// --- Configuration for grok.com ---
const SITE_CONFIG = {
  "grok.com": {
    // This selector finds the container for an AI response turn.
    // The `items-start` class differentiates it from the user's `items-end` turn.
    turnContainerSelector: 'div.group.flex-col.items-start',

    // This selector finds the AI-generated text content within the turn.
    messageContentSelector: 'div.response-content-markdown',

    // This selector finds the container for the action buttons (Copy, Like, Dislike).
    buttonGroupSelector: 'div.action-buttons'
  }
};
const currentConfig = SITE_CONFIG[window.location.hostname];

// --- Core Functions ---

function createSaveButton() {
  const button = document.createElement("button");
  // Using a class for styling is better practice. We'll add a CSS file later.
  // For now, let's keep it simple with inline styles for quick prototyping.
  button.innerHTML = "💾 Save to Memory";
  button.title = "Save this response to Memoria";
  button.style.backgroundColor = "#5E5CE6"; // Grok-like purple
  button.style.color = "white";
  button.style.border = "1px solid rgba(255, 255, 255, 0.2)";
  button.style.borderRadius = "9999px"; // Pill shape
  button.style.padding = "4px 12px";
  button.style.fontSize = "14px";
  button.style.fontWeight = "500";
  button.style.marginLeft = "8px"; // Add some space from other buttons
  button.style.cursor = "pointer";
  button.style.transition = "background-color 0.2s";

  button.onmouseover = () => button.style.backgroundColor = "#4c4ad8";
  button.onmouseout = () => button.style.backgroundColor = "#5E5CE6";

  return button;
}

function processPage() {
  if (!currentConfig) return;

  const allTurnContainers = document.querySelectorAll(currentConfig.turnContainerSelector);
  
  for (const turnElement of allTurnContainers) {
    if (turnElement.dataset.memoriaProcessed === "true") {
      continue;
    }
    turnElement.dataset.memoriaProcessed = "true";
    console.log("[Memoria] Found new AI message turn:", turnElement);

    const buttonGroup = turnElement.querySelector(currentConfig.buttonGroupSelector);
    if (buttonGroup) {
      console.log("%c[Memoria] Found action buttons, injecting...", "color: green;");
      const saveButton = createSaveButton();

      saveButton.addEventListener("click", (e) => {
        e.stopPropagation();
        const contentElement = turnElement.querySelector(currentConfig.messageContentSelector);
        if (contentElement) {
          const messageText = contentElement.textContent.trim();
          console.log("Saving to memory:", messageText);
          
          chrome.runtime.sendMessage({ type: "SAVE_MEMORY", payload: { content: messageText } });

          saveButton.textContent = "✅ Saved!";
          saveButton.disabled = true;
          saveButton.style.backgroundColor = "#00A86B"; // Green on success
          saveButton.style.cursor = "default";
          saveButton.onmouseover = null;
          saveButton.onmouseout = null;
        }
      });
      // Add our button to the start of the button group
      buttonGroup.prepend(saveButton);
    }
  }
}

// --- Main Execution ---
if (currentConfig) {
    console.log("[Memoria] Polling started for grok.com.");
    setInterval(processPage, 1000); // Check for new messages every second
}