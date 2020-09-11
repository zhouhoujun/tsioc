import { Type } from '@tsdi/ioc';
import { ModuleConfigure } from './configure';
import { ModuleRef } from './ModuleRef';
import { IAnnoationReflect } from '../annotations/reflect';

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
