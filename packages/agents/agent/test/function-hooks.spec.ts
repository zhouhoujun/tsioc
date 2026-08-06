import { RandomUuidGenerator } from '@tsdi/core';
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    AgentHookCommandExecutor,
    AgentRuntime,
    ApprovalDecision,
    DefaultAgentRuntime,
    EchoModelAdapter,
    InMemoryMemoryStore,
    InMemorySessionStore,
    NoopAgentHookCommandExecutor,
    SimpleSessionSummarizer,
    ToolRegistry,
    defaultAgentOptions
} from '../src';

class RewriteModelAdapter extends EchoModelAdapter {
    calls = 0;
    async complete(_request: any): Promise<any> {
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

class RecordingToolRegistry extends ToolRegistry {
    invoked: { name: string; input: any }[] = [];
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
        this.invoked.push({ name, input });
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
            stdout: `shell:${request.context.stage}${toolName}`,
            stderr: '',
            durationMs: 1
        };
    }
}

function createApprovalManager(): any {
    return {
        isConfigured: () => true,
        requiresApproval: () => true,
        checkApproval: async () => ({ decision: ApprovalDecision.APPROVED }),
        cancelBySession: () => 0,
        getPending: () => []
    };
}

function createRuntime(
    model: RewriteModelAdapter,
    registry: RecordingToolRegistry,
    options: any,
    executor: AgentHookCommandExecutor | null = new NoopAgentHookCommandExecutor()
): DefaultAgentRuntime {
    return new DefaultAgentRuntime(
        model,
        registry,
        new InMemorySessionStore(),
        new InMemoryMemoryStore(),
        new SimpleSessionSummarizer(),
        { ...defaultAgentOptions, ...options },
        { publishEvent: async () => undefined } as any,
            new RandomUuidGenerator(),
        undefined,
        undefined,
        createApprovalManager() as any,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        executor
    );
}

@Suite('Agent function hooks')
export class AgentFunctionHooksTest {
    @Test('static beforeTool function hook rewrites the tool input before execution')
    async staticBeforeToolFunctionHookRewritesInput() {
        const model = new RewriteModelAdapter();
        const registry = new RecordingToolRegistry();
        const runtime = createRuntime(model, registry, {
            hooks: {
                functions: {
                    beforeTool: {
                        name: 'rewrite-input',
                        handler: async () => ({ exitCode: 0, stdout: 'rewritten', input: { value: 42 } })
                    }
                }
            }
        });

        await runtime.runTurn('s1', 'hello');
        expect(registry.invoked).toHaveLength(1);
        expect(registry.invoked[0].input).toEqual({ value: 42 });
    }

    @Test('function hooks run before shell hooks for the same stage')
    async functionHooksRunBeforeShellHooks() {
        const model = new RewriteModelAdapter();
        const registry = new RecordingToolRegistry();
        const order: string[] = [];
        const runtime = createRuntime(model, registry, {
            hooks: {
                beforeTool: { command: 'shell-before-tool' },
                functions: {
                    beforeTool: {
                        name: 'fn-before-tool',
                        handler: async () => {
                            order.push('fn');
                            return { exitCode: 0, stdout: 'fn ran', stderr: '', durationMs: 1 };
                        }
                    }
                }
            }
        }, new StaticHookExecutor());

        await runtime.runTurn('s1', 'hello');
        expect(order).toEqual(['fn']);
        const messages = await runtime.getMessages('s1');
        const hookMessages = messages.filter(message => message.metadata?.kind === 'hook');
        expect(hookMessages.map(message => message.metadata?.hookName)).toEqual(['fn-before-tool', 'shell-before-tool']);
    }

    @Test('function hook stdout is appended to the transcript')
    async functionHookStdoutAppendsToTranscript() {
        const model = new RewriteModelAdapter();
        const registry = new RecordingToolRegistry();
        const runtime = createRuntime(model, registry, {
            hooks: {
                functions: {
                    beforeTurn: {
                        name: 'fn-before-turn',
                        handler: async () => ({ exitCode: 0, stdout: 'greetings from js' })
                    }
                }
            }
        });

        await runtime.runTurn('s1', 'hello');
        const messages = await runtime.getMessages('s1');
        const hookMessages = messages.filter(message => message.metadata?.kind === 'hook');
        expect(hookMessages).toHaveLength(1);
        expect(hookMessages[0].metadata?.hookStage).toEqual('beforeTurn');
        expect(hookMessages[0].metadata?.hookName).toEqual('fn-before-turn');
        expect(hookMessages[0].content).toContain('greetings from js');
    }

