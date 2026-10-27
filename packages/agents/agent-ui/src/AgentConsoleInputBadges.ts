import { formatAgentPanelLabel as panelLabel, type AgentUiTranslator } from './agent-ui.i18n';

/** Minimal slice of the console state used to build the input prompt badges. */
export interface AgentConsoleInputBadgeState {
    planMode?: boolean;
    /** `/yolo` auto-approve is persisted, so it must stay visible. */
    yoloMode?: boolean;
    vimMode?: boolean;
    inputMode?: string;
    isSshShellActive?: boolean;
    sshShell?: { hostId?: string } | null;
    queuedPromptCount?: number;
}

/**
 * Prompt badges rendered after the input prompt (`> · 计划 · vim 普通 · 3 条排队`).
 *
 * Extracted from `AgentConsoleInputPanelComponent` (source-size ratchet) and
 * localized: the badges are user-visible copy, while the SSH host id stays raw.
 */
export function formatAgentConsoleInputBadges(
    state?: AgentConsoleInputBadgeState,
    translator?: AgentUiTranslator | null
): string[] {
    const label = (key: string, fallback: string, params?: Record<string, any>) =>
        panelLabel(translator, 'input', key, fallback, params);
    const badges: string[] = [];
    if (state?.planMode) {
        badges.push(label('planBadge', 'plan'));
    }
    if (state?.yoloMode) {
        badges.push(label('yoloBadge', 'auto-approve'));
    }
    if (state?.vimMode) {
        badges.push(String(state.inputMode || '') === 'normal'
            ? label('vimNormal', 'vim normal')
            : label('vimInsert', 'vim insert'));
    }
    if (state?.isSshShellActive) {
        badges.push(`ssh ${state.sshShell?.hostId || ''}`);
    }
    const queuedCount = state?.queuedPromptCount ?? 0;
    if (queuedCount > 0) {
        badges.push(label('queuedBadge', '{count} queued', { count: queuedCount }));
    }
    return badges;
}
