import { AgentSessionProjectIndex, AgentThreadIndex, AgentSessionRole, AgentThreadStatus, AgentThreadStage } from './SessionStore';

/**
 * P236 — Unified project navigation projection (single-query DTO + filter + selection).
 *
 * The UI renders several overlapping views of the same session graph — `/projects`
 * groups sessions by project, `/threads` groups them by thread (delegation), and
 * `/sessions` lists them flat. Each of those previously required a separate round
 * trip and re-derived its own grouping on the client. This module is the single
 * projection that source-of-truth data (SessionStore project/thread/session indexes)
 * is folded into once, so a host can serve — and a UI can consume — one deterministic
 * NavTree and then filter / page / move a selection cursor over it without re-fetching.
 *
 * Everything here is pure (no node API, no I/O) so the same code runs on the agent
 * server and in the cross-platform agent-ui without environment leaks, matching the
 * P235 timeline-projection convention.
 *
 * The tree is deliberately shaped to mirror the real data model: a session belongs to
 * exactly one primary thread, and a thread belongs to a project when it can be linked.
 * Rather than forcing a rigid three-level nesting that the existing pickers don't use,
 * the DTO carries three orderings of the same leaf nodes:
 *   - `tree.projects`: project nodes whose `children` hold their member sessions.
 *   - `tree.threads` : thread nodes whose `children` hold their member sessions.
 *   - `tree.sessions`: flat session list.
 * All three share the SAME leaf `NavNode` objects (stable ids), so a selection cursor
 * matched with `resolveNavSelection` stays valid across view switches and refreshes,
 * and `applyNavFilter` narrows every ordering consistently.
 */

export type NavEntityType = 'project' | 'thread' | 'session';

/** Minimal session facts required to build the nav projection. */
export interface NavSessionSource {
    id: string;
    workspace?: string;
    projectId?: string;
    primaryThreadId?: string;
    sessionRole?: AgentSessionRole;
    status?: AgentThreadStatus;
    stage?: AgentThreadStage;
    title?: string;
    summary?: string;
    messageCount?: number;
    pinned?: boolean;
    archived?: boolean;
    lastActiveAt?: number;
    createdAt?: number;
}

/**
 * A node in the nav tree. Leaves are `session` nodes; `project`/`thread` nodes are
 * containers whose `children` hold their member sessions. `count` is the descendant
 * session count (1 for session leaves) so a picker can show `(N)` without walking.
 */
export interface NavNode {
    type: NavEntityType;
    id: string;
    label: string;
    workspace?: string;
    projectId?: string;
    primaryThreadId?: string;
    status?: AgentThreadStatus;
    stage?: AgentThreadStage;
    sessionRole?: AgentSessionRole;
    summary?: string;
    messageCount?: number;
    pinned?: boolean;
    archived?: boolean;
    lastActiveAt?: number;
    createdAt?: number;
    /** Nesting depth for rendering (0 = container at list root, 1..n = nested). */
    depth: number;
    /** Number of descendant sessions under this node (1 for a session leaf). */
    count: number;
    children: NavNode[];
}

export interface NavTree {
    projects: NavNode[];
    threads: NavNode[];
    sessions: NavNode[];
    totalSessions: number;
    totalProjects: number;
    totalThreads: number;
    updatedAt: number;
}

export interface NavFilter {
    text?: string;
    status?: string;
    stage?: string;
    workspace?: string;
    projectId?: string;
    threadId?: string;
    pinnedOnly?: boolean;
}

export interface NavSelection {
    type: NavEntityType;
    id: string;
    /** Flat index within the ordering that the cursor is being moved over. */
    index: number;
}

function normalizeText(value?: string): string {
    return String(value || '').trim().toLowerCase();
}

function sessionMatchesFilter(session: NavSessionSource | NavNode, filter: NavFilter): boolean {
    const text = normalizeText(filter.text);
    if (text) {
        const haystack = normalizeText([
            session.id,
            'title' in session ? session.title : undefined,
            'label' in session ? session.label : undefined,
            session.summary,
            session.workspace,
            session.projectId,
            session.primaryThreadId
        ].join(' '));
        if (!haystack.includes(text)) {
            return false;
        }
    }
    if (filter.pinnedOnly && !session.pinned) {
        return false;
    }
    if (filter.status && normalizeText(session.status) !== normalizeText(filter.status)) {
        return false;
    }
    if (filter.stage && normalizeText(session.stage) !== normalizeText(filter.stage)) {
        return false;
    }
    if (filter.workspace && normalizeText(session.workspace) !== normalizeText(filter.workspace)) {
        return false;
    }
    if (filter.projectId && normalizeText(session.projectId) !== normalizeText(filter.projectId)) {
        return false;
    }
    if (filter.threadId && normalizeText(session.primaryThreadId) !== normalizeText(filter.threadId)) {
        return false;
    }
    return true;
}

