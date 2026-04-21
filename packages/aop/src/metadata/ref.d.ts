import { TypeDef } from '@tsdi/ioc';
import { AdviceMetadata, AspectMetadata } from './meta';
/**
 * Aop def metadata.
 */
export interface AopDef extends TypeDef {
    aspect?: AspectMetadata;
    advices: AdviceMetadata[];
}
