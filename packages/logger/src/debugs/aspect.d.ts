import { JoinPoint } from '@tsdi/aop';
import { Logger } from '../logger';
import { LogAspect } from '../aspect';
/**
 * debug log aspect.
 *
 * @export
 * @class DebugLogAspect
 * @extends {LogAspect}
 */
export declare class DebugLogAspect extends LogAspect {
    logger: Logger;
    logging(joinPoint: JoinPoint): void;
}
