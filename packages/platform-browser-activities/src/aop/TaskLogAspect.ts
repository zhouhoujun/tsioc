import { lang } from '@tsdi/ioc';
import { Around, Aspect, Joinpoint, JoinpointState } from '@tsdi/aop';
import { LogProcess } from '@tsdi/logs';
import { Task, Activity, ControlActivity, IActivityRef, ActivityElementRef, ActivityTemplateRef, ActivityComponentRef } from '@tsdi/activities';

/**
 * Task Log process.
 *
 * @export
 * @class TaskLogProcess
 */
export class TaskLogProcess extends LogProcess {

    processLog(joinPoint: Joinpoint) {
        (async () => {
            let logger = this.logger;
            let target = joinPoint.target as IActivityRef;
            let name = target.name;
            if (!name) {
                name = lang.getClassName(joinPoint.targetType);
            }
            let start: Date, end: Date;
            let taskname = '\'' + name + '\'';
            if (joinPoint.state === JoinpointState.Before) {
                start = new Date();
                target['__startAt'] = start;
                logger.log('[' + start.toString() + ']', 'Starting', taskname, '...');
            }

            if (joinPoint.state === JoinpointState.AfterReturning) {
                start = target['__startAt'];
                end = new Date();
                delete target['__startAt'];
                logger.log('[' + end.toString() + ']', 'Finished', taskname, ' after ', end.getTime() - start.getTime());
            }

            if (joinPoint.state === JoinpointState.AfterThrowing) {
                start = target['__startAt'];
                end = new Date();
                delete target['__startAt'];
                logger.log('[' + end.toString() + ']', 'Finished', taskname, 'errored after', end.getTime() - start.getTime());
            }
        })();
    }
}

/**
 * custom task log
 *
 * @export
 * @class TaskLogAspect
 * @extends {TaskLogProcess}
 */
@Aspect({
    within: [ActivityElementRef, ActivityTemplateRef, ActivityComponentRef],
    without: ControlActivity,
    singleton: true
})
export class TaskLogAspect extends TaskLogProcess {
    @Around('execution(*.run)')
    logging(joinPoint: Joinpoint) {
        this.processLog(joinPoint);
    }
}


/**
 * control flow log
 *
 * @export
 * @class TaskControlLogAspect
 * @extends {TaskLogProcess}
 */
@Aspect({
    within: ControlActivity,
    singleton: true
})
export class TaskControlLogAspect extends TaskLogProcess {
    @Around('execution(*.run)')
    logging(joinPoint: Joinpoint) {
        this.processLog(joinPoint);
    }
}
