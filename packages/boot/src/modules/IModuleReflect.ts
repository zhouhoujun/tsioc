import { IInjector, Type, tokenId } from '@tsdi/ioc';
import { ModuleConfigure } from './ModuleConfigure';
import { ModuleRef } from './ModuleRef';
import { IAnnoationReflect } from '../annotations/IAnnoationReflect';

/**
 * parent injector token.
 */
export const ParentInjectorToken = tokenId<IInjector>('IOC_PARENT_INJECTOR')

export interface IModuleReflect extends IAnnoationReflect {
    /**
     * baseurl.
     *
     * @type {string}
     * @memberof IModuleReflect
     */
    baseURL?: string;
    /**
     *  components of current module.
     */
    components?: Type[];
    /**
     * dectors of components.
     */
    componentDectors?: string[];
    /**
     * get annoation.
     *
     * @template T
     * @param {boolean} [clone] default true.
     * @returns {T}
     * @memberof IModuleReflect
     */
    getAnnoation?<T extends ModuleConfigure>(clone?: boolean): T;

    /**
     * get module exports.
     */
    getModuleRef?<T>(): ModuleRef<T>;
}
