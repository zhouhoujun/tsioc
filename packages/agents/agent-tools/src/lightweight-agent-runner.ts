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
    private static readonly CONTINUE_PROMPT = [
        'Continue the delegated task from the current session state.',
        'If the task is complete, return the final result using these labels: Summary:, Diff:, Completed:, Next steps:, Risks:, Artifacts:.',
        'Do not restart from scratch.'
    ].join(' ');

    constructor(
        @Optional() private runtime?: AgentRuntime | null,
        @Optional() private sessions?: SessionStore | null
    ) {
        super();
    }

    async runParallel(requests: NestedAgentRunRequest[]): Promise<NestedAgentRunResult[]> {
        if (!this.runtime) {
            throw new Error('LightweightAgentRunner requires AgentRuntime. Ensure AgentModule is loaded and AgentRuntime is registered.');
        }
        if (requests.length === 0) {
            return [];
        }
        if (!this.started) {
            await this.runtime.start();
            this.started = true;
        }
        const settled = await Promise.allSettled(requests.map(req => this.runSingle(req)));
        return settled.map((result, index) => {
            if (result.status === 'fulfilled') {
                return result.value;
            }
            const err = result.reason instanceof Error ? result.reason : new Error(String(result.reason));
            return {
                content: `[parallel worker failed] ${err.message}`,
                sessionId: requests[index].sessionId,
                turnCount: 0,
                toolCalls: 0,
                report: {
                    summary: `Task failed: ${err.message}`,
                    risks: ['parallel worker error']
                }
            };
        });
    }

    private async runSingle(request: NestedAgentRunRequest): Promise<NestedAgentRunResult> {
        const sessionId = request.sessionId || `sub-${randomUUID()}`;

        if (request.toolsets?.length) {
            this.runtime!.setSessionToolFilter(sessionId, request.toolsets);
        }

        const prompt = request.systemPrompt
            ? `## Instructions\n${request.systemPrompt}\n\n## Task\n${request.prompt}`
            : request.prompt;

        try {
            const maxTurns = typeof request.maxTurns === 'number' && request.maxTurns > 0
                ? Math.floor(request.maxTurns)
                : 1;
            let result = await this.runtime!.runTurn(sessionId, prompt);
            let report = parseDelegatedAgentReport(result.message.content);

            for (let turn = 1; turn < maxTurns && !report; turn++) {
                result = await this.runtime!.runTurn(sessionId, LightweightAgentRunner.CONTINUE_PROMPT);
                report = parseDelegatedAgentReport(result.message.content);
            }

            const messages = await this.runtime!.getMessages(sessionId);
            const userCount = messages.filter(m => m.role === 'user').length;
            const toolCount = messages.filter(m => m.role === 'tool').length;

            if (request.parentSessionId && this.sessions) {
                try {
                    const subMessages = await this.runtime!.getMessages(sessionId);
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
            if (request.toolsets?.length) {
                this.runtime!.clearSessionToolFilter(sessionId);
            }
        }
    }

    async run(request: NestedAgentRunRequest): Promise<NestedAgentRunResult> {
        if (!this.runtime) {
            throw new Error('LightweightAgentRunner requires AgentRuntime. Ensure AgentModule is loaded and AgentRuntime is registered.');
        }
        if (!this.started) {
            await this.runtime.start();
            this.started = true;
        }
        const req = {
            ...request,
            sessionId: request.sessionId || `sub-${randomUUID()}`
        };
        return this.runSingle(req);
    }
}
