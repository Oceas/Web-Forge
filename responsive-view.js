// This script will be injected into the responsive preview page
function createResponsiveViews(url) {
  const devices = [
    { name: 'Mobile Portrait (375×667)', width: 375, height: 667 },
    { name: 'Tablet Portrait (768×1024)', width: 768, height: 1024 },
    { name: 'Desktop (1280×800)', width: 1280, height: 800 }
  ];

  const container = document.createElement('div');
  container.className = 'device-grid';
  document.body.appendChild(container);

  devices.forEach(device => {
    const wrapper = document.createElement('div');
    wrapper.className = 'device-frame';
    wrapper.innerHTML = `
      <div class="device-header">
        <span class="device-name">${device.name}</span>
        <span class="device-dims">${device.width} × ${device.height}</span>
      </div>
      <div class="preview-container">
        <webview 
          src="${url}"
          style="width: ${device.width}px; height: ${device.height}px;"
          partition="responsive"
        ></webview>
      </div>
    `;
    container.appendChild(wrapper);
  });
} 