import { Aspect, Around, Joinpoint, JoinpointState } from '@tsdi/aop';
import { Logger } from '../logger';
import { LogAspect } from '../aspect';
import { Level } from '../Level';
import { Log } from '../metadata';

/**
 * debug log aspect.
 *
 * @export
 * @class DebugLogAspect
 * @extends {LogAspect}
 */
@Aspect({ static: true })
export class DebugLogAspect extends LogAspect {

    @Log({ level: 'trace' }) logger!: Logger;

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
        this.processLog(joinPoint, level)
    }
}
