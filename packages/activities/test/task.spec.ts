import expect = require('expect');
import { SimpleTask, SimpleCTask, TaskModuleTest } from './simples.task';
import { ApplicationContext } from '@tsdi/core';
import { ServerActivitiesModule } from '@tsdi/platform-server-activities';
import { Workflow } from '../src/Workflow';
import { WorkflowService } from '../src/service';


describe('activity test', () => {

    let ctx: ApplicationContext;
    let workflow: WorkflowService;
    before(async () => {
        ctx = await Workflow.run({
            declarations: [
                SimpleCTask,
                SimpleTask,
                TaskModuleTest
            ]
        }, {});
        workflow = ctx.get(WorkflowService);
    })

    describe('#auto register with build', () => {

        it('should bootstrap with single task.', async () => {
            const acRef = await workflow.run(SimpleTask);
            // console.log(ctx.startup);
            expect(acRef.instance instanceof SimpleTask).toBe(true);
            // console.log(result);
            expect(acRef.instance.text).toEqual('simple task');
        });

        it('should bootstrap with single task via name or provider.', async () => {
            const actRef = await workflow.run(SimpleTask);
            // console.log(result);
            expect(actRef.instance.text).toEqual('simple task');
        });

        it('should bootstrap with component task.', async () => {
            const actRef = await workflow.run(SimpleCTask);
            expect(actRef.instance.text).toEqual('component task');
        });

        it('should bootstrap with component task via name or provider.', async () => {
            const actRef = await workflow.run(SimpleCTask);
            // console.log('comptest:' , result.activity, result.instance);
            expect(actRef.instance.text).toEqual('component task');
        });


        it('should bootstrap with meta IConfigure.', async () => {
            const actRef = await workflow.run(TaskModuleTest);
            // console.log('meta configure:' , result.instance.constructor.name, result.instance['activities'], result.resultValue)
            expect(actRef.instance.text).toEqual('component task');

        });

        // it('should bootstrap with configure.', async () => {
        //     let ctx = await Workflow.run({
        //         // deps: [
        //         //     ServerActivitiesModule
        //         // ],
        //         name: 'test1',
        //         template: [
        //             {
        //                 name: 'test---ccc---1',
        //                 activity: SimpleTask
        //             },
        //             SimpleCTask
        //             // {
        //             //     name: 'test------2',
        //             //     activity: SimpleCTask
        //             // }
        //         ]

        //     });
        //     // console.log('configure:' , result.instance.constructor.name, result.instance['activities'], result.resultValue);
        //     // console.log(ctx.module, ctx.target, ctx.getBootTarget());
        //     expect(ctx.result).toEqual('component task');
        // });

        // it('should bootstrap with template configure.', async () => {
        //     let app = new BootApplication();
        //     await app.getContainer().load(ComponentsModule, ActivityModule, SimpleTask, SimpleCTask)
        //     let ctx = await Workflow.run({
        //         // deps: [
        //         //     ServerActivitiesModule
        //         // ],
        //         name: 'test1',
        //         template: {
        //             name: 'test------2',
        //             activity: 'comptest'
        //         },
        //         injector: app.getContainer()
        //     });
        //     expect(ctx.result).toEqual('component task');
        // });

        // it('should bootstrap with template configure array.', async () => {
        //     let app = new BootApplication();
        //     await app.getContainer().load(ComponentsModule, ActivityModule, SimpleTask, SimpleCTask)
        //     let ctx = await Workflow.run({
        //         // deps: [
        //         //     ServerActivitiesModule
        //         // ],
        //         name: 'test1',
        //         template: [
        //             {
        //                 name: 'test---ccc---1',
        //                 activity: 'stest'
        //             },
        //             {
        //                 name: 'test------2',
        //                 activity: 'comptest'
        //             }
        //         ],
        //         injector: app.getContainer()
        //     });
        //     expect(ctx.result).toEqual('component task');
        // });

        // it('should get context by execute action.', async () => {
        //     let ctx = await Workflow.run({
        //         template: {
        //             activity: Activities.execute,
        //             action: `ctx => ctx.getContext('data')`
        //         },
        //         contexts: [
        //             { provide: 'data', useValue: 'test data' }
        //         ]
        //     });
        //     expect(ctx.getStartup() instanceof WorkflowInstance).toBeTruthy();
        //     // console.log(result);
        //     expect(ctx.result).toEqual('test data');
        // });


        // it('should get context by execute action in parallel.', async () => {
        //     let ctx = await Workflow.run({
        //         template: {
        //             activity: Activities.each,
        //             each: ctx => ['t0', 't1', 't2', 't3'],
        //             parallel: true,
        //             body: {
        //                 activity: Activities.execute,
        //                 action: ctx => {
        //                     // console.log(ctx.body);
        //                     return `${ctx.get('data')}: ${ctx.getInput()}`
        //                 }
        //             }
        //         },
        //         contexts: [
        //             { provide: 'data', useValue: 'test data' }
        //         ]
        //     });
        //     expect(ctx.getStartup() instanceof WorkflowInstance).toBeTruthy();
        //     expect(Array.isArray(ctx.result)).toBeTruthy();
        //     console.log(ctx.result);
        //     expect(ctx.result).toEqual([
        //         'test data: t0',
        //         'test data: t1',
        //         'test data: t2',
        //         'test data: t3'
        //     ]);
        // });

    });
});
