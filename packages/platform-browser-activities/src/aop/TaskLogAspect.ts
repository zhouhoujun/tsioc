import { ObjectMap, Inject, lang } from '@tsdi/ioc';
import { IContainer, ContainerToken } from '@tsdi/core';
import { Around, Aspect, Joinpoint, JoinpointState } from '@tsdi/aop';
import { LoggerAspect } from '@tsdi/logs';
import { Task, Activity } from '@tsdi/activities';

/**
 * Task Log
 *
 * @export
 * @class TaskLogAspect
 */
@Aspect({
    annotation: Task,
    within: Activity,
    singleton: true
})
export class TaskLogAspect extends LoggerAspect {

    private startHrts: ObjectMap<any>;
    constructor(@Inject(ContainerToken) container: IContainer) {
        super(container);

        this.startHrts = {};
    }

    @Around('execution(*.execute)')
    logging(joinPoint: Joinpoint) {
        let logger = this.logger;
        let target = joinPoint.target;
        let name = target.name;
        if (!name) {
            let classAnnations = lang.getClassAnnations(joinPoint.targetType);
            name = classAnnations ? classAnnations.name : joinPoint.targetType.name;
        }
        let start: Date, end: Date;
        let taskname = '\'' + name + '\'';
        if (joinPoint.state === JoinpointState.Before) {
            if (target.context && target.context.config && target.context.config.title) {
                logger.log('\n' + target.context.config.title + taskname + '\n');
            }
            start = new Date();
            this.startHrts[name] = start;
            logger.log('[' + start.toString() + ']', 'Starting', taskname, '...');
        }

        if (joinPoint.state === JoinpointState.AfterReturning) {
            start = this.startHrts[name];
            end = new Date();
            delete this.startHrts[name];
            logger.log('[' + end.toString() + ']', 'Finished', taskname, ' after ', end.getTime() - start.getTime());
        }

        if (joinPoint.state === JoinpointState.AfterThrowing) {
            start = this.startHrts[name];
            end = new Date();
            delete this.startHrts[name];
            logger.log('[' + end.toString() + ']', 'Finished', taskname, 'errored after', end.getTime() - start.getTime());
        }
    }
}
