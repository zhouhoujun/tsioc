import { ITypeReflect } from '@tsdi/ioc';
import { ModuleConfigure } from './ModuleConfigure';

export interface IModuleReflect extends ITypeReflect {
    annoDecoractor?: string;
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
}
