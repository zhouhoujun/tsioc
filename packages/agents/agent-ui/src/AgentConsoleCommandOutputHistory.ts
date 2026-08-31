/**
 * AgentConsole command-output durable history (P267).
 *
 * The shared command-output model, `CommandOutputStore` port, and
 * `AbstractCommandOutputStore` live in `@tsdi/agent` (the common dependency of
 * agent-ui and agent-gateway) so the durable-store logic is implemented once
 * and reused by every concrete store. This module re-exports them for agent-ui
 * callers, keeping the public surface identical.
 */
export {
    AgentConsoleCommandOutputHistoryEntry,
    CommandOutputQuery,
    CommandOutputPage,
    CommandOutputStore,
    AbstractCommandOutputStore,
    InMemoryCommandOutputStore,
    AGENT_CONSOLE_COMMAND_OUTPUT_HISTORY_CAP,
    AGENT_CONSOLE_COMMAND_OUTPUT_DEFAULT_PAGE,
    redactCommandOutputSecret,
    shouldRedactCommandOutputKey
} from '@tsdi/agent';
