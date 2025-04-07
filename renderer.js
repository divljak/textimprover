// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// We'll add our UI logic here later.

console.log('Renderer process starting.');

window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded and parsed.');

  let improveButton = null;

  document.addEventListener('mouseup', (event) => {
    console.log('Mouseup event detected.');
    const selectedText = window.getSelection().toString().trim();
    console.log('Selected text:', `"${selectedText}"`);

    // Remove existing button if any
    if (improveButton) {
      console.log('Removing existing button.');
      improveButton.remove();
      improveButton = null;
    }

    if (selectedText) {
      console.log('Selected text is not empty, creating button.');
      // Create the button
      improveButton = document.createElement('button');
      improveButton.textContent = 'Improve ✨';
      improveButton.style.position = 'absolute';
      improveButton.style.zIndex = '1000'; // Ensure button is on top
      improveButton.id = 'improve-text-button'; // Add an ID for potential styling/testing

      // Position the button near the selection
      const range = window.getSelection().getRangeAt(0);
      const rect = range.getBoundingClientRect();
      // Adjust position calculation to account for potential scroll
      improveButton.style.left = `${rect.right + window.scrollX + 5}px`; // 5px offset to the right
      improveButton.style.top = `${rect.top + window.scrollY}px`;

      // Add click listener
      improveButton.addEventListener('click', () => {
        console.log('Improve button clicked for:', selectedText);
        // Send selected text to main process for improvement via preload script
        if (window.electronAPI && typeof window.electronAPI.sendImproveTextRequest === 'function') {
            window.electronAPI.sendImproveTextRequest(selectedText);
        } else {
            console.error('electronAPI.sendImproveTextRequest is not available!');
        }
        // Remove button after click
        if (improveButton) {
          improveButton.remove();
          improveButton = null;
        }
      });

      document.body.appendChild(improveButton);
      console.log('Improve button appended to body.');
    } else {
      console.log('No text selected.');
    }
  });

  // Listener to remove button if user clicks elsewhere without selecting
  document.addEventListener('mousedown', (event) => {
      // Check if the click is outside the button
      if (improveButton && event.target !== improveButton) {
          const selection = window.getSelection();
          // Check if the target of the mousedown is inside the current selection range
          let clickedInsideSelection = false;
          if (!selection.isCollapsed) {
              const range = selection.getRangeAt(0);
              // Check if event coordinates are within any of the range's client rects
              const rects = range.getClientRects();
              for (let i = 0; i < rects.length; i++) {
                  if (event.clientX >= rects[i].left && event.clientX <= rects[i].right &&
                      event.clientY >= rects[i].top && event.clientY <= rects[i].bottom) {
                      clickedInsideSelection = true;
                      break;
                  }
              }
          }

          // If the click is outside the button AND outside the selected text area
          if (!clickedInsideSelection) {
              console.log('Mousedown detected outside button and selection, removing button.');
              improveButton.remove();
              improveButton = null;
          }
      }
  });

  console.log('Event listeners attached.'); // Added log
}); 