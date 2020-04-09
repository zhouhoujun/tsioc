import expect = require('expect');
import { Workflow, WorkflowInstance, ActivityModule, IfActivity, Activities, ActivityComponentRef, ActivityElementRef } from '../src';
import { SimpleTask, SimpleCTask, TaskModuleTest } from './simples.task';
import { BootApplication } from '@tsdi/boot';
import { ComponentsModule } from '@tsdi/components';


describe('activity test', () => {
    describe('#auto register with build', () => {

        it('should bootstrap with single task.', async () => {
            let ctx = await Workflow.run(SimpleTask);
            // console.log(ctx.startup);
            expect(ctx.getStartup() instanceof WorkflowInstance).toBe(true);
            // console.log(result);
            expect(ctx.result).toEqual('simple task');
        });

        it('should bootstrap with single task via name or provider.', async () => {
            let ctx = await Workflow.run(SimpleTask);
            // console.log(result);
            expect(ctx.result).toEqual('simple task');
        });

        it('should bootstrap with component task.', async () => {
            let ctx = await Workflow.run(SimpleCTask);
            expect(ctx.result).toEqual('component task');
        });

        it('should bootstrap with component task via name or provider.', async () => {
            let ctx = await Workflow.run(SimpleCTask);
            // console.log('comptest:' , result.activity, result.instance);
            expect(ctx.result).toEqual('component task');
        });

        it('should bootstrap with configure.', async () => {
            let ctx = await Workflow.run({
                // deps: [
                //     ServerActivitiesModule
                // ],
                name: 'test1',
                template: [
                    {
                        name: 'test---ccc---1',
                        activity: SimpleTask
                    },
                    SimpleCTask
                    // {
                    //     name: 'test------2',
                    //     activity: SimpleCTask
                    // }
                ]

            });
            // console.log('configure:' , result.instance.constructor.name, result.instance['activities'], result.resultValue);
            // console.log(ctx.module, ctx.target, ctx.getBootTarget());
            expect(ctx.result).toEqual('component task');
        });

        it('should bootstrap with meta IConfigure.', async () => {
            let ctx = await Workflow.run(TaskModuleTest);
            // console.log('meta configure:' , result.instance.constructor.name, result.instance['activities'], result.resultValue)
            expect(ctx.result).toEqual('component task');
            let activity = ctx.boot as ActivityComponentRef;
            let ifact = activity.nodeRef.rootNodes[0] as ActivityElementRef;
            // console.log(ifact);
            expect(ifact.nativeElement instanceof IfActivity).toBeTruthy();
            expect(ifact.name).toEqual('test---task---3');
            expect((<IfActivity>ifact.nativeElement).condition.name).not.toEqual('test---task---3');
        });

        it('should bootstrap with template configure.', async () => {
            let app = new BootApplication();
            await app.getContainer().load(ComponentsModule, ActivityModule, SimpleTask, SimpleCTask)
            let ctx = await Workflow.run({
                // deps: [
                //     ServerActivitiesModule
                // ],
                name: 'test1',
                template: {
                    name: 'test------2',
                    activity: 'comptest'
                },
                injector: app.getContainer()
            });
            expect(ctx.result).toEqual('component task');
        });

        it('should bootstrap with template configure array.', async () => {
            let app = new BootApplication();
            await app.getContainer().load(ComponentsModule, ActivityModule, SimpleTask, SimpleCTask)
            let ctx = await Workflow.run({
                // deps: [
                //     ServerActivitiesModule
                // ],
                name: 'test1',
                template: [
                    {
                        name: 'test---ccc---1',
                        activity: 'stest'
                    },
                    {
                        name: 'test------2',
                        activity: 'comptest'
                    }
                ],
                injector: app.getContainer()
            });
            expect(ctx.result).toEqual('component task');
        });

        it('should get context by execute action.', async () => {
            let ctx = await Workflow.run({
                template: {
                    activity: Activities.execute,
                    action: `ctx => ctx.getContext('data')`
                },
                contexts: [
                    { provide: 'data', useValue: 'test data' }
                ]
            });
            expect(ctx.getStartup() instanceof WorkflowInstance).toBeTruthy();
            // console.log(result);
            expect(ctx.result).toEqual('test data');
        });


        it('should get context by execute action in parallel.', async () => {
            let ctx = await Workflow.run({
                template: {
                    activity: Activities.each,
                    each: ctx => ['t0', 't1', 't2', 't3'],
                    parallel: true,
                    body: {
                        activity: Activities.execute,
                        action: ctx => {
                            // console.log(ctx.body);
                            return `${ctx.get('data')}: ${ctx.getInput()}`
                        }
                    }
                },
                contexts: [
                    { provide: 'data', useValue: 'test data' }
                ]
            });
            expect(ctx.getStartup() instanceof WorkflowInstance).toBeTruthy();
            expect(Array.isArray(ctx.result)).toBeTruthy();
            console.log(ctx.result);
            expect(ctx.result).toEqual([
                'test data: t0',
                'test data: t1',
                'test data: t2',
                'test data: t3'
            ]);
        });

    });
});
