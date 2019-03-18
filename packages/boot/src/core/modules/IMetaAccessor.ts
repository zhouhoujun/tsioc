import { Token, Express } from '@ts-ioc/ioc';
import { IContainer } from '@ts-ioc/core';
import { ModuleConfigure } from './ModuleConfigure';

/**
 * module metadata accessor.
 *
 * @export
 * @interface IMetaAccessor
 */
export interface IMetaAccessor {

    getToken(config: ModuleConfigure, container?: IContainer): Token<any>;

    getBootToken(config: ModuleConfigure, container?: IContainer): Token<any>

    /**
     * get metadata.
     *
     * @param {Token<any>} token
     * @param {IContainer} container
     * @param {ModuleConfigure} [extConfig]
     * @param {Express<string, boolean>} [decorFilter]
     * @returns {ModuleConfigure}
     * @memberof IMetaAccessor
     */
    getMetadata(token: Token<any>, container: IContainer, extConfig?: ModuleConfigure, decorFilter?: Express<string, boolean>): ModuleConfigure;

    /**
     * find matached metadata.
     *
     * @param {Token<any>} token
     * @param {IContainer} container
     * @param {Express<ModuleConfigure, boolean>} filter
     * @param {Express<string, boolean>} [decorFilter]
     * @returns {ModuleConfigure}
     * @memberof IMetaAccessor
     */
    find(token: Token<any>, container: IContainer, filter: Express<ModuleConfigure, boolean>, decorFilter?: Express<string, boolean>): ModuleConfigure;

    /**
     * filter metadata.
     *
     * @param {Token<any>} token
     * @param {IContainer} container
     * @param {Express<ModuleConfigure, boolean>} filter
     * @param {Express<string, boolean>} [decorFilter]
     * @returns {ModuleConfigure[]}
     * @memberof IMetaAccessor
     */
    filter(token: Token<any>, container: IContainer, filter: Express<ModuleConfigure, boolean>, decorFilter?: Express<string, boolean>): ModuleConfigure[]
}
