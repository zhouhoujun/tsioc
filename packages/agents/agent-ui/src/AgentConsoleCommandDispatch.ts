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
}

export async function dispatchAgentConsoleCommand(host: AgentConsoleCommandDispatchHost, value: string): Promise<boolean> {
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
    if (!host.state.commandHints.includes(canonical)) {
        const reason = resolved.matches.length
            ? `Ambiguous command: ${parsed.command}  (${resolved.matches.join(', ')})`
            : `Unknown command: ${parsed.command}`;
        host.state.commandExecutionController.fail(requestId, reason, false);
        host.notify(reason);
        host.pendingCommandRequestId = previousRequestId;
        return true;
    }
    const parsedArgs = parseAgentConsoleCommandArguments(getAgentConsoleCommandDefinition(canonical), args);
    if (parsedArgs.diagnostics.length) {
        const reason = formatAgentConsoleCommandDiagnostics(parsedArgs.diagnostics);
        host.state.commandExecutionController.fail(requestId, reason, false);
        // Preserve the exact command so the user can correct it and retry.
        host.state.setInput(parsed.raw, parsed.raw.length);
        host.notify(formatAgentConsoleCommandDiagnosticEcho(parsedArgs.diagnostics).join('\n'));
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
    host.state.commandExecutionController.fail(requestId, `Unknown command: ${parsed.command}`, false);
    host.pendingCommandRequestId = previousRequestId;
    return false;
}
