import { Pointcut } from './Pointcut';
import { AdviceMetadata } from './metadatas';

export interface MatchPointcut extends Pointcut {

    /**
     * advice for pointcut.
     *
     * @type {AdviceMetadata}
     * @memberof MatchPointcut
     */
    advice: AdviceMetadata;
}
