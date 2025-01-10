let cssEditorVisible = false;
let overridesVisible = false;
let mediaLibraryVisible = false;

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
    const overridesPanel = document.getElementById('overridesPanel');
    const copyButton = document.getElementById('copyButton');

    mediaLibraryVisible = !mediaLibraryVisible;
    cssEditorVisible = false;
    overridesVisible = false;

    // Toggle panels
    mediaPanel.style.display = mediaLibraryVisible ? 'block' : 'none';
    editor.style.display = 'none';
    copyButton.style.display = 'none';
    cssControls.style.display = 'none';
    overridesPanel.style.display = 'none';

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

// Rest of your existing handlers (cache toggle, CSS editor, etc.)
 