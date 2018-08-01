import { Registration, IContainer, Type, Token } from '@ts-ioc/core';
import { ModuleConfigure } from './ModuleConfiguration';
import { ModuleType, MdlInstance, DIModuleType, LoadedModule } from './ModuleType';


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
 * Generics module builder insterface.
 *
 * @export
 * @interface IGModuleBuilder
 * @template T
 */
export interface IModuleBuilder<T> {
    /**
     * get container of the module.
     *
     * @param {(Token<T> | ModuleConfigure)} token module type or module configuration.
     * @param {IContainer} [defaultContainer] set default container or not. not set will create new container.
     * @returns {IContainer}
     * @memberof IModuleBuilder
     */
    getContainer(token: Token<T> | ModuleConfigure, defaultContainer?: IContainer): IContainer;

    /**
     * create new container.
     *
     * @returns {IContainer}
     * @memberof IModuleBuilder
     */
    createContainer(): IContainer;

    /**
     * load module depdences.
     *
     * @param {(Token<T> | ModuleConfigure)} token
     * @param {IContainer} [defaultContainer]
     * @returns {Promise<LoadedModule>}
     * @memberof IModuleBuilder
     */
    load(token: Token<T> | ModuleConfigure, defaultContainer?: IContainer): Promise<LoadedModule>;

    /**
     * build module as ioc container.
     *
     * @param {(Token<T> | ModuleConfigure)} token
     * @param {(IContainer | LoadedModule)} [defaults]
     * @returns {Promise<MdlInstance<T>>}
     * @memberof IModuleBuilder
     */
    build(token: Token<T> | ModuleConfigure, defaults?: IContainer | LoadedModule): Promise<T>;

    /**
     * bootstrap module's main.
     *
     * @param {(Token<T> | ModuleConfigure)} token
     * @param {*} [data]
     * @param {IContainer} [defaultContainer]
     * @returns {Promise<MdlInstance<T>>}
     * @memberof IGModuleBuilder
     */
    bootstrap(token: Token<T> | ModuleConfigure, data?: any, defaultContainer?: IContainer): Promise<T>;

    /**
     * import di module.
     *
     * @param {(Type<any> | ModuleConfigure)} token di module type
     * @param {IContainer} container container to import module.
     * @returns {Promise<IContainer>}
     * @memberof IModuleBuilder
     */
    importModule(token: Type<any> | ModuleConfigure, container: IContainer): Promise<IContainer>;

    /**
     * register module depdences.
     *
     * @param {IContainer} container
     * @param {ModuleConfigure} config
     * @returns {Promise<ModuleConfigure>}
     * @memberof IModuleBuilder
     */
    registerDepdences(container: IContainer, config: ModuleConfigure): Promise<ModuleConfigure>;

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
     * @param {(Token<T> | ModuleConfigure)} token
     * @param {IContainer} [container] container.
     * @returns {ModuleConfigure}
     * @memberof IModuleBuilder
     */
    getConfigure(token: Token<T> | ModuleConfigure, container?: IContainer): ModuleConfigure;
}



/**
 * module builder token.
 */
export const ModuleBuilderToken = new InjectModuleBuilder<AnyModuleBuilder>('');

/**
 *  module builder. objected generics to any
 *
 * @export
 * @interface AnyModuleBuilder
 * @extends {IModuleBuilder<any>}
 */
export interface AnyModuleBuilder extends IModuleBuilder<any> {

    /**
     * build module as ioc container.
     *
     * @param {(Token<TM> | ModuleConfigure)} token
     * @param {(IContainer | LoadedModule)} [defaults]
     * @returns {Promise<MdlInstance<T>>}
     * @memberof IModuleBuilder
     */
    build<TM>(token: Token<TM> | ModuleConfigure, defaults?: IContainer | LoadedModule): Promise<MdlInstance<TM>>;

    /**
     * bootstrap module.
     *
     * @param {(Token<TM> | ModuleConfigure)} token
     * @param {IContainer} [defaultContainer]
     * @returns {Promise<MdlInstance<TM>>}
     * @memberof IModuleBuilder
     */
    bootstrap<TM>(token: Token<TM> | ModuleConfigure, defaultContainer?: IContainer): Promise<MdlInstance<TM>>;

}

