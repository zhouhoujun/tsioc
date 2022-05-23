import { Abstract } from '@tsdi/ioc';
import { AdviceMetadata } from './metadata/meta';
import { MatchPointcut } from './joinpoints/MatchPointcut';
import { AopReflect } from './metadata/ref';


/**
 * advice match interface, use to match advice when a registered create instance.
 */
@Abstract()
export abstract class AdviceMatcher {

    /**
     * match pointcuts of type.
     *
     * @param {Type} aspectType
     * @param {Type} type
     * @param {AdviceMetadata[]} [adviceMetas]
     * @returns {MatchPointcut[]}
     */
    abstract match(aspectType: AopReflect, type: AopReflect, adviceMetas?: AdviceMetadata[]): MatchPointcut[];
}
