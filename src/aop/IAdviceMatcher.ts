import { AdviceMetadata } from './metadatas';
import { Type } from '../Type';
import { MatchPointcut } from './MatchPointcut';
import { ObjectMap } from '../types';

export interface IAdviceMatcher {

    match(metadata: ObjectMap<AdviceMetadata[]>, type: Type<any>, instance?: any): MatchPointcut[]
}
