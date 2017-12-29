import { IPointcut } from './IPointcut';
import { AdviceMetadata } from './metadatas/index';

export interface MatchPointcut extends IPointcut {

    /**
     * advice for pointcut.
     *
     * @type {AdviceMetadata}
     * @memberof MatchPointcut
     */
    advice: AdviceMetadata;
}
