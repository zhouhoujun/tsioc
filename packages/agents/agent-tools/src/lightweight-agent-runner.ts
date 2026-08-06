import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { AgentRuntime, SessionStore } from '@tsdi/agent';
import { UuidGenerator } from '@tsdi/core';
import { AGENT_TOOLS_OPTIONS } from './tokens';
import { AgentToolsOptions } from './options';
import {
    appendSecrets,
    NestedAgentRunner,
    NestedAgentRunRequest,
    NestedAgentRunResult,
    parseDelegatedAgentReport,
    runWithConcurrency
} from './nested-agent-runner';
import { createDelegationCipher, resolveDelegationCipherKey } from './delegation/crypto';

@Injectable()
export class LightweightAgentRunner extends NestedAgentRunner {
    private started = false;
    static readonly DEFAULT_MAX_TURNS = 10;
    private static readonly CONTINUE_PROMPT = [
        'Continue the delegated task from the current session state.',
        'If the task is complete, return the final result using these labels: Summary:, Diff:, Completed:, Next steps:, Risks:, Artifacts:.',
        'Do not restart from scratch.'
    ].join(' ');

    constructor(
        private uuid: UuidGenerator,
        @Optional() private runtime?: AgentRuntime | null,
        @Optional() private sessions?: SessionStore | null,
        @Optional() @Inject(AGENT_TOOLS_OPTIONS) private options?: AgentToolsOptions | null
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
        const limit = requests[0]?.concurrency ?? this.options?.delegation?.concurrency;
        const settled = await runWithConcurrency(requests, limit, (req, index) => this.runSingle(req));
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

    private resolveWorkerModelProfile(request: NestedAgentRunRequest): string | undefined {
        if (!request.workerClass) {
            return undefined;
        }
        return this.options?.delegation?.workerModelProfiles?.[request.workerClass];
    }

    private async runSingle(request: NestedAgentRunRequest): Promise<NestedAgentRunResult> {
        const sessionId = request.sessionId || `sub-${this.uuid.generate()}`;
        const parentSessionId = request.parentSessionId;
        const workerProfile = this.resolveWorkerModelProfile(request);
        const explicitProfile = request.profile;
        const cipherKey = resolveDelegationCipherKey(this.options?.delegation?.encryption);
        const cipher = cipherKey ? createDelegationCipher(cipherKey) : undefined;
        const agentConfig = request.reasoning == null ? undefined : { reasoning: request.reasoning };
        const basePrompt = request.systemPrompt
            ? `## Instructions\n${request.systemPrompt}\n\n## Task\n${request.prompt}`
            : request.prompt;
        const prompt = appendSecrets(basePrompt, request.secrets);

        if (parentSessionId) {
            this.runtime!.registerChildSession(parentSessionId, sessionId, {
                kind: 'nested',
                goal: cipher ? cipher.encrypt(prompt) : basePrompt,
                toolsets: request.toolsets,
                model: request.model,
                maxTurns: request.maxTurns,
                ...(cipher && request.secrets
                    ? {
                        sealed: true,
                        secrets: Object.fromEntries(
                            Object.entries(request.secrets).map(([key, value]) => [key, cipher.encrypt(value)])
                        )
                    }
                    : {})
            });
        }
        if (request.toolsets?.length) {
            this.runtime!.setSessionToolFilter(sessionId, request.toolsets);
        }
        if (!explicitProfile && workerProfile) {
            this.runtime!.setSessionModelProfile(sessionId, workerProfile);
        }

        let succeeded = false;
        try {
            const maxTurns = typeof request.maxTurns === 'number' && request.maxTurns > 0
                ? Math.floor(request.maxTurns)
                : LightweightAgentRunner.DEFAULT_MAX_TURNS;
            let result = await this.runtime!.runTurn(sessionId, prompt, undefined, undefined, explicitProfile, agentConfig);
            let report = parseDelegatedAgentReport(result.message.content);

            for (let turn = 1; turn < maxTurns && !report; turn++) {
                result = await this.runtime!.runTurn(sessionId, LightweightAgentRunner.CONTINUE_PROMPT, undefined, undefined, explicitProfile, agentConfig);
                report = parseDelegatedAgentReport(result.message.content);
            }

            const messages = await this.runtime!.getMessages(sessionId);
            const userCount = messages.filter(m => m.role === 'user').length;
            const toolCount = messages.filter(m => m.role === 'tool').length;

            if (parentSessionId && this.sessions) {
                try {
                    const subMessages = await this.runtime!.getMessages(sessionId);
                    for (const msg of subMessages) {
                        await this.sessions.append(parentSessionId, msg);
                    }
                } catch (err) {
                    // session merge must not break the sub-agent result
                }
            }

            succeeded = true;
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
            if (parentSessionId) {
                this.runtime!.unregisterChildSession(parentSessionId, sessionId, succeeded ? 'completed' : 'failed');
            }
            if (request.toolsets?.length) {
                this.runtime!.clearSessionToolFilter(sessionId);
            }
            if (!explicitProfile && workerProfile) {
                this.runtime!.clearSessionModelProfile(sessionId);
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
            sessionId: request.sessionId || `sub-${this.uuid.generate()}`
        };
        return this.runSingle(req);
    }
}
