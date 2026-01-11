chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle request for current state
  if (message.action === "GET_STATE") {
    const isAnyPasswordVisible = !!document.querySelector("input[data-original-type='password']");
    sendResponse({ isShown: isAnyPasswordVisible });
    return true; // Keep the message channel open for the asynchronous response
  }

  // Handle the toggle action
  if (message.action === "TOGGLE_PASSWORDS") {
    const inputs = document.querySelectorAll("input[type='password'], input[data-original-type='password']");

    inputs.forEach(input => {
      if (message.show) {
        // Show the password
        if (input.type === "password") {
          input.dataset.originalType = "password";
          input.type = "text";
        }
      } else {
        // Hide the password
        if (input.dataset.originalType === "password") {
          input.type = "password";
          // We can leave the data attribute for future toggles, or remove it.
          // Let's remove it to be clean.
          delete input.dataset.originalType;
        }
      }
    });
  }
});