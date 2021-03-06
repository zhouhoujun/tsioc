import { Singleton } from '@tsdi/ioc';
import { Aspect, Around, Joinpoint, JoinpointState } from '@tsdi/aop';
import { LoggerAspect } from '../aspect';
import { Level } from '../Level';
import { ConsoleLogManager } from '../manager';

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

    protected getLoggerManager() {
        return this.injector.get(ConsoleLogManager);
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
        this.processLog(joinPoint, level);
    }

}
