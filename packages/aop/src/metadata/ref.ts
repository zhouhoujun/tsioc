import { TypeReflect } from '@tsdi/ioc';
import { AdviceMetadata, AspectMetadata } from './meta';


/**
 * Aop reflect.
 */
export interface AopReflect extends TypeReflect {
    aspect?: AspectMetadata;
    nonePointcut?: boolean;
    advices: AdviceMetadata[];
}
