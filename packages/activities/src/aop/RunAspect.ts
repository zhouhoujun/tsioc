import { Aspect, Joinpoint, AfterReturning } from '@tsdi/aop';
import { RunState, WorkflowContext, ActivityRef } from '../core/WorkflowContext';


/**
 * Task Log
 *
 * @export
 * @class TaskLogAspect
 */
@Aspect({
    within: ActivityRef,
    singleton: true
})
export class RunAspect {

    constructor() {

    }

    @AfterReturning('execution(*.run)')
    afterRun(joinPoint: Joinpoint) {

        let ctx = joinPoint.args[0] as WorkflowContext;
        let startup = ctx.getStartup();
        if (!startup) {
            return;
        }
        switch (startup.state) {
            case RunState.pause:
                throw new Error('workflow paused!');
            case RunState.stop:
                throw new Error('workflow stop!');
        }

    }

}
