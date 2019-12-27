import { Aspect, Joinpoint, AfterReturning } from '@tsdi/aop';
import { Task } from '../decorators/Task';
import { ActivityContext } from '../core/ActivityContext';
import { RunState } from '../core/WorkflowInstance';

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

    constructor() {

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
