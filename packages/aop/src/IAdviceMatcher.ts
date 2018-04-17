import { AdviceMetadata } from './metadatas/index';
import { MatchPointcut } from './joinpoints/index';
import { Type, ObjectMap } from '@ts-ioc/core';

/**
 * advice match interface, use to match advice when a registered create instance.
 *
 * @export
 * @interface IAdviceMatcher
 */
export interface IAdviceMatcher {

    match(aspectType: Type<any>, type: Type<any>, adviceMetas?: ObjectMap<AdviceMetadata[]>, instance?: any): MatchPointcut[]
}
