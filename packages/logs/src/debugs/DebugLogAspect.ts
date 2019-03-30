import { Singleton, Inject } from '@tsdi/ioc';
import { Aspect, Around, Joinpoint, JoinpointState } from '@tsdi/aop';
import { LoggerAspect } from '../LoggerAspect';
import { Level } from '../Level';
import { IContainer, ContainerToken } from '@tsdi/core';

/**
 * debug log aspect.
 *
 * @export
 * @class DebugLogAspect
 * @extends {LoggerAspect}
 */
@Singleton
@Aspect
export class DebugLogAspect extends LoggerAspect {

    constructor( @Inject(ContainerToken) container: IContainer) {
        super(container);
    }

    @Around('execution(*.*)')
    logging(joinPoint: Joinpoint) {
        let level: Level;
        switch (joinPoint.state) {
            case JoinpointState.AfterThrowing:
                level = Level.error;
                break;
            case JoinpointState.AfterReturning:
                level = Level.debug;
                break;

            case JoinpointState.After:
            case JoinpointState.Before:
                level = Level.trace;
                break;
        }
        this.processLog(joinPoint, null, null, level);
    }
}
