import { IContainer, ContainerToken } from '@tsdi/core';
import { Around, Aspect, Joinpoint, JoinpointState } from '@tsdi/aop';
import { LoggerAspect } from '@tsdi/logs';
import {  WorkflowInstance } from '@tsdi/activities';
import { ObjectMap, Inject } from '@tsdi/ioc';
/**
 * Task Log
 *
 * @export
 * @class TaskLogAspect
 */
@Aspect({
    within: WorkflowInstance,
    singleton: true
})
export class RunnerLogAspect extends LoggerAspect {

    private startHrts: ObjectMap<any>;
    constructor(@Inject(ContainerToken) container: IContainer) {
        super(container);

        this.startHrts = {};
    }

    @Around('execution(*.start)')
    logStart(joinPoint: Joinpoint) {
        let logger = this.logger;
        let runner = joinPoint.target as WorkflowInstance<any>;
        let uuid = runner.context.id;
        let name = runner.getTarget().name;
        let start: Date, end: Date;
        let taskname = '\'' + name + '\'';
        if (joinPoint.state === JoinpointState.Before) {
            start = new Date();
            this.startHrts[uuid] = start;
            logger.log('[' + start.toString() + ']', 'Starting workflow', taskname, '...');
        }

        if (joinPoint.state === JoinpointState.AfterReturning) {
            start = this.startHrts[uuid];
            end = new Date();
            delete this.startHrts[uuid];
            logger.log('[' + end.toString() + ']', 'Finished workflow', taskname, ' after ', end.getTime() - start.getTime());
        }

        if (joinPoint.state === JoinpointState.AfterThrowing) {
            start = this.startHrts[uuid];
            end = new Date();
            delete this.startHrts[uuid];
            logger.log('[' + end.toString() + ']', 'Finished workflow', taskname, 'errored after', end.getTime() - start.getTime());
        }
    }

}