function sessionLabel(session: NavSessionSource): string {
    return String(session.title || session.summary || '').trim() || session.id;
}

function containerLabel(id: string | undefined, fallback: string): string {
    return String(id || '').trim() || fallback;
}

function makeSessionNode(session: NavSessionSource): NavNode {
    return {
        type: 'session',
        id: session.id,
        label: sessionLabel(session),
        workspace: session.workspace,
        projectId: session.projectId,
        primaryThreadId: session.primaryThreadId,
        status: session.status,
        stage: session.stage,
        sessionRole: session.sessionRole,
        summary: session.summary,
        messageCount: session.messageCount,
        pinned: session.pinned,
        archived: session.archived,
        lastActiveAt: session.lastActiveAt,
        createdAt: session.createdAt,
        depth: 0,
        count: 1,
        children: []
    };
}

/**
 * Fold SessionStore indexes + flat session facts into one NavTree.
 *
 * @param projects `SessionStore.listProjects()` result.
 * @param threads  `SessionStore.listThreads()` result.
 * @param sessions flat session facts (id + metadata). Any session that is referenced
 *                 by a project/thread index but missing here is skipped; any session
 *                 present here but not in an index is still surfaced in `tree.sessions`.
 * @param updatedAt optional projection timestamp (defaults to now).
 */
export function buildNavTree(
    projects: AgentSessionProjectIndex[],
    threads: AgentThreadIndex[],
    sessions: NavSessionSource[],
    updatedAt: number = Date.now()
): NavTree {
    const sessionMap = new Map<string, NavSessionSource>();
    for (const session of sessions) {
        if (session && String(session.id || '').trim()) {
            sessionMap.set(session.id, session);
        }
    }

    // Session nodes are shared across all orderings (same object reference by id).
    const sessionNodes = new Map<string, NavNode>();
    const ensureSessionNode = (sessionId: string): NavNode | undefined => {
        const source = sessionMap.get(sessionId);
        if (!source) {
            return undefined;
        }
        let node = sessionNodes.get(sessionId);
        if (!node) {
            node = makeSessionNode(source);
            sessionNodes.set(sessionId, node);
        }
        return node;
    };

    const threadNodes: NavNode[] = [];
    for (const thread of threads || []) {
        const node: NavNode = {
            type: 'thread',
            id: String(thread.threadId || '').trim(),
            label: containerLabel(thread.title, String(thread.threadId || '').trim() || 'thread'),
            workspace: thread.workspace,
            projectId: thread.projectId,
            primaryThreadId: String(thread.threadId || '').trim() || undefined,
            status: thread.status,
            stage: thread.stage,
            lastActiveAt: thread.lastActiveAt,
            createdAt: thread.createdAt,
            depth: 0,
            count: 0,
            children: []
        };
        if (!node.id) {
            continue;
        }
        for (const sessionId of thread.sessionIds || []) {
            const sessionNode = ensureSessionNode(sessionId);
            if (!sessionNode) {
                continue;
            }
            sessionNode.depth = node.depth + 1;
            sessionNode.primaryThreadId = sessionNode.primaryThreadId || node.id;
            node.children.push(sessionNode);
        }
        node.count = node.children.length;
        threadNodes.push(node);
    }

    const projectNodes: NavNode[] = [];
    for (const project of projects || []) {
        const projectId = String(project.projectId || '').trim();
        const node: NavNode = {
            type: 'project',
            id: String(project.projectKey || project.projectId || '').trim() || `project:${projectNodes.length}`,
            label: containerLabel(
                projectId || project.focusSummary,
                String(project.workspace || project.primaryThreadId || project.projectKey || '').trim() || 'project'
            ),
            workspace: project.workspace,
            projectId: projectId || undefined,
            primaryThreadId: String(project.primaryThreadId || '').trim() || undefined,
            status: project.sessionRole === 'review' ? 'completed' : 'active',
            stage: project.sessionRole === 'review' ? 'review'
                : project.sessionRole === 'worker' ? 'implementation'
                : project.sessionRole === 'branch' ? 'discovery' : undefined,
            lastActiveAt: project.lastActiveAt,
            depth: 0,
            count: 0,
            children: []
        };
        for (const sessionId of project.sessionIds || []) {
            const sessionNode = ensureSessionNode(sessionId);
            if (!sessionNode) {
                continue;
            }
            sessionNode.depth = node.depth + 1;
            const sessionSource = sessionMap.get(sessionId)!;
            sessionNode.projectId = sessionNode.projectId || sessionSource.projectId || node.projectId || projectId || undefined;
            node.children.push(sessionNode);
        }
        node.count = node.children.length;
        if (node.children.length > 0 || node.label !== 'project') {
            projectNodes.push(node);
        }
    }

    const flatSessions = Array.from(sessionNodes.values())
        .sort((left, right) => {
            const delta = (right.lastActiveAt ?? 0) - (left.lastActiveAt ?? 0);
            if (delta !== 0) {
                return delta;
            }
            return left.id.localeCompare(right.id);
        });

    return {
        projects: projectNodes,
        threads: threadNodes,
        sessions: flatSessions,
        totalSessions: flatSessions.length,
        totalProjects: projectNodes.length,
        totalThreads: threadNodes.length,
        updatedAt
    };
}

