import { AppConfigure } from './AppConfigure';
import { LoadType, Factory, Token, isClass, isToken } from '@ts-ioc/core';
import { IApplicationBuilder, AnyApplicationBuilder } from './IApplicationBuilder';
import { ModuleBuilder, ModuleEnv, InjectedModule, IModuleBuilder, InjectModuleBuilderToken, DefaultModuleBuilderToken, ModuleBuilderToken, ModuleConfig } from '../modules';
import { IEvents } from '../utils';
import { Runnable } from '../runnable';
import { RunnableBuilder, RunnableEvents } from './RunnableBuilder';

/**
 * application events
 *
 * @export
 * @enum {number}
 */
export const AppEvents = RunnableEvents

/**
 * application events
 */
export const ApplicationEvents = RunnableEvents;

/**
 * application builder.
 *
 * @export
 * @class Default ApplicationBuilder
 * @extends {ModuleBuilder}
 * @template T
 */
export class DefaultApplicationBuilder<T> extends RunnableBuilder<T> implements IApplicationBuilder<T>, IEvents {

    protected configs: (string | AppConfigure)[];


    constructor(public baseURL?: string) {
        super();
        this.configs = [];
    }

    static create(baseURL?: string): AnyApplicationBuilder {
        return new DefaultApplicationBuilder<any>(baseURL);
    }

    /**
     * use configuration.
     *
     * @param {(string | AppConfigure)} [config]
     * @returns {this} global config for this application.
     * @memberof Bootstrap
     */
    useConfiguration(config?: string | AppConfigure): this {
        if (this.configMgr) {
            this.configMgr.useConfiguration(config);
        }
        this.configs.push(config);

        return this;
    }

    /**
     * use module as global Depdences module.
     *
     * @param {...LoadType[]} modules
     * @returns {this}
     * @memberof PlatformServer
     */
    use(...modules: LoadType[]): this {
        this.globalModules = this.globalModules.concat(modules);
        this.inited = false;
        return this;
    }

    /**
     * bind provider
     *
     * @template T
     * @param {Token<T>} provide
     * @param {Token<T> | Factory<T>} provider
     * @param {boolean} [beforRootInit]
     * @returns {this}
     * @memberof IContainer
     */
    provider(provide: Token<any>, provider: Token<any> | Factory<any>, beforRootInit?: boolean): this {
        if (beforRootInit) {
            this.beforeInitPds.set(provide, provider);
        } else {
            this.afterInitPds.set(provide, provider);
        }
        return this;
    }

    protected async load(token: Token<T> | AppConfigure, env?: ModuleEnv): Promise<InjectedModule<T>> {
        await this.initRootContainer();
        return super.load(token, env);
    }

    async build(token: Token<T> | AppConfigure, env?: ModuleEnv, data?: any): Promise<T> {
        let injmdl = await this.load(token, env);
        let builder = this.getBuilder(injmdl);
        let md = await builder.build(token, injmdl, data);
        this.emit(AppEvents.onModuleCreated, md, token);
        return md;
    }

    async bootstrap(token: Token<T> | AppConfigure, env?: ModuleEnv, data?: any): Promise<Runnable<T>> {
        let injmdl = await this.load(token, env);
        let builder = this.getBuilder(injmdl);
        return await builder.bootstrap(token, injmdl, data);
    }

    run(token: Token<T> | AppConfigure, env?: ModuleEnv, data?: any): Promise<Runnable<T>> {
        return this.bootstrap(token, env, data);
    }å

    protected createConfigureMgr() {
        let cfgMgr = super.createConfigureMgr();
        if (this.configs && this.configs.length) {
            this.configs.forEach(cfg => cfgMgr.useConfiguration(cfg));
        }
        return cfgMgr;
    }


}
