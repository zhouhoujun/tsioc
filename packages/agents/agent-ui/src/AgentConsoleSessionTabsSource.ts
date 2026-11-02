import { Injectable, Optional } from '@tsdi/ioc';
import { TranslatorService } from '@tsdi/i18n';
import { CommonTabBarSource, CommonTabItem } from '@tsdi/components/common';
import { AgentConsoleSessionState, AgentConsoleSessionItem } from './AgentConsoleSessionState';
import { resolvePanelThemeStyles } from './AgentConsolePanelStyles';
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
 * Agent-ui data/actions for the shared `common-tab-bar`. It scopes the strip to
 * the current project/workspace, applies the console theme and forwards tab
 * actions to the console state.
 */
@Injectable()
export class AgentConsoleSessionTabsSource implements CommonTabBarSource {
    constructor(private state: AgentConsoleSessionState, @Optional() private translator?: TranslatorService) {
    }

    get visible(): boolean {
        return this.state.messageLayout === 'viewport';
    }

    get items(): CommonTabItem[] {
        if (!this.visible) {
            return [];
        }
        return resolveAgentConsoleSessionTabs(this.state).map(session => {
            const active = session.id === this.state.sessionId || !!session.current;
            return {
                id: session.id,
                label: `  ${this.tabTitle(session)} `,
                active,
                style: active ? this.themeStyles.statusValue : this.themeStyles.statusLabel,
                showClose: active
            };
        });
    }

    get barStyle(): Record<string, string> {
        return { ...this.themeStyles.statusValue, padding: '0 1ch' };
    }

    get actionStyle(): Record<string, string> {
        return { ...this.themeStyles.sessionsAccent, 'font-weight': 'bold' };
    }

    get closeStyle(): Record<string, string> {
        return { ...this.themeStyles.statusValue, padding: '0 0 0 1ch' };
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

    protected get themeStyles() {
        return resolvePanelThemeStyles(this.state);
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
