import { Injectable, Optional } from '@tsdi/ioc';
import { TranslatorService } from '@tsdi/i18n';
import { getDisplayWidth, TabBarSource, TabItem } from '@tsdi/components/common';
import { AgentConsoleSessionState, AgentConsoleSessionItem } from './AgentConsoleSessionState';
import { resolveSessionProjectKey } from './AgentConsoleProjectProjection';
import { formatAgentUiLabel } from './agent-ui.i18n';

/**
 * Resolve the sessions shown in the top strip: only the current project and,
 * when a previous exit recorded open tabs, only that open set. Sessions deleted
 * or archived since the last exit fall back to the project's current sessions.
 */
export function resolveAgentConsoleSessionTabs(state: AgentConsoleSessionState): AgentConsoleSessionItem[] {
    const sessions = (state.sessions || []).filter(session => session && session.id);
    const anchor = sessions.find(session => session.id === state.sessionId)
        || sessions.find(session => session.current);
    const projectKey = anchor ? resolveSessionProjectKey(anchor) : '';
    const scoped = projectKey
        ? sessions.filter(session => resolveSessionProjectKey(session) === projectKey)
        : sessions;
    const openIds = (state.openSessionIds || []).filter(Boolean);
    if (!openIds.length) {
        return scoped;
    }
    const open = new Set(openIds);
    const visible = scoped.filter(session => open.has(session.id) || session.id === state.sessionId);
    if (!visible.length) {
        return scoped;
    }
    const order = new Map(openIds.map((id, index) => [id, index]));
    return visible.sort((left, right) => {
        const leftOrder = order.has(left.id) ? order.get(left.id)! : Number.MAX_SAFE_INTEGER;
        const rightOrder = order.has(right.id) ? order.get(right.id)! : Number.MAX_SAFE_INTEGER;
        return leftOrder - rightOrder;
    });
}

/**
 * Agent-ui data/actions for the shared `tab-bar`. It scopes the strip to
 * the current project/workspace, applies the console theme and forwards tab
 * actions to the console state.
 */
@Injectable()
export class AgentConsoleSessionTabsSource implements TabBarSource {
    constructor(private state: AgentConsoleSessionState, @Optional() private translator?: TranslatorService) {
    }

    get visible(): boolean {
        return this.state.messageLayout === 'viewport';
    }

    get items(): TabItem[] {
        if (!this.visible) {
            return [];
        }
        const items = resolveAgentConsoleSessionTabs(this.state).map(session => {
            const active = session.id === this.state.sessionId || !!session.current;
            return {
                id: session.id,
                label: ` ${this.tabTitle(session)} `,
                active,
                showClose: active
            };
        });
        return this.windowItems(items);
    }

    /**
     * Terminal strips cannot scroll: keep the active tab and `+` visible by
     * showing a window around it plus `…` markers. Browser strips keep every
     * tab (they scroll horizontally), so this only runs when the host reports
     * terminal columns.
     */
    protected windowItems(items: TabItem[]): TabItem[] {
        const columns = Math.floor(Number(this.state.tabStripColumns) || 0);
        if (!items.length || columns <= 0) {
            return items;
        }
        const budget = Math.max(12, columns - getDisplayWidth(this.createLabel) - 1);
        const widthOf = (item: TabItem): number => getDisplayWidth(item.label) + (item.showClose ? 2 : 0);
        const total = items.reduce((sum, item) => sum + widthOf(item), 0);
        if (total <= budget) {
            return items;
        }
        const active = Math.max(0, items.findIndex(item => item.active));
        const indicator = 3;
        const fits = (start: number, end: number, used: number): boolean =>
            used + (start > 0 ? indicator : 0) + (end < items.length ? indicator : 0) <= budget;
        let best = { start: active, end: active + 1 };
        for (let start = active; start >= 0; start -= 1) {
            let used = 0;
            for (let end = start + 1; end <= items.length; end += 1) {
                used += widthOf(items[end - 1]);
                if (!fits(start, end, used)) {
                    break;
                }
                if (start <= active && end > active) {
                    const size = end - start;
                    const bestSize = best.end - best.start;
                    const centered = Math.abs((start + end - 1) / 2 - active);
                    const bestCentered = Math.abs((best.start + best.end - 1) / 2 - active);
                    if (size > bestSize || (size === bestSize && centered < bestCentered)) {
                        best = { start, end };
                    }
                }
            }
        }
        const windowed = items.slice(best.start, best.end);
        const marker = (): TabItem => ({ id: '', label: ' … ', active: false, showClose: false, disabled: true });
        return [
            ...(best.start > 0 ? [marker()] : []),
            ...windowed,
            ...(best.end < items.length ? [marker()] : [])
        ];
    }

    get createLabel(): string {
        return ' + ';
    }

    get closeLabel(): string {
        return '✕';
    }

    select(id: string): void {
        this.state.sessionTabsAction?.select?.(id);
    }

    create(): void {
        this.state.sessionTabsAction?.create?.();
    }

    close(id: string): void {
        this.state.sessionTabsAction?.close?.(id);
    }

    /** Tab names use the session topic/title, never the raw session id. */
    protected tabTitle(session: AgentConsoleSessionItem): string {
        const candidate = [session.title, session.summary, session.focusSummary, session.rootRequest]
            .map(value => String(value || '').replace(/\s+/g, ' ').trim())
            .find(value => value && value !== session.id);
        const title = candidate
            || formatAgentUiLabel(this.translator, 'agent.menu.panel.sessions.untitled', 'New session');
        return title.length > 22 ? `${title.slice(0, 21)}…` : title;
    }
}
