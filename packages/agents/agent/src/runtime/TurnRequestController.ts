import type { AgentOptions } from '../options';
import type { SessionStore } from '../memory/SessionStore';
import type { GoalStore } from '../goal/GoalStore';
import type { MemoryStore, AgentMemoryRecord } from '../memory/MemoryStore';
import type { AgentContextManager, ContextPreparationReport } from '../context/AgentContextManager';
import type { SystemPromptBuilder } from '../prompt/SystemPromptBuilder';
import type { AgentToolDefinition } from '../tools/AgentTool';
import type { ModelRequest } from '../model/ModelRequest';
import type { AgentMessage } from './AgentMessage';

import { buildGoalContext } from '../goal/GoalStore';
import { collectToolReadPaths, isImportedChildMessage } from './AgentMessage';
import { rewriteClarificationFollowUp } from './ClarificationFollowUp';
import { buildDelegationModeHint } from './DelegationMode';
import { buildPersonalityHint } from '../prompt/personality-presets';
import { buildArchetypeModeHint } from '../archetype/AgentArchetype';

export interface TurnRequestHost {
    sessions: SessionStore;
    goalStore?: GoalStore;
    contextManager: AgentContextManager;
    memory: MemoryStore;
    promptBuilder?: SystemPromptBuilder;
    modelAdapter?: { supportsNativeToolSchemas?: boolean; provider?: string };
    options: AgentOptions;
    getRecentMessages(messages: AgentMessage[], currentUserMessageId: string): AgentMessage[];
    getRelevantMemory(query: string, sessionId: string): Promise<AgentMemoryRecord[]>;
    publishContextPrepared(sessionId: string, report: ContextPreparationReport): Promise<void>;
    getToolDefinitions(sessionId: string): AgentToolDefinition[];
    resolveArchetypeConfig(sessionId: string): any;
    resolveDelegationMode(sessionId: string, context?: any): any;
    createMessage(role: 'system', content: string): AgentMessage;
}

/** Assemble one model request: history window, goal/workspace, compaction, memory and prompt parts. */
export class TurnRequestController {
    constructor(private readonly host: TurnRequestHost) {
    }

