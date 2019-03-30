import { IContainer, ContainerToken } from '@tsdi/core';
import { Aspect, Joinpoint, Before, AfterReturning } from '@tsdi/aop';
import { IWorkflowInstance, RunState, Activity } from '../core';
import { Task } from '../decorators/Task';
import { Inject } from '@tsdi/ioc';

/**
 * Task Log
 *
 * @export
 * @class TaskLogAspect
 */
@Aspect({
    annotation: Task,
    singleton: true
})
export class RunAspect {

    /**
     * ioc container.
     *
     * @type {IContainer}
     * @memberof RunAspect
     */
    @Inject(ContainerToken)
    container: IContainer;

    constructor() {

    }

    @Before('execution(*.run)')
    beforeRun(joinPoint: Joinpoint) {
        let runner = this.getRunner(joinPoint.target);
        if (!runner) {
            return;
        }
        runner.saveState(joinPoint);
        switch (runner.state) {
            case RunState.pause:
                throw new Error('workflow paused!');
            case RunState.stop:
                throw new Error('workflow stop!');
        }

    }

    @AfterReturning('execution(*.run)')
    afterRun(joinPoint: Joinpoint) {

        let runner = this.getRunner(joinPoint.target);
        if (!runner) {
            return;
        }
        runner.saveState(joinPoint);
        switch (runner.state) {
            case RunState.pause:
                throw new Error('workflow paused!');
            case RunState.stop:
                throw new Error('workflow stop!');
        }

    }

    getRunner(task: any) {
        if (task instanceof Activity) {
            if (task.id && this.container.has(task.id)) {
                return this.container.get<IWorkflowInstance<any>>(task.id);
            }
        }
        return null;
    }
}
