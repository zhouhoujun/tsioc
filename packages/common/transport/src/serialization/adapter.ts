import { Type } from '@tsdi/ioc';


/**
 * status adapter.
 */
export abstract class StatusAdapter {
    abstract getDefault(type: Type | string): Type | string | undefined
    abstract isCompleted(data: any): boolean;
}