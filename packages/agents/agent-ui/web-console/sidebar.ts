import { formatAgentPanelLabel, formatSessionAge, type AgentConsoleSessionState } from '@tsdi/agent-ui';

export interface AgentConsoleWebSidebarHost {
    document: Document;
    /** The console mount; used to observe tab/agent changes. */
    mount: HTMLElement;
    state: AgentConsoleSessionState;
    runCommand(command: string): Promise<boolean> | void;
    navigate(sessionId: string): void;
    /** Optional cross-session attention counters (approvals/failed tasks/...). */
    loadCounts?(): Promise<{ work: number; inbox: number }>;
}

export interface AgentConsoleWebSidebarHandle {
    element: HTMLElement;
    toggle: HTMLElement;
    refresh(): void;
    dispose(): void;
}

/**
 * Desktop sidebar v0: Agents / Sessions / Work / Inbox navigation. Detail
 * dialogs stay in the console (`/agents`, `/work`, `/inbox`); the sidebar only
 * mirrors state and routes clicks. Refreshes are event-driven (tab strip and
 * agent badge mutations), never timers.
 */
export function createWebSidebar(host: AgentConsoleWebSidebarHost): AgentConsoleWebSidebarHandle {
    const doc = host.document;
    const state = host.state;
    const label = (key: string, fallback: string): string =>
        formatAgentPanelLabel(state.translator, 'sidebar', key, fallback);

    const element = doc.createElement('aside');
    element.className = 'agent-web-sidebar';
    element.setAttribute('aria-label', label('title', 'Agent center'));

    const head = doc.createElement('div');
    head.className = 'agent-web-sidebar-head';
    const title = doc.createElement('span');
    title.className = 'agent-web-sidebar-title';
    title.textContent = label('title', 'Agent center');
    const collapse = doc.createElement('button');
    collapse.type = 'button';
    collapse.className = 'agent-web-sidebar-collapse';
    collapse.textContent = '«';
    collapse.setAttribute('aria-label', label('collapse', 'Collapse sidebar'));
    head.append(title, collapse);

    const agentSection = doc.createElement('div');
    agentSection.className = 'agent-web-sidebar-section';
    const agentLabel = doc.createElement('div');
    agentLabel.className = 'agent-web-sidebar-label';
    agentLabel.textContent = label('agents', 'Agents');
    const agentRow = doc.createElement('button');
    agentRow.type = 'button';
    agentRow.className = 'agent-web-sidebar-row is-agent';
    const agentDot = doc.createElement('span');
    agentDot.className = 'agent-web-sidebar-dot';
    const agentName = doc.createElement('span');
    agentName.className = 'agent-web-sidebar-main';
    const agentMeta = doc.createElement('span');
    agentMeta.className = 'agent-web-sidebar-meta';
    agentMeta.textContent = label('switchAgent', 'switch');
    agentRow.append(agentDot, agentName, agentMeta);
    agentRow.addEventListener('click', () => { void host.runCommand('/agents'); });
    agentSection.append(agentLabel, agentRow);

    const sessionSection = doc.createElement('div');
    sessionSection.className = 'agent-web-sidebar-section is-sessions';
    const sessionLabel = doc.createElement('div');
    sessionLabel.className = 'agent-web-sidebar-label';
    sessionLabel.textContent = label('sessions', 'Sessions');
    const sessionList = doc.createElement('div');
    sessionList.className = 'agent-web-sidebar-list';
    sessionSection.append(sessionLabel, sessionList);

    const actions = doc.createElement('div');
    actions.className = 'agent-web-sidebar-actions';
    const action = (command: string, key: string, fallback: string): { button: HTMLButtonElement; count: HTMLElement } => {
        const button = doc.createElement('button');
        button.type = 'button';
        button.className = 'agent-web-sidebar-action';
        const name = doc.createElement('span');
        name.className = 'agent-web-sidebar-action-label';
        name.textContent = label(key, fallback);
        const count = doc.createElement('span');
        count.className = 'agent-web-sidebar-count';
        count.hidden = true;
        button.append(name, count);
        button.addEventListener('click', () => {
            void Promise.resolve(host.runCommand(command)).then(() => refreshCounts());
        });
        return { button, count };
    };
    const workAction = action('/work', 'work', 'Work');
    const inboxAction = action('/inbox', 'inbox', 'Inbox');
    actions.append(workAction.button, inboxAction.button);
    const renderCounts = (counts: { work: number; inbox: number }): void => {
        workAction.count.textContent = counts.work > 0 ? String(counts.work) : '';
        workAction.count.hidden = counts.work <= 0;
        inboxAction.count.textContent = counts.inbox > 0 ? String(counts.inbox) : '';
        inboxAction.count.hidden = counts.inbox <= 0;
    };
    let countsPending = false;
    const refreshCounts = (): void => {
        if (!host.loadCounts || countsPending) return;
        countsPending = true;
        void Promise.resolve(host.loadCounts())
            .then(counts => renderCounts({
                work: Math.max(0, Number(counts?.work) || 0),
                inbox: Math.max(0, Number(counts?.inbox) || 0)
            }))
            .catch(() => undefined)
            .finally(() => { countsPending = false; });
    };

    element.append(head, agentSection, sessionSection, actions);

    const toggle = doc.createElement('button');
    toggle.type = 'button';
    toggle.className = 'agent-web-sidebar-toggle';
    toggle.textContent = '»';
    toggle.setAttribute('aria-label', label('expand', 'Open sidebar'));

    const setOpen = (open: boolean): void => {
        doc.body?.setAttribute('data-agent-sidebar', open ? 'open' : 'closed');
    };
    const view = doc.defaultView as (Window & typeof globalThis) | null | undefined;
    const wide = view?.matchMedia?.('(min-width: 1080px)');
    setOpen(wide ? wide.matches : true);
    collapse.addEventListener('click', () => setOpen(false));
    toggle.addEventListener('click', () => setOpen(true));
    const onWideChange = (event: MediaQueryListEvent): void => setOpen(event.matches);
    wide?.addEventListener?.('change', onWideChange);
    const onVisibility = (): void => {
        if (!doc.hidden) refreshCounts();
    };
    doc.addEventListener?.('visibilitychange', onVisibility);

    let pending = false;
    const refresh = (): void => {
        if (pending) return;
        pending = true;
        void Promise.resolve().then(() => {
            pending = false;
            agentName.textContent = state.activeArchetype || 'build';
            sessionList.textContent = '';
            for (const session of (state.sessions || []).slice(0, 40)) {
                const row = doc.createElement('button');
                row.type = 'button';
                row.className = 'agent-web-sidebar-row is-session';
                if (session.id === state.sessionId) {
                    row.classList.add('is-current');
                    row.setAttribute('aria-current', 'true');
                }
                const name = doc.createElement('span');
                name.className = 'agent-web-sidebar-main';
                name.textContent = String(session.title || session.summary || session.id);
                const age = doc.createElement('span');
                age.className = 'agent-web-sidebar-meta';
                age.textContent = formatSessionAge(session.updatedAt);
                row.append(name, age);
                row.addEventListener('click', () => host.navigate(session.id));
                sessionList.appendChild(row);
            }
        });
    };

    const Observer = view?.MutationObserver ?? (globalThis as { MutationObserver?: typeof MutationObserver }).MutationObserver;
    let tabObserver: MutationObserver | null = null;
    let agentObserver: MutationObserver | null = null;
    if (Observer) {
        const tabBar = host.mount.querySelector('tab-bar');
        if (tabBar) {
            tabObserver = new Observer(() => { refresh(); refreshCounts(); });
            tabObserver.observe(tabBar, { childList: true, subtree: true, characterData: true });
        }
        const meta = host.mount.querySelector('.input-meta');
        if (meta) {
            agentObserver = new Observer(() => refresh());
            agentObserver.observe(meta, { childList: true, subtree: true, characterData: true });
        }
    }

    refresh();
    refreshCounts();
    doc.body?.appendChild(element);
    doc.body?.appendChild(toggle);

    return {
        element,
        toggle,
        refresh,
        dispose: () => {
            tabObserver?.disconnect();
            agentObserver?.disconnect();
            wide?.removeEventListener?.('change', onWideChange);
            doc.removeEventListener?.('visibilitychange', onVisibility);
            element.remove();
            toggle.remove();
            doc.body?.removeAttribute('data-agent-sidebar');
        }
    };
}
