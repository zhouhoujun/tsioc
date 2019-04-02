/**
 * translator.
 *
 * @export
 * @interface ITranslator
 */
export interface ITranslator {
    /**
     * translate target to.
     *
     * @param {*} target
     * @returns {any}
     * @memberof ITranslator
     */
    translate(target: any): any;
}


/**
 * base translator.
 *
 * @export
 * @abstract
 * @class Translator
 * @implements {ITranslator}
 * @template T
 * @template TR
 */
export abstract class Translator<T, TR> implements ITranslator {
    /**
     * translate target to.
     *
     * @param {T} target
     * @returns {TR}
     * @memberof ITranslator
     */
    abstract translate(target: T): TR;
}

