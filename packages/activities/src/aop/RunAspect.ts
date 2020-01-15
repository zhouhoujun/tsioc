import { Aspect, Joinpoint, AfterReturning } from '@tsdi/aop';
import { RunState, WorkflowContext } from '../core/WorkflowInstance';
import { ActivityComponentRef, ActivityElementRef } from '../core/ActivityRef';

/**
 * Task Log
 *
 * @export
 * @class TaskLogAspect
 */
@Aspect({
    within: [ActivityComponentRef, ActivityElementRef],
    singleton: true
})
export class RunAspect {

    constructor() {

    }

    @AfterReturning('execution(*.run)')
    afterRun(joinPoint: Joinpoint) {

        let ctx = joinPoint.args[0] as WorkflowContext;
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
