import { Token, tokenId, TokenId } from '@tsdi/ioc';
/**
 * base type parser.
 *
 * @export
 * @interface IBaseTypeParser
 */
export interface IBaseTypeParser {
    /**
     * parse val.
     *
     * @param {Token<T>} type
     * @param {*} paramVal
     * @returns {T}
     * @memberof IBaseTypeParser
     */
    parse<T>(type: Token<T>, paramVal): T;
}

/**
 * base type parser token.
 */
export const BaseTypeParserToken: TokenId<IBaseTypeParser> = tokenId<IBaseTypeParser>('BaseTypeParser');
