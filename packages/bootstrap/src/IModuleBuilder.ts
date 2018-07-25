import { Token, Registration, IContainer, IContainerBuilder, Type, InjectToken } from '@ts-ioc/core';
import { ModuleConfiguration } from './ModuleConfiguration';


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
     * root module container.
     *
     * @type {IContainer}
     * @memberof IModuleBuilder
     */
    rootContainer: IContainer;

    /**
     * get container of the module.
     *
     * @returns {IContainer}
     * @memberof IModuleBuilder
     */
    getContainer(): IContainer;

    /**
     * reset container.
     *
     * @memberof IModuleBuilder
     */
    resetContainer();

    /**
     * get container builder.
     *
     * @returns {IContainerBuilder}
     * @memberof IModuleBuilder
     */
    getContainerBuilder(): IContainerBuilder;

    /**
     * build module instacne.
     *
     * @param {(Token<T> | ModuleConfiguration<T>)} token build module.
     * @param {any} [data] create instance init data.
     * @returns {Promise<any>}
     * @memberof IPlatform
     */
    build(token: Token<T> | ModuleConfiguration<T>, data?: any): Promise<T>;

    /**
     * bundle instance via config.
     *
     * @param {T} instance
     * @param {ModuleConfiguration<T>} config
     * @returns {Promise<T>}
     * @memberof IModuleBuilder
     */
    buildStrategy(instance: T, config: ModuleConfiguration<T>): Promise<T>;

    /**
     * import di module.
     *
     * @param {(Type<any> | ModuleConfiguration<any>)} token di module type
     * @param {boolean} [forceNew] force to create new container and builder to import module. default false.
     * @returns {Promise<IContainer>}
     * @memberof IModuleBuilder
     */
    importModule(token: Type<any> | ModuleConfiguration<any>, forceNew?: boolean): Promise<IContainer>;

    /**
     * create instance via token and config.
     *
     * @param {Token<T>} token
     * @param {ModuleConfiguration<T>} config
     * @param {any} [data] create instance init data.
     * @returns {Promise<T>}
     * @memberof IModuleBuilder
     */
    createInstance(token: Token<T>, config: ModuleConfiguration<T>, data?: any): Promise<T>;

    /**
     * get builder.
     *
     * @param {ModuleConfiguration<T>} cfg
     * @param {boolean} [forceNew] force to create builder or not. default false.
     * @returns {IModuleBuilder<T>}
     * @memberof IModuleBuilder
     */
    getBuilder(cfg: ModuleConfiguration<T>, forceNew?: boolean): IModuleBuilder<T>;

    /**
     * register module depdences.
     *
     * @param {IContainer} container
     * @param {ModuleConfiguration<T>} config
     * @returns {Promise<IContainer>}
     * @memberof IModuleBuilder
     */
    registerDepdences(container: IContainer, config: ModuleConfiguration<T>): Promise<IContainer>;

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
     * @param {(Token<any> | ModuleConfiguration<T>)} token
     * @returns {ModuleConfiguration<T>}
     * @memberof IModuleBuilder
     */
    getConfigure(token: Token<any> | ModuleConfiguration<T>): ModuleConfiguration<T>;

}

