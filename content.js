let hideTimer;

const EYE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="cursor: pointer; opacity: 0.6; transition: opacity 0.2s;">
  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
  <circle cx="12" cy="12" r="3"></circle>
</svg>
`;

const VISUAL_INDICATOR_STYLE = "outline: 2px solid #007bff !important; outline-offset: -2px !important;";

function injectEyeIcon(input) {
  if (input.dataset.unhidyInjected) return;
  input.dataset.unhidyInjected = "true";

  const wrapper = document.createElement('div');
  wrapper.style.position = 'relative';
  wrapper.style.display = 'inline-block';
  wrapper.style.width = input.offsetWidth + 'px';
  wrapper.style.height = input.offsetHeight + 'px';
  
  // Try to mimic the input's display and margin
  const style = window.getComputedStyle(input);
  wrapper.style.margin = style.margin;
  wrapper.style.verticalAlign = style.verticalAlign;
  wrapper.style.flex = style.flex;

  input.parentNode.insertBefore(wrapper, input);
  wrapper.appendChild(input);

  const iconContainer = document.createElement('div');
  iconContainer.innerHTML = EYE_SVG;
  iconContainer.style.position = 'absolute';
  iconContainer.style.right = '8px';
  iconContainer.style.top = '50%';
  iconContainer.style.transform = 'translateY(-50%)';
  iconContainer.style.zIndex = '1000';
  iconContainer.style.display = 'flex';
  iconContainer.style.alignItems = 'center';
  iconContainer.title = "Toggle Visibility";

  iconContainer.addEventListener('mouseenter', () => iconContainer.firstElementChild.style.opacity = '1');
  iconContainer.addEventListener('mouseleave', () => iconContainer.firstElementChild.style.opacity = '0.6');

  iconContainer.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    if (!isPassword) {
        input.style.cssText = input.style.cssText.replace(VISUAL_INDICATOR_STYLE, "");
    } else {
        input.style.cssText += VISUAL_INDICATOR_STYLE;
    }
  });

  wrapper.appendChild(iconContainer);
}

function initialize() {
  const inputs = document.querySelectorAll("input[type='password']");
  inputs.forEach(injectEyeIcon);
}

// Watch for dynamic password fields
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === 1) {
        if (node.tagName === 'INPUT' && node.type === 'password') {
          injectEyeIcon(node);
        } else {
          node.querySelectorAll("input[type='password']").forEach(injectEyeIcon);
        }
      }
    });
  });
});

observer.observe(document.body, { childList: true, subtree: true });
initialize();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "GET_STATE") {
    const isAnyPasswordVisible = !!document.querySelector("input[data-original-type='password']") || 
                                 Array.from(document.querySelectorAll("input")).some(i => i.dataset.unhidyInjected && i.type === 'text');
    sendResponse({ isShown: isAnyPasswordVisible });
    return true;
  }

  if (message.action === "TOGGLE_PASSWORDS") {
    const inputs = document.querySelectorAll("input[type='password'], input[data-original-type='password']");

    if (!message.show) {
      clearTimeout(hideTimer);
      chrome.runtime.sendMessage({ action: "TIMER_ENDED" });
    }

    inputs.forEach(input => {
      if (message.show) {
        if (input.type === "password") {
          input.dataset.originalType = "password";
          input.type = "text";
          input.style.cssText += VISUAL_INDICATOR_STYLE;
        }
      } else {
        if (input.dataset.originalType === "password") {
          input.type = "password";
          delete input.dataset.originalType;
          input.style.cssText = input.style.cssText.replace(VISUAL_INDICATOR_STYLE, "");
        }
      }
    });

    if (message.show && message.duration) {
      const endTime = Date.now() + message.duration;
      chrome.runtime.sendMessage({ action: "TIMER_STARTED", endTime: endTime });

      hideTimer = setTimeout(() => {
        const currentlyVisibleInputs = document.querySelectorAll("input[data-original-type='password']");
        currentlyVisibleInputs.forEach(input => {
          input.type = "password";
          delete input.dataset.originalType;
          input.style.cssText = input.style.cssText.replace(VISUAL_INDICATOR_STYLE, "");
        });
        chrome.runtime.sendMessage({ action: "TIMER_ENDED" });
      }, message.duration);
    }
  }
});