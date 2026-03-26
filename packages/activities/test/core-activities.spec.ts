import expect = require('expect');
import { 
    StartActivity, EndActivity, SequenceActivity, ParallelActivity,
    IfActivity, WhileActivity, DoWhileActivity, TryCatchActivity,
    TimerActivity, IntervalActivity, SwitchActivity, ConditionalActivity
} from '../src/activities';
import { Activity, ActivityContext, ActivityResult } from '../src/activities/Activity';
import { CaseActivity } from '../src/activities/Case';

describe('Core Activities', () => {

    describe('StartActivity', () => {
        it('should return success with start time', async () => {
            const activity = new StartActivity();
            const beforeTime = Date.now();
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(true);
            expect(result.data?.startTime).toBeDefined();
            expect(result.data?.startTime).toBeGreaterThanOrEqual(beforeTime);
        });

        it('should work with empty context', async () => {
            const activity = new StartActivity();
            const result = await activity.execute({});
            
            expect(result.success).toBe(true);
        });
    });

    describe('EndActivity', () => {
        it('should return success with end time', async () => {
            const activity = new EndActivity();
            const beforeTime = Date.now();
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(true);
            expect(result.data?.endTime).toBeDefined();
            expect(result.data?.endTime).toBeGreaterThanOrEqual(beforeTime);
        });
    });

    describe('SequenceActivity', () => {
        it('should execute activities in sequence', async () => {
            const activity = new SequenceActivity();
            const executionOrder: number[] = [];
            
            activity.activities = [
                { execute: async () => { executionOrder.push(1); return { success: true }; } } as any,
                { execute: async () => { executionOrder.push(2); return { success: true }; } } as any,
                { execute: async () => { executionOrder.push(3); return { success: true }; } } as any
            ];
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(true);
            expect(executionOrder).toEqual([1, 2, 3]);
        });

        it('should return success when no activities', async () => {
            const activity = new SequenceActivity();
            activity.activities = [];
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(true);
            expect(result.data?.completed).toBe(true);
        });

        it('should stop on first error by default', async () => {
            const activity = new SequenceActivity();
            const executed: number[] = [];
            
            activity.activities = [
                { execute: async () => { executed.push(1); return { success: true }; } } as any,
                { execute: async () => { executed.push(2); return { success: false, error: new Error('Failed') }; } } as any,
                { execute: async () => { executed.push(3); return { success: true }; } } as any
            ];
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(false);
            expect(executed).toEqual([1, 2]);
        });

        it('should continue on error when configured', async () => {
            const activity = new SequenceActivity();
            activity.continueOnError = true;
            const executed: number[] = [];
            
            activity.activities = [
                { execute: async () => { executed.push(1); return { success: true }; } } as any,
                { execute: async () => { executed.push(2); return { success: false, error: new Error('Failed') }; } } as any,
                { execute: async () => { executed.push(3); return { success: true }; } } as any
            ];
            
            const result = await activity.execute({});
            
            expect(executed).toEqual([1, 2, 3]);
            expect(result.success).toBe(false);
        });

        it('should pass context to each activity', async () => {
            const activity = new SequenceActivity();
            const receivedContexts: ActivityContext[] = [];
            
            activity.activities = [
                { execute: async (ctx: ActivityContext) => { receivedContexts.push(ctx); return { success: true }; } } as any,
                { execute: async (ctx: ActivityContext) => { receivedContexts.push(ctx); return { success: true }; } } as any
            ];
            
            const context = { testData: 'shared' };
            await activity.execute(context);
            
            expect(receivedContexts.length).toBe(2);
            expect(receivedContexts[0]).toBe(context);
            expect(receivedContexts[1]).toBe(context);
        });
    });

    describe('ParallelActivity', () => {
        it('should execute activities in parallel', async () => {
            const activity = new ParallelActivity();
            const executionTimes: number[] = [];
            
            activity.activities = [
                { execute: async () => { executionTimes.push(Date.now()); await delay(10); return { success: true }; } } as any,
                { execute: async () => { executionTimes.push(Date.now()); await delay(10); return { success: true }; } } as any,
                { execute: async () => { executionTimes.push(Date.now()); await delay(10); return { success: true }; } } as any
            ];
            activity.maxConcurrent = 5;
            
            const startTime = Date.now();
            const result = await activity.execute({ activities: activity.activities });
            const endTime = Date.now();
            
            expect(result.success).toBe(true);
            expect(endTime - startTime).toBeLessThan(50);
        });

        it('should respect max concurrent limit', async () => {
            const activity = new ParallelActivity();
            let concurrentCount = 0;
            let maxConcurrentReached = 0;
            
            activity.activities = [
                createTrackingActivity(),
                createTrackingActivity(),
                createTrackingActivity(),
                createTrackingActivity(),
                createTrackingActivity()
            ];
            activity.maxConcurrent = 2;
            
            const result = await activity.execute({ activities: activity.activities });
            
            expect(result.success).toBe(true);

            function createTrackingActivity(): Activity {
                return {
                    execute: async () => {
                        concurrentCount++;
                        maxConcurrentReached = Math.max(maxConcurrentReached, concurrentCount);
                        await delay(20);
                        concurrentCount--;
                        return { success: true };
                    }
                } as any;
            }
        });

        it('should return success when no activities', async () => {
            const activity = new ParallelActivity();
            activity.activities = [];
            
            const result = await activity.execute({ activities: [] });
            
            expect(result.success).toBe(true);
        });
    });

    describe('ConditionalActivity', () => {
        it('should return success when condition is true', async () => {
            const activity = new ConditionalActivity();
            activity.condition = true;
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(true);
            expect(result.data).toBe(true);
        });

        it('should return failure when condition is false', async () => {
            const activity = new ConditionalActivity();
            activity.condition = false;
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(false);
            expect(result.data).toBe(false);
        });

        it('should handle truthy values', async () => {
            const activity = new ConditionalActivity();
            (activity as any).condition = 'truthy string';
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(true);
        });

        it('should handle falsy values', async () => {
            const activity = new ConditionalActivity();
            (activity as any).condition = 0;
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(false);
        });
    });

    describe('IfActivity', () => {
        it('should execute then activity when condition is true', async () => {
            const activity = new IfActivity();
            activity.condition = true;
            let thenExecuted = false;
            activity.thenActivity = {
                execute: async () => { thenExecuted = true; return { success: true }; }
            } as any;
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(true);
            expect(thenExecuted).toBe(true);
            expect(result.data?.condition).toBe(true);
        });

        it('should execute else activity when condition is false', async () => {
            const activity = new IfActivity();
            activity.condition = false;
            let thenExecuted = false;
            let elseExecuted = false;
            activity.thenActivity = {
                execute: async () => { thenExecuted = true; return { success: true }; }
            } as any;
            activity.elseActivity = {
                execute: async () => { elseExecuted = true; return { success: true }; }
            } as any;
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(true);
            expect(thenExecuted).toBe(false);
            expect(elseExecuted).toBe(true);
        });

        it('should return success when condition is false and no else activity', async () => {
            const activity = new IfActivity();
            activity.condition = false;
            activity.thenActivity = {
                execute: async () => ({ success: true })
            } as any;
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(true);
            expect(result.data?.condition).toBe(false);
        });

        it('should return error when no then activity', async () => {
            const activity = new IfActivity();
            activity.condition = true;
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(false);
            expect(result.error?.message).toContain('No then activity');
        });

        it('should pass result from executed activity', async () => {
            const activity = new IfActivity();
            activity.condition = true;
            activity.thenActivity = {
                execute: async () => ({ success: true, data: { value: 42 } })
            } as any;
            
            const result = await activity.execute({});
            
            expect(result.data?.result).toEqual({ value: 42 });
        });
    });

    describe('WhileActivity', () => {
        it('should execute body while condition is true', async () => {
            const activity = new WhileActivity();
            let counter = 0;
            
            activity.condition = async () => counter < 3;
            activity.body = {
                execute: async () => { counter++; return { success: true }; }
            } as any;
            activity.maxIterations = 10;
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(true);
            expect(counter).toBe(3);
            expect(result.data?.iteration).toBe(3);
        });

        it('should stop at max iterations', async () => {
            const activity = new WhileActivity();
            let counter = 0;
            
            activity.condition = async () => true;
            activity.body = {
                execute: async () => { counter++; return { success: true }; }
            } as any;
            activity.maxIterations = 5;
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(false);
            expect(result.error?.message).toContain('Maximum iterations');
            expect(counter).toBe(5);
        });

        it('should return error when no condition', async () => {
            const activity = new WhileActivity();
            activity.body = { execute: async () => ({ success: true }) } as any;
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(false);
            expect(result.error?.message).toContain('No condition');
        });

        it('should return error when no body', async () => {
            const activity = new WhileActivity();
            activity.condition = async () => true;
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(false);
            expect(result.error?.message).toContain('No body activity');
        });

        it('should respect interval between iterations', async () => {
            const activity = new WhileActivity();
            const times: number[] = [];
            
            activity.condition = async () => times.length < 3;
            activity.body = {
                execute: async () => { times.push(Date.now()); return { success: true }; }
            } as any;
            activity.maxIterations = 5;
            activity.interval = 20;
            
            const startTime = Date.now();
            await activity.execute({});
            const endTime = Date.now();
            
            expect(endTime - startTime).toBeGreaterThanOrEqual(40);
        });

        it('should not execute if condition is false initially', async () => {
            const activity = new WhileActivity();
            let executed = false;
            
            activity.condition = async () => false;
            activity.body = {
                execute: async () => { executed = true; return { success: true }; }
            } as any;
            activity.maxIterations = 10;
            
            const result = await activity.execute({});
            
            expect(executed).toBe(false);
            expect(result.data?.iteration).toBe(0);
        });
    });

    describe('DoWhileActivity', () => {
        it('should execute body at least once', async () => {
            const activity = new DoWhileActivity();
            let executed = false;
            
            const result = await activity.execute({
                condition: () => false,
                bodyActivity: {
                    execute: async () => { executed = true; return { success: true }; }
                } as any
            });
            
            expect(executed).toBe(true);
            expect(result.success).toBe(true);
            expect(result.data?.iterations).toBe(1);
        });

        it('should loop while condition is true', async () => {
            const activity = new DoWhileActivity();
            let counter = 0;
            
            const result = await activity.execute({
                condition: () => counter < 3,
                bodyActivity: {
                    execute: async () => { counter++; return { success: true }; }
                } as any,
                maxIterations: 10
            });
            
            expect(counter).toBe(3);
            expect(result.data?.iterations).toBe(3);
        });

        it('should stop on body execution failure', async () => {
            const activity = new DoWhileActivity();
            let counter = 0;
            
            const result = await activity.execute({
                condition: () => true,
                bodyActivity: {
                    execute: async () => {
                        counter++;
                        if (counter >= 2) {
                            return { success: false, error: new Error('Failed') };
                        }
                        return { success: true };
                    }
                } as any,
                maxIterations: 10
            });
            
            expect(result.success).toBe(false);
            expect(counter).toBe(2);
        });

        it('should return error when missing body or condition', async () => {
            const activity = new DoWhileActivity();
            
            const result = await activity.execute({} as any);
            
            expect(result.success).toBe(false);
            expect(result.error?.message).toContain('Missing required');
        });
    });

    describe('TryCatchActivity', () => {
        it('should execute try activity successfully', async () => {
            const activity = new TryCatchActivity();
            let tryExecuted = false;
            
            activity.tryActivity = {
                execute: async () => { tryExecuted = true; return { success: true, data: 'try result' }; }
            } as any;
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(true);
            expect(tryExecuted).toBe(true);
            expect(result.data?.tryResult?.success).toBe(true);
        });

        it('should catch error and execute catch activity', async () => {
            const activity = new TryCatchActivity();
            let catchExecuted = false;
            let caughtErrorMessage: string = '';
            
            activity.tryActivity = {
                execute: async () => { throw new Error('Try failed'); }
            } as any;
            activity.catchActivity = {
                execute: async (ctx: any) => {
                    catchExecuted = true;
                    caughtErrorMessage = ctx.error?.message || '';
                    return { success: true, data: 'caught' };
                }
            } as any;
            
            const result = await activity.execute({});
            
            expect(catchExecuted).toBe(true);
            expect(caughtErrorMessage).toBe('Try failed');
        });

        it('should execute finally activity regardless of error', async () => {
            const activity = new TryCatchActivity();
            let finallyExecuted = false;
            
            activity.tryActivity = {
                execute: async () => { throw new Error('Try failed'); }
            } as any;
            activity.catchActivity = {
                execute: async () => ({ success: true })
            } as any;
            activity.finallyActivity = {
                execute: async () => { finallyExecuted = true; return { success: true }; }
            } as any;
            
            await activity.execute({});
            
            expect(finallyExecuted).toBe(true);
        });

        it('should execute finally after successful try', async () => {
            const activity = new TryCatchActivity();
            let finallyExecuted = false;
            
            activity.tryActivity = {
                execute: async () => ({ success: true })
            } as any;
            activity.finallyActivity = {
                execute: async () => { finallyExecuted = true; return { success: true }; }
            } as any;
            
            await activity.execute({});
            
            expect(finallyExecuted).toBe(true);
        });

        it('should return error when no try activity', async () => {
            const activity = new TryCatchActivity();
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(false);
            expect(result.error?.message).toContain('Try activity is required');
        });

        it('should handle error when no catch activity', async () => {
            const activity = new TryCatchActivity();
            
            activity.tryActivity = {
                execute: async () => { throw new Error('Try failed'); }
            } as any;
            
            try {
                await activity.execute({});
                expect(true).toBe(false);
            } catch (error) {
                expect((error as Error).message).toBe('Try failed');
            }
        });

        it('should filter errors by type', async () => {
            const activity = new TryCatchActivity();
            let catchExecuted = false;
            
            class CustomError extends Error {
                constructor(message: string) {
                    super(message);
                    this.name = 'CustomError';
                }
            }
            
            activity.tryActivity = {
                execute: async () => { throw new CustomError('Custom error'); }
            } as any;
            activity.catchActivity = {
                execute: async () => { catchExecuted = true; return { success: true }; }
            } as any;
            activity.errorTypes = [CustomError];
            
            const result = await activity.execute({});
            
            expect(catchExecuted).toBe(true);
        });
    });

    describe('TimerActivity', () => {
        it('should execute after timeout delay', async () => {
            const activity = new TimerActivity();
            activity.type = 'timeout';
            activity.delay = 50;
            
            const startTime = Date.now();
            const result = await activity.execute({});
            const endTime = Date.now();
            
            expect(result.success).toBe(true);
            expect(result.data?.executed).toBe(true);
            expect(endTime - startTime).toBeGreaterThanOrEqual(40);
        });

        it('should execute interval with max repeats', async () => {
            const activity = new TimerActivity();
            activity.type = 'interval';
            activity.interval = 20;
            activity.maxRepeats = 3;
            activity.immediate = true;
            activity.body = {
                execute: async () => ({ success: true })
            } as any;
            
            const startTime = Date.now();
            const result = await activity.execute({});
            const endTime = Date.now();
            
            expect(result.success).toBe(true);
            expect(result.data?.executionCount).toBe(3);
            expect(endTime - startTime).toBeGreaterThanOrEqual(40);
        });

        it('should return error for invalid timer type', async () => {
            const activity = new TimerActivity();
            (activity as any).type = 'invalid';
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(false);
            expect(result.error?.message).toContain('Unsupported timer type');
        });

        it('should return error when no type specified', async () => {
            const activity = new TimerActivity();
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(false);
            expect(result.error?.message).toContain('Timer type is required');
        });

        it('should execute date timer at target time', async () => {
            const activity = new TimerActivity();
            activity.type = 'date';
            activity.targetDate = new Date(Date.now() + 50);
            
            const startTime = Date.now();
            const result = await activity.execute({});
            const endTime = Date.now();
            
            expect(result.success).toBe(true);
            expect(endTime - startTime).toBeGreaterThanOrEqual(40);
        });

        it('should return error when no target date for date type', async () => {
            const activity = new TimerActivity();
            activity.type = 'date';
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(false);
            expect(result.error?.message).toContain('Target date is required');
        });
    });

    describe('IntervalActivity', () => {
        it('should execute with interval and max executions', async () => {
            const activity = new IntervalActivity();
            let executionCount = 0;
            
            activity.interval = 20;
            activity.maxExecutions = 3;
            activity.body = {
                execute: async () => { executionCount++; return { success: true }; }
            } as any;
            
            const startTime = Date.now();
            const result = await activity.execute({});
            const endTime = Date.now();
            
            expect(result.success).toBe(true);
            expect(executionCount).toBe(3);
            expect(result.data?.executions).toBe(3);
            expect(endTime - startTime).toBeGreaterThanOrEqual(40);
        });

        it('should execute immediately when configured', async () => {
            const activity = new IntervalActivity();
            const executionTimes: number[] = [];
            
            activity.interval = 30;
            activity.maxExecutions = 2;
            activity.immediate = true;
            activity.body = {
                execute: async () => { executionTimes.push(Date.now()); return { success: true }; }
            } as any;
            
            const startTime = Date.now();
            await activity.execute({});
            
            expect(executionTimes[0] - startTime).toBeLessThan(20);
        });

        it('should return error when no body', async () => {
            const activity = new IntervalActivity();
            activity.interval = 100;
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(false);
            expect(result.error?.message).toContain('No action activity');
        });

        it('should return error for invalid interval', async () => {
            const activity = new IntervalActivity();
            activity.interval = -1;
            activity.body = { execute: async () => ({ success: true }) } as any;
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(false);
            expect(result.error?.message).toContain('Invalid interval');
        });
    });

    describe('SwitchActivity', () => {
        it('should execute all cases', async () => {
            const activity = new SwitchActivity<number>();
            let executionCount = 0;
            
            activity.cases = [
                {
                    execute: async () => { executionCount++; return { success: true, data: { matched: true } }; }
                } as any,
                {
                    execute: async () => { executionCount++; return { success: true, data: { matched: false } }; }
                } as any
            ];
            activity.breakOnMatch = true;
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(true);
            expect(result.data?.matched).toBe(true);
        });

        it('should execute default when provided', async () => {
            const activity = new SwitchActivity<number>();
            let defaultExecuted = false;
            
            activity.cases = [
                {
                    execute: async () => ({ success: true, data: { matched: false } })
                } as any
            ];
            activity.defaultActivity = {
                execute: async () => { defaultExecuted = true; return { success: true }; }
            } as any;
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(true);
            expect(defaultExecuted).toBe(true);
        });

        it('should return error when no cases', async () => {
            const activity = new SwitchActivity();
            activity.cases = [];
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(false);
            expect(result.error?.message).toContain('No cases');
        });

        it('should execute all cases when breakOnMatch is false', async () => {
            const activity = new SwitchActivity<number>();
            const executionCount = { value: 0 };
            
            activity.cases = [
                {
                    execute: async () => { executionCount.value++; return { success: true, data: { matched: true } }; }
                } as any,
                {
                    execute: async () => { executionCount.value++; return { success: true, data: { matched: true } }; }
                } as any,
                {
                    execute: async () => { executionCount.value++; return { success: true, data: { matched: true } }; }
                } as any
            ];
            activity.breakOnMatch = false;
            
            await activity.execute({});
            
            expect(executionCount.value).toBe(3);
        });
    });
});

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}