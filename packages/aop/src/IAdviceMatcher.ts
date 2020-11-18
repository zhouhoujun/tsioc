import { Type } from '@tsdi/ioc';
import { AdviceMetadata } from './metadatas';
import { MatchPointcut } from './joinpoints/MatchPointcut';


/**
 * advice match interface, use to match advice when a registered create instance.
 *
 * @export
 * @interface IAdviceMatcher
 */
export interface IAdviceMatcher {

    /**
     * match pointcuts of type.
     *
     * @param {Type} aspectType
     * @param {Type} type
     * @param {AdviceMetadata[]} [adviceMetas]
     * @param {*} [instance]
     * @returns {MatchPointcut[]}
     */
    match(aspectType: Type, type: Type, adviceMetas?: AdviceMetadata[], instance?: any): MatchPointcut[]
}
