import { IPointcut } from './IPointcut';
import { AdviceMetadata } from '../metadatas';

/**
 * match pointcut.
 */
export interface MatchPointcut extends IPointcut {

    /**
     * advice for pointcut.
     *
     * @type {AdviceMetadata}
     */
    advice: AdviceMetadata;
}
