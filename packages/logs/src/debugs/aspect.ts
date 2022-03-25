import { Singleton } from '@tsdi/ioc';
import { Aspect, Around, Joinpoint, JoinpointState } from '@tsdi/aop';
import { ILogger } from '../logger';
import { LoggerAspect } from '../aspect';
import { Level } from '../Level';
import { Logger } from '../metadata/Logger';

/**
 * debug log aspect.
 *
 * @export
 * @class DebugLogAspect
 * @extends {LoggerAspect}
 */
@Singleton()
@Aspect()
export class DebugLogAspect extends LoggerAspect {

    @Logger({ level: 'trace' }) logger!: ILogger;

    @Around('execution(*.*)')
    logging(joinPoint: Joinpoint) {
        let level: Level = 'info';
        switch (joinPoint.state) {
            case JoinpointState.AfterThrowing:
                level = 'error';
                break;
            case JoinpointState.AfterReturning:
                level = 'debug';
                break;

            case JoinpointState.After:
            case JoinpointState.Before:
                level = 'trace';
                break;
        }
        this.processLog(joinPoint, level);
    }
}
