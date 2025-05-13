const whitelistBtn = document.getElementById('whitelistBtn');
const arrowSpan = whitelistBtn.querySelector('.arrow');
const originalArrow = arrowSpan.innerHTML;

const confirmDialog = document.getElementById('confirmDialog');
const confirmYes = document.getElementById('confirmYes');
const confirmNo = document.getElementById('confirmNo');

// Add a counter element below the button if not present
let counter = document.getElementById('progressCounter');
if (!counter) {
  counter = document.createElement('div');
  counter.id = 'progressCounter';
  counter.style.fontSize = '12px';
  counter.style.marginTop = '6px';
  counter.style.textAlign = 'center';
  whitelistBtn.parentNode.appendChild(counter);
}
counter.textContent = '';

function setLoading(isLoading) {
  if (isLoading) {
    arrowSpan.innerHTML = `<img src="img/loading.gif" alt="Loading" style="height:18px;width:18px;vertical-align:middle;">`;
    whitelistBtn.disabled = true;
  } else {
    arrowSpan.innerHTML = originalArrow;
    whitelistBtn.disabled = false;
  }
}

function setCounter(text) {
  counter.textContent = text || '';
}

function setError(msg) {
  setLoading(false);
  setCounter('');
  counter.textContent = msg;
  counter.style.color = 'red';
}

whitelistBtn.addEventListener('click', () => {
  // Show confirmation dialog instead of starting immediately
  whitelistBtn.style.display = 'none';
  confirmDialog.style.display = 'block';
  setCounter('');
  counter.style.color = '';
});

confirmYes.addEventListener('click', () => {
  confirmDialog.style.display = 'none';
  whitelistBtn.style.display = '';
  setLoading(true);
  setCounter('');
  counter.style.color = '';
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {action: 'whitelistAllIps'});
  });
});

confirmNo.addEventListener('click', () => {
  confirmDialog.style.display = 'none';
  whitelistBtn.style.display = '';
  setCounter('');
  counter.style.color = '';
});

// Listen for messages from the content script about progress
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'whitelistProgress') {
    if (msg.status === 'done') {
      setLoading(false);
      setCounter('Done!');
    } else if (msg.status === 'started') {
      setLoading(true);
      setCounter('Starting...');
      counter.style.color = '';
    } else if (msg.status === 'progress') {
      setCounter(`${msg.completed}/${msg.total}`);
      counter.style.color = '';
    } else if (msg.status === 'error') {
      setError(msg.message);
    }
  }
});
