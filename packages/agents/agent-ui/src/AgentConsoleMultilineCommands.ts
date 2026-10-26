import { formatAgentUiNotice, type AgentUiTranslator } from './agent-ui.i18n';

/**
 * Host surface for the multiline draft commands.
 *
 * Extracted from `AgentConsoleCommandHandlers` so the facade-adjacent command
 * registry file does not grow every time a multiline notice is added.
 */
export interface MultilineCommandHost {
    multilineMode: boolean;
    draftLines: string[];
    translator?: AgentUiTranslator | null;
    notify(message: string): void;
    submitMultilineDraft(): Promise<void>;
}

/** `/multiline` toggles draft accumulation and reports the new state. */
export async function runMultilineCommand(ctx: MultilineCommandHost): Promise<boolean> {
    ctx.multilineMode = !ctx.multilineMode;
    if (ctx.multilineMode) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'multilineModeOn'));
        return true;
    }
    const discarded = ctx.draftLines.length > 0;
    ctx.draftLines = [];
    ctx.notify(formatAgentUiNotice(ctx.translator, discarded ? 'multilineDraftDiscarded' : 'multilineModeOff'));
    return true;
}

/** `/send` submits the accumulated draft; it is a no-op when no line is pending. */
export async function runSendCommand(ctx: MultilineCommandHost): Promise<boolean> {
    if (!ctx.draftLines.length) {
        return true;
    }
    await ctx.submitMultilineDraft();
    return true;
}
