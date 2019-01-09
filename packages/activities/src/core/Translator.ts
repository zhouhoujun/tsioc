import { Registration, Token } from '@ts-ioc/core';

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
 * create translator token.
 *
 * @export
 * @class InjectTranslatorToken
 * @extends {Registration<T>}
 * @template T
 */
export class InjectTranslatorToken<T, TR> extends Registration<Translator<T, TR>> {
    constructor(type: Token<T>) {
        super(type, 'Translator');
    }
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

