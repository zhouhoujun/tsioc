/** @deprecated Import the shared command execution contract from `@tsdi/agent`. */
export {
    AgentConsoleCommandStatus,
    AgentConsoleCommandExecution,
    AgentConsoleCommandExecutionAction,
    AGENT_CONSOLE_COMMAND_EXECUTION_RING_CAP,
    createBeginCommandExecutionAction,
    createCompleteCommandExecutionAction,
    createFailCommandExecutionAction,
    createLinkCommandOutputAction,
    reduceAgentConsoleCommandExecution
} from '@tsdi/agent';
