import {
    IContainer, LoadType, Factory, Token,
    ContainerBuilder, IContainerBuilder, isClass,
    isToken, PromiseUtil, Injectable, lang, ParamProviders, isNullOrUndefined, ResoveWay, IResolver, ClassType
} from '@ts-ioc/core';
import { IRunnableBuilder, CustomRegister, RunnableBuilderToken, ProcessRunRootToken, RunOptions, CurrentRunnableBuilderToken } from './IRunnableBuilder';
import {
    ModuleBuilder, DIModuleInjectorToken,
    InjectedModule, IModuleBuilder, InjectModuleBuilderToken,
    ModuleBuilderToken, ModuleConfig
} from '../modules';
import { ContainerPool, ContainerPoolToken, Events, IEvents } from '../utils';
import { BootModule } from '../BootModule';
import { Runnable } from '../runnable';
import { ConfigureMgrToken, IConfigureManager } from './IConfigureManager';
import { RunnableConfigure } from './AppConfigure';
import { ConfigureRegister } from './ConfigureRegister';
import { BootstrapInjectorToken } from './BootModuleInjector';

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

    getRunRoot(resolver?: IResolver): string {
        return this._baseURL || (resolver || this.getPools().getDefault()).resolve(ProcessRunRootToken) || '';
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
    has<T>(key: Token<T>, aliasOrway?: string | ResoveWay): boolean {
        return this.getPools().values().some(c => c.has(key, aliasOrway))
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
    resolve<T>(token: Token<T>, resway?: ResoveWay | ParamProviders, ...providers: ParamProviders[]): T {
        let resolved: T;
        this.getPools().values().some(c => {
            resolved = c.resolve(token, resway, ...providers);
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
        await this.registerByConfigure(container);
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
        options.bootBuilder = this;
        options.configManager = this.getConfigManager();
        let builder = this.getBuilder(injmdl);
        if (!this.isSame(builder, this)) {
            return params.token ? await builder.bootstrap(params.token, params.config, options) : await builder.bootstrap(params.config, options);
        } else {
            return params.token ? await super.bootstrap(params.token, params.config, options) : await super.bootstrap(params.config, options);
        }
    }

    protected isSame(mdb1: IModuleBuilder<any>, mdb2: IModuleBuilder<any>): boolean {
        if (!mdb1 || !mdb2) {
            return false;
        }
        if (mdb1 === mdb2) {
            return true;
        }
        if (lang.getClass(mdb1) === lang.getClass(mdb2)) {
            return true;
        }
        return false;
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
            if (isToken(cfg.builder)) {
                if (isClass(cfg.builder)) {
                    if (!container.has(cfg.builder)) {
                        container.register(cfg.builder);
                    }
                    if (cfg.builder === lang.getClass(this)) {
                        builder = this;
                    }
                }
                if (!builder) {
                    builder = container.resolve(cfg.builder);
                }
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
        chain.first(container.resolve(BootstrapInjectorToken));
        container.bindProvider(ContainerPoolToken, () => this.getPools());
        container.bindProvider(CurrentRunnableBuilderToken, () => this);
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
    protected async registerByConfigure(container: IContainer): Promise<void> {

        let configManager = this.getConfigManager();
        let config = await configManager.getConfig();
        if (!config.baseURL) {
            config.baseURL = this.getRunRoot(container);
        }

        await PromiseUtil.step(this.customRegs.map(cs => async () => {
            let tokens = await cs(container, config, this);
            return tokens;
        }));

        let curClass = lang.getClass(this);
        let registers: {
            resolver: IResolver,
            serType: ClassType<ConfigureRegister<any>>
        }[] = [];

        // only run root register.
        container.iteratorServices(
            (serType, fac, resolver) => {
                if (!config.baseURL) {
                    config.baseURL = this.getRunRoot(resolver);
                }
                registers.push({
                    resolver: resolver,
                    serType: serType
                });
            },
            ConfigureRegister,
            curClass, true, ResoveWay.nodes);

        await Promise.all(registers.map(ser => ser.resolver.resolve(ser.serType).register(config, this)));
    }
}
