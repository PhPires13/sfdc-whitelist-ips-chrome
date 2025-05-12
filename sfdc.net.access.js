(() => {
    // Improved cookie parsing for sid
    const sidMatch = document.cookie.match(/(?:^|;\s*)sid=([^;]+)/);
    const sid = sidMatch ? sidMatch[1] : null;
    if (!sid) {
        alert('Session ID (sid) cookie not found. Please make sure you are logged in.');
        return;
    }

    const pendingIps = [];
    const IP_RANGE = 255;
    const counterElement = document.createElement('p');

    initCounterElement();

    function initCounterElement() {
        counterElement.innerText = `0/${IP_RANGE}`;
        counterElement.id = 'ipCounter';
    }

    // Add message listener for extension popup
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request && request.action === 'whitelistAllIps') {
                allowAll();
                sendResponse({status: 'started'});
            }
        });
    }

    function createLoadingImage() {
        const loadingImage = document.createElement('img');
        loadingImage.src = '/img/loading.gif';
        loadingImage.className = 'LoadinImage';
        return loadingImage;
    }

    function allowAll() {
        const pbButton = document.querySelector('.pbButton');
        if (confirm('This will allow users to connect from every computer without verification code or security token. This might present a security threat. Would you like to proceed?')) {
            if (pbButton) {
                pbButton.appendChild(createLoadingImage());
                pbButton.appendChild(counterElement);
            }
            for (let i = 0; i <= IP_RANGE; i += 2) {
                addIp(i);
            }
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
            console.log(`${ipPrefix} is done`);
            pendingIps[ipPrefix] = false;
            const ipsLeft = pendingIps.reduce((sum, curVal) => curVal ? ++sum : sum, 0);
            console.log(`${ipsLeft} ips left`);
            counterElement.innerText = `${IP_RANGE - ipsLeft}/${IP_RANGE}`;
            if (ipsLeft === 0) location.reload();
        }).catch(err => {
            console.error(`Error processing IP prefix ${ipPrefix}:`, err);
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
