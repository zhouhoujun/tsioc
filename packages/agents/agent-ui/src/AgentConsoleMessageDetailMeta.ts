import { formatAgentPanelLabel as panelLabel, type AgentUiTranslator } from './agent-ui.i18n';

/** Console state slice needed by the message inspector header. */
export interface AgentConsoleMessageDetailState {
    displayMessages: Array<{ id: string }>;
    messageDetailScroll: number;
    messageDetailColumnScroll: number;
    messageDetailMaxColumn: number;
}

/**
 * Header of the message inspector: `消息 1/2 用户  |  行 1-1 / 1  |  列 1/16`.
 *
 * Extracted from `AgentConsoleMessageDetailPanelComponent` (source-size
 * ratchet) and localized: the role word and chrome are UI copy, the indexes and
 * line/column counters stay numbers.
 */
export function formatAgentMessageDetailSummary(
    state: AgentConsoleMessageDetailState,
    message: { id?: string; role?: string },
    contentLineCount: number,
    visibleLineCount: number,
    translator?: AgentUiTranslator | null
): string {
    const role = String(message.role || 'system').toLowerCase();
    const roleLabel = panelLabel(translator, 'messageDetail', `role${role.charAt(0).toUpperCase()}${role.slice(1)}`, role);
    const index = Math.max(0, state.displayMessages.findIndex(item => item.id === message.id));
    const start = Math.min(contentLineCount, state.messageDetailScroll + 1);
    const end = Math.min(contentLineCount, state.messageDetailScroll + visibleLineCount);
    const column = state.messageDetailColumnScroll + 1;
    const totalColumns = Math.max(1, state.messageDetailMaxColumn);
    return panelLabel(
        translator,
        'messageDetail',
        'summary',
        'message {index}/{messages} {role}  |  lines {start}-{end} / {lines}  |  col {column}/{columns}',
        {
            index: index + 1,
            messages: state.displayMessages.length,
            role: roleLabel,
            start,
            end,
            lines: contentLineCount,
            column,
            columns: totalColumns
        }
    );
}
