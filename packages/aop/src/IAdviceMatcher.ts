import { AdviceMetadata } from './metadatas/index';
import { MatchPointcut } from './joinpoints/index';
import { Type, ObjectMap, InjectToken } from '@ts-ioc/core';

/**
 * Aop advice matcher interface token.
 * it is a token id, you can register yourself IActionBuilder for this.
 */
export const AdviceMatcherToken = new InjectToken<IAdviceMatcher>('__IOC_IAdviceMatcher');

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
     * @param {Type<any>} aspectType
     * @param {Type<any>} type
     * @param {ObjectMap<AdviceMetadata[]>} [adviceMetas]
     * @param {*} [instance]
     * @returns {MatchPointcut[]}
     * @memberof IAdviceMatcher
     */
    match(aspectType: Type<any>, type: Type<any>, adviceMetas?: ObjectMap<AdviceMetadata[]>, instance?: any): MatchPointcut[]
}
