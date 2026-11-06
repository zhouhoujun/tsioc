import type { AgentConsoleSessionState } from './AgentConsoleSessionState';
import type { CommandHandlerContext } from './AgentConsoleCommandHandlerContext';
import { COMMAND_HANDLERS } from './AgentConsoleCommandHandlers';
import { parseSlashCommandLine } from './AgentConsoleInputHelpers';
import {
    formatAgentConsoleCommandDiagnosticEcho,
    formatAgentConsoleCommandDiagnostics,
    getAgentConsoleCommandDefinition,
    getAgentConsoleCommandName,
    parseAgentConsoleCommandArguments
} from './AgentConsoleCommandRegistry';

export interface AgentConsoleCommandDispatchHost {
    readonly state: AgentConsoleSessionState;
    pendingCommandRequestId: string;
    resolveUniqueCommandPrefix(input: string): { command: string; matches: string[] };
    notify(message: string, duration?: number): void;
    buildCommandContext(abortSignal?: AbortSignal): CommandHandlerContext;
    /** Optional host render transaction around a command's synchronous burst. */
    beginRenderBatch?(): void;
    endRenderBatch?(): void;
}

export async function dispatchAgentConsoleCommand(host: AgentConsoleCommandDispatchHost, value: string): Promise<boolean> {
    const begin = host.beginRenderBatch ? () => host.beginRenderBatch!() : undefined;
    const end = host.endRenderBatch ? () => host.endRenderBatch!() : undefined;
    begin?.();
    let released = false;
    const release = (): void => {
        if (released) return;
        released = true;
        end?.();
    };
    // Commands that stay open for network/server work must not freeze the UI;
    // release the transaction shortly after the synchronous popup burst.
    const timer = begin ? setTimeout(release, 48) : undefined;
    try {
        return await dispatchAgentConsoleCommandInternal(host, value);
    } finally {
        if (timer) clearTimeout(timer);
        release();
    }
}

async function dispatchAgentConsoleCommandInternal(host: AgentConsoleCommandDispatchHost, value: string): Promise<boolean> {
    const parsed = parseSlashCommandLine(value);
    if (!parsed.command.startsWith('/')) {
        return false;
    }
    const resolved = host.resolveUniqueCommandPrefix(parsed.command);
    const canonical = getAgentConsoleCommandName(resolved.command);
    const args = String(parsed.args || '').trim();
    const previousRequestId = host.pendingCommandRequestId;
    const requestId = host.state.commandExecutionController.begin(canonical, args);
    host.pendingCommandRequestId = requestId;
    const definition = getAgentConsoleCommandDefinition(canonical);
    if (!host.state.commandHints.includes(canonical) && !definition) {
        const reason = resolved.matches.length
            ? host.state.translateLabel('agent.command.ambiguous', { command: parsed.command, matches: resolved.matches.join(', ') }, `Ambiguous command: ${parsed.command}  (${resolved.matches.join(', ')})`)
            : host.state.translateLabel('agent.command.unknown', { command: parsed.command }, `Unknown command: ${parsed.command}`);
        host.state.commandExecutionController.fail(requestId, reason, false);
        host.notify(reason);
        host.pendingCommandRequestId = previousRequestId;
        return true;
    }
    const translate = (key: string, params?: Record<string, any>, fallback?: string) => host.state.translateLabel(key, params, fallback ?? key);
    const parsedArgs = parseAgentConsoleCommandArguments(definition, args, translate);
    if (parsedArgs.diagnostics.length) {
        const reason = formatAgentConsoleCommandDiagnostics(parsedArgs.diagnostics, translate);
        host.state.commandExecutionController.fail(requestId, reason, false);
        // Preserve the exact command so the user can correct it and retry.
        host.state.setInput(parsed.raw, parsed.raw.length);
        host.notify(formatAgentConsoleCommandDiagnosticEcho(parsedArgs.diagnostics, translate).join('\n'));
        host.pendingCommandRequestId = previousRequestId;
        return true;
    }
    const handler = COMMAND_HANDLERS[canonical];
    if (handler) {
        try {
            const handled = await handler(host.buildCommandContext(host.state.commandExecutionController.signal(requestId)), args, { command: canonical, matches: resolved.matches, parsedArgs });
            if (!host.state.commandExecutionController.isCurrent(requestId)) {
                host.pendingCommandRequestId = previousRequestId;
                return true;
            }
            host.state.commandExecutionController.complete(requestId, 'succeeded');
            host.pendingCommandRequestId = previousRequestId;
            return handled;
        } catch (error) {
            if (!host.state.commandExecutionController.isCurrent(requestId)) {
                host.pendingCommandRequestId = previousRequestId;
                return true;
            }
            const reason = error instanceof Error ? error.message : String(error);
            host.state.commandExecutionController.fail(requestId, reason, true);
            host.notify(reason);
            host.pendingCommandRequestId = previousRequestId;
            return true;
        }
    }
    host.state.commandExecutionController.fail(requestId, host.state.translateLabel('agent.command.unknown', { command: parsed.command }, `Unknown command: ${parsed.command}`), false);
    host.pendingCommandRequestId = previousRequestId;
    return false;
}
