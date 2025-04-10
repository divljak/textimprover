const { app, BrowserWindow, globalShortcut, clipboard, screen, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
require('dotenv').config(); // Load environment variables from .env file
// const OpenAI = require('openai'); // Remove OpenAI requirement
// const { paraphraseText, correctGrammarText } = require('./hf-service.js'); // Import BOTH functions
const { improveText } = require('./hf-service.js'); // Import the single improvement function

// Constants
const POPOVER_WIDTH = 300;
const MIN_POPOVER_HEIGHT = 120; // Must match renderer's MIN_HEIGHT
const MAX_POPOVER_HEIGHT = 400; // Must match renderer's MAX_HEIGHT

// Global variables
let mainWindow; // Main application window (currently unused)
let popoverWindow = null; // Reference to the popover window
let lastSelectedText = ''; // Stores text from clipboard on shortcut press
let tray = null; // Reference to the system tray icon

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

// Remove mainWindow creation or comment it out if needed later
/*
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
*/

// --- Popover Window Creation & Management --- 
function createPopoverWindow() {
  closePopoverWindow(); // Close existing popover first

  const { x, y } = screen.getCursorScreenPoint();
  const popoverWidth = POPOVER_WIDTH; // Use constant
  const popoverHeight = MIN_POPOVER_HEIGHT; // Use constant

  popoverWindow = new BrowserWindow({
    width: popoverWidth,
    height: popoverHeight,
    minHeight: MIN_POPOVER_HEIGHT, // Set min/max if supported/desired
    maxHeight: MAX_POPOVER_HEIGHT,
    x: Math.round(x - popoverWidth / 2), // Centered below cursor
    y: y + 10,                     
    frame: false, // Frameless window
    transparent: true, // Allows for rounded corners via CSS
    alwaysOnTop: true, // Keep popover above other windows
    resizable: false,
    movable: true, 
    focusable: true, // Allow interaction
    skipTaskbar: true, // Don't show in taskbar/Dock
    show: false, // Initially hidden until content is ready
    webPreferences: {
      preload: path.join(__dirname, 'popover-preload.js'), // Secure way to expose Node APIs to renderer
      contextIsolation: true, // Recommended security setting
      nodeIntegration: false, // Recommended security setting
    }
  });

  popoverWindow.loadFile('popover.html');

  popoverWindow.once('ready-to-show', () => {
    if (popoverWindow && !popoverWindow.isDestroyed()) {
        popoverWindow.show(); 
    }
  });

  // Close if it loses focus (optional, maybe keep it open?)
  popoverWindow.on('blur', () => {
      closePopoverWindow();
  });

  popoverWindow.on('closed', () => {
    popoverWindow = null;
  });
}

function closePopoverWindow() {
    if (popoverWindow && !popoverWindow.isDestroyed()) {
        popoverWindow.close();
    }
    popoverWindow = null;
}
// --- End Popover Window --- 

// --- Text Improvement Logic --- 
// Fetches improved text from the API service
async function handleImproveTextRequest(textToImprove) {
  console.log("Handling improvement request for:", textToImprove);
  let result = { success: false, improvedText: null }; // Define result object

  if (!textToImprove) {
    console.warn("No text provided for improvement.");
    result.improvedText = "No text provided."; // Provide feedback
    return result; 
  }

  try {
    console.log("Sending text to Hugging Face API for general improvement...");
    const improved = await improveText(textToImprove); // Get text from service

    if (improved && !improved.startsWith("Model is loading") && !improved.startsWith("Improvement service")) {
      console.log("Improved text received:", improved);
      result.success = true;
      result.improvedText = improved;
      // DO NOT WRITE TO CLIPBOARD HERE
      // clipboard.writeText(improvedText);
      // console.log("Improved text copied to clipboard. Manual paste needed for now.");
    } else if (improved) { // Handle info messages from API call
      console.warn("Improvement service message:", improved);
      result.success = false; // Treat info message as non-success for replacement
      result.improvedText = improved;
      // DO NOT WRITE TO CLIPBOARD HERE
    } else {
      console.error("Hugging Face service did not return improved text (likely an API error).");
      result.improvedText = "Error: Could not get improvement from API.";
      result.success = false;
      // DO NOT WRITE TO CLIPBOARD HERE
    }
  } catch (error) {
    console.error("Error during text improvement process:", error);
    result.improvedText = `Error: Improvement failed (${error.message || 'Unknown error'})`;
    result.success = false;
    // DO NOT WRITE TO CLIPBOARD HERE
  }
  return result; // Return the result object
}
// --- End Text Improvement Logic ---

// --- App Initialization --- 
app.whenReady().then(() => {
  // Create the main window (optional, currently disabled)
  // createWindow();

  // Hide the Dock icon (important for menu bar apps)
  if (process.platform === 'darwin') { // Only hide dock on macOS
      app.dock.hide();
  }

  // Create System Tray icon
  // Use a macOS template image for a standard look
  // Or provide path.join(__dirname, 'assets/iconTemplate.png') for custom icon
  // tray = new Tray(path.join(__dirname, 'iconTemplate.png')); // REMOVE THIS PROBLEMATIC LINE
  // On macOS, template images are automatically handled
  if (process.platform === 'darwin') {
    tray = new Tray(nativeImage.createFromNamedImage('NSImageNameActionTemplate'));
  } else {
    // Provide a path for other platforms or fallback
    // For now, let's assume a simple icon exists or use a placeholder
    // This needs refinement for cross-platform
    const iconPath = path.join(__dirname, 'assets/icon_16x16.png'); // Example path
    // Check if file exists before creating tray if needed
    try {
        tray = new Tray(iconPath);
    } catch (e) {
        console.error("Failed to create tray icon from path:", e);
        // Handle error: maybe quit, maybe use default behavior
        tray = new Tray(nativeImage.createEmpty()); // Create empty placeholder
    }
  }

  // Create context menu for the Tray icon
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Quit Text Improver',
      click: () => {
        app.quit(); // Quit the application
      }
    }
    // Add other menu items here later if needed (e.g., Settings)
  ]);

  tray.setToolTip('Text Improver');
  tray.setContextMenu(contextMenu);

  // Register Global Shortcut (Cmd+Shift+I)
  const ret = globalShortcut.register('CommandOrControl+Shift+I', async () => {
    console.log('CommandOrControl+Shift+I is pressed');
    lastSelectedText = clipboard.readText(); 
    console.log('Clipboard text stored:', lastSelectedText);

    if (lastSelectedText) {
      // 1. Show popover (starts loading)
      createPopoverWindow();
      // 2. Run the improvement request
      const result = await handleImproveTextRequest(lastSelectedText);
      // 3. Send the result to the popover (if it still exists)
      if (popoverWindow && !popoverWindow.isDestroyed()) {
          popoverWindow.webContents.send('suggestion-result', result);
      } else {
          console.log('Popover window closed before sending initial result.');
      }
    } else {
      // Close popover if shortcut pressed with no text
      closePopoverWindow(); 
    }
  });

  if (!ret) {
    console.log('Global shortcut registration failed');
  }
  console.log('Is Cmd+Shift+I registered?', globalShortcut.isRegistered('CommandOrControl+Shift+I'));

  // Remove activate handler if mainWindow is removed
  /*
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
  */
});
// --- End App Initialization ---

