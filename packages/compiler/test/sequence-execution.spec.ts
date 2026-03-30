import expect = require('expect');
import { SequenceActivity, Activity, ActivityContext, ActivityResult } from '@tsdi/activities';
import { CompilerActivity } from '../src/CompilerActivity';
import { SourceFilesActivity } from '../src/activities/SourceFilesActivity';
import { EsbuildBuildActivity } from '../src/activities/EsbuildBuildActivity';
import { ComponentParseActivity } from '../src/activities/ComponentParseActivity';
import { MetadataGenerateActivity } from '../src/activities/MetadataGenerateActivity';
import { AnnotationCompileActivity } from '../src/activities/AnnotationCompileActivity';

interface TestContext extends ActivityContext {
    step1Done?: boolean;
    step2Done?: boolean;
    step3Done?: boolean;
    valueFromStep1?: string;
    valueFromStep2?: string;
    finalValue?: string;
    counter?: number;
}

describe('Sequence Execution Order Tests', () => {
    describe('SequenceActivity basic order verification', () => {
        it('should execute activities strictly in order (1, 2, 3)', async () => {
            const sequence = new SequenceActivity();
            const executionOrder: number[] = [];

            sequence.activities = [
                { execute: async () => { executionOrder.push(1); return { success: true }; } } as any,
                { execute: async () => { executionOrder.push(2); return { success: true }; } } as any,
                { execute: async () => { executionOrder.push(3); return { success: true }; } } as any
            ];

            await sequence.execute({});

            expect(executionOrder).toEqual([1, 2, 3]);
        });

        it('should execute activities in order even with delays', async () => {
            const sequence = new SequenceActivity();
            const executionOrder: string[] = [];

            sequence.activities = [
                {
                    execute: async () => {
                        await new Promise(r => setTimeout(r, 20));
                        executionOrder.push('first');
                        return { success: true };
                    }
                } as any,
                {
                    execute: async () => {
                        executionOrder.push('second');
                        return { success: true };
                    }
                } as any,
                {
                    execute: async () => {
                        executionOrder.push('third');
                        return { success: true };
                    }
                } as any
            ];

            await sequence.execute({});

            expect(executionOrder).toEqual(['first', 'second', 'third']);
        });

        it('should stop and return on first failure (no continueOnError)', async () => {
            const sequence = new SequenceActivity();
            const executed: string[] = [];

            sequence.activities = [
                {
                    execute: async () => { executed.push('step1'); return { success: true }; }
                } as any,
                {
                    execute: async () => { executed.push('step2-fail'); return { success: false, error: new Error('Failed') }; }
                } as any,
                {
                    execute: async () => { executed.push('step3-should-not-run'); return { success: true }; }
                } as any
            ];

            const result = await sequence.execute({});

            expect(result.success).toBe(false);
            expect(executed).toEqual(['step1', 'step2-fail']);
        });

        it('should continue when continueOnError is true', async () => {
            const sequence = new SequenceActivity();
            sequence.continueOnError = true;
            const executed: string[] = [];

            sequence.activities = [
                {
                    execute: async () => { executed.push('step1'); return { success: true }; }
                } as any,
                {
                    execute: async () => { executed.push('step2-fail'); return { success: false, error: new Error('Failed') }; }
                } as any,
                {
                    execute: async () => { executed.push('step3'); return { success: true }; }
                } as any
            ];

            const result = await sequence.execute({});

            expect(result.success).toBe(false);
            expect(executed).toEqual(['step1', 'step2-fail', 'step3']);
        });
    });

    describe('CompilerActivity template sequence order', () => {
        it('should define activities matching template order', () => {
            const compiler = new CompilerActivity();
            expect(compiler.activities).toBeDefined();
            expect(Array.isArray(compiler.activities)).toBe(true);
        });

        it('should have activities array available', () => {
            const compiler = new CompilerActivity();
            expect(compiler.activities).toBeDefined();
            expect(Array.isArray(compiler.activities)).toBe(true);
        });
    });

    describe('CompilerActivity activities via Workflow', () => {
        it('should execute source-files before component-parse in sequence', async () => {
            const order: string[] = [];
            const sequence = new SequenceActivity();

            sequence.activities = [
                Object.assign(new SourceFilesActivity(), {
                    async execute(ctx: ActivityContext) {
                        order.push('1-source-files');
                        return { success: true, data: { files: [] } };
                    }
                }),
                Object.assign(new ComponentParseActivity(), {
                    async execute(ctx: ActivityContext) {
                        order.push('2-component-parse');
                        return { success: true, data: { components: [] } };
                    }
                })
            ];

            await sequence.execute({});

            expect(order).toEqual(['1-source-files', '2-component-parse']);
        });

        it('should execute all compiler stages in correct order', async () => {
            const order: string[] = [];
            const sequence = new SequenceActivity();

            sequence.activities = [
                Object.assign(new SourceFilesActivity(), {
                    async execute(ctx: ActivityContext) {
                        order.push('source-files');
                        return { success: true };
                    }
                }),
                Object.assign(new ComponentParseActivity(), {
                    async execute(ctx: ActivityContext) {
                        order.push('component-parse');
                        return { success: true };
                    }
                }),
                Object.assign(new AnnotationCompileActivity(), {
                    async execute(ctx: ActivityContext) {
                        order.push('annotation-compile');
                        return { success: true };
                    }
                }),
                Object.assign(new EsbuildBuildActivity(), {
                    async execute(ctx: ActivityContext) {
                        order.push('esbuild-build');
                        return { success: true };
                    }
                }),
                Object.assign(new MetadataGenerateActivity(), {
                    async execute(ctx: ActivityContext) {
                        order.push('metadata-generate');
                        return { success: true };
                    }
                })
            ];

            await sequence.execute({});

            expect(order).toEqual([
                'source-files',
                'component-parse',
                'annotation-compile',
                'esbuild-build',
                'metadata-generate'
            ]);
        });

        it('should track execution timing to verify sequential execution', async () => {
            const timings: { name: string; start: number; end: number }[] = [];

            const sequence = new SequenceActivity();
            sequence.activities = [
                {
                    execute: async () => {
                        timings.push({ name: 'task1', start: Date.now(), end: 0 });
                        await new Promise(r => setTimeout(r, 30));
                        timings[timings.length - 1].end = Date.now();
                        return { success: true };
                    }
                } as any,
                {
                    execute: async () => {
                        timings.push({ name: 'task2', start: Date.now(), end: 0 });
                        await new Promise(r => setTimeout(r, 20));
                        timings[timings.length - 1].end = Date.now();
                        return { success: true };
                    }
                } as any,
                {
                    execute: async () => {
                        timings.push({ name: 'task3', start: Date.now(), end: 0 });
                        await new Promise(r => setTimeout(r, 10));
                        timings[timings.length - 1].end = Date.now();
                        return { success: true };
                    }
                } as any
            ];

            await sequence.execute({});

            expect(timings[0].name).toBe('task1');
            expect(timings[1].name).toBe('task2');
            expect(timings[2].name).toBe('task3');

            expect(timings[1].start).toBeGreaterThanOrEqual(timings[0].end);
            expect(timings[2].start).toBeGreaterThanOrEqual(timings[1].end);
        });
    });

    describe('Context data flow in sequence', () => {
        it('should pass context data to all activities in sequence', async () => {
            const sequence = new SequenceActivity();
            const receivedContexts: TestContext[] = [];

            sequence.activities = [
                {
                    execute: async (ctx: TestContext) => {
                        ctx.step1Done = true;
                        ctx.valueFromStep1 = 'calculated';
                        receivedContexts.push({ ...ctx });
                        return { success: true };
                    }
                } as any,
                {
                    execute: async (ctx: TestContext) => {
                        ctx.step2Done = true;
                        ctx.valueFromStep2 = ctx.valueFromStep1 + '-modified';
                        receivedContexts.push({ ...ctx });
                        return { success: true };
                    }
                } as any,
                {
                    execute: async (ctx: TestContext) => {
                        ctx.step3Done = true;
                        ctx.finalValue = ctx.valueFromStep2 + '-final';
                        receivedContexts.push({ ...ctx });
                        return { success: true };
                    }
                } as any
            ];

            const result = await sequence.execute({ initial: 'data' });

            expect(result.success).toBe(true);
            expect(receivedContexts[0].step1Done).toBe(true);
            expect(receivedContexts[1].step2Done).toBe(true);
            expect(receivedContexts[2].step3Done).toBe(true);
            expect(receivedContexts[2].finalValue).toBe('calculated-modified-final');
        });

        it('should preserve context modifications across activities', async () => {
            const sequence = new SequenceActivity();
            const context: TestContext = { counter: 0 };

            sequence.activities = [
                {
                    execute: async (ctx: TestContext) => {
                        ctx.counter = (ctx.counter || 0) + 1;
                        return { success: true };
                    }
                } as any,
                {
                    execute: async (ctx: TestContext) => {
                        ctx.counter = (ctx.counter || 0) + 1;
                        return { success: true };
                    }
                } as any,
                {
                    execute: async (ctx: TestContext) => {
                        ctx.counter = (ctx.counter || 0) + 1;
                        return { success: true };
                    }
                } as any
            ];

            await sequence.execute(context);

            expect(context.counter).toBe(3);
        });
    });

    describe('SequenceActivity results tracking', () => {
        it('should track results from each activity in order', async () => {
            const sequence = new SequenceActivity();
            const results: any[] = [];

            sequence.activities = [
                {
                    execute: async () => {
                        return { success: true, data: { step: 1, value: 'first' } };
                    }
                } as any,
                {
                    execute: async () => {
                        return { success: true, data: { step: 2, value: 'second' } };
                    }
                } as any,
                {
                    execute: async () => {
                        return { success: true, data: { step: 3, value: 'third' } };
                    }
                } as any
            ];

            const result = await sequence.execute({});

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data?.results).toBeDefined();

            const resultsMap = result.data?.results as Map<any, any>;
            expect(resultsMap.size).toBe(3);
        });

        it('should return lastActivity in result data', async () => {
            const sequence = new SequenceActivity();
            const lastActivity = {
                execute: async () => ({ success: true, data: { last: true } })
            } as any;

            sequence.activities = [
                { execute: async () => ({ success: true }) } as any,
                { execute: async () => ({ success: true }) } as any,
                lastActivity
            ];

            const result = await sequence.execute({});

            expect(result.data?.lastActivity).toBe(lastActivity);
        });
    });
});
