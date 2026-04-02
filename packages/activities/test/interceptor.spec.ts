import expect = require('expect');
import { createInjector, Injector, InjectUtil } from '@tsdi/ioc';
import { ComponentsModule } from '@tsdi/components';
import { WorkflowModule } from '../src/workflow.module';
import {
    ActivityInterceptorService,
    ActivityLogAspect,
    IActivityInterceptor,
    ActivityLogEntry
} from '../src/aop';
import { Activity, ActivityContext, ActivityResult } from '../src/activities/Activity';

describe('Activity Interceptor System', () => {
    let injector: Injector;
    let interceptorService: ActivityInterceptorService;

    beforeEach(() => {
        injector = createInjector();
        InjectUtil.use(injector, WorkflowModule);
        interceptorService = injector.get(ActivityInterceptorService);
    });

    describe('ActivityInterceptorService', () => {
        it('should register interceptor', () => {
            const interceptor: IActivityInterceptor = {
                type: 'before',
                before: async (ctx: ActivityContext) => ctx
            };

            interceptorService.registerInterceptor({ interceptor });
            const interceptors = interceptorService.getInterceptors();

            expect(interceptors.length).toBe(1);
        });

        it('should unregister interceptor', () => {
            const interceptor: IActivityInterceptor = {
                type: 'before',
                before: async (ctx: ActivityContext) => ctx
            };

            interceptorService.registerInterceptor({ interceptor });
            interceptorService.unregisterInterceptor(interceptor);

            expect(interceptorService.getInterceptors().length).toBe(0);
        });

        it('should clear all interceptors', () => {
            const interceptor1: IActivityInterceptor = {
                type: 'before',
                before: async (ctx: ActivityContext) => ctx
            };
            const interceptor2: IActivityInterceptor = {
                type: 'after',
                after: async (ctx: ActivityContext, act: Activity, res: ActivityResult) => res
            };

            interceptorService.registerInterceptor({ interceptor: interceptor1 });
            interceptorService.registerInterceptor({ interceptor: interceptor2 });
            interceptorService.clearInterceptors();

            expect(interceptorService.getInterceptors().length).toBe(0);
        });

        it('should execute activity with before interceptor', async () => {
            let beforeCalled = false;
            const interceptor: IActivityInterceptor = {
                type: 'before',
                priority: 1,
                before: async (ctx: ActivityContext) => {
                    beforeCalled = true;
                    return { ...ctx, modified: true };
                }
            };

            interceptorService.registerInterceptor({ interceptor });

            const activity: Activity = {
                execute: async (ctx: ActivityContext) => ({
                    success: true,
                    data: ctx
                })
            } as any;

            const result = await interceptorService.executeWithInterceptors(
                activity,
                { original: true }
            );

            expect(beforeCalled).toBe(true);
            expect(result.success).toBe(true);
        });

        it('should execute activity with after interceptor', async () => {
            let afterCalled = false;
            const interceptor: IActivityInterceptor = {
                type: 'after',
                after: async (ctx: ActivityContext, act: Activity, res: ActivityResult) => {
                    afterCalled = true;
                    return { ...res, intercepted: true };
                }
            };

            interceptorService.registerInterceptor({ interceptor });

            const activity: Activity = {
                execute: async (ctx: ActivityContext) => ({
                    success: true,
                    data: ctx
                })
            } as any;

            const result = await interceptorService.executeWithInterceptors(
                activity,
                {}
            );

            expect(afterCalled).toBe(true);
        });

        it('should execute activity with onError interceptor', async () => {
            let errorCalled = false;
            const interceptor: IActivityInterceptor = {
                type: 'onError',
                onError: async (ctx: ActivityContext, act: Activity, err: Error) => {
                    errorCalled = true;
                    return { success: true, data: { errorCaught: err.message } };
                }
            };

            interceptorService.registerInterceptor({ interceptor });

            const activity: Activity = {
                execute: async () => {
                    throw new Error('Test error');
                }
            } as any;

            const result = await interceptorService.executeWithInterceptors(
                activity,
                {}
            );

            expect(errorCalled).toBe(true);
            expect(result.success).toBe(true);
            expect(result.data?.errorCaught).toBe('Test error');
        });

        it('should log activity execution', () => {
            interceptorService.log('info', 'TestActivity', 'Test message');

            const logs = interceptorService.getLogs();
            expect(logs.length).toBe(1);
            expect(logs[0].activityName).toBe('TestActivity');
            expect(logs[0].message).toBe('Test message');
            expect(logs[0].level).toBe('info');
        });

        it('should filter logs by level', () => {
            interceptorService.log('info', 'Activity1', 'Info message');
            interceptorService.log('error', 'Activity2', 'Error message');
            interceptorService.log('debug', 'Activity3', 'Debug message');

            const errorLogs = interceptorService.getLogs({ level: 'error' });
            expect(errorLogs.length).toBe(1);
            expect(errorLogs[0].activityName).toBe('Activity2');
        });

        it('should filter logs by activity name', () => {
            interceptorService.log('info', 'Activity1', 'Message 1');
            interceptorService.log('info', 'Activity2', 'Message 2');
            interceptorService.log('info', 'Activity1', 'Message 3');

            const filtered = interceptorService.getLogs({ activityName: 'Activity1' });
            expect(filtered.length).toBe(2);
        });

        it('should clear logs', () => {
            interceptorService.log('info', 'TestActivity', 'Test message');
            interceptorService.clearLogs();

            expect(interceptorService.getLogs().length).toBe(0);
        });

        it('should enable and disable tracing', () => {
            interceptorService.setEnableTrace(true);
            expect(interceptorService.isTraceEnabled()).toBe(true);

            interceptorService.setEnableTrace(false);
            expect(interceptorService.isTraceEnabled()).toBe(false);
        });
    });

    describe('ActivityLogAspect', () => {
        it('should provide ActivityLogAspect from module', () => {
            expect(ActivityLogAspect).toBeDefined();
        });
    });
});
