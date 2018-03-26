import { AdviceMetadata } from './metadatas/index';
import { MatchPointcut } from './joinpoints/index';
import { Type, ObjectMap } from '../types';

export interface IAdviceMatcher {

    match(aspectType: Type<any>, type: Type<any>, adviceMetas?: ObjectMap<AdviceMetadata[]>, instance?: any): MatchPointcut[]
}
