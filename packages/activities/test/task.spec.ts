import expect = require('expect');
import { Workflow, IWorkflow, SequenceActivity, WorkflowInstance } from '../src';
import { SimpleTask, SimpleCTask, TaskModuleTest } from './simples.task';


describe('activity test', () => {
    describe('#auto register with build', () => {

        let container: IWorkflow;
        before(async () => {
            container = Workflow.create();
        });

        it('should bootstrap with single task.', async () => {
            let runner = await container.bootstrap(SimpleTask);
            expect(runner instanceof WorkflowInstance).toBe(true);
            let result = await runner.start();
            // console.log(result);
            expect(result.result).toEqual('simple task');
        });

        it('should bootstrap with single task via name or provider.', async () => {
            let result = await container.use(SimpleTask).bootstrap('stest');
            // console.log(result);
            expect(result.resultValue).toEqual('simple task');
        });

        it('should bootstrap with component task.', async () => {
            let result = await container.bootstrap(SimpleCTask);
            expect(result.resultValue).toEqual('component task');
        });

        it('should bootstrap with component task via name or provider.', async () => {
            let result = await container.use(SimpleCTask).bootstrap('comptest');
            // console.log('comptest:' , result.activity, result.instance);
            expect(result.resultValue).toEqual('component task');
        });

        it('should bootstrap with configure.', async () => {
            let result = await container.bootstrap({
                name: 'test1',
                activity: SequenceActivity,
                sequence: [
                    {
                        name: 'test------1',
                        task: SimpleTask
                    },
                    {
                        name: 'test------2',
                        task: SimpleCTask
                    }
                ]
            });
            // console.log('configure:' , result.instance.constructor.name, result.instance['activities'], result.resultValue);
            expect(result.resultValue).toEqual('component task');
        });

        it('should bootstrap with meta IConfigure.', async () => {
            let result = await container.bootstrap(TaskModuleTest);
            // console.log('meta configure:' , result.instance.constructor.name, result.instance['activities'], result.resultValue)
            expect(result.resultValue).toEqual('component task');
        });

    });
});
