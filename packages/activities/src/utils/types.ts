import { InvocationContext } from '@tsdi/ioc';


/**
 * source
 */
export type Src = string | string[];

/**
 * task source.
 */
export type TaskSrc = Src | ((ctx?: InvocationContext) => Src);

/**
 * node callback
 *
 * @export
 * @interface NodeCabllback
 */
export interface NodeCabllback {
    (err: Error, data?: any): Promise<any> | void
}
