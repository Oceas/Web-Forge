let cssEditorVisible = false;
let overridesVisible = false;

const webDevTips = [
  "Use 'console.table()' to display array data in a readable format",
  "The 'rem' unit is relative to the root element's font size",
  "CSS 'gap' property works in Flexbox too, not just Grid",
  "'prefers-color-scheme' media query detects system dark mode",
  "Use CSS ':focus-visible' for better keyboard navigation styling",
  "'console.time()' and 'console.timeEnd()' measure code execution",
  "The ':empty' selector targets elements with no children",
  "'object-fit: cover' maintains aspect ratio like background-size",
  "Use 'aspect-ratio' property for responsive media containers",
  "'display: grid; place-items: center;' for perfect centering"
];

// Load saved CSS and settings when popup opens
document.addEventListener('DOMContentLoaded', async () => {
  const editor = document.getElementById('cssEditor');
  const cssControls = document.getElementById('cssControls');
  const cssToggle = document.getElementById('cssToggle');
  const copyButton = document.getElementById('copyButton');
  
  // Load saved CSS and enabled state
  const { savedCSS = '', cssEnabled = true } = await chrome.storage.local.get(['savedCSS', 'cssEnabled']);
  
  editor.value = savedCSS;
  cssToggle.checked = cssEnabled;
  
  // Show controls if we have CSS
  if (savedCSS) {
    cssEditorVisible = true;
    editor.style.display = 'block';
    copyButton.style.display = 'block';
    cssControls.style.display = 'flex';
  }

  // Load cache settings
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const hostname = new URL(tab.url).hostname;
  const { cacheDisabled = {} } = await chrome.storage.local.get('cacheDisabled');
  document.getElementById('cacheToggle').checked = cacheDisabled[hostname] || false;

  // Set daily tip
  const today = new Date().getDate();
  const tipIndex = today % webDevTips.length;
  document.getElementById('dailyTip').textContent = webDevTips[tipIndex];
});

document.getElementById('cssButton').addEventListener('click', () => {
  const editor = document.getElementById('cssEditor');
  const cssControls = document.getElementById('cssControls');
  const copyButton = document.getElementById('copyButton');
  cssEditorVisible = !cssEditorVisible;
  editor.style.display = cssEditorVisible ? 'block' : 'none';
  copyButton.style.display = cssEditorVisible ? 'block' : 'none';
  cssControls.style.display = cssEditorVisible ? 'flex' : 'none';
});

document.getElementById('cssEditor').addEventListener('input', async (e) => {
  const css = e.target.value;
  
  try {
    // Save CSS to storage
    await chrome.storage.local.set({ savedCSS: css });
    
    // Only inject if enabled
    const { cssEnabled = true } = await chrome.storage.local.get('cssEnabled');
    if (cssEnabled) {
      // Get the current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Inject the CSS using executeScript
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: injectCSS,
        args: [css]
      });
    }
  } catch (error) {
    console.error('Failed to inject CSS:', error);
  }
});

// Handle clear button
document.getElementById('clearCss').addEventListener('click', async () => {
  const editor = document.getElementById('cssEditor');
  editor.value = '';
  await chrome.storage.local.set({ savedCSS: '' });
  
  // Clear CSS from current page
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: injectCSS,
    args: ['']
  });
});

// Handle toggle switch
document.getElementById('cssToggle').addEventListener('change', async (e) => {
  const enabled = e.target.checked;
  await chrome.storage.local.set({ cssEnabled: enabled });
  
  // Get the current active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // Get saved CSS
  const { savedCSS = '' } = await chrome.storage.local.get('savedCSS');
  
  // Inject or clear CSS based on toggle state
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: injectCSS,
    args: [enabled ? savedCSS : '']
  });
});

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

// Add copy button handler
document.getElementById('copyButton').addEventListener('click', async () => {
  const editor = document.getElementById('cssEditor');
  try {
    await navigator.clipboard.writeText(editor.value);
    const copyButton = document.getElementById('copyButton');
    const originalHTML = copyButton.innerHTML;
    
    // Change to checkmark icon
    copyButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    `;
    
    setTimeout(() => {
      copyButton.innerHTML = originalHTML;
    }, 1000);
  } catch (err) {
    console.error('Failed to copy text: ', err);
  }
});

// Handle panel switching
document.getElementById('overridesButton').addEventListener('click', () => {
  const overridesPanel = document.getElementById('overridesPanel');
  const editor = document.getElementById('cssEditor');
  const cssControls = document.getElementById('cssControls');
  const copyButton = document.getElementById('copyButton');

  overridesVisible = !overridesVisible;
  cssEditorVisible = false;

  // Toggle panels
  overridesPanel.style.display = overridesVisible ? 'block' : 'none';
  editor.style.display = 'none';
  copyButton.style.display = 'none';
  cssControls.style.display = 'none';
});

// Handle cache toggle
document.getElementById('cacheToggle').addEventListener('change', async (e) => {
  const enabled = e.target.checked;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const hostname = new URL(tab.url).hostname;

  // Save setting
  const { cacheDisabled = {} } = await chrome.storage.local.get('cacheDisabled');
  cacheDisabled[hostname] = enabled;
  await chrome.storage.local.set({ cacheDisabled });

  if (enabled) {
    // Clear cache for this site
    await chrome.browsingData.removeCache({
      origins: [tab.url]
    });
  }
});

// Handle inspector toggle
document.getElementById('inspectorToggle').addEventListener('change', async (e) => {
  const enabled = e.target.checked;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (enabled) {
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      css: `
        .web-tools-hover {
          outline: 2px solid #4F46E5 !important;
          outline-offset: 2px !important;
        }
      `
    });
  }

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: toggleInspector,
    args: [enabled]
  });
});
 