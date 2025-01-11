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

chrome.webRequest.onHeadersReceived.addListener(
  function(details) {
    const headers = details.responseHeaders.filter(header => 
      !['x-frame-options', 'content-security-policy'].includes(header.name.toLowerCase())
    );
    
    return { responseHeaders: headers };
  },
  {
    urls: ['<all_urls>'],
    types: ['sub_frame']
  },
  ['blocking', 'responseHeaders', 'extraHeaders']
);

// Add to your existing background.js
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === 'toggleDeviceMode') {
    try {
      // Toggle device mode using Chrome DevTools Protocol
      await chrome.debugger.attach({ tabId: request.tabId }, '1.3');
      
      // Enable device mode
      await chrome.debugger.sendCommand(
        { tabId: request.tabId },
        'Emulation.setDeviceMetricsOverride',
        {
          width: request.width || 0,
          height: request.height || 0,
          deviceScaleFactor: 1,
          mobile: request.width < 1024,
          screenOrientation: request.height > request.width ? 
            { angle: 0, type: 'portraitPrimary' } : 
            { angle: 90, type: 'landscapePrimary' }
        }
      );

      // Show device toolbar
      await chrome.debugger.sendCommand(
        { tabId: request.tabId },
        'Emulation.setShowDeviceFrame',
        { show: true }
      );

    } catch (error) {
      console.error('Failed to toggle device mode:', error);
    }
  }
});

// Handle debugger detach
chrome.debugger.onDetach.addListener((source) => {
  console.log('Debugger detached:', source);
});

// Add to your existing background.js
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    try {
      // Re-attach debugger if it was previously attached
      await chrome.debugger.attach({ tabId }, '1.3');
    } catch (error) {
      // Ignore errors if debugger wasn't attached
    }
  }
});

// Clean up debugger when tab closes
chrome.tabs.onRemoved.addListener(async (tabId) => {
  try {
    await chrome.debugger.detach({ tabId });
  } catch (error) {
    // Ignore errors if debugger wasn't attached
  }
});

// Add to background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openDevTools') {
    chrome.tabs.update(request.tabId, { url: `chrome://inspect/#devices` });
  }
}); 