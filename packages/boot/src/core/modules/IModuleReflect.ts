import { ITypeReflect, IInjector } from '@tsdi/ioc';
import { ModuleConfigure } from './ModuleConfigure';

export interface IModuleReflect extends ITypeReflect {
    /**
     * anno decorator.
     *
     * @type {string}
     * @memberof IModuleReflect
     */
    annoDecoractor?: string;
    /**
     * baseurl.
     *
     * @type {string}
     * @memberof IModuleReflect
     */
    baseURL?: string;
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
    getModuleExports?(): IInjector;
}
