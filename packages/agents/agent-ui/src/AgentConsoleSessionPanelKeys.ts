import type { AgentConsoleSessionState } from './AgentConsoleSessionState';
import { agentConsoleTextChunk } from './AgentConsoleKeyText';
import type { AgentConsoleTranscriptNavigationController } from './AgentConsoleTranscriptNavigation';

export interface SessionPanelKeyHost {
    dismiss(transcriptNavigation: AgentConsoleTranscriptNavigationController): Promise<boolean>;
}

/**
 * Sessions panel keys: type to search (title/id/workspace), Backspace edits,
 * Esc clears the filter and only then closes, `q` closes while unfiltered.
 */
export async function handleSessionsKeyView(
    state: AgentConsoleSessionState,
    normalized: string,
    transcriptNavigation: AgentConsoleTranscriptNavigationController,
    host: SessionPanelKeyHost
): Promise<boolean | undefined> {
    if (!state.sessionsFocused) {
        return undefined;
    }
    const filter = String(state.navFilter.text || '');
    const setFilter = (text: string) => {
        state.navFilter = { ...state.navFilter, text: text || undefined };
        state.clampSessionSelectionToFilter();
    };
    if (normalized === 'esc' || normalized === 'escape') {
        if (filter) {
            setFilter('');
            return true;
        }
        return host.dismiss(transcriptNavigation);
    }
    if (normalized === 'backspace' || normalized === '\u007f' || normalized === '\b') {
        if (filter) {
            setFilter(filter.slice(0, -1));
            return true;
        }
        return false;
    }
    // Fast backspace arrives as a single DEL chunk; remove one char per byte.
    if (/^[\u007f\b]+$/.test(normalized)) {
        if (!filter) return false;
        setFilter(filter.slice(0, -normalized.length));
        return true;
    }
    if (normalized === 'q' && !filter) {
        return host.dismiss(transcriptNavigation);
    }
    const chunk = agentConsoleTextChunk(normalized);
    if (chunk) {
        setFilter(filter + chunk);
        return true;
    }
    switch (normalized) {
        case 'copy':
            await state.copyFocusedTextAction?.(state.buildSelectedSessionCopyText(), state.translateLabel('agent.notice.copyLabelSession', undefined, 'session'));
            return true;
        case 'down': state.moveSessionSelection(1); return true;
        case 'up': state.moveSessionSelection(-1); return true;
        case 'pageup': state.moveSessionSelectionPage(-1); return true;
        case 'pagedown': state.moveSessionSelectionPage(1); return true;
        case 'home': state.selectFirstSession(); return true;
        case 'end': state.selectLastSession(); return true;
        case 'enter':
            if (!state.selectedSession?.id) {
                return false;
            }
            await state.activateSelectedSessionAction?.(state.selectedSession.id);
            return true;
        default:
            return false;
    }
}
