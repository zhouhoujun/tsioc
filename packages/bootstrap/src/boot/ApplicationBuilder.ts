import { Token, IContainer } from '@ts-ioc/core';
import { AppConfigure } from './AppConfigure';
import { IApplicationBuilder, AnyApplicationBuilder } from './IApplicationBuilder';
import { ModuleEnv, InjectedModule } from '../modules';
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
export class ApplicationBuilder<T> extends RunnableBuilder<T> implements IApplicationBuilder<T>, IEvents {

    protected configs: (string | AppConfigure)[];


    constructor(public baseURL?: string) {
        super();
        this.configs = [];
    }

    static create(baseURL?: string): AnyApplicationBuilder {
        return new ApplicationBuilder<any>(baseURL);
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

    async load(token: Token<T> | AppConfigure, env?: ModuleEnv): Promise<InjectedModule<T>> {
        return await super.load(token, env);
    }

    async build(token: Token<T> | AppConfigure, env?: ModuleEnv, data?: any): Promise<T> {
        return await super.build(token, env, data);
    }

    async bootstrap(token: Token<T> | AppConfigure, env?: ModuleEnv, data?: any): Promise<Runnable<T>> {
        return await super.bootstrap(token, env, data);
    }

    async run(token: Token<T> | AppConfigure, env?: ModuleEnv, data?: any): Promise<Runnable<T>> {
        return await super.run(token, env, data);
    }

    protected createConfigureMgr() {
        let cfgMgr = super.createConfigureMgr();
        if (this.configs && this.configs.length) {
            this.configs.forEach(cfg => cfgMgr.useConfiguration(cfg));
        }
        return cfgMgr;
    }

    /**
     * register by configure.
     *
     * @protected
     * @param {IContainer} container
     * @param {AppConfigure} config
     * @returns {Promise<void>}
     * @memberof RunnableBuilder
     */
    protected async registerByConfigure(container: IContainer, config: AppConfigure): Promise<void> {
        await super.registerByConfigure(container, config);
    }
}
