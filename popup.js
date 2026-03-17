let isShown = false;
let countdownInterval;
const toggleBtn = document.getElementById("toggleBtn");
const quickPeekBtn = document.getElementById("quickPeekBtn");
const timerInput = document.getElementById("timer");

const generateBtn = document.getElementById("generateBtn");
const genPasswordInput = document.getElementById("genPassword");

const updateButton = (show) => {
  isShown = show;
  toggleBtn.textContent = isShown ? "Hide Passwords" : "Show Passwords";
};

const startCountdown = (endTime) => {
  timerInput.disabled = true;
  quickPeekBtn.disabled = true;
  countdownInterval = setInterval(() => {
    const remaining = Math.round((endTime - Date.now()) / 1000);
    if (remaining >= 0) {
      timerInput.value = remaining;
    } else {
      stopCountdown();
    }
  }, 1000);
};

const stopCountdown = async () => {
  clearInterval(countdownInterval);
  timerInput.disabled = false;
  quickPeekBtn.disabled = false;
  const { timerValue = 20 } = await chrome.storage.local.get("timerValue");
  timerInput.value = timerValue;
  updateButton(false);
};

function generatePassword(length = 16) {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let retVal = "";
    for (let i = 0; i < length; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return retVal;
}

document.addEventListener("DOMContentLoaded", async () => {
  const { timerValue = 20, activeEndTime } = await chrome.storage.local.get(["timerValue", "activeEndTime"]);
  timerInput.value = timerValue;

  if (activeEndTime && activeEndTime > Date.now()) {
    startCountdown(activeEndTime);
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('https://chrome.google.com/'))) {
    toggleBtn.disabled = true;
    quickPeekBtn.disabled = true;
    timerInput.disabled = true;
    toggleBtn.textContent = "N/A on this page";
    return;
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { action: "GET_STATE" });
    if (response) {
      updateButton(response.isShown);
    }
  } catch (e) {
    updateButton(false);
  }
});

toggleBtn.addEventListener("click", async () => {
  if (toggleBtn.disabled) return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const duration = parseInt(timerInput.value, 10) * 1000;
  
  chrome.tabs.sendMessage(tab.id, {
    action: "TOGGLE_PASSWORDS",
    show: !isShown,
    duration: !isShown ? duration : undefined,
  });
  updateButton(!isShown);
});

quickPeekBtn.addEventListener("click", async () => {
    if (quickPeekBtn.disabled) return;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, {
        action: "TOGGLE_PASSWORDS",
        show: true,
        duration: 5000
    });
    updateButton(true);
});

timerInput.addEventListener("change", () => {
  if (!countdownInterval) {
    chrome.storage.local.set({ timerValue: timerInput.value });
  }
});

generateBtn.addEventListener("click", () => {
    const password = generatePassword();
    genPasswordInput.value = password;
    navigator.clipboard.writeText(password).then(() => {
        const originalText = generateBtn.textContent;
        generateBtn.textContent = "Copied!";
        generateBtn.style.backgroundColor = "#28a745";
        setTimeout(() => {
            generateBtn.textContent = originalText;
            generateBtn.style.backgroundColor = "";
        }, 1000);
    });
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "TIMER_STARTED") {
    chrome.storage.local.set({ activeEndTime: message.endTime });
    startCountdown(message.endTime);
  } else if (message.action === "TIMER_ENDED") {
    chrome.storage.local.remove("activeEndTime");
    stopCountdown();
  }
});