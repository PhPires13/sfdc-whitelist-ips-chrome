const NETWORK_ACCESS_PATTERNS = [
  /\/05G(\/|$)/, // Classic
  /\/lightning\/setup\/NetworkAccess\// // Lightning
];

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!tab.url) return;
  const shouldShow = NETWORK_ACCESS_PATTERNS.some(re => re.test(tab.url));
  chrome.action.setPopup({
    tabId,
    popup: shouldShow ? "popup.html" : ""
  });
  chrome.action.enable(tabId);
});
