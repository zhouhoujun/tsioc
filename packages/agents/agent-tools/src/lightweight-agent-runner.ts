import { randomUUID } from 'crypto';
import { Injectable, Optional } from '@tsdi/ioc';
import { AgentRuntime, SessionStore } from '@tsdi/agent';
import {
    NestedAgentRunner,
    NestedAgentRunRequest,
    NestedAgentRunResult,
    parseDelegatedAgentReport
} from './nested-agent-runner';

@Injectable()
export class LightweightAgentRunner extends NestedAgentRunner {
    private started = false;

    constructor(
        @Optional() private runtime?: AgentRuntime | null,
        @Optional() private sessions?: SessionStore | null
    ) {
        super();
    }

    async run(request: NestedAgentRunRequest): Promise<NestedAgentRunResult> {
        if (!this.runtime) {
            throw new Error('LightweightAgentRunner requires AgentRuntime. Ensure AgentModule is loaded and AgentRuntime is registered.');
        }

        const sessionId = request.sessionId || `sub-${randomUUID()}`;

        if (!this.started) {
            await this.runtime.start();
            this.started = true;
        }

        // M2b: apply toolset filter to restrict sub-agent tools
        if (request.toolsets?.length) {
            this.runtime.setSessionToolFilter(sessionId, request.toolsets);
        }

        const prompt = request.systemPrompt
            ? `## Instructions\n${request.systemPrompt}\n\n## Task\n${request.prompt}`
            : request.prompt;

        try {
            const result = await this.runtime.runTurn(sessionId, prompt);

            const messages = await this.runtime.getMessages(sessionId);
            const userCount = messages.filter(m => m.role === 'user').length;
            const toolCount = messages.filter(m => m.role === 'tool').length;

            const report = parseDelegatedAgentReport(result.message.content);

            // M2d: import sub-agent messages into parent session
            if (request.parentSessionId && this.sessions) {
                try {
                    const subMessages = await this.runtime.getMessages(sessionId);
                    for (const msg of subMessages) {
                        await this.sessions.append(request.parentSessionId, msg);
                    }
                } catch (err) {
                    // session merge must not break the sub-agent result
                }
            }

            return {
                content: result.message.content,
                sessionId,
                turnCount: userCount,
                toolCalls: toolCount,
                model: result.message.metadata?.model,
                finishReason: result.message.metadata?.finishReason,
                usage: result.message.metadata?.usage,
                report
            };
        } finally {
            // M2b: clear toolset filter for the sub-agent session
            if (request.toolsets?.length) {
                this.runtime.clearSessionToolFilter(sessionId);
            }
        }
    }
}
