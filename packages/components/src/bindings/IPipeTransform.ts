import { AnnoationContext } from '@tsdi/boot';

/**
 * pipe transform insterface.
 *
 * @export
 * @interface IPipeTransform
 */
export interface IPipeTransform {
    /**
     * transform
     *
     * @param {*} value
     * @param {...any[]} args
     * @returns {*}
     * @memberof IPipeTransform
     */
    transform(value: any, ...args: any[]): any;

    /**
     * reverse value to current context.
     *
     * @param {AnnoationContext} ctx
     * @param {*} value
     * @memberof IPipeTransform
     */
    reverse?(ctx: AnnoationContext, value: any)
}
