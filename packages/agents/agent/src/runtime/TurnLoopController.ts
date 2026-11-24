import { EMPTY_RESPONSE_MAX_RETRIES } from '../AgentLimits';
import type { StreamChunk } from '../model/StreamChunk';
import type { ModelRequest } from '../model/ModelRequest';
import type { ModelResponse } from '../model/ModelResponse';
import type { AgentToolDefinition } from '../tools/AgentTool';
import { ToolLoopDetector } from '../tools/ToolLoopDetector';
import type { AgentMessage } from './AgentMessage';
import type { AgentTurnResult } from './AgentTurnResult';
import type { TurnExecutionContext } from './TurnExecutionContext';
import { buildEmptyResponseRetryRequest, buildFollowUpRecoveryRequest, buildToolErrorRecoveryRequest } from './recovery-requests';
import { MAX_TOOL_ROUNDS_PROMPT } from './tool-round-budget';

const EMPTY_RESPONSE_RETRY_BACKOFF_MS = 150;
const BUDGET_EXHAUSTED_MESSAGE = 'Token budget exhausted. The turn was stopped to prevent further cost. Provide a brief summary of completed work and remaining steps.';
const BUDGET_EXHAUSTED_NOTICE = '\n\n[Token budget exhausted. Stopping turn.]\n\n';

export interface TurnLoopHost {
    maxRounds: number;
    maxLoopRecoveries: number;
    throwIfTurnCancelled(sessionId: string): void;
    sleep(ms: number): Promise<void>;
    enforceBudget(sessionId: string): Promise<boolean>;
    resolveTermination(turnContext: TurnExecutionContext, maxLoopRecoveries: number): string | undefined;
    promoteSteer(sessionId: string): Promise<void>;
    buildRequest(sessionId: string, query: string, currentUserMessageId: string, turnContext: TurnExecutionContext): Promise<ModelRequest>;
    maybeInjectPrompt(request: ModelRequest, turnContext: TurnExecutionContext): ModelRequest | undefined;
    prepareRequest(sessionId: string, request: ModelRequest, turnContext: TurnExecutionContext): ModelRequest;
    respond(sessionId: string, request: ModelRequest): AsyncGenerator<StreamChunk, ModelResponse, void>;
    respondStreaming(sessionId: string, request: ModelRequest): AsyncGenerator<StreamChunk, ModelResponse, void>;
    beginLiveTools?(sessionId: string, context: TurnExecutionContext, detector: ToolLoopDetector, tools: AgentToolDefinition[]): void;
    createMessage(role: AgentMessage['role'], content: string): AgentMessage;
    shouldRetryEmptyResponse(response: ModelResponse): boolean;
    shouldRecoverEmptyFollowUp(request: ModelRequest, response: ModelResponse): boolean;
    findRecentToolError(sessionId: string): Promise<string | undefined>;
    handleResponse(
        sessionId: string,
        response: ModelResponse,
        currentUserMessageId: string,
        loopDetector: ToolLoopDetector,
        tools: AgentToolDefinition[] | undefined,
        turnContext: TurnExecutionContext
    ): Promise<{ message?: AgentMessage }>;
    runGate(sessionId: string, turnContext: TurnExecutionContext, roundStartEvidence: number): Promise<void>;
    warnNearToolRoundLimit(sessionId: string, round: number, maxRounds: number): Promise<void>;
    buildPlanContinuation(sessionId: string, turnContext: TurnExecutionContext): string | undefined;
    append(sessionId: string, message: AgentMessage): Promise<void>;
    finalizeResponse(sessionId: string, currentUserMessageId: string, response: ModelResponse, turnContext: TurnExecutionContext): Promise<AgentMessage>;
    completeTermination(sessionId: string, query: string, currentUserMessageId: string, turnContext: TurnExecutionContext, termination: string): Promise<AgentMessage>;
    completeStreamingTermination(sessionId: string, query: string, currentUserMessageId: string, turnContext: TurnExecutionContext, termination: string): AsyncGenerator<StreamChunk, AgentMessage, void>;
}

/**
 * Unified turn loop shared by the non-streaming and streaming paths.
 *
 * The only behavioural switch is `streaming`, which controls whether model
 * output is forwarded as chunks and whether the extra tool-error recovery
 * request runs (streaming-only today).
 */
export class TurnLoopController {
    constructor(private readonly host: TurnLoopHost) {
    }