// --- IPC Handlers (Communication from Popover) ---

// Handles 'Done'/'Copy' button click from popover
ipcMain.on('accept-suggestion', (event, text) => {
    console.log('Main received: accept-suggestion with text:', text);
    if(text && !text.startsWith("Error:") && !text.startsWith("Failed to")) {
        clipboard.writeText(text); // Write the ACCEPTED text to clipboard
    } else {
        console.warn('Accept called with error/empty text, clipboard not updated.');
    }
    closePopoverWindow(); // Close after accepting
});

// Handles 'Regenerate' button click from popover
ipcMain.on('regenerate-suggestion', async () => {
    console.log('Main received: regenerate-suggestion');
    const originalText = lastSelectedText;
    if (!originalText) {
        console.warn('No original text stored for regeneration.');
        closePopoverWindow();
        return;
    }

    // Re-run improvement logic
    if (popoverWindow && !popoverWindow.isDestroyed()) {
        console.log('Calling handleImproveTextRequest for regeneration:', originalText);
        const result = await handleImproveTextRequest(originalText);
        
        // Send new result (ensure window still exists)
        if (popoverWindow && !popoverWindow.isDestroyed()) {
            popoverWindow.webContents.send('suggestion-result', result);
        } else {
            console.log('Popover window closed before sending regeneration result.');
        }
    } else {
        console.log('Popover window not ready for regeneration result.');
    }
});

// Handles close request (e.g., from explicit close button if added, or internal logic)
ipcMain.on('close-popover', () => {
    console.log('Main received: close-popover');
    closePopoverWindow();
});

// Handles resize request from popover renderer
ipcMain.on('request-popover-resize', (event, height) => {
  if (popoverWindow && !popoverWindow.isDestroyed() && height > 0) {
    // Ensure height respects bounds defined in constants
    const clampedHeight = Math.max(MIN_POPOVER_HEIGHT, Math.min(height, MAX_POPOVER_HEIGHT));
    const currentBounds = popoverWindow.getBounds();
    console.log(`Resizing popover to height: ${clampedHeight}`); // Log clamped height
    popoverWindow.setBounds({ 
        width: currentBounds.width, 
        height: clampedHeight // Use clamped height
    });
  }
});

// --- End IPC Handlers ---

// --- App Lifecycle Event Handlers ---

// Controls app behavior when all windows are closed
app.on('window-all-closed', function () {
  // In a menu bar app, we usually DON'T quit when all windows are closed
  // The app lives in the tray. Only quit via the tray menu or Cmd+Q.
  // So, we can comment this out or make it conditional.
  // if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  closePopoverWindow(); // Ensure popover is closed on quit
  // Destroy the tray icon
  if (tray && !tray.isDestroyed()) {
    tray.destroy();
  }
});
// --- End App Lifecycle ---

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here. 

// Need to define MIN_HEIGHT globally or pass it around
// const MIN_HEIGHT = 120; // Define minimum height (should match renderer) 