import { Registration, IContainer, Type } from '@ts-ioc/core';
import { ModuleConfigure } from './ModuleConfiguration';
import { ModuleType, MdlInstance, DIModuleType } from './ModuleType';


/**
 * inject module builder.
 *
 * @export
 * @class InjectModuleBuilder
 * @extends {Registration<T>}
 * @template T
 */
export class InjectModuleBuilder<T extends IGModuleBuilder<any>> extends Registration<T> {
    constructor(desc: string) {
        super('DI_ModuleBuilder', desc);
    }
}


/**
 * module builder token.
 */
export const ModuleBuilderToken = new InjectModuleBuilder<IModuleBuilder>('');


/**
 * Generics module builder insterface.
 *
 * @export
 * @interface IGModuleBuilder
 * @template T
 */
export interface IGModuleBuilder<T> {
    /**
     * get container of the module.
     *
     * @param {(ModuleType | ModuleConfigure)} token module type or module configuration.
     * @param {IContainer} [defaultContainer] set default container or not. not set will create new container.
     * @returns {IContainer}
     * @memberof IModuleBuilder
     */
    getContainer(token: ModuleType | ModuleConfigure, defaultContainer?: IContainer): IContainer;

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
     * @param {(DIModuleType<T> | ModuleConfigure)} token
     * @param {IContainer} [defaultContainer]
     * @returns {Promise<MdlInstance<T>>}
     * @memberof IModuleBuilder
     */
    build(token: DIModuleType<T> | ModuleConfigure, defaultContainer?: IContainer): Promise<MdlInstance<T>>;

    /**
     * bootstrap module.
     *
     * @param {(DIModuleType<T> | ModuleConfigure)} token
     * @param {IContainer} [defaultContainer]
     * @returns {Promise<MdlInstance<T>>}
     * @memberof IModuleBuilder
     */
    bootstrap(token: DIModuleType<T> | ModuleConfigure, defaultContainer?: IContainer): Promise<MdlInstance<T>>;

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
     * @param {(ModuleType | ModuleConfigure)} token
     * @param {IContainer} [container] container.
     * @returns {ModuleConfigure}
     * @memberof IModuleBuilder
     */
    getConfigure(token: ModuleType | ModuleConfigure, container?: IContainer): ModuleConfigure;
}

/**
 *  module builder. objected generics to any
 *
 * @export
 * @interface IModuleBuilder
 * @extends {IGModuleBuilder<any>}
 */
export interface IModuleBuilder extends IGModuleBuilder<any> {

    /**
     * build module as ioc container.
     *
     * @param {(DIModuleType<TM> | ModuleConfigure)} token
     * @param {IContainer} [defaultContainer]
     * @returns {Promise<MdlInstance<T>>}
     * @memberof IModuleBuilder
     */
    build<TM>(token: DIModuleType<TM> | ModuleConfigure, defaultContainer?: IContainer): Promise<MdlInstance<TM>>;

    /**
     * bootstrap module.
     *
     * @param {(DIModuleType<TM> | ModuleConfigure)} token
     * @param {IContainer} [defaultContainer]
     * @returns {Promise<MdlInstance<TM>>}
     * @memberof IModuleBuilder
     */
    bootstrap<TM>(token: DIModuleType<TM> | ModuleConfigure, defaultContainer?: IContainer): Promise<MdlInstance<TM>>;

}

