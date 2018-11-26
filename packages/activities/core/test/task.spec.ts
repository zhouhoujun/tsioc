import 'mocha';
import { expect } from 'chai';
import { ITaskContainer, SequenceActivity, ActivityRunner } from '../src';

import { SimpleTask, SimpleCTask, TaskModuleTest } from './simples.task';
import { TaskContainer } from '@taskfr/platform-server';

describe('auto register with build', () => {

    let container: ITaskContainer;
    before(async () => {
        container = TaskContainer.create(__dirname);
    });

    it('should bootstrap with single task.', async () => {
        let runner = await container.bootstrap(SimpleTask);
        expect(runner instanceof ActivityRunner).eq(true);
        let result = await runner.start();
        // console.log(result);
        expect(result).eq('simple task');
    });

    it('should bootstrap with single task via name or provider.', async () => {
        let result = await container.use(SimpleTask).bootstrap('test');
        // console.log(result);
        expect(result.resultValue).eq('simple task');
    });

    it('should bootstrap with component task.', async () => {
        let result = await container.bootstrap(SimpleCTask);
        expect(result.resultValue).eq('component task');
    });

    it('should bootstrap with component task via name or provider.', async () => {
        let result = await container.use(SimpleCTask).bootstrap('comptest');
        // console.log('comptest:' , result.activity, result.activityInstance);
        expect(result.resultValue).eq('component task');
    });

    it('should bootstrap with IConfigure.', async () => {
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
        expect(result.resultValue).eq('component task');
    });

    it('should bootstrap with meta IConfigure.', async () => {
        let result = await container.bootstrap(TaskModuleTest);
        expect(result.resultValue).eq('component task');
    });

});

