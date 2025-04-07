const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Expose the send method for sending requests to the main process
  sendImproveTextRequest: (text) => ipcRenderer.send('improve-text-request', text)
});

console.log('Preload script for main window loaded.'); 