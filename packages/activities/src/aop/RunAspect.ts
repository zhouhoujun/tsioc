import { Aspect, JoinPoint, AfterReturning } from '@tsdi/aop';
import { Activity } from '../activities/Activity';



/**
 * Task Log
 *
 * @export
 * @class TaskLogAspect
 */
@Aspect({
    within: Activity,
    singleton: true
})
export class RunAspect {

    constructor() {

    }

    @AfterReturning('execution(*.execute(..))')
    afterRun(joinPoint: JoinPoint) {

        // const actRef = joinPoint.target as ActivityRef;

        // switch (actRef.state) {
        //     case RunState.pause:
        //         throw new Error('workflow paused!');
        //     case RunState.stop:
        //         throw new Error('workflow stop!');
        // }

    }

}
