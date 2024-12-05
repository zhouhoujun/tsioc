import { Type } from '@tsdi/ioc';


/**
 * Codings adapter.
 */
export abstract class MappingsAapter {
    abstract getDefault(type: Type | string): Type | string | undefined
    abstract isCompleted(data: any): boolean;
}