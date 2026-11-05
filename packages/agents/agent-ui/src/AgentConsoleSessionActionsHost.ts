import type { AgentToolDefinition } from '@tsdi/agent';
import type {
    AgentConsoleActivity,
    AgentConsoleApprovalRequest,
    AgentConsoleProviderWizardState,
    AgentConsoleSelectMenu,
    AgentConsoleSelectOption,
    AgentConsoleToolItem,
    AgentConsoleToolRun
} from './AgentConsoleStateTypes';
import { getAgentConsoleInputTokenRange } from './AgentConsoleSuggestions';
import { refreshInputSuggestions as refreshInputSuggestionsView } from './AgentConsoleSuggestionRefresh';
import { AgentConsoleSessionInputProcessingHost } from './AgentConsoleSessionInputProcessingHost';
import type { AgentConsoleSessionState } from './AgentConsoleSessionState';
import {
    clearRunningToolInState,
    clearToolActivityInState,
    pushActivityInState,
    removePendingApprovalInState,
    setPendingApprovalsInState,
    setRunningToolInState,
    upsertPendingApprovalInState,
    upsertToolRunInState
} from './AgentConsoleExecutionState';
import {
    acceptSelectMenu as acceptSelectMenuInState,
    acceptSelectMenuIndex as acceptSelectMenuIndexInState,
    cancelSelectMenu as cancelSelectMenuInState,
    chooseSelectMenuIndex as chooseSelectMenuIndexInState,
    closeSelectMenu as closeSelectMenuInState,
    completeSelectMenu as completeSelectMenuInState,
    confirmSelectMenu as confirmSelectMenuInState,
    confirmSelectMenuAndKeepOpen as confirmSelectMenuAndKeepOpenInState,
    dismissSelectMenuLayer as dismissSelectMenuLayerInState,
    isArgumentSuggestionMenu as isArgumentSuggestionMenuInState,
    moveSelectMenu as moveSelectMenuInState,
    moveSelectMenuPage as moveSelectMenuPageInState,
    moveSelectMenuToEdge as moveSelectMenuToEdgeInState,
    openSelectMenu as openSelectMenuInState,
    openSubSelectMenu as openSubSelectMenuInState,
    resolveSelectMenu as resolveSelectMenuInState,
    resolveSelectedSelectMenuOption,
    selectAsync as selectAsyncInState,
    setSelectMenuIndex as setSelectMenuIndexInState,
    shouldSubmitConfirmedSelectMenuValue as shouldSubmitConfirmedSelectMenuValueInState
} from './AgentConsoleSelectMenuState';

/** Select menu, provider wizard and tool activity facade. */
export abstract class AgentConsoleSessionActionsHost extends AgentConsoleSessionInputProcessingHost {
    protected abstract self(): AgentConsoleSessionState;

    setPendingApprovals(requests: AgentConsoleApprovalRequest[]): void { setPendingApprovalsInState(this.self(), requests); }

    upsertPendingApproval(request: AgentConsoleApprovalRequest): void { upsertPendingApprovalInState(this.self(), request); }

    removePendingApproval(requestId: string): void { removePendingApprovalInState(this.self(), requestId); }

