import { IPointcut } from './IPointcut';
import { AdviceMetadata } from '../metadata/meta';

/**
 * match pointcut.
 */
export interface MatchPointcut extends IPointcut {

    accessor?: 'get' | 'set';

    /**
     * advice for pointcut.
     *
     * @type {AdviceMetadata}
     */
    advice: AdviceMetadata;
}
