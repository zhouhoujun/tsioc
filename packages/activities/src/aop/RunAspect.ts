import { Inject } from '@tsdi/ioc';
import { IContainer, ContainerToken } from '@tsdi/core';
import { Aspect, Joinpoint, Before, AfterReturning } from '@tsdi/aop';
import { RunState, ActivityContext } from '../core';
import { Task } from '../decorators/Task';

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

    @Before('execution(*.execute)')
    beforeRun(joinPoint: Joinpoint) {
        let ctx = joinPoint.args[0] as ActivityContext;
        if (!ctx.runnable) {
            return;
        }
        ctx.status.current = joinPoint.target;
    }

    @AfterReturning('execution(*.execute)')
    afterRun(joinPoint: Joinpoint) {

        let ctx = joinPoint.args[0] as ActivityContext;
        if (!ctx.runnable) {
            return;
        }
        switch (ctx.runnable.state) {
            case RunState.pause:
                throw new Error('workflow paused!');
            case RunState.stop:
                throw new Error('workflow stop!');
        }

    }

}
