console.log('Floating renderer loaded.');

// Get the text area element
const textArea = document.getElementById('improved-text-area');

// Listen for the improved text sent from the main process
window.electronAPI.onDisplayImprovedText((improvedText) => {
  console.log('Received improved text in floating window:', improvedText);
  if (textArea) {
    textArea.value = improvedText; // Display the text in the text area
  }
});

// --- Remove old button logic ---
/*
let currentText = '';

// Listen for the text sent from the main process
window.electronAPI.onSetText((text) => {
  console.log('Received text in floating window:', text);
  currentText = text;
});

const improveButton = document.getElementById('improve-button');

improveButton.addEventListener('click', async () => {
  console.log('Improve button clicked. Sending text:', currentText);
  if (currentText) {
    try {
      // Disable button while processing
      improveButton.disabled = true;
      improveButton.textContent = '...'; // Indicate loading
      
      const success = await window.electronAPI.improveText(currentText);
      console.log('Text improvement requested. Success:', success);
      // Window will be closed by main process on success/completion
    } catch (error) {
      console.error('Error sending text for improvement:', error);
      // Re-enable button on error maybe?
      improveButton.disabled = false;
      improveButton.textContent = '✨'; 
      // Optionally close the window even on error, or show an error state
      // window.close(); // Example: closing on error too
    }
  } else {
    console.log('No text stored to improve.');
    // Optionally close the window if there's no text
    // window.close();
  }
});
*/
// --- End Remove old button logic --- 