    async *run(
        sessionId: string,
        query: string,
        currentUserMessageId: string,
        turnContext: TurnExecutionContext,
        streaming: boolean
    ): AsyncGenerator<StreamChunk, AgentTurnResult, void> {
        const loopDetector = new ToolLoopDetector();
        loopDetector.reset();
        let round = 0;
        const { maxRounds, maxLoopRecoveries } = this.host;
        const respond = streaming ? this.host.respondStreaming : this.host.respond;
        let emptyResponseRetryCount = 0;

        turnLoop: while (true) {
            this.host.throwIfTurnCancelled(sessionId);
            if (await this.host.enforceBudget(sessionId)) {
                if (streaming) {
                    yield { type: 'text', content: BUDGET_EXHAUSTED_NOTICE };
                }
                return { sessionId, message: this.host.createMessage('assistant', BUDGET_EXHAUSTED_MESSAGE) };
            }
            const termination = this.host.resolveTermination(turnContext, maxLoopRecoveries);
            if (termination) {
                let message: AgentMessage;
                if (streaming) {
                    message = yield* this.host.completeStreamingTermination(sessionId, query, currentUserMessageId, turnContext, termination);
                } else {
                    message = await this.host.completeTermination(sessionId, query, currentUserMessageId, turnContext, termination);
                }
                return { sessionId, message };
            }
            await this.host.promoteSteer(sessionId);
            let request = await this.host.buildRequest(sessionId, query, currentUserMessageId, turnContext);
            const recoveredRequest = this.host.maybeInjectPrompt(request, turnContext);
            if (recoveredRequest) {
                request = recoveredRequest;
            }
            if (streaming) {
                this.host.beginLiveTools?.(sessionId, turnContext, loopDetector, request.tools ?? []);
            }
            let response: ModelResponse = yield* respond(sessionId, this.host.prepareRequest(sessionId, request, turnContext));
            if (emptyResponseRetryCount < EMPTY_RESPONSE_MAX_RETRIES && this.host.shouldRetryEmptyResponse(response)) {
                emptyResponseRetryCount++;
                if (turnContext.diagnostics) {
                    turnContext.diagnostics.emptyResponseRetryCount++;
                }
                await this.host.sleep(EMPTY_RESPONSE_RETRY_BACKOFF_MS * emptyResponseRetryCount);
                response = yield* respond(
                    sessionId,
                    this.host.prepareRequest(
                        sessionId,
                        buildEmptyResponseRetryRequest(request, (role, content) => this.host.createMessage(role, content)),
                        turnContext
                    )
                );
            }
            if (this.host.shouldRecoverEmptyFollowUp(request, response)) {
                if (turnContext.diagnostics) {
                    turnContext.diagnostics.followUpRecoveryCount++;
                }
                response = yield* respond(
                    sessionId,
                    this.host.prepareRequest(
                        sessionId,
                        buildFollowUpRecoveryRequest(request, (role, content) => this.host.createMessage(role, content)),
                        turnContext
                    )
                );
            }
            // Streaming keeps one additional recovery: an empty response after a tool error retries with that error.
            if (streaming && this.host.shouldRetryEmptyResponse(response)) {
                const toolError = await this.host.findRecentToolError(sessionId);
                if (toolError) {
                    response = yield* respond(
                        sessionId,
                        this.host.prepareRequest(
                            sessionId,
                            buildToolErrorRecoveryRequest(request, toolError, (role, content) => this.host.createMessage(role, content)),
                            turnContext
                        )
                    );
                }
            }

            const roundStartEvidence = turnContext.evidenceLedger?.size ?? 0;
            const handled = await this.host.handleResponse(sessionId, response, currentUserMessageId, loopDetector, request.tools, turnContext);
            if (handled.message) {
                return { sessionId, message: handled.message };
            }

            await this.host.runGate(sessionId, turnContext, roundStartEvidence);

            round++;
            if (round <= maxRounds) {
                await this.host.warnNearToolRoundLimit(sessionId, round, maxRounds);
                continue turnLoop;
            }
            this.host.throwIfTurnCancelled(sessionId);
            const resume = this.host.buildPlanContinuation(sessionId, turnContext);
            if (resume) {
                await this.host.append(sessionId, this.host.createMessage('user', resume));
                round = 0;
                continue turnLoop;
            }
            await this.host.append(sessionId, this.host.createMessage('user', MAX_TOOL_ROUNDS_PROMPT));
            const finalRequest = await this.host.buildRequest(sessionId, query, currentUserMessageId, turnContext);
            const finalResponse = yield* respond(sessionId, this.host.prepareRequest(sessionId, finalRequest, turnContext));
            const finalMessage = await this.host.finalizeResponse(sessionId, currentUserMessageId, finalResponse, turnContext);
            return { sessionId, message: finalMessage };
        }
    }
}
