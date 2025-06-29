console.log("Memoria Background Script Loaded (v3).");

const API_URL = "https://rohitkshirsagar19-memoria-api.hf.space";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SAVE_MEMORY") {
    console.log("[Background Script] Received data to save:", message.payload);
    
    fetch(`${API_URL}/save_memory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message.payload),
    })
    .then(response => response.json().then(data => ({ok: response.ok, data})))
    .then(({ok, data}) => {
      if (!ok) throw new Error(data.detail || 'Server error');
      console.log("[Background Script] Success response from server:", data);
      sendResponse({ status: "success", data: data });
    })
    .catch(error => {
      console.error("[Background Script] Error sending save request:", error);
      sendResponse({ status: "error", message: error.toString() });
    });

    return true; // Keep message channel open for async response
  
  } else if (message.type === "SEARCH_MEMORY") { // NEW: Handle search messages
    console.log("[Background Script] Received query to search:", message.payload);
    
    fetch(`${API_URL}/search_memory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message.payload),
    })
    .then(response => response.json().then(data => ({ok: response.ok, data})))
    .then(({ok, data}) => {
        if (!ok) throw new Error(data.detail || 'Server error');
        console.log("[Background Script] Search results from server:", data);
        sendResponse({ status: "success", data: data });
    })
    .catch(error => {
        console.error("[Background Script] Error sending search request:", error);
        sendResponse({ status: "error", message: error.toString() });
    });
    
    return true; // Keep message channel open for async response
  }
});