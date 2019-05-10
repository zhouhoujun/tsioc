import expect = require('expect');
import { Workflow, WorkflowInstance } from '../src';
import { SimpleTask, SimpleCTask, TaskModuleTest } from './simples.task';


describe('activity test', () => {
    describe('#auto register with build', () => {

        it('should bootstrap with single task.', async () => {
            let ctx = await Workflow.run(SimpleTask);
            expect(ctx.runnable instanceof WorkflowInstance).toBe(true);
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
                name: 'test1',
                template: [
                    {
                        name: 'test------1',
                        activity: SimpleTask
                    },
                    SimpleCTask
                    // {
                    //     name: 'test------2',
                    //     activity: SimpleCTask
                    // }
                ]

            });
            // console.log(result.target.activities[1])
            // console.log('configure:' , result.instance.constructor.name, result.instance['activities'], result.resultValue);
            expect(ctx.result).toEqual('component task');
        });

        it('should bootstrap with meta IConfigure.', async () => {
            let ctx = await Workflow.run(TaskModuleTest);
            // console.log('meta configure:' , result.instance.constructor.name, result.instance['activities'], result.resultValue)
            expect(ctx.result).toEqual('component task');
        });

    });
});
