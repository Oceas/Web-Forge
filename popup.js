let cssEditorVisible = false;
let mediaLibraryVisible = false;
let isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
let responsiveVisible = false;

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
  
  // Load saved CSS and enabled state (default enabled to true)
  const { savedCSS = '', cssEnabled = true } = await chrome.storage.local.get(['savedCSS', 'cssEnabled']);
  
  editor.value = savedCSS;
  cssToggle.checked = true;
  
  // Save the enabled state as true
  await chrome.storage.local.set({ cssEnabled: true });
  
  // Show controls if we have CSS
  if (savedCSS) {
    cssEditorVisible = true;
    editor.style.display = 'block';
    copyButton.style.display = 'block';
    cssControls.style.display = 'flex';
  }

  // Set daily tip
  const today = new Date().getDate();
  const tipIndex = today % webDevTips.length;
  document.getElementById('dailyTip').textContent = webDevTips[tipIndex];

  // Load theme preference with system default
  const { themeOverride } = await chrome.storage.local.get('themeOverride');
  if (themeOverride !== undefined) {
    isDarkMode = themeOverride;
  } else {
    // Use system preference as default
    isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  await chrome.storage.local.set({ themeOverride: isDarkMode });
  updateTheme();
});

// CSS Button handler
document.getElementById('cssButton').addEventListener('click', () => {
  const editor = document.getElementById('cssEditor');
  const cssControls = document.getElementById('cssControls');
  const copyButton = document.getElementById('copyButton');
  cssEditorVisible = !cssEditorVisible;
  editor.style.display = cssEditorVisible ? 'block' : 'none';
  copyButton.style.display = cssEditorVisible ? 'block' : 'none';
  cssControls.style.display = cssEditorVisible ? 'flex' : 'none';
});

// Media Library handler
document.getElementById('mediaButton').addEventListener('click', async () => {
  try {
    const mediaPanel = document.getElementById('mediaPanel');
    const editor = document.getElementById('cssEditor');
    const cssControls = document.getElementById('cssControls');
    const copyButton = document.getElementById('copyButton');

    mediaLibraryVisible = !mediaLibraryVisible;
    cssEditorVisible = false;

    // Toggle panels
    mediaPanel.style.display = mediaLibraryVisible ? 'block' : 'none';
    editor.style.display = 'none';
    copyButton.style.display = 'none';
    cssControls.style.display = 'none';

    if (mediaLibraryVisible) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          // Get all images from img tags
          const imgTags = Array.from(document.querySelectorAll('img'))
            .filter(img => img.src)
            .map(img => img.src);
          
          // Get all background images
          const bgImages = Array.from(document.querySelectorAll('*'))
            .map(el => window.getComputedStyle(el).backgroundImage)
            .filter(bg => bg.includes('url('))
            .map(bg => bg.match(/url\(['"]?(.*?)['"]?\)/)[1]);
          
          return [...new Set([...imgTags, ...bgImages])];
        }
      });

      if (results && results[0]?.result) {
        const images = results[0].result;
        const mediaGrid = document.querySelector('.media-grid');
        
        if (images.length === 0) {
          mediaGrid.style.display = 'none';
          document.getElementById('noMedia').style.display = 'block';
        } else {
          mediaGrid.style.display = 'grid';
          document.getElementById('noMedia').style.display = 'none';
          
          mediaGrid.innerHTML = images.map((url, index) => `
            <div class="media-item">
              <img src="${url}" alt="Media ${index + 1}" loading="lazy">
              <button class="download-button" data-url="${url}" title="Download image">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              </button>
            </div>
          `).join('');

          // Add download handlers with improved error handling
          document.querySelectorAll('.download-button').forEach(button => {
            button.addEventListener('click', async (e) => {
              e.preventDefault();
              e.stopPropagation();
              
              const url = button.dataset.url;
              try {
                // Create a temporary anchor element
                const a = document.createElement('a');
                a.href = url;
                a.download = url.split('/').pop().split('#')[0].split('?')[0] || 'image.png'; // Fallback filename
                a.target = '_blank';
                
                // Trigger the download
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                
                // Visual feedback
                const originalHTML = button.innerHTML;
                button.innerHTML = `
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                `;
                
                setTimeout(() => {
                  button.innerHTML = originalHTML;
                }, 1000);
                
              } catch (error) {
                console.error('Download failed:', error);
                button.style.backgroundColor = '#fee2e2';
                setTimeout(() => {
                  button.style.backgroundColor = '';
                }, 1000);
              }
            });
          });
        }
      }
    }
  } catch (error) {
    console.error('Media Library error:', error);
  }
});

