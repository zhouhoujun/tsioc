import { InjectToken } from '../InjectToken';
import { Type } from '../types';
import { IContainer } from '../IContainer';

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
    inject(container: IContainer, modules: Type<any>[]): any;
}

/**
 * module fileter token.
 */
export const ModuleInjectorToken = new InjectToken<IModuleInjector>('DI_ModuleInjector');
