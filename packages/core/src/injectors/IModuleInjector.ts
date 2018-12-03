import { Type } from '../types';
import { IContainer } from '../IContainer';
import { Registration } from '../Registration';

/**
 *  InjectorResult
 *
 * @export
 * @interface InjectorResult
 */
export interface InjectorResult {
    injected: Type<any>[];
    next?: Type<any>[];
}

/**
 * module injector.
 *
 * @export
 * @interface IModuleInjector
 */
export interface IModuleInjector {
    /**
     * inject module to container.
     *
     * @param {IContainer} container
     * @param {Type<any>[]} modules
     * @returns {Type<any>[]}
     * @memberof IModuleInjector
     */
    inject(container: IContainer, modules: Type<any>[]): Promise<InjectorResult>;

    /**
     * sync inject module.
     *
     * @param {IContainer} container
     * @param {Type<any>[]} modules
     * @returns {InjectorResult}
     * @memberof IModuleInjector
     */
    syncInject(container: IContainer, modules: Type<any>[]): InjectorResult;
}

/**
 *  inject module injector token.
 */
export class InjectModuleInjectorToken<T extends IModuleInjector> extends Registration<T> {
    constructor(desc: string) {
        super('DI_ModuleInjector', desc)
    }
}

/**
 * async module injector token.
 */
export const ModuleInjectorToken = new InjectModuleInjectorToken<IModuleInjector>('');
