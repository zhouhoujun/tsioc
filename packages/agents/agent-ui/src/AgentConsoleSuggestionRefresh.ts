import type { AgentConsoleSelectOption, AgentConsoleSessionState } from './AgentConsoleSessionState';
import { agentConsoleCommandHints } from './AgentConsoleCommandRegistry';
import { resolveDynamicArgumentValues } from './AgentConsoleArgumentValues';
import {
    AGENT_CONSOLE_SUGGESTIONS_HINT,
    AGENT_CONSOLE_SUGGESTIONS_TITLE,
    applyAgentConsoleSuggestion,
    getAgentConsoleInputTokenRange,
    isAgentConsoleSuggestionMenu,
    resolveAgentConsoleInputSuggestions
} from './AgentConsoleSuggestions';

export function refreshInputSuggestions(state: AgentConsoleSessionState): void {
        if (state.selectMenu && !isAgentConsoleSuggestionMenu(state.selectMenu)) {
            return;
        }
        if (state.suppressSuggestionMenu) {
            state.suppressSuggestionMenu = false;
            return;
        }
        const currentInput = state.input;
        const currentCursor = state.inputCursor;
        const active = getAgentConsoleInputTokenRange(currentInput, currentCursor);
        const applySuggestions = (workspaceSuggestions: AgentConsoleSelectOption[] = []) => {
            const activeToken = getAgentConsoleInputTokenRange(state.input, state.inputCursor)?.token;
            const commandCandidates = activeToken === '/'
                ? agentConsoleCommandHints(state.injectedCommandHints)
                : state.commandHints;
            const options = resolveAgentConsoleInputSuggestions(
                state.input,
                state.inputCursor,
                commandCandidates,
                state.tools,
                workspaceSuggestions,
                state.suggestionLabels(),
                (command, index, words, token) => resolveDynamicArgumentValues({ tools: state.tools, sessions: state.sessions, mentionCatalog: state.mentionCatalog }, command, index, token)
            );
            if (!options.length) {
                if (isAgentConsoleSuggestionMenu(state.selectMenu)) {
                    state.selectMenu = undefined;
                    state.selectMenuAction = undefined;
                }
                state.syncDerivedInputFocus();
                return;
            }
            // Async workspace suggestions append after the first render; keeping
            // the previous value then parked the highlight on a tool mention
            // (`@tim` + Enter submitted `@time` instead of inserting the file).
            const selectedValue = state.selectMenuTouched ? state.selectedSelectMenuOption?.value : undefined;
            const selectedIndex = Math.max(0, options.findIndex(option => option.value === selectedValue));
            state.selectMenu = {
                title: AGENT_CONSOLE_SUGGESTIONS_TITLE,
                hint: state.consoleOptions.suggestionsHint,
                options,
                selectedIndex
            };
            state.syncDerivedInputFocus();
            state.selectMenuAction = async (value?: string) => {
                if (!value) {
                    return;
                }
                const next = applyAgentConsoleSuggestion(state.input, state.inputCursor, value);
                state.input = next.value;
                state.inputCursor = state.clampCursor(state.input, next.cursor);
                state.refreshInputSuggestions();
                state.syncDerivedInputFocus();
            };
        };

        applySuggestions();
        if (!active?.token?.startsWith('@') || !state.workspaceMentionResolver) {
            return;
        }
        const requestId = ++state.workspaceSuggestionRequestId;
        void state.workspaceMentionResolver.resolveSuggestions(state.workspace, active.token, undefined, state.mentionCatalog).then(options => {
            if (requestId !== state.workspaceSuggestionRequestId) {
                return;
            }
            if (state.input !== currentInput || state.inputCursor !== currentCursor) {
                return;
            }
            applySuggestions(options);
        }).catch(() => undefined);

}
