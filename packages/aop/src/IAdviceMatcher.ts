import { Type, ObjectMap } from '@tsdi/ioc';
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
     * @param {ObjectMap<AdviceMetadata[]>} [adviceMetas]
     * @param {*} [instance]
     * @returns {MatchPointcut[]}
     * @memberof IAdviceMatcher
     */
    match(aspectType: Type, type: Type, adviceMetas?: ObjectMap<AdviceMetadata[]>, instance?: any): MatchPointcut[]
}
