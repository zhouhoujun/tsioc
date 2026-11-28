import { Injectable, Optional } from '@tsdi/ioc';
import { TranslatorService } from '@tsdi/i18n';
import { getDisplayWidth } from '@tsdi/components/common';
import { TabBarSource, TabItem } from '@tsdi/components/common/tab-bar';
import { AgentConsoleSessionState, AgentConsoleSessionItem } from './AgentConsoleSessionState';
import { resolveAgentConsoleSessionTabs } from './AgentConsoleSessionTabList';
export { resolveAgentConsoleSessionTabs } from './AgentConsoleSessionTabList';
import { resolveAgentConsoleStripWindow } from './AgentConsoleStripWindow';
import { rememberAgentConsoleSessionTabVisit } from './AgentConsoleSessionTabNavigation';
import { formatAgentPanelLabel, formatAgentUiLabel } from './agent-ui.i18n';

interface AgentConsoleTabWindow {
    visible: TabItem[];
    start: number;
    end: number;
    canBack: boolean;
    canForward: boolean;
    backStart: number;
}

/**
 * Resolve the sessions shown in the top strip: only the current project and,
 * when a previous exit recorded open tabs, only that open set. Sessions deleted
 * or archived since the last exit fall back to the project's current sessions.
 */
/**
 * Agent-ui data/actions for the shared `tab-bar`. It scopes the strip to
 * the current project/workspace, applies the console theme and forwards tab
 * actions to the console state.
 *
 * The terminal strip cannot scroll like a DOM strip, so it windows its items
 * around the active tab and switches pages left/right with the shared arrows.
 * Browsers leave `windowed` false and let the strip scroll itself.
 */
@Injectable()
export class AgentConsoleSessionTabsSource implements TabBarSource {
    protected lastWindow?: { start: number; end: number };

    constructor(private state: AgentConsoleSessionState, @Optional() private translator?: TranslatorService) {
    }

    get visible(): boolean {
        return this.state.messageLayout === 'viewport';
    }

    /** Terminal strips window `items`; DOM hosts scroll the strip natively. */
    get windowed(): boolean {
        return this.visible && Math.floor(Number(this.state.tabStripColumns) || 0) > 0;
    }

    get items(): TabItem[] {
        if (!this.visible) {
            return [];
        }
        return this.resolveWindow(this.allItems()).visible;
    }

    /** Overflow navigation for the terminal strip (DOM arrows scroll natively). */
    get canScrollBack(): boolean {
        return this.windowed && this.resolveWindow(this.allItems()).canBack;
    }

    get canScrollForward(): boolean {
        return this.windowed && this.resolveWindow(this.allItems()).canForward;
    }

    /** Every tab for the shared overflow menu (the terminal windows `items`). */
    get overflowItems(): TabItem[] {
        return this.visible ? this.allItems() : [];
    }

    get overflowLabel(): string {
        return ' … ';
    }

    get overflowTitle(): string {
        return formatAgentPanelLabel(this.translator, 'sessions', 'moreTabs', 'More tabs');
    }

    get scrollBackLabel(): string {
        return ' ‹ ';
    }

    get scrollForwardLabel(): string {
        return ' › ';
    }

    get scrollBackTitle(): string {
        return formatAgentPanelLabel(this.translator, 'sessions', 'scrollBack', 'Scroll tabs left');
    }

    get scrollForwardTitle(): string {
        return formatAgentPanelLabel(this.translator, 'sessions', 'scrollForward', 'Scroll tabs right');
    }

    scrollBack(): void {
        const window = this.resolveWindow(this.allItems());
        if (!window.canBack) {
            return;
        }
        this.state.tabWindowStart = window.backStart;
        this.state.tabWindowAnchor = String(this.state.sessionId || '');
    }

    scrollForward(): void {
        const window = this.resolveWindow(this.allItems());
        if (!window.canForward) {
            return;
        }
        this.state.tabWindowStart = window.end;
        this.state.tabWindowAnchor = String(this.state.sessionId || '');
    }

    /** All tabs in strip order, before winnowing to the visible page. */
    protected allItems(): TabItem[] {
        return resolveAgentConsoleSessionTabs(this.state).map(session => {
            const active = session.id === this.state.sessionId || !!session.current;
            return {
                id: session.id,
                label: ` ${this.tabTitle(session)} `,
                active,
                // Browsers reveal the close affordance on hover (like every
                // other tab strip); the terminal keeps it on the active tab.
                showClose: (active ? true : (this.state.tabCloseOnHover ? 'hover' : false)) as TabItem['showClose']
            };
        });
    }

    /**
     * Window the strip around the active tab (or around the page the user
     * scrolled to) and report whether the arrows can page further. Selecting
     * another tab re-centers because the manual page is anchored to the session
     * that was active when the arrows were used.
     */
    protected resolveWindow(items: TabItem[]): AgentConsoleTabWindow {
        const all: AgentConsoleTabWindow = {
            visible: items,
            start: 0,
            end: items.length,
            canBack: false,
            canForward: false,
            backStart: 0
        };
        const columns = Math.floor(Number(this.state.tabStripColumns) || 0);
        if (!items.length || columns <= 0) {
            this.lastWindow = { start: 0, end: items.length };
            return all;
        }
        const widthOf = (item: TabItem): number => getDisplayWidth(item.label) + (item.showClose ? 3 : 0);
        const total = items.reduce((sum, item) => sum + widthOf(item), 0);
        const plainBudget = Math.max(12, columns - getDisplayWidth(this.createLabel) - 1);
        if (total <= plainBudget) {
            this.lastWindow = { start: 0, end: items.length };
            return all;
        }
        // The single "more" control keeps one stable cell at the end of the
        // strip; the menu lists every tab instead of paging with arrows.
        const overflowBudget = getDisplayWidth(this.overflowLabel);
        const budget = Math.max(4, plainBudget - overflowBudget);
        const sessionId = String(this.state.sessionId || '');
        const activeById = sessionId ? items.findIndex(item => item.id === sessionId) : -1;
        const active = Math.max(0, activeById >= 0 ? activeById : items.findIndex(item => item.active));
        // A manual page is anchored to the session that was active when the
        // arrows were used, so selecting another tab re-centers the strip.
        const anchor = String(this.state.tabWindowAnchor || '');
        const manual = anchor && anchor === sessionId ? this.state.tabWindowStart : -1;
        const window = resolveAgentConsoleStripWindow({
            count: items.length,
            widthOf: index => widthOf(items[index]),
            active,
            budget,
            start: manual
        });
        this.lastWindow = { start: window.start, end: window.end };
        return {
            visible: items.slice(window.start, window.end),
            start: window.start,
            end: window.end,
            canBack: window.canBack,
            canForward: window.canForward,
            backStart: window.backStart
        };
    }

    get createLabel(): string {
        return ' + ';
    }

    get renameLabel(): string {
        return formatAgentPanelLabel(this.translator, 'sessions', 'rename', 'Rename tab');
    }

    get closeLabel(): string {
        return '✕';
    }

    select(id: string): void {
        rememberAgentConsoleSessionTabVisit(this.state, this.state.sessionId);
        rememberAgentConsoleSessionTabVisit(this.state, id);
        this.state.sessionTabsAction?.select?.(id);
    }

    create(): void {
        this.state.sessionTabsAction?.create?.();
    }

    close(id: string): void {
        this.state.sessionTabsAction?.close?.(id);
    }

    rename(id: string, title: string): void {
        this.state.sessionTabsAction?.rename?.(id, title);
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