// CSS Editor input handler
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

// Handle CSS toggle switch
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

// CSS injection function
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

// Rest of your existing handlers (cache toggle, CSS editor, etc.)

// Add these new functions
function updateTheme() {
  if (isDarkMode) {
    document.body.classList.add('dark-theme');
    document.getElementById('themeToggle').innerHTML = `
      <svg class="theme-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
      </svg>
    `;
  } else {
    document.body.classList.remove('dark-theme');
    document.getElementById('themeToggle').innerHTML = `
      <svg class="theme-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
      </svg>
    `;
  }
}

// Add theme toggle handler
document.getElementById('themeToggle').addEventListener('click', async () => {
  isDarkMode = !isDarkMode;
  await chrome.storage.local.set({ themeOverride: isDarkMode });
  updateTheme();
  console.log('Theme toggled:', isDarkMode ? 'dark' : 'light'); // Debug log
});

// Add theme change listener
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', async (e) => {
  const { themeOverride } = await chrome.storage.local.get('themeOverride');
  if (themeOverride === undefined) {
    isDarkMode = e.matches;
    await chrome.storage.local.set({ themeOverride: isDarkMode });
    updateTheme();
  }
});

// Update the Responsive button handler
document.getElementById('responsiveButton').addEventListener('click', () => {
  const responsivePanel = document.getElementById('responsivePanel');
  const editor = document.getElementById('cssEditor');
  const cssControls = document.getElementById('cssControls');
  const overridesPanel = document.getElementById('overridesPanel');
  const mediaPanel = document.getElementById('mediaPanel');
  const copyButton = document.getElementById('copyButton');

  responsiveVisible = !responsiveVisible;
  cssEditorVisible = false;
  overridesVisible = false;
  mediaLibraryVisible = false;

  // Toggle panels
  responsivePanel.style.display = responsiveVisible ? 'block' : 'none';
  editor.style.display = 'none';
  copyButton.style.display = 'none';
  cssControls.style.display = 'none';
  overridesPanel.style.display = 'none';
  mediaPanel.style.display = 'none';
});

// Update the device button handlers
document.querySelectorAll('.device-button').forEach(button => {
  button.addEventListener('click', async () => {
    try {
      const width = parseInt(button.dataset.width);
      const height = parseInt(button.dataset.height);
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (width === 0) {
        // For reset button, open in full size
        await chrome.windows.create({
          url: tab.url,
          state: 'maximized'
        });
      } else {
        // Add some padding for window chrome
        const windowPadding = {
          width: 16,
          height: 88  // Account for title bar and window chrome
        };

        await chrome.windows.create({
          url: tab.url,
          width: width + windowPadding.width,
          height: height + windowPadding.height,
          type: 'popup',
          focused: true
        });
      }

      // Close the popup
      window.close();
    } catch (error) {
      console.error('Failed to open responsive view:', error);
    }
  });
});

// Updated function to handle responsive mode
function setResponsiveMode(width, height) {
  // Handle reset case
  if (width === '0' && height === '0') {
    // Reset viewport
    let viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.content = 'width=device-width, initial-scale=1.0';
    }
    // Reset any custom styles
    document.documentElement.style.width = '';
    document.documentElement.style.height = '';
    document.body.style.width = '';
    document.body.style.height = '';
    document.body.style.transform = '';
    return;
  }

  // Set viewport for mobile view
  let viewport = document.querySelector('meta[name="viewport"]');
  if (!viewport) {
    viewport = document.createElement('meta');
    viewport.name = 'viewport';
    document.head.appendChild(viewport);
  }
  
  // Force the viewport width and disable user scaling
  viewport.content = `width=${width}, height=${height}, initial-scale=1.0, maximum-scale=1.0, user-scalable=no`;

  // Add necessary styles to simulate device size
  const style = document.createElement('style');
  style.textContent = `
    html {
      width: ${width}px !important;
      height: ${height}px !important;
      overflow-x: hidden !important;
    }
    body {
      width: ${width}px !important;
      min-width: ${width}px !important;
      max-width: ${width}px !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow-x: hidden !important;
    }
  `;
  document.head.appendChild(style);

  // Force layout recalculation
  document.documentElement.style.transform = 'scale(1)';
  document.body.style.transform = 'scale(1)';
}

