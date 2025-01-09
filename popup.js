let cssEditorVisible = false;

// Load saved CSS and settings when popup opens
document.addEventListener('DOMContentLoaded', async () => {
  const editor = document.getElementById('cssEditor');
  const cssControls = document.getElementById('cssControls');
  const cssToggle = document.getElementById('cssToggle');
  
  // Load saved CSS and enabled state
  const { savedCSS = '', cssEnabled = true } = await chrome.storage.local.get(['savedCSS', 'cssEnabled']);
  
  editor.value = savedCSS;
  cssToggle.checked = cssEnabled;
  
  // Show controls if we have CSS
  if (savedCSS) {
    cssEditorVisible = true;
    editor.style.display = 'block';
    cssControls.style.display = 'flex';
  }
});

document.getElementById('cssButton').addEventListener('click', () => {
  const editor = document.getElementById('cssEditor');
  const cssControls = document.getElementById('cssControls');
  cssEditorVisible = !cssEditorVisible;
  editor.style.display = cssEditorVisible ? 'block' : 'none';
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

document.getElementById('action2').addEventListener('click', () => {
  console.log('Action 2 clicked');
}); 