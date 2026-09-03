import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application, Handler, RunContext } from '@tsdi/core';
import { RandomUuidGenerator } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import {
    AGENT_PROMPT_SECTIONS,
    AGENT_TURN_INTERCEPTORS,
    AgentHookCommandExecutor,
    AgentRuntime,
    AgentTurnInput,
    AgentTurnResult,
    ApprovalDecision,
    DefaultAgentRuntime,
    EchoModelAdapter,
    ModelAdapter,
    SimpleSessionSummarizer,
    ToolRegistry,
    defaultAgentOptions
} from '../src';
import { SessionStore } from '../src/memory/SessionStore';
import { MemoryStore } from '../src/memory/MemoryStore';
import { runAgentOrmApp } from './helpers/agent-orm';

@Injectable()
class StaticPromptSection {
    render(): string {
        return '## Injected Section\ncustom prompt section';
    }
}

@Injectable()
class SlashCommandInterceptor {
    async intercept(input: AgentTurnInput, next: Handler<AgentTurnInput, Promise<AgentTurnResult>, RunContext>, context: RunContext): Promise<AgentTurnResult> {
        if (input.input.trim() !== '/ping') {
            return next.handle(input, context);
        }
        return {
            sessionId: input.sessionId,
            message: {
                id: 'pong',
                role: 'assistant',
                content: 'pong',
                createdAt: Date.now()
            }
        };
    }
}

@Suite('Agent extension hooks')
export class AgentExtensionHooksTest {
    @Test('prompt sections appear in system prompt through IoC providers')
    async promptSectionsAppearInSystemPrompt() {
        class CapturingModelAdapter extends EchoModelAdapter {
            requests: any[] = [];
            async complete(request: any): Promise<any> {
                this.requests.push(request);
                return { message: 'ok', stopReason: 'end' };
            }
        }

        const model = new CapturingModelAdapter();
        const ctx = await runAgentOrmApp([
            { provide: ModelAdapter, useValue: model },
            StaticPromptSection,
            { provide: AGENT_PROMPT_SECTIONS, useExisting: StaticPromptSection, multi: true }
        ]);
        try {
            const runtime = ctx.get(AgentRuntime);
            await runtime.runTurn('s1', 'hello');
            const system = model.requests[0].messages[0].content;
            expect(system).toContain('autonomous task agent');
            expect(system).toContain('break the work into smaller steps');
            expect(system).toContain('spawn_agent');
            expect(system).toContain('continue the task directly');
            expect(system).toContain('## Injected Section');
            expect(system).toContain('custom prompt section');
        } finally {
            await ctx.close();
        }
    }

    @Test('prompt sections advise coding task execution and diff review when tools are available')
    async promptSectionsAdviseCodingTaskAndDiffReview() {
        const { IdentitySection, ToolsSection } = require('../src/prompt/SystemPromptBuilder');
        const identity = new IdentitySection();
        const tools = new ToolsSection();
        const context = {
            sessionId: 's1',
            tools: [
                { name: 'coding_task', description: 'coordinate coding tasks' },
                { name: 'git_operations', description: 'inspect git state' }
            ],
            memory: '',
            dateTime: new Date().toISOString()
        };

        const identityPrompt = identity.render(context as any);
        const toolsPrompt = tools.render(context as any);

        expect(identityPrompt).toContain('prefer coding_task');
        expect(identityPrompt).toContain('inspect the resulting git diff');
        expect(identityPrompt).toContain('Do not stop after only a plan');
        expect(identityPrompt).toContain('one concise clarification question');
        expect(toolsPrompt).toContain('prefer `coding_task`');
        expect(toolsPrompt).toContain('use `git_operations` with `action: "diff"`');
        expect(toolsPrompt).toContain('do not stop at a bare summary');
    }

    @Test('builtin implementation skill carries the delivery workflow')
    async builtinImplementationSkillCarriesDeliveryWorkflow() {
        const { getBuiltinSkills, resetBuiltinSkillsCache } = require('@tsdi/agent-tools/skills');
        resetBuiltinSkillsCache();
        const skill = getBuiltinSkills().find((item: any) => item.id === 'implement');

        expect(skill?.summary).toContain('Implement requested code');
        expect(skill?.aliases).toEqual(['build', 'code', 'tdd']);
        expect(skill?.promptFull).toContain('failing test first');
        expect(skill?.promptFull).toContain('Do not stop at a proposal');
    }

