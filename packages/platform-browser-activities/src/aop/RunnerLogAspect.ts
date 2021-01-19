import { Inject, lang, IContainer, CONTAINER} from '@tsdi/ioc';
import { Around, Aspect, Joinpoint, JoinpointState } from '@tsdi/aop';
import { LogProcess } from '@tsdi/logs';
import { WorkflowInstance } from '@tsdi/activities';

/**
 * Task Log
 */
@Aspect({
    within: WorkflowInstance,
    singleton: true
})
export class RunnerLogAspect extends LogProcess {

    constructor(@Inject(CONTAINER) container: IContainer) {
        super(container);
    }

    @Around('execution(*.start)')
    processLog(joinPoint: Joinpoint) {
        let logger = this.logger;
        let runner = joinPoint.target as WorkflowInstance;
        let context = runner.getContext();
        // let uuid = runner.context.id;
        let name = runner.getBoot().name || lang.getClassName(context.type);
        let start: Date, end: Date;
        let taskname = '\'' + name + '\'';
        if (joinPoint.state === JoinpointState.Before) {
            start = new Date();
            runner['__startAt'] = start;
            logger.log('[' + start.toString() + ']', 'Starting workflow', taskname, '...');
        }

        if (joinPoint.state === JoinpointState.AfterReturning) {
            start = runner['__startAt'];
            end = new Date();
            delete runner['__startAt'];
            logger.log('[' + end.toString() + ']', 'Finished workflow', taskname, ' after ', end.getTime() - start.getTime());
        }

        if (joinPoint.state === JoinpointState.AfterThrowing) {
            start = runner['__startAt'];
            end = new Date();
            delete runner['__startAt'];
            logger.log('[' + end.toString() + ']', 'Finished workflow', taskname, 'errored after', end.getTime() - start.getTime());
        }
    }
}
