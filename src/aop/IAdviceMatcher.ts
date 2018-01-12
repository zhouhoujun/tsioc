import { AdviceMetadata } from './metadatas/index';
import { Type } from '../Type';
import { MatchPointcut } from './MatchPointcut';
import { ObjectMap } from '../types';

export interface IAdviceMatcher {

    match(aspectType: Type<any>, type: Type<any>, adviceMetas?: ObjectMap<AdviceMetadata[]>, instance?: any): MatchPointcut[]
}
