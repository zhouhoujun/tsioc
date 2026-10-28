(function () {
    var STORAGE_KEY = 'tsdi-agent-web-token';

    function rpc(baseUrl, token, method, params) {
        var headers = { 'Content-Type': 'application/json' };
        if (token) {
            headers.Authorization = 'Bearer ' + token;
        }
        return fetch(baseUrl + '/rpc', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method: method, params: params || {} })
        }).then(function (response) {
            return response.json().then(function (payload) {
                if (!response.ok || payload.error) {
                    throw new Error((payload.error && payload.error.message) || ('HTTP ' + response.status));
                }
                return payload.result;
            });
        });
    }

    function formatAge(updatedAt) {
        var minutes = Math.floor(Math.max(0, Date.now() - Number(updatedAt || 0)) / 60000);
        if (minutes < 1) return '<1m';
        if (minutes < 60) return minutes + 'm';
        var hours = Math.floor(minutes / 60);
        if (hours < 24) return hours + 'h';
        var days = Math.floor(hours / 24);
        if (days < 7) return days + 'd';
        return new Date(updatedAt).toISOString().slice(0, 10);
    }

    /** Redeem a one-time pairing code, then hand the token to the console. */
    async function configure() {
        var params = new URLSearchParams(window.location.search);
        var token = window.sessionStorage.getItem(STORAGE_KEY) || '';
        var pair = params.get('pair');
        if (pair) {
            try {
                var redeemed = await fetch(window.location.origin + '/api/pair', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code: pair })
                });
                if (redeemed.ok) {
                    var payload = await redeemed.json();
                    token = payload.token || '';
                    window.sessionStorage.setItem(STORAGE_KEY, token);
                }
            } catch (error) {
                // The console still loads and reports the RPC error (expired code).
            }
            params.delete('pair');
            var query = params.toString();
            window.history.replaceState(null, '', window.location.pathname + (query ? '?' + query : ''));
        }
        return {
            baseUrl: (window.__TSDI_AGENT_WEB_BASE_URL__ || window.location.origin || '').replace(/\/+$/, ''),
            token: token,
            sessionId: params.get('session') || undefined,
            pwa: true
        };
    }

    async function renderHeader(config) {
        var select = document.getElementById('agent-session-select');
        var addButton = document.getElementById('agent-session-new');
        var status = document.getElementById('agent-header-status');
        if (!select || !addButton) {
            return;
        }
        try {
            var sessions = (await rpc(config.baseUrl, config.token, 'session.list', {})) || [];
            if (!sessions.length) {
                // A fresh server has no sessions; give the console one to mount on.
                var created = await rpc(config.baseUrl, config.token, 'session.create', {});
                var createdId = created && (created.sessionId || created.id);
                if (createdId) {
                    sessions = [{ id: createdId, lastActiveAt: Date.now() }];
                    config.sessionId = createdId;
                    window.__TSDI_AGENT_WEB__.sessionId = createdId;
                }
            }
            sessions.sort(function (left, right) {
                return (Number(right.lastActiveAt) || 0) - (Number(left.lastActiveAt) || 0);
            });
            select.textContent = '';
            sessions.forEach(function (session) {
                var option = document.createElement('option');
                option.value = session.id;
                option.textContent = (session.title || session.summary || session.id) + '  ·  ' + formatAge(session.lastActiveAt);
                if (session.id === config.sessionId) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
            if (!config.sessionId && sessions[0]) {
                config.sessionId = sessions[0].id;
                select.value = sessions[0].id;
            }
            select.addEventListener('change', function () {
                navigate(select.value);
            });
            addButton.addEventListener('click', async function () {
                addButton.disabled = true;
                try {
                    var created = await rpc(config.baseUrl, config.token, 'session.create', {});
                    navigate(created.sessionId || created.id);
                } catch (error) {
                    if (status) {
                        status.textContent = String((error && error.message) || error);
                    }
                    addButton.disabled = false;
                }
            });
            if (status) {
                status.textContent = sessions.length + (sessions.length === 1 ? ' session' : ' sessions');
            }
        } catch (error) {
            if (status) {
                status.textContent = String((error && error.message) || error);
            }
        }
    }

    function sessionUrl(sessionId) {
        var params = new URLSearchParams(window.location.search);
        params.set('session', sessionId);
        return window.location.pathname + '?' + params.toString();
    }

    function navigate(sessionId) {
        window.location.href = sessionUrl(sessionId);
    }

    // Test/automation hook: the page itself never needs this.
    window.__TSDI_AGENT_WEB_HEADER__ = { sessionUrl: sessionUrl, formatAge: formatAge };

    configure().then(function (config) {
        window.__TSDI_AGENT_WEB__ = config;
        renderHeader(config).then(function () {
            var script = document.createElement('script');
            script.src = './dist/agent-console.js';
            document.body.appendChild(script);
        });
    });
})();
