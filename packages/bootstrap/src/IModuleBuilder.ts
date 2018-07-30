import { Token, Registration, IContainer, Type, InjectToken } from '@ts-ioc/core';
import { ModuleConfiguration } from './ModuleConfiguration';
import { ModuleType, IocModule, ModuleInstance } from './ModuleType';
import { IBootstrapBuilder } from './IBootstrapBuilder';


/**
 * inject module builder.
 *
 * @export
 * @class InjectModuleBuilder
 * @extends {Registration<T>}
 * @template T
 */
export class InjectModuleBuilder<T extends IModuleBuilder<any>> extends Registration<T> {
    constructor(desc: string) {
        super('DI_ModuleBuilder', desc);
    }
}

/**
 * module builder token.
 */
export const ModuleBuilderToken = new InjectModuleBuilder<IModuleBuilder<any>>('');

/**
 * root module builder token.
 */
export const RootModuleBuilderToken = new InjectModuleBuilder<IModuleBuilder<any>>('RootModule');

/**
 * root container token.
 */
export const RootContainerToken = new InjectToken<IContainer>('DI_RootContainer');
/**
 * module builder
 *
 * @export
 * @interface IModuleBuilder
 * @template T
 */
export interface IModuleBuilder<T> {

    /**
     * get container of the module.
     *
     * @param {(ModuleType | ModuleConfiguration<T>)} token module type or module configuration.
     * @param {IContainer} [defaultContainer] set default container or not. not set will create new container.
     * @returns {IContainer}
     * @memberof IModuleBuilder
     */
    getContainer(token: ModuleType | ModuleConfiguration<T>, defaultContainer?: IContainer): IContainer ;

    /**
     * create new container.
     *
     * @returns {IContainer}
     * @memberof IModuleBuilder
     */
    createContainer(): IContainer;

    /**
     * build module as ioc container.
     *
     * @param {(ModuleType | ModuleConfiguration<any>)} token
     * @param {IContainer} [defaultContainer]
     * @returns {Promise<ModuleInstance<T>>}
     * @memberof IModuleBuilder
     */
    build(token: ModuleType | ModuleConfiguration<T>, defaultContainer?: IContainer): Promise<ModuleInstance<T>>;

    /**
     * import di module.
     *
     * @param {(Type<any> | ModuleConfiguration<any>)} token di module type
     * @param {IContainer} container container to import module.
     * @returns {Promise<IContainer>}
     * @memberof IModuleBuilder
     */
    importModule(token: Type<any> | ModuleConfiguration<any>, container: IContainer): Promise<IContainer> ;

    /**
     * register module depdences.
     *
     * @param {IContainer} container
     * @param {ModuleConfiguration<T>} config
     * @returns {Promise<IContainer>}
     * @memberof IModuleBuilder
     */
    registerDepdences(container: IContainer, config: ModuleConfiguration<T>): Promise<ModuleConfiguration<T>>;

    /**
     * get the module define decorator or decorator name.
     *
     * @returns {(Function | string)}
     * @memberof IModuleBuilder
     */
    getDecorator(): Function | string;

    /**
     * get configure from module calss metadata or module config object.
     *
     * @param {(ModuleType | ModuleConfiguration<T>)} token
     * @param {IContainer} [container] container.
     * @returns {ModuleConfiguration<T>}
     * @memberof IModuleBuilder
     */
    getConfigure(token: ModuleType | ModuleConfiguration<T>, container?: IContainer): ModuleConfiguration<T>;


    /**
     * bootstrap module.
     *
     * @param {(ModuleType | ModuleConfiguration<T>)} token
     * @param {IContainer} [defaultContainer]
     * @returns {Promise<ModuleInstance<T>>}
     * @memberof IModuleBuilder
     */
    bootstrap(token: ModuleType | ModuleConfiguration<T>, defaultContainer?: IContainer): Promise<ModuleInstance<T>>;

}

