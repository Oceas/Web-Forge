let previewPane = null;

function createPreviewPane() {
  previewPane = document.createElement('div');
  previewPane.id = 'colorPreviewPane';
  previewPane.style.cssText = `
    position: fixed;
    padding: 8px;
    background: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    pointer-events: none;
    z-index: 999999;
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: monospace;
    font-size: 12px;
  `;
  document.body.appendChild(previewPane);
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

function parseColor(color) {
  const div = document.createElement('div');
  div.style.color = color;
  document.body.appendChild(div);
  const computed = window.getComputedStyle(div).color;
  document.body.removeChild(div);
  
  const match = computed.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (match) {
    return rgbToHex(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]));
  }
  return color;
}

function handleColorPickerMove(e) {
  const color = window.getComputedStyle(e.target).backgroundColor;
  const hexColor = parseColor(color);
  
  if (!previewPane) {
    createPreviewPane();
  }
  
  previewPane.innerHTML = `
    <div style="width: 20px; height: 20px; background-color: ${color}; border: 1px solid #ccc; border-radius: 2px;"></div>
    <span>${hexColor}</span>
  `;
  
  previewPane.style.left = `${e.pageX + 20}px`;
  previewPane.style.top = `${e.pageY + 20}px`;
}

function toggleColorPicker(enabled) {
  if (enabled) {
    document.addEventListener('mousemove', handleColorPickerMove);
    document.addEventListener('click', handleColorPick);
    document.body.style.cursor = 'crosshair';
  } else {
    document.removeEventListener('mousemove', handleColorPickerMove);
    document.removeEventListener('click', handleColorPick);
    document.body.style.cursor = '';
    if (previewPane) {
      previewPane.remove();
      previewPane = null;
    }
  }
}

function handleColorPick(e) {
  e.preventDefault();
  const color = window.getComputedStyle(e.target).backgroundColor;
  const hexColor = parseColor(color);
  
  chrome.runtime.sendMessage({
    type: 'colorPicked',
    color: hexColor
  });
  
  toggleColorPicker(false);
}
