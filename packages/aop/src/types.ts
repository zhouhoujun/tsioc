import { TypeReflect } from '@tsdi/ioc';
import { AdviceMetadata, AspectMetadata } from './metadatas';

/**
 * Joinpoint state.
 */
export type AdviceTypes = 'Before' | 'Pointcut' | 'After' | 'AfterReturning' | 'AfterThrowing' | 'Advice' | 'Around';


export interface AopReflect extends TypeReflect {
    aspect?: AspectMetadata;
    nonePointcut?: boolean;
    advices: AdviceMetadata[];
}
