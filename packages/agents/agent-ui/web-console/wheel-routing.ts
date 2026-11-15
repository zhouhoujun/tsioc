import { isAgentConsoleSuggestionMenu, type AgentConsoleSessionState } from '@tsdi/agent-ui';

export interface AgentConsoleWheelHost {
    getState(): AgentConsoleSessionState;
    resolveFollower(): { wheel(deltaY: number): void; atTop: boolean } | null;
    requestOlderMessages(): void;
}

/**
 * Route a wheel event by the active surface.
 *
 * A long text dialog owns the wheel while open (its own page scrolls); a
 * blocking select dialog moves its selection. Otherwise the viewport
 * transcript follower scrolls history — never the dialog underneath.
 */
export function routeAgentConsoleWheel(event: WheelEvent, host: AgentConsoleWheelHost): void {
    if (event.deltaY === 0) {
        return;
    }
    const state = host.getState();
    if (state.textOverlay) {
        state.scrollTextOverlay(event.deltaY > 0 ? 1 : -1);
        event.preventDefault();
        return;
    }
    const menu = state.selectMenu;
    if (menu && !isAgentConsoleSuggestionMenu(menu)) {
        state.moveSelectMenu(event.deltaY > 0 ? 1 : -1);
        event.preventDefault();
        return;
    }
    if (state.messageLayout !== 'viewport') {
        return;
    }
    const follower = host.resolveFollower();
    if (!follower) {
        return;
    }
    follower.wheel(event.deltaY);
    if (event.deltaY < 0 && follower.atTop) {
        host.requestOlderMessages();
    }
    event.preventDefault();
}
