import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application, Handler, RunContext } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import { AGENT_PROMPT_SECTIONS, AGENT_TURN_INTERCEPTORS, AgentModule, AgentRuntime, AgentTurnInput, AgentTurnResult, EchoModelAdapter, ModelAdapter } from '../src';

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
        const ctx = await Application.run(AgentModule, {
            providers: [
                { provide: ModelAdapter, useValue: model },
                StaticPromptSection,
                { provide: AGENT_PROMPT_SECTIONS, useExisting: StaticPromptSection, multi: true }
            ]
        });
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
        const ctx = await Application.run(AgentModule, {
            providers: [
                { provide: ModelAdapter, useValue: model },
                SlashCommandInterceptor,
                { provide: AGENT_TURN_INTERCEPTORS, useExisting: SlashCommandInterceptor, multi: true }
            ]
        });
        try {
            const runtime = ctx.get(AgentRuntime);
            const result = await runtime.runTurn('s1', '/ping');
            expect(result.message.content).toEqual('pong');
            expect(model.calls).toEqual(0);
        } finally {
            await ctx.close();
        }
    }
}
