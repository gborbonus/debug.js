(function () {
    // Buffer for raw data (used for JSON copying)
    const logBuffer = { verbose: [], info: [], warnings: [], errors: [], debug: [], trace: [] };
    const unreadCounts = { verbose: 0, info: 0, warnings: 0, errors: 0, debug: 0, trace: 0 };
    const timers = {};
    let currentTab = 'verbose';
    let container = null;

    const defaultStyles = {
        icon: { position: 'fixed', bottom: '20px', right: '20px', width: '40px', height: '40px', background: '#007bff', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: '1000' },
        container: { position: 'fixed', bottom: '0', left: '0', width: '100%', maxHeight: '50vh', background: '#ffffff', borderTop: '2px solid #007bff', overflow: 'hidden', display: 'none' },
        tabs: { display: 'flex', background: '#f8f9fa', borderBottom: '1px solid #e0e0e0', padding: '5px 10px 0' },
        tab: { flex: '1', padding: '8px', textAlign: 'center', background: '#e9ecef', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#495057' },
        tabActive: { background: '#ffffff', fontWeight: '500', borderBottom: '2px solid #007bff' },
        controls: { padding: '10px', display: 'flex', gap: '10px', background: '#f8f9fa' },
        search: { flex: '1', padding: '8px', border: '1px solid #ced4da', borderRadius: '5px', fontSize: '14px', outline: 'none' },
        copyButton: { padding: '8px 15px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' },
        output: { height: 'calc(50vh - 90px)', overflowY: 'auto', padding: '15px', fontSize: '13px', lineHeight: '1.5' },
        logEntry: { marginBottom: '8px', whiteSpace: 'pre-wrap' },
        verbose: { color: '#6c757d' },
        info: { color: '#212529' },
        warning: { color: '#fd7e14' },
        error: { color: '#dc3545' },
        debug: { color: '#17a2b8' },
        trace: { color: '#6f42c1' }
    };

    function applyStyles(element, baseStyles, overrides = {}) {
        Object.assign(element.style, baseStyles, overrides);
    }

    function initDebugUI(styleOverrides = {}) {
        if (container) return;

        const debugIcon = document.createElement('div');
        debugIcon.innerHTML = '🐞';
        applyStyles(debugIcon, defaultStyles.icon, styleOverrides.icon);

        container = document.createElement('div');
        applyStyles(container, defaultStyles.container, styleOverrides.container);

        const tabsContainer = document.createElement('div');
        applyStyles(tabsContainer, defaultStyles.tabs, styleOverrides.tabs);

        const tabNames = ['verbose', 'info', 'warnings', 'errors', 'debug', 'trace'];
        tabNames.forEach(type => {
            const tab = document.createElement('button');
            tab.textContent = type.charAt(0).toUpperCase() + type.slice(1);
            tab.dataset.tab = type;
            applyStyles(tab, defaultStyles.tab, styleOverrides.tab);
            if (type === currentTab) applyStyles(tab, defaultStyles.tabActive, styleOverrides.tabActive);
            tab.onclick = () => switchTab(type);
            const notification = document.createElement('span');
            notification.style.cssText = 'margin-left: 5px; width: 18px; height: 18px; background: #dc3545; color: white; border-radius: 50%; font-size: 12px; line-height: 18px; visibility: hidden; display: inline-block;';
            tab.appendChild(notification);
            tabsContainer.appendChild(tab);
        });

        const controls = document.createElement('div');
        applyStyles(controls, defaultStyles.controls, styleOverrides.controls);

        const searchInput = document.createElement('input');
        searchInput.placeholder = 'Search logs...';
        applyStyles(searchInput, defaultStyles.search, styleOverrides.search);
        searchInput.oninput = renderLogs;

        const copyButton = document.createElement('button');
        copyButton.textContent = 'Copy as JSON';
        applyStyles(copyButton, defaultStyles.copyButton, styleOverrides.copyButton);
        copyButton.onclick = () => {
            const json = JSON.stringify(logBuffer, null, 2);
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(json).then(() => alert('Logs copied!')).catch(err => {
                    console.error('Clipboard API failed:', err);
                    fallbackCopy(json);
                });
            } else {
                fallbackCopy(json);
            }
        };

        function fallbackCopy(text) {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                alert('Logs copied via fallback! Paste them now.');
            } catch (err) {
                console.error('Fallback copy failed:', err);
                alert('Copy failed. Please manually copy the logs from the console.');
            }
            document.body.removeChild(textarea);
        }

        controls.appendChild(searchInput);
        controls.appendChild(copyButton);

        const output = document.createElement('div');
        applyStyles(output, defaultStyles.output, styleOverrides.output);

        container.appendChild(tabsContainer);
        container.appendChild(controls);
        container.appendChild(output);

        document.body.appendChild(debugIcon);
        document.body.appendChild(container);

        debugIcon.onclick = () => {
            container.style.display = container.style.display === 'block' ? 'none' : 'block';
            if (container.style.display === 'block') renderLogs();
        };
    }

    function log(type, message, data) {
        const timestamp = new Date().toISOString();
        const entry = { 
            timestamp, 
            message, // Store raw message (string or object)
            data: data || undefined // Store raw additional data if provided
        };
        logBuffer[type].push(entry);
        if (type !== currentTab) unreadCounts[type]++;
        if (container && container.style.display === 'block') renderLogs();
        updateNotifications();
    }

    function renderLogs() {
        const output = container.querySelector('div[style*="overflow-y"]');
        const searchText = container.querySelector('input').value.toLowerCase();
        output.innerHTML = '';
        
        logBuffer[currentTab].forEach(entry => {
            let displayMessage = entry.message;
            if (typeof entry.message === 'object' && entry.message !== null) {
                displayMessage = JSON.stringify(entry.message, null, 2); // Format for UI
            }
            let displayData = entry.data ? `: ${typeof entry.data === 'object' ? JSON.stringify(entry.data, null, 2) : entry.data}` : '';
            
            const text = `${entry.timestamp} - ${displayMessage}${displayData}`;
            if (!searchText || text.toLowerCase().includes(searchText)) {
                const div = document.createElement('div');
                applyStyles(div, defaultStyles.logEntry, { color: defaultStyles[currentTab]?.color });
                div.textContent = text;
                output.appendChild(div);
            }
        });
        output.scrollTop = output.scrollHeight;
    }

    function updateNotifications() {
        const tabs = container.querySelectorAll('button[data-tab]');
        tabs.forEach(tab => {
            const type = tab.dataset.tab;
            const notification = tab.querySelector('span');
            notification.textContent = unreadCounts[type] || '';
            notification.style.visibility = unreadCounts[type] > 0 ? 'visible' : 'hidden';
        });
    }

    function switchTab(type) {
        currentTab = type;
        unreadCounts[type] = 0;
        const tabs = container.querySelectorAll('button[data-tab]');
        tabs.forEach(tab => {
            tab.style.cssText = '';
            applyStyles(tab, defaultStyles.tab);
            if (tab.dataset.tab === type) applyStyles(tab, defaultStyles.tabActive);
        });
        renderLogs();
        updateNotifications();
    }

    const originalConsole = { ...console };
    console.log = (...args) => { log('verbose', args[0], args.slice(1)[0]); originalConsole.log(...args); };
    console.info = (...args) => { log('info', args[0], args.slice(1)[0]); originalConsole.info(...args); };
    console.warn = (...args) => { log('warnings', args[0], args.slice(1)[0]); originalConsole.warn(...args); };
    console.error = (...args) => {
        const error = args[0] instanceof Error ? args[0] : new Error(args[0]);
        log('errors', error.message, {
            stack: error.stack || 'No stack available',
            details: args.length > 1 ? JSON.stringify(args.slice(1), null, 2) : undefined
        });
        originalConsole.error(...args);
    };
    console.debug = (...args) => { log('debug', args[0], args.slice(1)[0]); originalConsole.debug(...args); };
    console.trace = (...args) => { log('trace', args[0], args.slice(1)[0]); originalConsole.trace(...args); };
    console.time = (label) => { timers[label] = performance.now(); originalConsole.time(label); };
    console.timeEnd = (label) => {
        const time = performance.now() - (timers[label] || 0);
        log('info', `${label}: ${time.toFixed(2)}ms`);
        delete timers[label];
        originalConsole.timeEnd(label);
    };

    window.onerror = function (message, source, lineno, colno, error) {
        log('errors', 'Uncaught Synchronous Error', {
            message: message,
            source: source,
            line: lineno,
            column: colno,
            stack: error ? error.stack : 'No stack trace available (error object not provided)'
        });
        return false;
    };

    window.addEventListener('unhandledrejection', (event) => {
        const error = event.reason;
        log('errors', 'Uncaught Promise Rejection', {
            message: error.message || 'No message provided',
            stack: error.stack || 'No stack trace available',
            reason: error instanceof Error ? error.toString() : JSON.stringify(error, null, 2)
        });
    });

    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
        try {
            const response = await originalFetch(...args);
            log('info', 'Fetch Completed', {
                url: args[0],
                status: response.status,
                statusText: response.statusText
            });
            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unable to read response text');
                const error = new Error(`Fetch failed: ${response.status} ${response.statusText} - ${errorText}`);
                log('errors', error.message, {
                    url: args[0],
                    options: args[1],
                    stack: error.stack
                });
                throw error;
            }
            return response;
        } catch (error) {
            log('errors', 'Fetch Network Error', {
                message: error.message,
                url: args[0],
                options: args[1],
                stack: error.stack
            });
            throw error;
        }
    };

    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (...args) {
        this.addEventListener('load', () => {
            log('info', 'XHR Completed', {
                method: args[0],
                url: args[1],
                status: this.status,
                statusText: this.statusText
            });
            if (this.status >= 400) {
                log('errors', 'XHR Request Failed', {
                    message: `HTTP ${this.status}: ${this.statusText}`,
                    method: args[0],
                    url: args[1],
                    response: this.responseText.slice(0, 200),
                    stack: new Error().stack
                });
            }
        });
        this.addEventListener('error', () => {
            log('errors', 'XHR Network Error', {
                message: 'Network error occurred',
                method: args[0],
                url: args[1],
                stack: new Error().stack
            });
        });
        originalXHROpen.apply(this, args);
    };

    window.DebugLog = {
        init: (styleOverrides) => initDebugUI(styleOverrides || {}),
        log: log
    };

    DebugLog.init();
})();
