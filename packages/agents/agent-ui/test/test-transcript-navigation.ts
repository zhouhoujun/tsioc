import { AgentConsoleSessionState } from '../src/AgentConsoleSessionState';
import { DefaultAgentConsoleTranscriptNavigationController } from '../src/AgentConsoleTranscriptNavigation';

const controllers = new WeakMap<AgentConsoleSessionState, DefaultAgentConsoleTranscriptNavigationController>();

export function navigationFor(state: AgentConsoleSessionState): DefaultAgentConsoleTranscriptNavigationController {
    let controller = controllers.get(state);
    if (!controller) {
        controller = new DefaultAgentConsoleTranscriptNavigationController(state);
        controllers.set(state, controller);
    }
    return controller;
}
