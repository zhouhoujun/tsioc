import {
    IContainer, LoadType, Factory, Token,
    ContainerBuilder, IContainerBuilder, isClass,
    isToken, PromiseUtil, Injectable, lang, isFunction, ParamProviders, isNullOrUndefined
} from '@ts-ioc/core';
import { IRunnableBuilder, CustomRegister, RunnableBuilderToken, ProcessRunRootToken, RunOptions } from './IRunnableBuilder';
import {
    ModuleBuilder, DIModuleInjectorToken,
    InjectedModule, IModuleBuilder, InjectModuleBuilderToken,
    ModuleBuilderToken, ModuleConfig
} from '../modules';
import { ContainerPool, ContainerPoolToken, Events, IEvents } from '../utils';
import { BootModule } from '../BootModule';
import { Runnable } from '../runnable';
import { ConfigureMgrToken, IConfigureManager, ConfigureRegisterToken } from './IConfigureManager';
import { RunnableConfigure } from './AppConfigure';

/**
 * runnable events
 *
 * @export
 * @enum {number}
 */
export enum RunnableEvents {
    /**
     * on root container created.
     */
    onRootContainerCreated = 'onRootContainerCreated',
    /**
     * on root container inited.
     */
    onRootContainerInited = 'onRootContainerInited',
    /**
     * on module created.
     */
    onModuleCreated = 'onModuleCreated',
    /**
     * on registered runner use module.
     */
    registeredExt = 'registeredExt'
}


/**
 * runnable builder.
 *
 * @export
 * @class RunnableBuilder
 * @extends {ModuleBuilder}
 * @template T
 */
@Injectable(RunnableBuilderToken)
export class RunnableBuilder<T> extends ModuleBuilder<T> implements IRunnableBuilder<T>, IEvents {

    protected globalModules: LoadType[];
    protected customRegs: CustomRegister<T>[];
    protected beforeInitPds: Map<Token<any>, any>;
    protected afterInitPds: Map<Token<any>, any>;
    protected configMgr: IConfigureManager<ModuleConfig<T>>;
    inited = false;

    events: Events;

    private _baseURL: string;

    constructor(baseURL?: string) {
        super();
        this._baseURL = baseURL;
        this.customRegs = [];
        this.globalModules = [];
        this.beforeInitPds = new Map();
        this.afterInitPds = new Map();
        this.events = new Events();
        this.initEvents();
    }

    protected initEvents() {
        this.on(RunnableEvents.onRootContainerInited, (container) => {
            this.afterInitPds.forEach((val, key) => {
                container.bindProvider(key, val);
            });
        })
    }

    on(name: string, event: (...args: any[]) => void): this {
        this.events.on(name, event);
        return this;
    }

    off(name: string, event?: (...args: any[]) => void): this {
        this.events.off(name, event);
        return this;
    }

    emit(name: string, ...args: any[]): void {
        this.events.emit(name, ...args);
    }

    getPools(): ContainerPool {
        if (!this.pools) {
            this.pools = new ContainerPool(this.createContainerBuilder());
            this.createDefaultContainer();
        }
        return this.pools;
    }

    getRunRoot(container: IContainer) {
        return this._baseURL || container.get(ProcessRunRootToken) || '';
    }

    /**
     * has register in pools.
     * use must after `initContainerPools`.
     *
     * @template T
     * @param {Token<T>} key
     * @returns {boolean}
     * @memberof RunnableBuilder
     */
    hasRegister<T>(key: Token<T>): boolean {
        return this.getPools().values().some(c => c.hasRegister(key))
    }

    /**
     * resove token in pools.
     * use must after `initContainerPools`.
     * @template T
     * @param {Token<T>} token
     * @param {...ParamProviders[]} providers
     * @returns {T}
     * @memberof RunnableBuilder
     */
    resolve<T>(token: Token<T>, ...providers: ParamProviders[]): T {
        let resolved: T;
        this.getPools().values().some(c => {
            resolved = c.resolve(token, ...providers);
            return !isNullOrUndefined(resolved);
        })
        return resolved;
    }

    protected createContainerBuilder(): IContainerBuilder {
        return new ContainerBuilder();
    }

    /**
     * use module as global Depdences module.
     *
     * @param {...LoadType[]} modules
     * @returns {this}
     * @memberof RunnableBuilder
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
     * @param {boolean} [beforeInit]
     * @returns {this}
     * @memberof RunnableBuilder
     */
    provider(provide: Token<any>, provider: Token<any> | Factory<any>, beforeInit?: boolean): this {
        if (beforeInit) {
            this.beforeInitPds.set(provide, provider);
        } else {
            this.afterInitPds.set(provide, provider);
        }
        return this;
    }

    getProvider(provide: Token<any>, beforeInit?: boolean): Token<any> | Factory<any> {
        if (beforeInit) {
            return this.beforeInitPds.has(provide) ? this.beforeInitPds.get(provide) : null;
        } else {
            return this.afterInitPds.has(provide) ? this.afterInitPds.get(provide) : null;
        }
    }