function filterContainerChildren(children: NavNode[], filter: NavFilter): NavNode[] {
    const result: NavNode[] = [];
    for (const child of children) {
        if (child.type === 'session') {
            if (sessionMatchesFilter(child, filter)) {
                result.push(child);
            }
        } else {
            const nested = filterContainerChildren(child.children, filter);
            if (nested.length) {
                result.push({ ...child, children: nested, count: nested.length });
            }
        }
    }
    return result;
}

/**
 * Return a filtered copy of the tree. Containers whose (filtered) member sessions
 * become empty are pruned; counts are recomputed. Leaf `session` nodes are reused by
 * reference (stable ids) — only container nodes are shallow-copied.
 */
export function applyNavFilter(tree: NavTree, filter?: NavFilter): NavTree {
    if (!filter || Object.keys(filter).length === 0) {
        return tree;
    }
    const projects = filterContainerChildren(tree.projects, filter);
    const threads = filterContainerChildren(tree.threads, filter);
    const sessions = tree.sessions.filter(session => sessionMatchesFilter(session, filter));
    return {
        projects,
        threads,
        sessions,
        totalSessions: sessions.length,
        totalProjects: projects.length,
        totalThreads: threads.length,
        updatedAt: tree.updatedAt
    };
}

/**
 * Flatten the tree into a single ordered list of nodes for a picker/scroll view.
 * `type` restricts to one entity kind (project/thread/session); otherwise all
 * container + leaf nodes are returned in project->thread->session nested order.
 */
export function flattenNav(tree: NavTree, type?: NavEntityType): NavNode[] {
    if (type === 'project') {
        return tree.projects.slice();
    }
    if (type === 'thread') {
        return tree.threads.slice();
    }
    if (type === 'session') {
        return tree.sessions.slice();
    }
    const out: NavNode[] = [];
    const seen = new Set<string>();
    const visit = (node: NavNode) => {
        const key = `${node.type}:${node.id}`;
        if (seen.has(key)) {
            return;
        }
        seen.add(key);
        out.push(node);
        for (const child of node.children) {
            visit(child);
        }
    };
    for (const project of tree.projects) {
        visit(project);
    }
    for (const thread of tree.threads) {
        visit(thread);
    }
    for (const session of tree.sessions) {
        if (!seen.has(`session:${session.id}`)) {
            out.push(session);
        }
    }
    return out;
}

/** Move the cursor one step over the flattened list; returns undefined at bounds. */
export function navigateCursor(
    current: NavSelection | undefined,
    tree: NavTree,
    direction: 'up' | 'down',
    type?: NavEntityType
): NavSelection | undefined {
    const list = flattenNav(tree, type);
    if (!list.length) {
        return undefined;
    }
    const currentIndex = current ? list.findIndex(node => node.id === current.id && node.type === current.type) : -1;
    const step = direction === 'down' ? 1 : -1;
    let nextIndex = currentIndex < 0 ? (direction === 'down' ? 0 : list.length - 1) : currentIndex + step;
    if (nextIndex < 0 || nextIndex >= list.length) {
        return undefined;
    }
    const node = list[nextIndex];
    return { type: node.type, id: node.id, index: nextIndex };
}

/**
 * Resolve a saved selection against the current (possibly refreshed/re-filtered) tree.
 * Returns the matching node if it still exists under the given filter ordering, else
 * undefined so a caller can fall back to a default index. This is what makes selection
 * "survive a refresh" without leaking stale positions.
 */
export function resolveNavSelection(selection: NavSelection | undefined, tree: NavTree): NavNode | undefined {
    if (!selection) {
        return undefined;
    }
    const type = selection.type || 'session';
    const list = flattenNav(tree, type);
    if (type === 'session') {
        return list.find(node => node.id === selection.id) ?? undefined;
    }
    return list.find(node => node.id === selection.id) ?? undefined;
}
