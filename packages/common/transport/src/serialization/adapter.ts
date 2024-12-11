import { Type } from '@tsdi/ioc';


/**
 * status adapter.
 */
export abstract class SerializationAdapter {
    abstract getDefault(type: Type | string): Type | string | undefined
    abstract isCompleted(data: any): boolean;
}