// popover-preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Send messages TO main process
  acceptSuggestion: (text) => ipcRenderer.send('accept-suggestion', text),
  regenerateSuggestion: () => ipcRenderer.send('regenerate-suggestion'),
  closePopover: () => ipcRenderer.send('close-popover'),
  requestResize: (height) => ipcRenderer.send('request-popover-resize', height),

  // Receive messages FROM main process
  onSuggestionResult: (callback) => {
    // Expecting a single string argument now
    const listener = (_event, textString) => callback(textString);
    ipcRenderer.on('suggestion-result', listener);
    
    // Return a function to remove the listener for cleanup (optional but good practice)
    return () => ipcRenderer.removeListener('suggestion-result', listener);
  }
}); 