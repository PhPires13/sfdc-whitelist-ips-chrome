(() => {
    // Only run on Classic Network Access or Lightning Setup pages
    if (!/\/05G(\/|$)/.test(window.location.pathname) &&
        !/\/lightning\/setup\//.test(window.location.pathname)) {
        return;
    }

    // Improved cookie parsing for sid
    const sidMatch = document.cookie.match(/(?:^|;\s*)sid=([^;]+)/);
    const sid = sidMatch ? sidMatch[1] : null;
    if (!sid) {
        alert('Session ID (sid) cookie not found. Please make sure you are logged in.');
        return;
    }

    const pendingIps = [];
    const IP_RANGE = 255;

    // Add message listener for extension popup
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request && request.action === 'whitelistAllIps') {
                chrome.runtime.sendMessage({type: 'whitelistProgress', status: 'started'});
                allowAll();
                sendResponse({ status: 'started' });
            }
        });
    }

    function allowAll() {
        // Removed confirm dialog, always proceed
        for (let i = 0; i <= IP_RANGE; i += 2) {
            addIp(i);
        }
    }

    function addIp(ipPrefix) {
        pendingIps[ipPrefix] = true;
        request('/05G/e', 'GET').then(result => {
            const tokenMatch = result.match(/input type="hidden" name="_CONFIRMATIONTOKEN" id="_CONFIRMATIONTOKEN" value="([^"]*)"/);
            const confirmationToken = tokenMatch ? tokenMatch[1] : null;
            if (!confirmationToken) throw new Error('Confirmation token not found');
            return request(`/05G/e?IpStartAddress=${ipPrefix}.0.0.0&IpEndAddress=${ipPrefix + 1}.255.255.255&save=1&_CONFIRMATIONTOKEN=${confirmationToken}`, 'POST');
        }).then(() => {
            pendingIps[ipPrefix] = false;
            const ipsLeft = pendingIps.reduce((sum, curVal) => curVal ? ++sum : sum, 0);
            // Send progress update to popup
            chrome.runtime.sendMessage({
                type: 'whitelistProgress',
                status: 'progress',
                completed: IP_RANGE - ipsLeft,
                total: IP_RANGE
            });
            if (ipsLeft === 0) {
                // Notify popup that loading is done BEFORE reload
                chrome.runtime.sendMessage({type: 'whitelistProgress', status: 'done'});
                setTimeout(() => location.reload(), 500);
            }
        }).catch(err => {
            chrome.runtime.sendMessage({
                type: 'whitelistProgress',
                status: 'error',
                message: `Error processing IP prefix ${ipPrefix}: ${err.message || err}`
            });
        });
    }

    function request(url, method = 'GET') {
        return fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${sid}`,
                'Accept': '*/*'
            },
            credentials: 'same-origin'
        }).then(response => {
            if (!response.ok) throw new Error(response.statusText);
            return response.text();
        });
    }
})();
(() => {
    // Only run on Classic Network Access or Lightning Setup pages
    if (!/\/05G(\/|$)/.test(window.location.pathname) &&
        !/\/lightning\/setup\//.test(window.location.pathname)) {
        return;
    }

    // Improved cookie parsing for sid
    const sidMatch = document.cookie.match(/(?:^|;\s*)sid=([^;]+)/);
    const sid = sidMatch ? sidMatch[1] : null;
    if (!sid) {
        alert('Session ID (sid) cookie not found. Please make sure you are logged in.');
        return;
    }

    const pendingIps = [];
    const IP_RANGE = 255;

    // Add message listener for extension popup
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request && request.action === 'whitelistAllIps') {
                // Notify popup that loading has started
                chrome.runtime.sendMessage({type: 'whitelistProgress', status: 'started'});
                allowAll();
                sendResponse({ status: 'started' });
            }
        });
    }

    function allowAll() {
        if (confirm('This will allow users to connect from every computer without verification code or security token. This might present a security threat. Would you like to proceed?')) {
            showLoadingPopup();
            for (let i = 0; i <= IP_RANGE; i += 2) {
                addIp(i);
            }
        } else {
            chrome.runtime.sendMessage({type: 'whitelistProgress', status: 'done'});
        }
    }

    function showLoadingPopup() {
        // Remove existing popup if present
        const existing = document.getElementById('sfdc-whitelist-loading-popup');
        if (existing) existing.remove();

        const popup = document.createElement('div');
        popup.id = 'sfdc-whitelist-loading-popup';
        popup.style.position = 'fixed';
        popup.style.top = '0';
        popup.style.left = '0';
        popup.style.width = '100vw';
        popup.style.height = '100vh';
        popup.style.background = 'rgba(0,0,0,0.4)';
        popup.style.display = 'flex';
        popup.style.alignItems = 'center';
        popup.style.justifyContent = 'center';
        popup.style.zIndex = '99999';

        popup.innerHTML = `
            <div style="background: #fff; padding: 32px 48px; border-radius: 8px; box-shadow: 0 2px 16px rgba(0,0,0,0.2); display: flex; flex-direction: column; align-items: center;">
                <div class="sfdc-spinner" style="margin-bottom: 16px;">
                    <div style="border: 6px solid #f3f3f3; border-top: 6px solid #3498db; border-radius: 50%; width: 48px; height: 48px; animation: sfdc-spin 1s linear infinite;"></div>
                </div>
                <div style="font-size: 18px; color: #333; margin-bottom: 8px;">Whitelisting all IPs... Please wait.</div>
                <div id="sfdc-whitelist-progress-count" style="font-size: 16px; color: #666;">0 / ${IP_RANGE + 1} completed</div>
            </div>
            <style>
                @keyframes sfdc-spin {
                    0% { transform: rotate(0deg);}
                    100% { transform: rotate(360deg);}
                }
            </style>
        `;
        document.body.appendChild(popup);
    }

    // Remove popup when done or on error
    function removeLoadingPopup() {
        const popup = document.getElementById('sfdc-whitelist-loading-popup');
        if (popup) popup.remove();
    }

    function updateLoadingPopupProgress(completed, total) {
        const el = document.getElementById('sfdc-whitelist-progress-count');
        if (el) {
            el.textContent = `${completed} / ${total} completed`;
        }
    }

    function addIp(ipPrefix) {
        pendingIps[ipPrefix] = true;
        request('/05G/e', 'GET').then(result => {
            const tokenMatch = result.match(/input type="hidden" name="_CONFIRMATIONTOKEN" id="_CONFIRMATIONTOKEN" value="([^"]*)"/);
            const confirmationToken = tokenMatch ? tokenMatch[1] : null;
            if (!confirmationToken) throw new Error('Confirmation token not found');
            return request(`/05G/e?IpStartAddress=${ipPrefix}.0.0.0&IpEndAddress=${ipPrefix + 1}.255.255.255&save=1&_CONFIRMATIONTOKEN=${confirmationToken}`, 'POST');
        }).then(() => {
            pendingIps[ipPrefix] = false;
            const ipsLeft = pendingIps.reduce((sum, curVal) => curVal ? ++sum : sum, 0);
            const completed = IP_RANGE - ipsLeft + 1;
            // Send progress update to popup
            chrome.runtime.sendMessage({
                type: 'whitelistProgress',
                status: 'progress',
                completed,
                total: IP_RANGE + 1
            });
            updateLoadingPopupProgress(completed, IP_RANGE + 1);
            if (ipsLeft === 0) {
                // Notify popup that loading is done BEFORE reload
                chrome.runtime.sendMessage({type: 'whitelistProgress', status: 'done'});
                removeLoadingPopup();
                setTimeout(() => location.reload(), 500);
            }
        }).catch(err => {
            chrome.runtime.sendMessage({
                type: 'whitelistProgress',
                status: 'error',
                message: `Error processing IP prefix ${ipPrefix}: ${err.message || err}`
            });
            removeLoadingPopup();
        });
    }

    function request(url, method = 'GET') {
        return fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${sid}`,
                'Accept': '*/*'
            },
            credentials: 'same-origin'
        }).then(response => {
            if (!response.ok) throw new Error(response.statusText);
            return response.text();
        });
    }
})();