    selectAsync(title: string, options: AgentConsoleSelectOption[], selectedIndex = 0, hint?: string, kind?: string): Promise<string | undefined> { return selectAsyncInState(this.self(), title, options, selectedIndex, hint, kind); }
    openSelectMenu(title: string, options: AgentConsoleSelectOption[], selectedIndex = 0, hint?: string, kind?: string): void { openSelectMenuInState(this.self(), title, options, selectedIndex, hint, kind); }
    closeSelectMenu(): void { closeSelectMenuInState(this.self()); }
    async dismissSelectMenuLayer(): Promise<void> { return dismissSelectMenuLayerInState(this.self()); }
    setSelectMenuIndex(index: number): void { setSelectMenuIndexInState(this.self(), index); }
    moveSelectMenu(delta: number): void { moveSelectMenuInState(this.self(), delta); }
    moveSelectMenuToEdge(edge: 'start' | 'end'): void { moveSelectMenuToEdgeInState(this.self(), edge); }
    moveSelectMenuPage(direction: 1 | -1): void { moveSelectMenuPageInState(this.self(), direction); }
    get selectedSelectMenuOption(): AgentConsoleSelectOption | undefined { return resolveSelectedSelectMenuOption(this.self()); }
    isArgumentSuggestionMenu(menu: AgentConsoleSelectMenu | undefined): boolean { return isArgumentSuggestionMenuInState(this.self(), menu); }
    shouldSubmitConfirmedSelectMenuValue(menu: AgentConsoleSelectMenu | undefined, value?: string): boolean { return shouldSubmitConfirmedSelectMenuValueInState(this.self(), menu, value); }
    async confirmSelectMenu(value?: string): Promise<string | undefined> { return confirmSelectMenuInState(this.self(), value); }
    async confirmSelectMenuAndKeepOpen(value?: string): Promise<string | undefined> { return confirmSelectMenuAndKeepOpenInState(this.self(), value); }
    async completeSelectMenu(value?: string): Promise<string | undefined> { return completeSelectMenuInState(this.self(), value); }
    async acceptSelectMenu(value?: string): Promise<{ value: string | undefined; submitted: boolean }> { return acceptSelectMenuInState(this.self(), value); }
    async acceptSelectMenuIndex(index: number): Promise<{ value: string | undefined; submitted: boolean }> { return acceptSelectMenuIndexInState(this.self(), index); }
    async chooseSelectMenuIndex(index: number): Promise<void> { return chooseSelectMenuIndexInState(this.self(), index); }
    async cancelSelectMenu(): Promise<void> { return cancelSelectMenuInState(this.self()); }
    async openSubSelectMenu(title: string, options: AgentConsoleSelectOption[], selectedIndex = 0, hint?: string): Promise<void> { return openSubSelectMenuInState(this.self(), title, options, selectedIndex, hint); }
    async resolveSelectMenu(value: string | undefined): Promise<void> { return resolveSelectMenuInState(this.self(), value); }

    setProviderWizard(patch: Partial<AgentConsoleProviderWizardState>): void {
        this.providerWizard = {
            ...(this.providerWizard || {
                open: true, phase: 'choose', stepIndex: 0, stepCount: 1,
                stepLabel: '', progress: '', prompt: '', help: '', hint: '', secret: false, summary: []
            }),
            ...patch
        };
    }

    closeProviderWizard(): void {
        this.providerWizard = undefined;
        this.inputSecret = false;
        this.inputPrompt = this.consoleOptions.inputPrompt;
    }

    /**
     * True when the open suggestion menu completes a subcommand/enum argument
     * (`/statusline l|ist`). Enter must then execute the completed command;
     * Tab stays a pure completion.
     */

    /** Tab: fill the input with the highlighted suggestion without executing it. */

    /**
     * Re-open the `/` or `@` suggestion menu for the current token.
     *
     * Esc closes the menu; without this, Tab could not bring it back and the
     * only way to continue was editing the text.
     */
    reopenInputSuggestions(): boolean {
        if (!getAgentConsoleInputTokenRange(this.input, this.inputCursor)?.token) {
            return false;
        }
        this.refreshInputSuggestions();
        return true;
    }

    refreshInputSuggestions(): void {
        refreshInputSuggestionsView(this.self());
    }

    setRunningTool(toolName: string): void { setRunningToolInState(this.self(), toolName); }

    clearRunningTool(toolName: string): void { clearRunningToolInState(this.self(), toolName); }

    clearToolActivity(): void { clearToolActivityInState(this.self()); }

    pushActivity(kind: AgentConsoleActivity['kind'], message: string): void { pushActivityInState(this.self(), kind, message); }

    upsertToolRun(run: AgentConsoleToolRun): void { upsertToolRunInState(this.self(), run); }

    summarize(value: string): string {
        const text = value.replace(/\s+/g, ' ').trim();
        return text.length > this.consoleOptions.summaryMaxLength
            ? `${text.slice(0, this.consoleOptions.summaryMaxLength)}...`
            : text;
    }

    toToolItem(definition: AgentToolDefinition, active: boolean): AgentConsoleToolItem {
        return {
            name: definition.name,
            toolset: definition.toolset,
            active,
            activationKind: definition.activation?.kind
        };
    }
}