    async initContainerPools() {
        if (this.inited) {
            return;
        }
        let container = this.getPools().getDefault();
        await this.registerExts(container);
        let configManager = this.getConfigManager();
        let config = await configManager.getConfig();
        await this.registerByConfigure(container, config);
        this.inited = true;
        this.events.emit(RunnableEvents.onRootContainerInited, container);
    }

    async load(token: Token<T> | RunnableConfigure, config?: RunnableConfigure | RunOptions<T>, options?: RunOptions<T>): Promise<InjectedModule<T>> {
        await this.initContainerPools();
        return await super.load(token, config, options);
    }

    async bootstrap(token: Token<T> | RunnableConfigure, config?: RunnableConfigure | RunOptions<T>, options?: RunOptions<T>): Promise<Runnable<T>> {
        let params = this.vaildParams(token, config, options);
        options = params.options || {};
        let injmdl = params.token ? await this.load(params.token, params.config, options) : await this.load(params.config, options);
        options.env = injmdl;
        let builder = this.getBuilder(injmdl);
        options.bootBuilder = this;
        options.configManager = this.getConfigManager();
        return params.token ? await builder.bootstrap(params.token, params.config, options) : await builder.bootstrap(params.config, options);
    }

    /**
     * get module builder
     *
     * @param {(Token<T> |RunnableConfigure)} token
     * @param {ModuleEnv} [env]
     * @returns {IModuleBuilder<T>}
     * @memberof RunnableBuilder
     */
    async getBuilderByConfig(token: Token<T> | RunnableConfigure, options?: RunOptions<T>): Promise<IModuleBuilder<T>> {
        let injmdl = await this.load(token, options);
        return this.getBuilder(injmdl);
    }

    getBuilder(injmdl: InjectedModule<T>): IModuleBuilder<T> {
        let cfg = injmdl.config;
        let container = injmdl.container;
        let builder: IModuleBuilder<T>;
        if (cfg) {
            if (isClass(cfg.builder)) {
                if (!container.has(cfg.builder)) {
                    container.register(cfg.builder);
                }
            }
            if (isToken(cfg.builder)) {
                builder = container.resolve(cfg.builder);
            } else if (cfg.builder instanceof ModuleBuilder) {
                builder = cfg.builder;
            }
        }

        let tko = injmdl.token;
        if (!builder && tko) {
            builder = container.getService(ModuleBuilderToken, tko, (tk) => new InjectModuleBuilderToken(tk), cfg.defaultBuilder || ModuleBuilderToken);
        }

        return builder || this;
    }

    getConfigManager(): IConfigureManager<ModuleConfig<T>> {
        if (!this.configMgr) {
            this.configMgr = this.createConfigureMgr();
        }
        return this.configMgr;
    }

    protected createConfigureMgr() {
        let container = this.getPools().getDefault();
        return container.getService(ConfigureMgrToken, lang.getClass(this), { baseURL: this.getRunRoot(container) });
    }

    protected createDefaultContainer() {
        let container = this.pools.getDefault();
        container.register(BootModule);

        let chain = container.getBuilder().getInjectorChain(container);
        chain.first(container.resolve(DIModuleInjectorToken));
        container.bindProvider(ContainerPoolToken, () => this.getPools());

        this.beforeInitPds.forEach((val, key) => {
            container.bindProvider(key, val);
        });

        this.events.emit(RunnableEvents.onRootContainerCreated, container);
        return container;
    }

    /**
     * register ioc exts
     *
     * @protected
     * @param {IContainer} container
     * @param {AppConfigure} config
     * @memberof RunnableBuilder
     */
    protected async registerExts(container: IContainer): Promise<void> {
        if (this.globalModules.length) {
            let usedModules = this.globalModules;
            let types = await container.loadModule(...usedModules);
            this.emit(RunnableEvents.registeredExt, types, container);
        }
    }

    /**
     * register by configure.
     *
     * @protected
     * @param {IContainer} container
     * @param {ModuleConfig<T>} config
     * @returns {Promise<void>}
     * @memberof RunnableBuilder
     */
    protected async registerByConfigure(container: IContainer, config: RunnableConfigure): Promise<void> {
        // filter top level container.
        let topcs = this.getPools().values().filter(c => c === container || c.parent === container);
        topcs.some(c => {
            config.baseURL = this.getRunRoot(c);
            return !!config.baseURL;
        });

        await PromiseUtil.step(this.customRegs.map(cs => async () => {
            let tokens = await cs(container, config, this);
            return tokens;
        }));

        await Promise.all(topcs.map(c => {
            let reg = c.getService(ConfigureRegisterToken, lang.getClass(this));
            if (!config.baseURL) {
                config.baseURL = this.getRunRoot(c);
            }
            if (reg) {
                return reg.register(config, c, this);
            }
            return null;
        }));
    }
}
