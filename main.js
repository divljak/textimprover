const { app, BrowserWindow, globalShortcut, clipboard, screen, ipcMain, Notification } = require('electron');
const path = require('path');
require('dotenv').config(); // Load environment variables from .env file
// const OpenAI = require('openai'); // Remove OpenAI requirement
// const { paraphraseText, correctGrammarText } = require('./hf-service.js'); // Import BOTH functions
const { improveText } = require('./hf-service.js'); // Import the single improvement function

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let floatingWindow = null; // Re-introduce floating window variable, initialize to null

// --- OpenAI Setup --- 
// let openai; // Remove OpenAI variable
// try {
//   if (!process.env.OPENAI_API_KEY) {
//     throw new Error("OPENAI_API_KEY not found in environment variables. Please set it in a .env file.");
//   }
//   openai = new OpenAI({
//     apiKey: process.env.OPENAI_API_KEY,
//   });
//   console.log("OpenAI client initialized successfully.");
// } catch (error) {
//   console.error("Failed to initialize OpenAI client:", error.message);
//   // Optionally: Exit the app or disable the feature if API key is missing
//   // app.quit(); 
// }
// --- End OpenAI Setup --- // Remove entire OpenAI setup block

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js') // Use a preload script if needed later
    }
  });

  // and load the index.html of the app.
  mainWindow.loadFile('index.html');

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();

  // Handle window closed
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
}

// --- Floating Indicator Window --- 
function createFloatingIndicator() {
  // Close any existing indicator
  if (floatingWindow) {
    floatingWindow.close();
    floatingWindow = null;
  }

  const { x, y } = screen.getCursorScreenPoint();
  const windowSize = 50; // Size of the floating indicator

  floatingWindow = new BrowserWindow({
    width: windowSize,
    height: windowSize,
    x: Math.round(x - windowSize / 2), // Centered horizontally
    y: y + 10,                      // Slightly below cursor
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    movable: false,
    focusable: false, // Prevent indicator from taking focus
    skipTaskbar: true, // Don't show in taskbar
    show: false, // Don't show until ready
    webPreferences: {
      preload: path.join(__dirname, 'preload-floating.js'), // Use the (minimal) preload
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  floatingWindow.loadFile('floating.html');

  // Show when ready, but without activating/focusing it
  floatingWindow.once('ready-to-show', () => {
    if (floatingWindow && !floatingWindow.isDestroyed()) {
        floatingWindow.showInactive(); 
    }
  });

  // Ensure it's cleaned up if closed manually or unexpectedly
  floatingWindow.on('closed', () => {
    floatingWindow = null;
  });
}

function closeFloatingIndicator() {
    if (floatingWindow && !floatingWindow.isDestroyed()) {
        floatingWindow.close();
    }
    floatingWindow = null;
}
// --- End Floating Indicator Window --- 

// --- Refactored Text Improvement Logic ---
// Moved core logic here to be callable from shortcut or potential future button IPC
async function handleImproveTextRequest(textToImprove) {
  console.log("Handling improvement request for:", textToImprove);

  if (!textToImprove) {
    console.warn("No text provided for improvement.");
    return false;
  }

  let success = false;

  try {
    console.log("Sending text to Hugging Face API for general improvement...");
    const improvedText = await improveText(textToImprove);

    if (improvedText && !improvedText.startsWith("Model is loading") && !improvedText.startsWith("Improvement service")) {
      console.log("Improved text received:", improvedText);
      clipboard.writeText(improvedText);
      console.log("Improved text copied to clipboard. Manual paste needed for now.");
      success = true;
    } else if (improvedText) {
      console.warn("Improvement service message:", improvedText);
      clipboard.writeText(`Info: ${improvedText}`);
      success = true; // Consider this a soft success
    } else {
      console.error("Hugging Face service did not return improved text (likely an API error).");
      clipboard.writeText("Error: Could not get improvement from API.");
      success = false;
    }
  } catch (error) {
    console.error("Error during text improvement process:", error);
    clipboard.writeText(`Error: Improvement process failed (${error.message || 'Unknown error'})`);
    success = false;
  }

  return success;
}
// --- End Refactored Logic ---

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  // Register a global shortcut listener.
  const ret = globalShortcut.register('CommandOrControl+Shift+I', async () => {
    console.log('CommandOrControl+Shift+I is pressed');
    const selectedText = clipboard.readText();
    console.log('Clipboard text:', selectedText);

    if (selectedText) {
      // Show indicator *before* starting the async work
      createFloatingIndicator(); 
      try {
          // Call the refactored improvement logic directly
          await handleImproveTextRequest(selectedText);
      } finally {
          // Close indicator *after* the work is done (success or fail)
          closeFloatingIndicator();
      }
    } else {
      console.log('No text on clipboard to improve.');
      // Optionally close any dangling indicator if shortcut pressed with no text
      closeFloatingIndicator(); 
    }
  });

  if (!ret) {
    console.log('Global shortcut registration failed');
  }

  // Check if the shortcut is registered.
  console.log('Is Cmd+Shift+I registered?', globalShortcut.isRegistered('CommandOrControl+Shift+I'));

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Remove the old ipcMain handler for 'improve-text' as it's now handled directly
// or refactored into handleImproveTextRequest
/*
ipcMain.handle('improve-text', async (event, textToImprove) => {
  // ... old handler code removed ...
  // Call the refactored function if you want to keep an IPC mechanism for a button
  // return await handleImproveTextRequest(textToImprove);
});
*/

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  // Unregister all shortcuts.
  globalShortcut.unregisterAll();
  // Ensure floating indicator is closed on quit
  closeFloatingIndicator(); 
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here. 