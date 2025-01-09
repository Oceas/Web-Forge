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
  let styleElement = document.getElementById('web-tools-css');
  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = 'web-tools-css';
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