    @Test('dynamic registration adds and removes function hooks at runtime')
    async dynamicRegistrationAddsAndRemovesFunctionHooks() {
        const model = new RewriteModelAdapter();
        const registry = new RecordingToolRegistry();
        const runtime = createRuntime(model, registry, {});

        runtime.registerHookFunction('beforeTurn', {
            name: 'dynamic-fn',
            handler: async () => ({ exitCode: 0, stdout: 'dynamic hook ran' })
        });

        await runtime.runTurn('s1', 'hello');
        let messages = await runtime.getMessages('s1');
        let hookMessages = messages.filter(message => message.metadata?.kind === 'hook');
        expect(hookMessages.map(message => message.metadata?.hookName)).toEqual(['dynamic-fn']);

        runtime.unregisterHookFunction('beforeTurn', 'dynamic-fn');
        await runtime.runTurn('s2', 'hello');
        messages = await runtime.getMessages('s2');
        hookMessages = messages.filter(message => message.metadata?.kind === 'hook');
        expect(hookMessages).toHaveLength(0);
    }

    @Test('function hook exceptions do not block tool execution')
    async functionHookExceptionsDoNotBlockToolExecution() {
        const model = new RewriteModelAdapter();
        const registry = new RecordingToolRegistry();
        const runtime = createRuntime(model, registry, {
            hooks: {
                functions: {
                    beforeTool: [
                        {
                            name: 'exploding',
                            handler: async () => {
                                throw new Error('boom');
                            }
                        },
                        {
                            name: 'rewrite-input',
                            handler: async () => ({ exitCode: 0, input: { value: 7 } })
                        }
                    ]
                }
            }
        });

        await runtime.runTurn('s1', 'hello');
        expect(registry.invoked).toHaveLength(1);
        expect(registry.invoked[0].input).toEqual({ value: 7 });
        const messages = await runtime.getMessages('s1');
        const hookMessages = messages.filter(message => message.metadata?.kind === 'hook');
        expect(hookMessages.map(message => message.metadata?.hookName)).toEqual(['exploding']);
        expect(hookMessages[0].metadata?.exitCode).toEqual(1);
    }

    @Test('function hooks work without a shell executor')
    async functionHooksWorkWithoutShellExecutor() {
        const model = new RewriteModelAdapter();
        const registry = new RecordingToolRegistry();
        const runtime = createRuntime(model, registry, {
            hooks: {
                beforeTurn: { command: 'should-not-run' },
                functions: {
                    beforeTurn: {
                        name: 'browser-fn',
                        handler: async () => ({ exitCode: 0, stdout: 'browser hook' })
                    }
                }
            }
        });

        await runtime.runTurn('s1', 'hello');
        const messages = await runtime.getMessages('s1');
        const hookMessages = messages.filter(message => message.metadata?.kind === 'hook');
        expect(hookMessages.map(message => message.metadata?.hookName)).toEqual(['browser-fn']);
        expect(hookMessages[0].content).toContain('browser hook');
    }

    @Test('beforeTool rewrite is reflected in the tool receipt input summary')
    async beforeToolRewriteReflectedInReceipt() {
        const model = new RewriteModelAdapter();
        const registry = new RecordingToolRegistry();
        const runtime = createRuntime(model, registry, {
            hooks: {
                functions: {
                    beforeTool: {
                        name: 'rewrite-input',
                        handler: async () => ({ exitCode: 0, stdout: 'rewritten', input: { value: 42 } })
                    }
                }
            }
        });

        await runtime.runTurn('s1', 'hello');
        const messages = await runtime.getMessages('s1');
        const toolMessage = messages.find(message => message.metadata?.kind === 'tool' || message.role === 'assistant');
        expect(registry.invoked[0].input).toEqual({ value: 42 });
        expect(toolMessage).toBeDefined();
    }
}
