import {
    formatAgentPanelLabel,
    formatSessionAge,
    type AgentConsoleProjectItem,
    type AgentConsoleSessionItem,
    type AgentConsoleSessionState
} from '@tsdi/agent-ui';
import {
    buildWebSidebarProjects,
    filterWebSidebarSessions,
    groupWebSidebarSessions,
    resolveWebSidebarProjectLabel,
    searchWebSidebarProjects,
    type AgentConsoleWebSessionGroupKey
} from './session-search';

export interface AgentConsoleWebSidebarHost {
    document: Document;
    /** The console mount; used to observe tab/agent changes. */
    mount: HTMLElement;
    state: AgentConsoleSessionState;
    runCommand(command: string): Promise<boolean> | void;
    navigate(sessionId: string): void;
    /** Optional cross-session attention counters (approvals/failed tasks/...). */
    loadCounts?(): Promise<{ work: number; inbox: number }>;
    /** Optional: reload the console session index (terminal-created sessions). */
    refreshSessions?(): Promise<void> | void;
}

export interface AgentConsoleWebSidebarHandle {
    element: HTMLElement;
    toggle: HTMLElement;
    refresh(): void;
    /** Type-to-filter the session list (deep links/tests). */
    setSessionQuery(query: string): void;
    /** Restrict the session list to one project key ('' = all projects). */
    setProjectFilter(projectKey: string): void;
    /** Move keyboard focus into the session finder (⌘K / Ctrl+K). */
    focusSessionSearch(): void;
    dispose(): void;
}

const SESSION_LIMIT = 200;

/**
 * Agent center sidebar v1. Sessions and projects are searchable in place
 * (opencode-style finders): the project picker filters by label/workspace, the
 * session finder filters by title/id/workspace/project and groups the result by
 * activity date. Detail dialogs stay in the console (`/agents`, `/work`,
 * `/inbox`, `/settings`); the sidebar only mirrors state and routes clicks.
 * Refreshes are event-driven (tab strip and agent badge mutations), never
 * timers.
 */
