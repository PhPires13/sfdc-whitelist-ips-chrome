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
            for (let i = 0; i <= IP_RANGE; i += 2) {
                addIp(i);
            }
        } else {
            chrome.runtime.sendMessage({type: 'whitelistProgress', status: 'done'});
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
