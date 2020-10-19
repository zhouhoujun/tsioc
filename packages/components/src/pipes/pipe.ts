
/**
 * pipe transform insterface.
 *
 * @export
 * @interface PipeTransform
 */
export interface PipeTransform {
    /**
     * transform
     *
     * @param {*} value
     * @param {...any[]} args
     * @returns {*}
     * @memberof IPipeTransform
     */
    transform(value: any, ...args: any[]): any;
}
