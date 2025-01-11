// Listen for tab updates
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    // Get saved CSS and enabled state
    const { savedCSS = '', cssEnabled = true } = await chrome.storage.local.get(['savedCSS', 'cssEnabled']);
    if (savedCSS && cssEnabled) {
      // Inject the saved CSS
      await chrome.scripting.executeScript({
        target: { tabId },
        function: injectCSS,
        args: [savedCSS]
      });
    }
  }
});

// Function to inject CSS
function injectCSS(css) {
  let styleElement = document.getElementById('web-forge-css');
  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = 'web-forge-css';
    document.head.appendChild(styleElement);
  }
  styleElement.textContent = css;
  return true;
}

// Handle extension reload message
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'reload') {
    chrome.runtime.reload();
  }
});

// Listen for navigation events to clear cache if needed
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId === 0) { // Only handle main frame navigation
    const hostname = new URL(details.url).hostname;
    const { cacheDisabled = {} } = await chrome.storage.local.get('cacheDisabled');
    
    if (cacheDisabled[hostname]) {
      await chrome.browsingData.removeCache({
        origins: [details.url]
      });
    }
  }
}); 