import { IocCompositeAction, IocActionContext, IocActionType } from '../actions';
import { Type } from '../types';
import { isArray } from '../utils';
import { IIocContainer } from '../IIocContainer';
import { getOwnParamerterNames } from '../factories';

/**
 * register Type init life scope action.
 *
 * @export
 * @class LifeScope
 * @extends {IocCoreService}
 */
export class LifeScope<T extends IocActionContext> extends IocCompositeAction<T> {

    /**
     * get paramerter names.
     *
     * @template T
     * @param {Type<T>} type
     * @param {string} propertyKey
     * @returns {string[]}
     * @memberof LifeScope
     */
    getParamerterNames<T>(type: Type<T>, propertyKey: string): string[] {
        let metadata = getOwnParamerterNames(type);
        let paramNames = [];
        if (metadata && metadata.hasOwnProperty(propertyKey)) {
            paramNames = metadata[propertyKey]
        }
        if (!isArray(paramNames)) {
            paramNames = [];
        }
        return paramNames;
    }

}
