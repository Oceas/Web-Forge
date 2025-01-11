const devices = [
  { name: 'Mobile Portrait (375×667)', width: 375, height: 667 },
  { name: 'Tablet Portrait (768×1024)', width: 768, height: 1024 },
  { name: 'Desktop (1280×800)', width: 1280, height: 800 }
];

// Get the URL to preview from the query parameter
const urlToPreview = new URLSearchParams(window.location.search).get('url');

if (urlToPreview) {
  const deviceGrid = document.querySelector('.device-grid');
  
  devices.forEach(device => {
    const deviceFrame = document.createElement('div');
    deviceFrame.className = 'device-frame';
    
    deviceFrame.innerHTML = `
      <div class="device-header">
        <span class="device-name">${device.name}</span>
        <span class="device-dims">${device.width} × ${device.height}</span>
      </div>
      <div class="preview-container" style="width: ${device.width}px;">
        <iframe 
          src="${urlToPreview}" 
          title="${device.name}"
          width="${device.width}"
          height="${device.height}"
          loading="lazy"
        ></iframe>
      </div>
    `;
    
    deviceGrid.appendChild(deviceFrame);
  });
} 