    @Test('turn interceptors can short-circuit turns through IoC providers')
    async turnInterceptorsCanShortCircuitTurns() {
        class CapturingModelAdapter extends EchoModelAdapter {
            calls = 0;
            async complete(_request: any): Promise<any> {
                this.calls++;
                return { message: 'ok', stopReason: 'end' };
            }
        }

        const model = new CapturingModelAdapter();
        const ctx = await runAgentOrmApp([
            { provide: ModelAdapter, useValue: model },
            SlashCommandInterceptor,
            { provide: AGENT_TURN_INTERCEPTORS, useExisting: SlashCommandInterceptor, multi: true }
        ]);
        try {
            const runtime = ctx.get(AgentRuntime);
            const result = await runtime.runTurn('s1', '/ping');
            expect(result.message.content).toEqual('pong');
            expect(model.calls).toEqual(0);
        } finally {
            await ctx.close();
        }
    }

    @Test('lifecycle hooks append context messages across turn, approval and tool stages')
    async lifecycleHooksAppendContextMessages() {
        class HookModelAdapter extends EchoModelAdapter {
            calls = 0;
            requests: any[] = [];
            async complete(request: any): Promise<any> {
                this.requests.push(request);
                if (this.calls++ === 0) {
                    return {
                        message: '',
                        toolCalls: [{ id: 'tool-1', name: 'hook_tool', input: { value: 1 } }],
                        stopReason: 'tool_use'
                    };
                }
                return { message: 'done', stopReason: 'end' };
            }
        }

        class HookToolRegistry extends ToolRegistry {
            private tool = {
                name: 'hook_tool',
                description: 'test hook tool',
                execution: { sideEffect: true },
                async invoke(input: any) {
                    return { echoed: input?.value ?? null };
                }
            };

            getTools(): any[] {
                return [this.tool];
            }
            getTool(name: string): any {
                return name === this.tool.name ? this.tool : undefined;
            }
            async invoke(name: string, input: any): Promise<any> {
                return this.getTool(name)?.invoke(input);
            }
        }

        class StaticHookExecutor extends AgentHookCommandExecutor {
            isSupported(): boolean {
                return true;
            }

            async execute(request: any): Promise<any> {
                const toolName = request.context?.toolCall?.name ? `:${request.context.toolCall.name}` : '';
                return {
                    exitCode: 0,
                    stdout: `${request.context.stage}${toolName}`,
                    stderr: '',
                    durationMs: 1
                };
            }
        }

        const approvalManager = {
            isConfigured: () => true,
            requiresApproval: () => true,
            checkApproval: async () => ({ decision: ApprovalDecision.APPROVED }),
            cancelBySession: () => 0,
            getPending: () => []
        };
        const ctx = await runAgentOrmApp();
        try {
            const runtime = new DefaultAgentRuntime(
            new HookModelAdapter(),
            new HookToolRegistry(),
            ctx.get(SessionStore),
            ctx.get(MemoryStore),
            new SimpleSessionSummarizer(),
            {
                ...defaultAgentOptions,
                hooks: {
                    beforeTurn: { command: 'before-turn' },
                    afterTurn: { command: 'after-turn' },
                    beforeTool: { command: 'before-tool' },
                    afterTool: { command: 'after-tool' },
                    onApproval: { command: 'on-approval' }
                }
            },
            { publishEvent: async () => undefined } as any,
            new RandomUuidGenerator(),
            undefined,
            undefined,
            approvalManager as any,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            new StaticHookExecutor()
        );

        await runtime.runTurn('s1', 'hello');
        const messages = await runtime.getMessages('s1');
        const hookMessages = messages.filter(message => message.metadata?.kind === 'hook');
        expect(hookMessages.map(message => message.metadata?.hookStage)).toEqual([
            'beforeTurn',
            'onApproval',
            'beforeTool',
            'afterTool',
            'afterTurn'
        ]);
        expect(hookMessages.map(message => message.content.includes('[hook'))).toEqual([true, true, true, true, true]);
        } finally { await ctx.close(); }
    }
}
