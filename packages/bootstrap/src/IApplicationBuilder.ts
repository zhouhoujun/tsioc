import { Token, Type, LoadType, InjectToken, IContainer } from '@ts-ioc/core';
import { AppConfiguration } from './AppConfiguration';
import { IModuleBuilder } from './IModuleBuilder';

/**
 * custom define module.
 */
export type CustomRegister = (container: IContainer, config?: AppConfiguration, builder?: IApplicationBuilder) => Token<any>[] | Promise<Token<any>[]>;

export const ApplicationBuilderToken = new InjectToken<IApplicationBuilder>('DI_AppBuilder');

/**
 * application builder.
 *
 * @export
 * @interface IApplicationBuilder
 * @extends {IModuleBuilder}
 * @template T
 */
export interface IApplicationBuilder extends IModuleBuilder {

    /**
     * use custom configuration.
     *
     * @param {(string | AppConfiguration)} [config]
     * @param {IContainer} [container]
     * @returns {this}
     * @memberof IApplicationBuilder
     */
    useConfiguration(config?: string | AppConfiguration, container?: IContainer): this;

    /**
     * use module
     *
     * @param {...LoadType[]} modules
     * @returns {this}
     * @memberof IApplicationBuilder
     */
    use(...modules: LoadType[]): this;

}
