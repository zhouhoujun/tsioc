import expect = require('expect');
import {
    AssignActivity, LogActivity, ForEachActivity,
    TransformActivity, MapActivity, FilterActivity, ReduceActivity,
    ValidateActivity, RequiredActivity, RangeActivity, PatternActivity,
    EmitActivity, WaitActivity,
    BatchActivity, MergeActivity, SplitActivity
} from '../src/activities';
import { ActivityContext } from '../src/activities/Activity';

describe('Common Activities', () => {

    describe('AssignActivity', () => {
        it('should assign values to context', async () => {
            const activity = new AssignActivity();
            activity.values = { name: 'test', value: 123 };
            
            const context: any = { variables: {} };
            const result = await activity.execute(context);
            
            expect(result.success).toBe(true);
            expect(context.variables.name).toBe('test');
            expect(context.variables.value).toBe(123);
        });

        it('should merge values with existing context', async () => {
            const activity = new AssignActivity();
            activity.values = { newKey: 'newValue' };
            activity.merge = true;
            
            const context: any = { variables: { existingKey: 'existingValue' } };
            const result = await activity.execute(context);
            
            expect(result.success).toBe(true);
            expect(context.variables.existingKey).toBe('existingValue');
            expect(context.variables.newKey).toBe('newValue');
        });

        it('should overwrite existing values when overwrite is true', async () => {
            const activity = new AssignActivity();
            activity.values = { key: 'newValue' };
            activity.merge = true;
            activity.overwrite = true;
            
            const context: any = { variables: { key: 'oldValue' } };
            const result = await activity.execute(context);
            
            expect(result.success).toBe(true);
            expect(context.variables.key).toBe('newValue');
        });
    });

    describe('LogActivity', () => {
        it('should log message with info level', async () => {
            const activity = new LogActivity();
            activity.level = 'info';
            activity.message = 'Test log message';
            
            const logs: string[] = [];
            const context: any = {
                logger: {
                    info: (...args: any[]) => logs.push(args.join(' ')),
                    debug: () => {},
                    warn: () => {},
                    error: () => {}
                }
            };
            
            const result = await activity.execute(context);
            
            expect(result.success).toBe(true);
            expect(logs.length).toBeGreaterThan(0);
            expect(logs[0]).toContain('Test log message');
        });

        it('should log with timestamp when enabled', async () => {
            const activity = new LogActivity();
            activity.message = 'Timestamp test';
            activity.includeTimestamp = true;
            
            const logs: string[] = [];
            const context: any = {
                logger: {
                    info: (...args: any[]) => logs.push(args.join(' ')),
                    debug: () => {},
                    warn: () => {},
                    error: () => {}
                }
            };
            
            const result = await activity.execute(context);
            
            expect(result.success).toBe(true);
            expect(logs[0]).toMatch(/\[\d{4}-\d{2}-\d{2}T/);
        });

        it('should log data along with message', async () => {
            const activity = new LogActivity();
            activity.message = 'Data log';
            activity.data = { key: 'value' };
            
            let loggedData: any = null;
            const context: any = {
                logger: {
                    info: (_msg: string, data: any) => loggedData = data,
                    debug: () => {},
                    warn: () => {},
                    error: () => {}
                }
            };
            
            const result = await activity.execute(context);
            
            expect(result.success).toBe(true);
            expect(loggedData).toEqual({ key: 'value' });
        });
    });

    describe('ForEachActivity', () => {
        it('should iterate over items sequentially', async () => {
            const activity = new ForEachActivity();
            activity.items = [1, 2, 3];
            activity.parallel = false;
            
            const executedItems: number[] = [];
            activity.body = {
                execute: async (ctx: any) => {
                    executedItems.push(ctx.currentItem);
                    return { success: true, data: ctx.currentItem * 2 };
                }
            } as any;
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(true);
            expect(executedItems).toEqual([1, 2, 3]);
            expect(result.data?.processed).toBe(3);
        });

        it('should iterate in parallel when parallel is true', async () => {
            const activity = new ForEachActivity();
            activity.items = [1, 2, 3, 4, 5];
            activity.parallel = true;
            activity.maxConcurrency = 3;
            
            const executedItems: number[] = [];
            activity.body = {
                execute: async (ctx: any) => {
                    await new Promise(r => setTimeout(r, 10));
                    executedItems.push(ctx.currentItem);
                    return { success: true };
                }
            } as any;
            
            const startTime = Date.now();
            const result = await activity.execute({});
            const endTime = Date.now();
            
            expect(result.success).toBe(true);
            expect(executedItems.length).toBe(5);
            expect(endTime - startTime).toBeLessThan(100);
        });

        it('should continue on error when configured', async () => {
            const activity = new ForEachActivity();
            activity.items = [1, 2, 3];
            activity.continueOnError = true;
            
            activity.body = {
                execute: async (ctx: any) => {
                    if (ctx.currentItem === 2) {
                        return { success: false, error: new Error('Item 2 failed') };
                    }
                    return { success: true };
                }
            } as any;
            
            const result = await activity.execute({});
            
            expect(result.data?.processed).toBe(3);
        });

        it('should stop on first error by default', async () => {
            const activity = new ForEachActivity();
            activity.items = [1, 2, 3];
            activity.continueOnError = false;
            
            activity.body = {
                execute: async (ctx: any) => {
                    if (ctx.currentItem === 2) {
                        return { success: false, error: new Error('Failed') };
                    }
                    return { success: true };
                }
            } as any;
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(false);
            expect(result.data?.processed).toBe(2);
        });
    });

    describe('TransformActivity', () => {
        it('should transform data using function', async () => {
            const activity = new TransformActivity();
            activity.input = { value: 5 };
            activity.transform = (data: any) => ({ ...data, doubled: data.value * 2 });
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(true);
            expect(result.data?.output?.doubled).toBe(10);
        });

        it('should chain multiple transforms', async () => {
            const activity = new TransformActivity();
            activity.input = 5;
            activity.chain = [
                (x: number) => x * 2,
                (x: number) => x + 10,
                (x: number) => x.toString()
            ];
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(true);
            expect(result.data?.output).toBe('20');
        });
    });

    describe('MapActivity', () => {
        it('should map items using mapper function', async () => {
            const activity = new MapActivity();
            activity.items = [1, 2, 3];
            activity.mapper = (item: number) => item * 2;
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(true);
            expect(result.data?.results).toEqual([2, 4, 6]);
        });
    });

    describe('FilterActivity', () => {
        it('should filter items based on predicate', async () => {
            const activity = new FilterActivity();
            activity.items = [1, 2, 3, 4, 5];
            activity.predicate = (item: number) => item % 2 === 0;
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(true);
            expect(result.data?.results).toEqual([2, 4]);
            expect(result.data?.filteredCount).toBe(2);
        });
    });

    describe('ReduceActivity', () => {
        it('should reduce items to single value', async () => {
            const activity = new ReduceActivity();
            activity.items = [1, 2, 3, 4, 5];
            activity.reducer = (acc: number, curr: number) => acc + curr;
            activity.initialValue = 0;
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(true);
            expect(result.data?.result).toBe(15);
        });
    });

    describe('ValidateActivity', () => {
        it('should validate data against rules', async () => {
            const activity = new ValidateActivity();
            activity.data = { name: 'test', age: 25 };
            activity.rules = [
                { field: 'name', validator: (v: string) => v.length > 0 },
                { field: 'age', validator: (v: number) => v >= 18 }
            ];
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(true);
            expect(result.data?.isValid).toBe(true);
        });

        it('should collect validation errors', async () => {
            const activity = new ValidateActivity();
            activity.data = { name: '', age: 10 };
            activity.rules = [
                { field: 'name', validator: (v: string) => v.length > 0 ? true : 'Name is required' },
                { field: 'age', validator: (v: number) => v >= 18 ? true : 'Must be 18 or older' }
            ];
            activity.stopOnFirstError = false;
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(false);
            expect(result.data?.isValid).toBe(false);
            expect(result.data?.errors?.name).toContain('Name is required');
        });

        it('should stop on first error when configured', async () => {
            const activity = new ValidateActivity();
            activity.data = { name: '', age: 10 };
            activity.rules = [
                { field: 'name', validator: (v: string) => v.length > 0 ? true : 'Required' },
                { field: 'age', validator: (v: number) => v >= 18 ? true : 'Too young' }
            ];
            activity.stopOnFirstError = true;
            
            const result = await activity.execute({});
            
            expect(result.data?.errors?.name).toBeDefined();
            expect(result.data?.errors?.age).toBeUndefined();
        });
    });

    describe('RequiredActivity', () => {
        it('should pass for non-empty values', async () => {
            const activity = new RequiredActivity();
            activity.field = 'name';
            
            const context: any = { data: { name: 'test' } };
            const result = await activity.execute(context);
            
            expect(result.success).toBe(true);
            expect(result.data?.isValid).toBe(true);
        });

        it('should fail for empty values', async () => {
            const activity = new RequiredActivity();
            activity.field = 'name';
            
            const context: any = { data: { name: '' } };
            const result = await activity.execute(context);
            
            expect(result.success).toBe(false);
            expect(result.data?.isValid).toBe(false);
        });
    });

    describe('RangeActivity', () => {
        it('should validate number within range', async () => {
            const activity = new RangeActivity();
            activity.field = 'age';
            activity.min = 18;
            activity.max = 65;
            
            const context: any = { data: { age: 30 } };
            const result = await activity.execute(context);
            
            expect(result.success).toBe(true);
            expect(result.data?.isValid).toBe(true);
        });

        it('should fail for number below minimum', async () => {
            const activity = new RangeActivity();
            activity.field = 'age';
            activity.min = 18;
            
            const context: any = { data: { age: 10 } };
            const result = await activity.execute(context);
            
            expect(result.success).toBe(false);
        });
    });

    describe('PatternActivity', () => {
        it('should validate string against pattern', async () => {
            const activity = new PatternActivity();
            activity.field = 'email';
            activity.pattern = /^[a-z]+@[a-z]+\.[a-z]+$/;
            
            const context: any = { data: { email: 'test@example.com' } };
            const result = await activity.execute(context);
            
            expect(result.success).toBe(true);
            expect(result.data?.isValid).toBe(true);
        });

        it('should fail for non-matching pattern', async () => {
            const activity = new PatternActivity();
            activity.field = 'email';
            activity.pattern = /^[a-z]+@[a-z]+\.[a-z]+$/;
            
            const context: any = { data: { email: 'invalid-email' } };
            const result = await activity.execute(context);
            
            expect(result.success).toBe(false);
        });
    });

    describe('EmitActivity', () => {
        it('should emit event to context', async () => {
            const activity = new EmitActivity();
            activity.event = 'test-event';
            activity.data = { message: 'Hello' };
            
            const context: any = { events: new Map() };
            const result = await activity.execute(context);
            
            expect(result.success).toBe(true);
            expect(context.events.has('test-event')).toBe(true);
            expect(context.events.get('test-event')[0].data).toEqual({ message: 'Hello' });
        });

        it('should create events map if not exists', async () => {
            const activity = new EmitActivity();
            activity.event = 'new-event';
            activity.data = { test: true };
            
            const context: any = {};
            const result = await activity.execute(context);
            
            expect(result.success).toBe(true);
            expect(context.events).toBeDefined();
        });
    });

    describe('BatchActivity', () => {
        it('should process items in batches', async () => {
            const activity = new BatchActivity();
            activity.items = Array.from({ length: 25 }, (_, i) => i);
            activity.batchSize = 10;
            
            const processedItems: number[] = [];
            activity.body = {
                execute: async (ctx: any) => {
                    processedItems.push(ctx.currentItem);
                    return { success: true };
                }
            } as any;
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(true);
            expect(result.data?.processed).toBe(25);
            expect(result.data?.batches).toBe(3);
        });

        it('should add delay between batches', async () => {
            const activity = new BatchActivity();
            activity.items = [1, 2, 3];
            activity.batchSize = 1;
            activity.delayBetweenBatches = 50;
            
            activity.body = {
                execute: async () => ({ success: true })
            } as any;
            
            const startTime = Date.now();
            await activity.execute({});
            const endTime = Date.now();
            
            expect(endTime - startTime).toBeGreaterThanOrEqual(100);
        });
    });

    describe('MergeActivity', () => {
        it('should merge objects', async () => {
            const activity = new MergeActivity();
            activity.sources = [
                { a: 1 },
                { b: 2 },
                { c: 3 }
            ];
            activity.strategy = 'object';
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(true);
            expect(result.data?.merged).toEqual({ a: 1, b: 2, c: 3 });
        });

        it('should deep merge objects when enabled', async () => {
            const activity = new MergeActivity();
            activity.sources = [
                { nested: { a: 1 } },
                { nested: { b: 2 } }
            ];
            activity.strategy = 'object';
            activity.deep = true;
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(true);
            expect(result.data?.merged).toEqual({ nested: { a: 1, b: 2 } });
        });

        it('should concat arrays', async () => {
            const activity = new MergeActivity();
            activity.sources = [[1, 2], [3, 4], [5]];
            activity.strategy = 'concat';
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(true);
            expect(result.data?.merged).toEqual([1, 2, 3, 4, 5]);
        });
    });

    describe('SplitActivity', () => {
        it('should split string by delimiter', async () => {
            const activity = new SplitActivity();
            activity.input = 'a,b,c,d';
            activity.delimiter = ',';
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(true);
            expect(result.data?.parts).toEqual(['a', 'b', 'c', 'd']);
        });

        it('should split array into chunks', async () => {
            const activity = new SplitActivity();
            activity.input = [1, 2, 3, 4, 5, 6];
            activity.chunkSize = 2;
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(true);
            expect(result.data?.parts).toEqual([[1, 2], [3, 4], [5, 6]]);
        });
    });
});