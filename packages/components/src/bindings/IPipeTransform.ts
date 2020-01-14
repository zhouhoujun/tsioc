
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
}
