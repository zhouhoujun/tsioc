import { Type, tokenId, TokenId } from '@tsdi/ioc';

/**
 * model parser. parser model from request.
 *
 * @export
 * @interface IModelParser
 */
export interface IModelParser<T = any> {

    /**
     * parse model.
     *
     * @param {Type<T>} type
     * @param {T} objMap
     * @returns {*}
     * @memberof IModelParser
     */
    parseModel(type: Type<T>, objMap: any): T;

}


/**
 * default module parser token.
 */
export const DefaultModelParserToken: TokenId<IModelParser> = tokenId<IModelParser>('DefaultModelParser')
