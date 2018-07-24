import { InjectToken } from '../InjectToken';
/**
 * IRecognizer interface token.
 * it is a token id, you can register yourself IRecognizer for this.
 */
export const RecognizerToken = new InjectToken<IRecognizer>('DI_IRecognizer');

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
