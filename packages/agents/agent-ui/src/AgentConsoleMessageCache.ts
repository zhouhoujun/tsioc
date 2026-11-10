import type { AgentConsoleSessionState } from './AgentConsoleSessionState';
import type { AgentConsoleTheme } from './AgentConsoleTheme';
import type { AgentConsoleRenderedMessageItem } from './AgentConsoleMessageRenderers';

export const messageItemsCache = new WeakMap<object, {
    messages: Array<{ id?: string; role?: string; content: string; metadata?: Record<string, any> }>;
    slotKeys: string[];
    selectedMessageId: string;
    messagesFocused: boolean;
    theme: AgentConsoleTheme;
    statusLabels: AgentConsoleSessionState['consoleOptions']['messageStatusLabels'];
    statusSymbol: AgentConsoleSessionState['consoleOptions']['messageStatusSymbol'];
    username: AgentConsoleSessionState['consoleOptions']['username'];
    rawMode: boolean;
    streaming: boolean;
    showTimestamps: boolean;
    showCriticalMarks: boolean;
    showToolOutput: boolean;
    showUsername: boolean;
    timelineMode: boolean;
    timelineViewMode: string;
    messageDetailOpen: boolean;
    markdownContentWidth: number;
    collapsedTurns: Record<string, boolean>;
    items: AgentConsoleRenderedMessageItem[];
}>();

