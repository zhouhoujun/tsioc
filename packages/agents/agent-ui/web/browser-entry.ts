import { runAgentWebConsole } from '../web-console';

/**
 * Browser bundle entry.
 *
 * `web/index.html` only provides `#agent-console` and `window.__TSDI_AGENT_WEB__`
 * (paired token, base URL, session id) via `header.js`; the component graph
 * itself has to be started here. Keeping this in a dedicated entry means the
 * library entry (`../web-console`) stays side-effect free for tests/hosts.
 */
if (typeof document !== 'undefined' && document.getElementById('agent-console')) {
    void runAgentWebConsole().catch(error => {
        const mount = document.getElementById('agent-console');
        if (mount) {
            mount.textContent = `Console failed to start: ${error instanceof Error ? error.message : String(error)}`;
        }
    });
}
