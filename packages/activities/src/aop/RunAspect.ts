import { Aspect, Joinpoint, AfterReturning } from '@tsdi/aop';
import { ActivityRef } from '../refs/activity';
import { RunState } from '../refs/state';


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

        const actRef = joinPoint.target as ActivityRef;

        switch (actRef.state) {
            case RunState.pause:
                throw new Error('workflow paused!');
            case RunState.stop:
                throw new Error('workflow stop!');
        }

    }

}
