/**
 * @file @tsdi/agent-ui/console — console-platform entry point.
 *
 * This file exports console-specific code only.
 * Base code is available via @tsdi/agent-ui (main entry).
 */
export * from './ConsoleAgentConsoleSessionState';
import * as voiceHandlers from '../src/AgentConsoleVoiceHandlers';
import { installVoiceHandlers } from '../src/AgentConsoleVoiceLoader';
installVoiceHandlers(voiceHandlers);
export * from './run-agent-ui';
export * from './run-agent-console';
