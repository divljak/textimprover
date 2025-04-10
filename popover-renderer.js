// popover-renderer.js

const loadingStateDiv = document.getElementById('loading-state');
const suggestionStateDiv = document.getElementById('suggestion-state');
const suggestedTextP = document.getElementById('suggested-text');
const regenerateButton = document.getElementById('regenerate-button');
const copyButton = document.getElementById('copy-button');
const popoverBody = document.querySelector('.popover-body#suggestion-state');
const popoverFooter = document.querySelector('.popover-footer');

let currentSuggestion = '';
const MAX_HEIGHT = 400; // Max height for the popover
const MIN_HEIGHT = 120; // Min height

// Listen for results from the main process
window.electronAPI.onSuggestionResult((result) => {
  console.log('Received suggestion result:', result);
  currentSuggestion = result.improved || 'Error processing text.';
  suggestedTextP.textContent = currentSuggestion;

  // Switch view
  loadingStateDiv.style.display = 'none';
  suggestionStateDiv.style.display = 'block';

  // Calculate and request resize *after* content is set and displayed
  requestAnimationFrame(() => { // Ensure styles are applied before measuring
    const bodyStyle = window.getComputedStyle(popoverBody);
    const footerStyle = window.getComputedStyle(popoverFooter);
    
    const bodyPadding = parseInt(bodyStyle.paddingTop) + parseInt(bodyStyle.paddingBottom);
    const footerHeight = popoverFooter.offsetHeight + parseInt(footerStyle.marginTop) + parseInt(footerStyle.marginBottom);
    const textHeight = suggestedTextP.scrollHeight; // Get the scroll height of the text paragraph
    
    let desiredHeight = textHeight + bodyPadding + footerHeight + 1; // +1 for border/rounding safety
    
    // Clamp height between min and max
    desiredHeight = Math.max(MIN_HEIGHT, Math.min(desiredHeight, MAX_HEIGHT));
    
    console.log(`Requesting resize to height: ${Math.round(desiredHeight)}`);
    window.electronAPI.requestResize(Math.round(desiredHeight));
  });
});

// Handle button clicks
regenerateButton.addEventListener('click', () => {
  console.log('Regenerate clicked');
  // Show loading state again
  loadingStateDiv.style.display = 'flex'; // Use flex if that's how it's centered
  suggestionStateDiv.style.display = 'none';
  // Tell main process to regenerate
  window.electronAPI.regenerateSuggestion();
});

copyButton.addEventListener('click', () => {
  console.log('Copy button clicked');
  if (currentSuggestion && !currentSuggestion.startsWith("Error")) {
    window.electronAPI.acceptSuggestion(currentSuggestion);
    // Add visual feedback? e.g., change text to "Copied!"
    copyButton.innerHTML = 'Copied!';
    setTimeout(() => {
        // Restore button content with the NEW icon
        copyButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
            </svg>
            Copy`; 
    }, 1500);
  }
  // Main process will handle closing the popover after accepting
}); 