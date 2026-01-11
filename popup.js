let isShown = false;
const toggleBtn = document.getElementById("toggleBtn");

// Function to update button text and state
const updateButton = (show) => {
  isShown = show;
  toggleBtn.textContent = isShown ? "Hide Passwords" : "Show Passwords";
};

// When the popup loads, get the current state from the content script
document.addEventListener("DOMContentLoaded", async () => {
  // Get the active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Disable the button on special pages where content scripts can't run
  if (tab && tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('https://chrome.google.com/'))) {
    toggleBtn.disabled = true;
    toggleBtn.textContent = "N/A on this page";
    return;
  }

  try {
    // Send a message to the content script to get the current state
    const response = await chrome.tabs.sendMessage(tab.id, { action: "GET_STATE" });
    if (response) {
      updateButton(response.isShown);
    }
  } catch (e) {
    // This catches the "Could not establish connection" error if the content script isn't loaded
    console.warn("Content script not ready or on a restricted page. Defaulting to 'hidden'. Error:", e.message);
    updateButton(false);
  }
});

// When the button is clicked, send the toggle message
toggleBtn.addEventListener("click", async () => {
  if (toggleBtn.disabled) return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Send the message and optimistically update the UI
  chrome.tabs.sendMessage(tab.id, {
    action: "TOGGLE_PASSWORDS",
    show: !isShown
  });
  updateButton(!isShown);
});
