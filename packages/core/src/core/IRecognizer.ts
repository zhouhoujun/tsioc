
/**
 * recognize the vaule is special alias for registor to container.
 *
 * @export
 * @interface IRecognizer
 */
export interface IRecognizer {

    /**
     * recognize the special alias of value.
     *
     * @param {*} value
     * @returns {string}
     * @memberof IRecognizer
     */
    recognize(value: any): string;
}
