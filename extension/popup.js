/**
 * Memoria - Popup Script (popup.js)
 *
 * This script handles the user interaction within the extension's popup.
 * It takes the user's search query, sends it to the background script,
 * and displays the results.
 */

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const resultsContainer = document.getElementById('resultsContainer');

    const performSearch = () => {
        const query = searchInput.value;
        if (!query) {
            // Don't search if the input is empty
            return;
        }

        // 1. Show a loading state to the user
        resultsContainer.innerHTML = '<p class="loading">Searching...</p>';

        // 2. Send a message to the background script to perform the search
        chrome.runtime.sendMessage({ type: "SEARCH_MEMORY", payload: { query: query } }, (response) => {
            // 4. This callback function handles the response from the background script
            
            // Clear the loading message
            resultsContainer.innerHTML = '';

            if (chrome.runtime.lastError) {
                console.error("Error communicating with background script:", chrome.runtime.lastError.message);
                resultsContainer.innerHTML = '<p class="result-item">Error: Could not connect to the service.</p>';
                return;
            }
            
            if (response && response.status === 'success' && response.data.results) {
                const results = response.data.results;
                if (results.length > 0) {
                    // If we have results, create and append an element for each one
                    results.forEach(doc => {
                        const resultItem = document.createElement('div');
                        resultItem.className = 'result-item';
                        resultItem.textContent = doc; // Using textContent is safer than innerHTML
                        resultsContainer.appendChild(resultItem);
                    });
                } else {
                    // If the search returned no results
                    resultsContainer.innerHTML = '<p class="placeholder">No memories found matching your query.</p>';
                }
            } else {
                // Handle cases where the response is not what we expect or an error occurred
                console.error("Received an error or invalid response from backend:", response);
                resultsContainer.innerHTML = '<p class="result-item">An error occurred while searching.</p>';
            }
        });
    };

    // 3. Add event listeners for the search action
    searchButton.addEventListener('click', performSearch);

    // Also allow searching by pressing "Enter" in the input field
    searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            performSearch();
        }
    });

    // Automatically focus the search input when the popup opens
    searchInput.focus();
});