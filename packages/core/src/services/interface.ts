import { Abstract, Token } from '@tsdi/ioc';
/**
 * type parser.
 *
 * @export
 */
@Abstract()
export abstract class TypeParser {
    /**
     * parse val.
     *
     * @param {Token<T>} type
     * @param {*} paramVal
     * @returns {T}
     */
    abstract parse<T>(type: Token<T> | Function, paramVal: any): T;
}
