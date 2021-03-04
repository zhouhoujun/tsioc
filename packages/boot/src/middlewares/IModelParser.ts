import { Type } from '@tsdi/ioc';

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
     */
    parseModel(type: Type<T>, objMap: any): T;

}
