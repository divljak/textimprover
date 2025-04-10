// popover-preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Send messages TO main process
  acceptSuggestion: (text) => ipcRenderer.send('accept-suggestion', text),
  regenerateSuggestion: () => ipcRenderer.send('regenerate-suggestion'),
  closePopover: () => ipcRenderer.send('close-popover'),
  requestResize: (height) => ipcRenderer.send('request-popover-resize', height),

  // Receive messages FROM main process
  onSuggestionResult: (callback) => ipcRenderer.on('suggestion-result', (_event, result) => callback(result))
}); 