    async build(sessionId: string, query: string, currentUserMessageId: string, turnContext?: any): Promise<ModelRequest> {
        const state = await this.host.sessions.get(sessionId);
        let messages = this.host.getRecentMessages(state.messages.filter(message => !isImportedChildMessage(message)), currentUserMessageId);
        const rewrittenMessages = rewriteClarificationFollowUp(messages, currentUserMessageId);
        if (turnContext?.diagnostics && rewrittenMessages !== messages) {
            turnContext.diagnostics.followUpContextRewritten = true;
        }
        messages = rewrittenMessages;
        const goal = await this.host.goalStore?.getSessionGoal(sessionId);
        if (goal?.status === 'active') {
            messages = [{ id: `goal-${goal.id}`, role: 'system', content: buildGoalContext(goal), createdAt: goal.updatedAt }, ...messages];
        }
        const workspaceRoot = String(turnContext?.workspace || '').trim();
        if (workspaceRoot) {
            messages = [{
                id: 'workspace-root',
                role: 'system',
                content: `Workspace root: ${workspaceRoot}. Use workspace-relative paths only; never use absolute paths or '..' to escape the root, because file tools reject paths outside it.`,
                createdAt: Date.now()
            }, ...messages];
        }
        const preparedHistory = await this.host.contextManager.prepareHistory(messages, sessionId, currentUserMessageId);
        messages = preparedHistory.messages;
        await this.host.publishContextPrepared(sessionId, preparedHistory.report);

        const report = preparedHistory.report;
        if (report.compactionTriggered && turnContext?.diagnostics) {
            turnContext.diagnostics.compactionCount = (turnContext.diagnostics.compactionCount || 0) + 1;
            turnContext.diagnostics.totalTokenSavings = (turnContext.diagnostics.totalTokenSavings || 0) + report.cumulativeTokenSavings;
            turnContext.diagnostics.compressionRatio = report.compressionRatio;
            turnContext.diagnostics.compactionLevel = report.level;
        }
        if (report.replayed && turnContext?.diagnostics) {
            turnContext.diagnostics.replayCount = (turnContext.diagnostics.replayCount || 0) + 1;
            turnContext.diagnostics.replayKind = report.replayKind;
        }
        if (this.host.contextManager.isExperienceMemoryEnabled() && preparedHistory.report.strategy !== 'unchanged') {
            this.host.contextManager.autoSynthesizeExperiences(this.host.memory);
        }
        if (this.host.contextManager.hasCompactedContent(sessionId)) {
            const liveWindowIds = new Set(messages.map(message => message.id));
            const recovered = this.host.contextManager.recoverDetail(sessionId, query, liveWindowIds);
            if (recovered && recovered.length > 0) {
                let insertAt = -1;
                for (let index = messages.length - 1; index >= 0; index--) {
                    if (messages[index].role === 'system' && messages[index].content.includes('Context Summary')) {
                        insertAt = index;
                        break;
                    }
                }
                messages = [...messages.slice(0, insertAt + 1), ...recovered, ...messages.slice(insertAt + 1)];
            }
        }

        const memoryInjectionEnabled = this.host.options.ui?.memoryInjection !== false;
        const relevantMemory = memoryInjectionEnabled ? await this.host.getRelevantMemory(query, sessionId) : [];
        const memory = this.host.contextManager.trimMemory(
            memoryInjectionEnabled && this.host.contextManager.isExperienceMemoryEnabled()
                ? [...relevantMemory, ...(await this.host.contextManager.loadExperienceMemory(this.host.memory))]
                : relevantMemory
        );

        if (this.host.promptBuilder) {
            const promptContext = {
                sessionId,
                tools: this.host.getToolDefinitions(sessionId).map(t => ({ name: t.name, description: t.description, activation: t.activation })),
                memory: memory.map(item => `- ${item.key}: ${item.value}`).join('\n'),
                dateTime: new Date().toISOString(),
                extra: {
                    contextPreparation: preparedHistory.report,
                    skillTokenBudget: this.host.options.skillTokenBudget,
                    workspace: workspaceRoot,
                    readFiles: collectToolReadPaths(messages),
                    nativeToolSchemas: this.host.modelAdapter?.supportsNativeToolSchemas !== false,
                    provider: this.host.modelAdapter?.provider
                }
            };
            const buildParts = (this.host.promptBuilder as any).buildParts;
            const parts = typeof buildParts === 'function'
                ? await buildParts.call(this.host.promptBuilder, promptContext)
                : { cacheable: await this.host.promptBuilder.build(promptContext), dynamic: '' };
            const modeHint = buildArchetypeModeHint(this.host.resolveArchetypeConfig(sessionId));
            const delegationHint = buildDelegationModeHint(this.host.resolveDelegationMode(sessionId, turnContext));
            const personalityHint = buildPersonalityHint(this.host.options.ui?.personality);
            const staticPrompt = `${parts.cacheable}${modeHint}${delegationHint}${personalityHint}`;
            const systemMessages = [staticPrompt, parts.dynamic].filter(Boolean).map(text => this.host.createMessage('system', text));
            if (systemMessages.length) messages = [...systemMessages, ...messages];
            const qualityNote = turnContext?.delegationQualityNote;
            if (qualityNote) {
                turnContext!.delegationQualityNote = undefined;
                messages = [this.host.createMessage('system', qualityNote), ...messages];
            }
        }

        const request: ModelRequest = { sessionId, messages, tools: this.host.getToolDefinitions(sessionId), memory, summary: state.summary };
        const modelOverride = turnContext?.agent;
        if (modelOverride?.temperature !== undefined) request.temperature = modelOverride.temperature;
        if (modelOverride?.maxTokens !== undefined) request.maxTokens = modelOverride.maxTokens;
        if (modelOverride?.model !== undefined) request.model = modelOverride.model;
        return request;
    }
}
