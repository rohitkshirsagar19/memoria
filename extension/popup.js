document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const resultsContainer = document.getElementById('resultsContainer');

    const performSearch = () => {
        const query = searchInput.value;
        if (!query) return;

        resultsContainer.innerHTML = '<p class="loading">Searching...</p>';

        chrome.runtime.sendMessage({ type: "SEARCH_MEMORY", payload: { query: query } }, (response) => {
            resultsContainer.innerHTML = '';
            if (chrome.runtime.lastError || response.status !== 'success') {
                console.error("Search failed:", response?.message || chrome.runtime.lastError?.message);
                resultsContainer.innerHTML = '<p class="result-item">An error occurred.</p>';
                return;
            }

            const results = response.data.results;
            if (results && results.length > 0) {
                results.forEach(doc => {
                    const resultItem = document.createElement('div');
                    resultItem.className = 'result-item';
                    resultItem.textContent = doc;
                    
                    // NEW: Add click-to-paste functionality
                    resultItem.addEventListener('click', () => {
                        // Find the current active tab
                        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                            if (tabs[0]) {
                                // Send a message directly to that tab's content script
                                chrome.tabs.sendMessage(tabs[0].id, {
                                    type: "PASTE_TEXT",
                                    payload: { text: doc }
                                }, (response) => {
                                    if (chrome.runtime.lastError) {
                                        console.error("Paste command failed:", chrome.runtime.lastError.message);
                                    } else {
                                        console.log("Paste successful.");
                                    }
                                });
                                // Close the popup after clicking
                                window.close(); 
                            }
                        });
                    });

                    resultsContainer.appendChild(resultItem);
                });
            } else {
                resultsContainer.innerHTML = '<p class="placeholder">No memories found.</p>';
            }
        });
    };

    searchButton.addEventListener('click', performSearch);
    searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') performSearch();
    });
    searchInput.focus();
});