import { Aspect, Joinpoint, AfterReturning } from '@tsdi/aop';
import { RunState, WorkflowContext } from '../core/WorkflowInstance';
import { ActivityRef } from '../core/ActivityRef';

/**
 * Task Log
 *
 * @export
 * @class TaskLogAspect
 */
@Aspect({
    within: [ActivityRef],
    singleton: true
})
export class RunAspect {

    constructor() {

    }

    @AfterReturning('execution(*.run)')
    afterRun(joinPoint: Joinpoint) {

        let ctx = joinPoint.args[0] as WorkflowContext;
        if (!ctx.startup) {
            return;
        }
        switch (ctx.startup.state) {
            case RunState.pause:
                throw new Error('workflow paused!');
            case RunState.stop:
                throw new Error('workflow stop!');
        }

    }

}
