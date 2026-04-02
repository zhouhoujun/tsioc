import expect = require('expect');
import { createInjector, Injector, InjectUtil } from '@tsdi/ioc';
import { ComponentsModule } from '@tsdi/components';
import { WorkflowModule } from '../src/workflow.module';
import { ActivityContext } from '../src/activities/Activity';
import { CodeActivity, SubProcessActivity, HttpRequestActivity } from '../src/activities';

describe('New Activities', () => {
    let injector: Injector;

    beforeEach(() => {
        injector = createInjector();
        InjectUtil.use(injector, WorkflowModule);
    });

    describe('CodeActivity', () => {
        it('should execute handler function', async () => {
            const activity = new CodeActivity();
            activity.handler = async (ctx: ActivityContext) => ({
                success: true,
                data: { processed: true }
            });

            const result = await activity.execute({});

            expect(result.success).toBe(true);
            expect(result.data?.processed).toBe(true);
        });

        it('should return error when no handler provided', async () => {
            const activity = new CodeActivity();

            const result = await activity.execute({});

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should handle synchronous handler', async () => {
            const activity = new CodeActivity();
            activity.handler = (ctx: ActivityContext) => ({
                success: true,
                data: { sync: true }
            });

            const result = await activity.execute({});

            expect(result.success).toBe(true);
            expect(result.data?.sync).toBe(true);
        });
    });

    describe('SubProcessActivity', () => {
        it('should execute with workflow definition', async () => {
            const activity = new SubProcessActivity();
            activity.workflow = {
                id: 'sub-workflow',
                name: 'Sub Workflow',
                nodes: [],
                connections: []
            };

            const result = await activity.execute({});

            expect(result.success).toBe(true);
            expect(result.data?.workflowId).toBe('sub-workflow');
        });

        it('should return error when no workflow provided', async () => {
            const activity = new SubProcessActivity();

            const result = await activity.execute({});

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should pass inputs to subprocess', async () => {
            const activity = new SubProcessActivity();
            activity.workflow = {
                id: 'sub-workflow',
                name: 'Sub Workflow',
                nodes: [],
                connections: []
            };
            activity.inputs = { key: 'value' };

            const result = await activity.execute({});

            expect(result.success).toBe(true);
            expect(result.data?.inputs?.key).toBe('value');
        });
    });

    describe('HttpRequestActivity', () => {
        it('should create with default options', async () => {
            const activity = new HttpRequestActivity();
            activity.url = 'https://httpbin.org/get';

            expect(activity.method).toBe('GET');
            expect(activity.timeout).toBe(30000);
            expect(activity.responseType).toBe('json');
        });

        it('should validate URL required', async () => {
            const activity = new HttpRequestActivity();

            const result = await activity.execute({});

            expect(result.success).toBe(false);
            expect(result.error?.message).toContain('URL');
        });
    });
});
