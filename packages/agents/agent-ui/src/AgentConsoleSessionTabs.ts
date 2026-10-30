import { Attribute, Component } from '@tsdi/components';
import { AgentConsoleSessionState, AgentConsoleSessionItem } from './AgentConsoleSessionState';
import { AgentConsoleTheme, defaultAgentConsoleTheme } from './AgentConsoleTheme';
import { resolvePanelThemeStyles } from './AgentConsolePanelStyles';

interface SessionTabView {
    id: string;
    label: string;
    style: Record<string, string>;
}

@Component({
    selector: 'agent-console-session-tabs',
    template: `
    <p class="console-session-tabs" v-style="barStyle" role="tablist" v-show="visible">
        <span class="session-tab" role="tab" v-for="tab in tabs" v-style="tab.style" @click="selectTab(tab.id)">{{tab.label}}</span>
        <span class="session-tab-new" role="button" v-style="newStyle" @click="createTab"> + </span>
    </p>
    `
})
export class AgentConsoleSessionTabsComponent {
    constructor(private state: AgentConsoleSessionState) {
    }

    @Attribute() theme: AgentConsoleTheme = defaultAgentConsoleTheme;

    protected get activeThemeStyles() {
        return resolvePanelThemeStyles(this.state, this.theme);
    }

    get visible(): boolean {
        return this.state.messageLayout === 'viewport';
    }

    get tabs(): SessionTabView[] {
        if (!this.visible) {
            return [];
        }
        return (this.state.sessions || []).filter(session => session && session.id).map(session => ({
            id: session.id,
            label: `${session.id === this.state.sessionId || session.current ? '●' : ' '} ${this.tabTitle(session)} `,
            style: session.id === this.state.sessionId || session.current
                ? this.activeThemeStyles.sessionsSelected
                : this.activeThemeStyles.statusValue
        }));
    }

    get barStyle(): Record<string, string> {
        return { ...this.activeThemeStyles.statusValue, padding: '0 1ch' };
    }

    get newStyle(): Record<string, string> {
        return { ...this.activeThemeStyles.sessionsAccent, 'font-weight': 'bold' };
    }

    protected tabTitle(session: AgentConsoleSessionItem): string {
        const candidate = String(session.title || session.summary || session.focusSummary || session.rootRequest || '').replace(/\s+/g, ' ').trim();
        const raw = candidate && candidate !== session.id ? candidate : session.id.slice(0, 8);
        const text = raw || session.id.slice(0, 8);
        return text.length > 22 ? `${text.slice(0, 21)}…` : text;
    }

    selectTab(id: string): void {
        this.state.sessionTabsAction?.select?.(id);
    }

    createTab(): void {
        this.state.sessionTabsAction?.create?.();
    }
}
