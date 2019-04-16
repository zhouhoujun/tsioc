import expect = require('expect');
import { Workflow, SequenceActivity, WorkflowInstance } from '../src';
import { SimpleTask, SimpleCTask, TaskModuleTest } from './simples.task';


describe('activity test', () => {
    describe('#auto register with build', () => {

        it('should bootstrap with single task.', async () => {
            let ctx = await Workflow.run(SimpleTask);
            let runner = ctx.runnable;
            expect(runner instanceof WorkflowInstance).toBe(true);
            let result = await runner.start();
            // console.log(result);
            expect(result.result).toEqual('simple task');
        });

        it('should bootstrap with single task via name or provider.', async () => {
            let result = await Workflow.run(SimpleTask);
            // console.log(result);
            expect(result.data).toEqual('simple task');
        });

        it('should bootstrap with component task.', async () => {
            let result = await Workflow.run(SimpleCTask);
            expect(result.data).toEqual('component task');
        });

        it('should bootstrap with component task via name or provider.', async () => {
            let result = await Workflow.run(SimpleCTask);
            // console.log('comptest:' , result.activity, result.instance);
            expect(result.data).toEqual('component task');
        });

        it('should bootstrap with configure.', async () => {
            let result = await Workflow.run({
                name: 'test1',
                module: SequenceActivity,
                template: [
                    {
                        name: 'test------1',
                        activity: SimpleTask
                    },
                    {
                        name: 'test------2',
                        activity: SimpleCTask
                    }
                ]
            });
            // console.log('configure:' , result.instance.constructor.name, result.instance['activities'], result.resultValue);
            expect(result.data).toEqual('component task');
        });

        it('should bootstrap with meta IConfigure.', async () => {
            let result = await Workflow.run(TaskModuleTest);
            // console.log('meta configure:' , result.instance.constructor.name, result.instance['activities'], result.resultValue)
            expect(result.data).toEqual('component task');
        });

    });
});