export function createWebSidebar(host: AgentConsoleWebSidebarHost): AgentConsoleWebSidebarHandle {
    const doc = host.document;
    const state = host.state;
    const label = (key: string, fallback: string, params?: Record<string, any>): string =>
        formatAgentPanelLabel(state.translator, 'sidebar', key, fallback, params);
    const projectLabelOf = (project: AgentConsoleProjectItem): string =>
        String(project.label || '').trim() || label('workspace', 'Workspace');

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

    // ── Project finder ──────────────────────────────────────────────────────
    const projectSection = doc.createElement('div');
    projectSection.className = 'agent-web-sidebar-section is-projects';
    const projectToggle = doc.createElement('button');
    projectToggle.type = 'button';
    projectToggle.className = 'agent-web-sidebar-project-toggle';
    projectToggle.setAttribute('aria-expanded', 'false');
    const projectName = doc.createElement('span');
    projectName.className = 'agent-web-sidebar-project-name';
    const projectCount = doc.createElement('span');
    projectCount.className = 'agent-web-sidebar-meta';
    const projectChevron = doc.createElement('span');
    projectChevron.className = 'agent-web-sidebar-chevron';
    projectChevron.textContent = '▾';
    projectToggle.append(projectName, projectCount, projectChevron);
    const projectPanel = doc.createElement('div');
    projectPanel.className = 'agent-web-sidebar-project-panel';
    projectPanel.hidden = true;
    const projectInput = doc.createElement('input');
    projectInput.type = 'search';
    projectInput.className = 'agent-web-sidebar-input is-project';
    projectInput.placeholder = label('searchProjects', 'Filter projects');
    projectInput.setAttribute('aria-label', label('searchProjects', 'Filter projects'));
    const projectList = doc.createElement('div');
    projectList.className = 'agent-web-sidebar-project-list';
    projectList.setAttribute('role', 'listbox');
    projectPanel.append(projectInput, projectList);
    projectSection.append(projectToggle, projectPanel);

    // ── Agent profile ───────────────────────────────────────────────────────
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

    // ── Session finder ──────────────────────────────────────────────────────
    const sessionSection = doc.createElement('div');
    sessionSection.className = 'agent-web-sidebar-section is-sessions';
    const sessionLabelRow = doc.createElement('div');
    sessionLabelRow.className = 'agent-web-sidebar-label-row';
    const sessionLabel = doc.createElement('span');
    sessionLabel.className = 'agent-web-sidebar-label';
    sessionLabel.textContent = label('sessions', 'Sessions');
    const sessionCount = doc.createElement('span');
    sessionCount.className = 'agent-web-sidebar-count';
    const addSession = doc.createElement('button');
    addSession.type = 'button';
    addSession.className = 'agent-web-sidebar-add';
    addSession.textContent = '+';
    addSession.setAttribute('aria-label', label('newSession', 'New session'));
    addSession.title = label('newSession', 'New session');
    addSession.addEventListener('click', () => { void host.runCommand('/new'); });
    sessionLabelRow.append(sessionLabel, sessionCount, addSession);
    const sessionInput = doc.createElement('input');
    sessionInput.type = 'search';
    sessionInput.className = 'agent-web-sidebar-input is-session-search';
    sessionInput.placeholder = label('searchSessions', 'Search sessions');
    sessionInput.setAttribute('aria-label', label('searchSessions', 'Search sessions'));
    sessionInput.setAttribute('autocomplete', 'off');
    const sessionList = doc.createElement('div');
    sessionList.className = 'agent-web-sidebar-list';
    sessionSection.append(sessionLabelRow, sessionInput, sessionList);

    // ── Footer actions ──────────────────────────────────────────────────────
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
    const settingsAction = action('/settings', 'settings', 'Settings');
    actions.append(workAction.button, inboxAction.button, settingsAction.button);
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

    element.append(head, projectSection, agentSection, sessionSection, actions);

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
        if (doc.hidden) return;
        refreshCounts();
        // The terminal may have created/renamed sessions while this tab was
        // hidden; re-read the index instead of trusting a stale snapshot.
        void Promise.resolve(host.refreshSessions?.())
            .catch(() => undefined)
            .then(() => refresh());
    };
    doc.addEventListener?.('visibilitychange', onVisibility);

    // ── Finder state ────────────────────────────────────────────────────────
    let query = '';
    let projectQuery = '';
    let projectKey = '';
    let projectsOpen = false;
    let activeIndex = -1;
    let rows: HTMLElement[] = [];
    let rowSessions: AgentConsoleSessionItem[] = [];
    let resolvedProjects: AgentConsoleProjectItem[] = [];
    let pending = false;

    const groupLabel = (key: AgentConsoleWebSessionGroupKey): string => {
        switch (key) {
            case 'today': return label('today', 'Today');
            case 'yesterday': return label('yesterday', 'Yesterday');
            case 'previous7Days': return label('previous7Days', 'Previous 7 days');
            case 'older': return label('older', 'Older');
            default: return label('unknownDate', 'Undated');
        }
    };

    const projectRow = (key: string, text: string, count: number): HTMLElement => {
        const row = doc.createElement('button');
        row.type = 'button';
        row.className = 'agent-web-sidebar-row is-project-row';
        row.setAttribute('role', 'option');
        if (!key) {
            row.classList.add('is-all');
        } else {
            row.dataset.project = key;
        }
        const selected = key === projectKey;
        row.classList.toggle('is-current', selected);
        row.setAttribute('aria-selected', selected ? 'true' : 'false');
        const name = doc.createElement('span');
        name.className = 'agent-web-sidebar-main';
        name.textContent = text;
        const meta = doc.createElement('span');
        meta.className = 'agent-web-sidebar-meta';
        meta.textContent = String(count);
        row.append(name, meta);
        row.addEventListener('click', () => {
            projectKey = key;
            projectsOpen = false;
            activeIndex = -1;
            refresh();
        });
        return row;
    };

    const renderProjects = (): void => {
        resolvedProjects = buildWebSidebarProjects(state.sessions || [], state.projects || []);
        let current = projectKey ? resolvedProjects.find(project => project.key === projectKey) : undefined;
        if (projectKey && !current) {
            // The scoped project disappeared (archived/deleted sessions): fall
            // back to all projects instead of showing a permanently empty list.
            projectKey = '';
            current = undefined;
        }
        projectName.textContent = current ? projectLabelOf(current) : label('allProjects', 'All projects');
        // "All projects" needs no counter (the session list already shows it);
        // a scoped project shows how many sessions it contributes.
        projectCount.textContent = current ? String(current.sessionCount) : '';
        projectCount.hidden = !current;
        projectToggle.classList.toggle('is-filtered', !!current);
        projectToggle.setAttribute('aria-expanded', projectsOpen ? 'true' : 'false');
        projectToggle.title = projectName.textContent;
        projectPanel.hidden = !projectsOpen;
        projectList.textContent = '';
        if (!projectsOpen) {
            return;
        }
        const total = resolvedProjects.reduce((sum, project) => sum + Math.max(0, project.sessionCount), 0);
        projectList.appendChild(projectRow('', label('allProjects', 'All projects'), total));
        for (const project of searchWebSidebarProjects(resolvedProjects, projectQuery)) {
            projectList.appendChild(projectRow(project.key, projectLabelOf(project), project.sessionCount));
        }
        if (!projectList.querySelector('.is-project-row[data-project]')) {
            const empty = doc.createElement('div');
            empty.className = 'agent-web-sidebar-empty';
            empty.textContent = label('noProjects', 'No projects match "{query}"', { query: projectQuery.trim() });
            projectList.appendChild(empty);
        }
    };

    const sessionRow = (session: AgentConsoleSessionItem, showProject: boolean): HTMLElement => {
        const row = doc.createElement('button');
        row.type = 'button';
        row.className = 'agent-web-sidebar-row is-session';
        row.dataset.session = session.id;
        if (session.id === state.sessionId) {
            row.classList.add('is-current');
            row.setAttribute('aria-current', 'true');
        }
        const name = doc.createElement('span');
        name.className = 'agent-web-sidebar-main';
        const untitled = formatAgentPanelLabel(state.translator, 'sessions', 'untitled', 'New session');
        name.textContent = String(session.title || session.summary || '').trim() || untitled;
        row.append(name);
        const tagText = showProject
            ? (resolveWebSidebarProjectLabel(session) || label('workspace', 'Workspace'))
            : '';
        if (tagText) {
            const tag = doc.createElement('span');
            tag.className = 'agent-web-sidebar-tag';
            tag.textContent = tagText;
            row.append(tag);
            row.title = `${name.textContent} · ${tagText}`;
        } else {
            row.title = name.textContent;
        }
        const age = doc.createElement('span');
        age.className = 'agent-web-sidebar-meta';
        age.textContent = formatSessionAge(session.updatedAt);
        row.append(age);
        row.addEventListener('click', () => host.navigate(session.id));
        return row;
    };

    const searchAllRow = (): HTMLElement => {
        const row = doc.createElement('button');
        row.type = 'button';
        row.className = 'agent-web-sidebar-row is-search-all';
        row.textContent = label('searchAll', 'Search all messages for "{query}"', { query: query.trim() });
        row.addEventListener('click', () => { void host.runCommand(`/search ${query.trim()}`); });
        return row;
    };

    const applyActive = (): void => {
        rows.forEach((row, index) => row.classList.toggle('is-active', index === activeIndex));
    };

    const renderSessions = (): void => {
        const sessions = state.sessions || [];
        const visible = filterWebSidebarSessions({ sessions, query, projectKey, limit: SESSION_LIMIT });
        sessionCount.textContent = query.trim() || projectKey
            ? label('sessionCount', '{visible}/{total}', { visible: visible.length, total: sessions.length })
            : String(sessions.length);
        sessionList.textContent = '';
        rows = [];
        rowSessions = [];
        if (!visible.length) {
            const empty = doc.createElement('div');
            empty.className = 'agent-web-sidebar-empty';
            empty.textContent = query.trim()
                ? label('noSessions', 'No sessions match "{query}"', { query: query.trim() })
                : label('noSessionsShort', 'No sessions');
            sessionList.appendChild(empty);
            if (query.trim()) {
                sessionList.appendChild(searchAllRow());
            }
            return;
        }
        const showProject = !projectKey && resolvedProjects.length > 1;
        for (const group of groupWebSidebarSessions(visible)) {
            const header = doc.createElement('div');
            header.className = 'agent-web-sidebar-group';
            header.textContent = groupLabel(group.key);
            sessionList.appendChild(header);
            for (const session of group.sessions) {
                const row = sessionRow(session, showProject);
                rows.push(row);
                rowSessions.push(session);
                sessionList.appendChild(row);
            }
        }
        applyActive();
    };

    const refresh = (): void => {
        if (pending) return;
        pending = true;
        void Promise.resolve().then(() => {
            pending = false;
            agentName.textContent = state.activeArchetype || 'build';
            renderProjects();
            renderSessions();
        });
    };

    // ── Finder interactions ─────────────────────────────────────────────────
    const openFirstMatch = (): void => {
        const target = rowSessions[activeIndex >= 0 && activeIndex < rowSessions.length ? activeIndex : 0];
        if (target) {
            host.navigate(target.id);
        }
    };

    sessionInput.addEventListener('input', () => {
        query = sessionInput.value;
        activeIndex = -1;
        renderSessions();
    });
    sessionInput.addEventListener('keydown', event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            if (!rows.length) return;
            event.preventDefault();
            const delta = event.key === 'ArrowDown' ? 1 : -1;
            activeIndex = activeIndex < 0
                ? (delta > 0 ? 0 : rows.length - 1)
                : (activeIndex + delta + rows.length) % rows.length;
            applyActive();
            rows[activeIndex]?.scrollIntoView?.({ block: 'nearest' });
            return;
        }
        if (event.key === 'Enter') {
            event.preventDefault();
            openFirstMatch();
            return;
        }
        if (event.key === 'Escape') {
            if (query) {
                sessionInput.value = '';
                query = '';
                activeIndex = -1;
                renderSessions();
            } else {
                sessionInput.blur();
            }
            event.stopPropagation();
        }
    });

    const closeProjectPanel = (): void => {
        projectsOpen = false;
        renderProjects();
        sessionInput.focus?.();
    };
    projectToggle.addEventListener('click', () => {
        projectsOpen = !projectsOpen;
        if (projectsOpen) {
            // Reopen with a clean finder: a stale query would hide projects.
            projectQuery = '';
            projectInput.value = '';
        }
        renderProjects();
        if (projectsOpen) {
            projectInput.focus?.();
        }
    });
    projectInput.addEventListener('input', () => {
        projectQuery = projectInput.value;
        renderProjects();
    });
    projectInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            const row = projectList.querySelector('.is-project-row') as HTMLElement | null;
            row?.click();
            return;
        }
        if (event.key === 'Escape') {
            event.stopPropagation();
            if (projectQuery) {
                projectInput.value = '';
                projectQuery = '';
                renderProjects();
            } else {
                closeProjectPanel();
            }
        }
    });
    const onPointerDown = (event: Event): void => {
        if (!projectsOpen) return;
        const target = event.target as Node | null;
        if (target && projectSection.contains(target)) return;
        projectsOpen = false;
        renderProjects();
    };
    doc.addEventListener?.('pointerdown', onPointerDown, true);

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
        setSessionQuery: value => {
            query = String(value || '');
            sessionInput.value = query;
            activeIndex = -1;
            renderSessions();
        },
        setProjectFilter: value => {
            projectKey = String(value || '');
            activeIndex = -1;
            refresh();
        },
        focusSessionSearch: () => {
            // ⌘K must work from any state: a collapsed sidebar reopens first
            // (a hidden input cannot take focus).
            setOpen(true);
            sessionInput.focus?.();
            sessionInput.select?.();
        },
        dispose: () => {
            tabObserver?.disconnect();
            agentObserver?.disconnect();
            wide?.removeEventListener?.('change', onWideChange);
            doc.removeEventListener?.('visibilitychange', onVisibility);
            doc.removeEventListener?.('pointerdown', onPointerDown, true);
            element.remove();
            toggle.remove();
            doc.body?.removeAttribute('data-agent-sidebar');
        }
    };
}