// Update the responsive button handler
document.getElementById('openResponsiveView').addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Inject the responsive viewer into the current page
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: injectResponsiveViewer,
      args: [tab.url]
    });

    // Inject the styles
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      css: `
        .responsive-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.75);
          z-index: 999999;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .responsive-viewer {
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          position: relative;
          width: 90vw;
          height: 90vh;
          display: flex;
        }

        .responsive-frame {
          flex: 1;
          padding: 20px;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .responsive-frame iframe {
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          transition: all 0.3s ease;
        }

        .device-controls {
          position: absolute;
          top: 20px;
          right: 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          background: white;
          padding: 8px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .device-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .device-button:hover {
          background: #f8fafc;
          transform: translateY(-1px);
        }

        .device-button svg {
          width: 20px;
          height: 20px;
          color: #4f46e5;
        }

        .device-button.active {
          background: #4f46e5;
        }

        .device-button.active svg {
          color: white;
        }

        .close-button {
          position: absolute;
          top: 20px;
          left: 20px;
          background: none;
          border: none;
          color: #1e293b;
          cursor: pointer;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          padding: 0;
        }

        .close-button svg {
          width: 24px;
          height: 24px;
        }

        .close-button:hover {
          background: #f1f5f9;
        }

        .rotate-90 {
          transform: rotate(90deg);
        }
      `
    });

    window.close();
  } catch (error) {
    console.error('Failed to inject responsive viewer:', error);
  }
});

function injectResponsiveViewer(pageUrl) {
  // Create the viewer container
  const overlay = document.createElement('div');
  overlay.className = 'responsive-overlay';
  
  overlay.innerHTML = `
    <div class="responsive-viewer">
      <button class="close-button" title="Close">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <div class="responsive-frame">
        <iframe src="${pageUrl}"></iframe>
      </div>
      <div class="device-controls">
        <button class="device-button" data-width="375" data-height="667" title="Mobile Portrait">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
          </svg>
        </button>
        <button class="device-button" data-width="667" data-height="375" title="Mobile Landscape">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="rotate-90">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
          </svg>
        </button>
        <button class="device-button" data-width="768" data-height="1024" title="Tablet Portrait">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5h3m-6.75 2.25h10.5a2.25 2.25 0 002.25-2.25v-15a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 4.5v15a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </button>
        <button class="device-button" data-width="1024" data-height="768" title="Tablet Landscape">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="rotate-90">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5h3m-6.75 2.25h10.5a2.25 2.25 0 002.25-2.25v-15a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 4.5v15a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </button>
        <button class="device-button" data-width="1280" data-height="800" title="Desktop">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
          </svg>
        </button>
      </div>
    </div>
  `;

  // Add to page
  document.body.appendChild(overlay);

  // Get elements
  const frame = overlay.querySelector('iframe');
  const closeButton = overlay.querySelector('.close-button');

  // Set initial size
  frame.style.width = '100%';
  frame.style.height = '100%';

  // Handle device buttons
  overlay.querySelectorAll('.device-button').forEach(button => {
    button.addEventListener('click', () => {
      const width = button.dataset.width;
      const height = button.dataset.height;
      
      frame.style.width = width + 'px';
      frame.style.height = height + 'px';

      // Update active state
      overlay.querySelectorAll('.device-button').forEach(btn => 
        btn.classList.remove('active')
      );
      button.classList.add('active');
    });
  });

  // Handle close button
  closeButton.addEventListener('click', () => {
    overlay.remove();
  });

  // Handle click outside to close
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  });
}

// Add copy button handler
document.getElementById('copyButton').addEventListener('click', async () => {
  const cssEditor = document.getElementById('cssEditor');
  const copyButton = document.getElementById('copyButton');
  
  try {
    await navigator.clipboard.writeText(cssEditor.value);
    
    // Visual feedback
    const originalHTML = copyButton.innerHTML;
    copyButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    `;
    
    // Reset after 1 second
    setTimeout(() => {
      copyButton.innerHTML = originalHTML;
    }, 1000);
    
  } catch (err) {
    console.error('Failed to copy text: ', err);
    
    // Error feedback
    copyButton.style.backgroundColor = '#fee2e2';
    setTimeout(() => {
      copyButton.style.backgroundColor = '';
    }, 1000);
  }
});
 