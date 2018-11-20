import { IContainer, LoadType, MapSet, Factory, Token, DefaultContainerBuilder, IContainerBuilder, isClass, isToken, InjectReference } from '@ts-ioc/core';
import { IRunnableBuilder, CustomRegister } from './IRunnableBuilder';
import { ModuleBuilder, ModuleEnv, DIModuleInjectorToken, InjectedModule, IModuleBuilder, InjectModuleBuilderToken, DefaultModuleBuilderToken, ModuleBuilderToken, ModuleConfig, ModuleConfigure } from '../modules';
import { ContainerPool, ContainerPoolToken, Events, IEvents } from '../utils';
import { BootModule } from '../BootModule';
import { Runnable } from '../runnable';
import { ConfigureMgrToken, ConfigureManager } from './ConfigureManager';

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
     * on boot created.
     */
    onBootCreated = 'onBootCreated',
    /**
     *  on runable service started.
     */
    onRunnableStarted = 'onRunnableStarted'
}


/**
 * runnable builder.
 *
 * @export
 * @class RunnableBuilder
 * @extends {ModuleBuilder}
 * @template T
 */
export class RunnableBuilder<T> extends ModuleBuilder<T> implements IRunnableBuilder<T>, IEvents {

    protected globalModules: LoadType[];
    protected customRegs: CustomRegister<T>[];
    protected beforeInitPds: MapSet<Token<any>, any>;
    protected afterInitPds: MapSet<Token<any>, any>;
    protected configMgr: ConfigureManager<ModuleConfig<T>>;
    inited = false;

    events: Events;

    constructor(public baseURL?: string) {
        super();
        this.customRegs = [];
        this.globalModules = [];
        this.beforeInitPds = new MapSet();
        this.afterInitPds = new MapSet();
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

    protected createContainerBuilder(): IContainerBuilder {
        return new DefaultContainerBuilder();
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
     * @param {boolean} [beforRootInit]
     * @returns {this}
     * @memberof RunnableBuilder
     */
    provider(provide: Token<any>, provider: Token<any> | Factory<any>, beforRootInit?: boolean): this {
        if (beforRootInit) {
            this.beforeInitPds.set(provide, provider);
        } else {
            this.afterInitPds.set(provide, provider);
        }
        return this;
    }

    protected async load(token: Token<T> | ModuleConfigure, env?: ModuleEnv): Promise<InjectedModule<T>> {
        await this.initRootContainer();
        return await super.load(token, env);
    }

    async build(token: Token<T> | ModuleConfigure, env?: ModuleEnv, data?: any): Promise<T> {
        let injmdl = await this.load(token, env);
        let builder = this.getBuilder(injmdl);
        let md = await builder.build(token, injmdl, data);
        this.emit(RunnableEvents.onModuleCreated, md, token);
        return md;
    }

    async bootstrap(token: Token<T> | ModuleConfigure, env?: ModuleEnv, data?: any): Promise<Runnable<T>> {
        let injmdl = await this.load(token, env);
        let builder = this.getBuilder(injmdl);
        return await builder.bootstrap(token, injmdl, data);
    }

    run(token: Token<T> | ModuleConfigure, env?: ModuleEnv, data?: any): Promise<Runnable<T>> {
        return this.bootstrap(token, env, data);
    }

    /**
     * get module builder
     *
     * @param {(Token<T> | ModuleConfig<T>)} token
     * @param {ModuleEnv} [env]
     * @returns {IModuleBuilder<T>}
     * @memberof RunnableBuilder
     */
    async getBuilderByConfig(token: Token<T> | ModuleConfig<T>, env?: ModuleEnv): Promise<IModuleBuilder<T>> {
        let injmdl = await this.load(token, env);
        return this.getBuilder(injmdl)
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
            builder = container.getRefService(
                (tk) => [
                    { token: ModuleBuilder, isRef: false },
                    new InjectModuleBuilderToken(tk),
                    new InjectReference(ModuleBuilder, tk)
                ],
                tko, DefaultModuleBuilderToken);
        }
        if (!builder) {
            builder = this.getDefaultBuilder(container);
        }

        return builder || this;
    }

    getConfigManager(): ConfigureManager<ModuleConfig<T>> {
        if (!this.configMgr) {
            this.configMgr = this.createConfigureMgr();
        }
        return this.configMgr;
    }

    protected createConfigureMgr() {
        return this.getPools().getDefault().getService(ConfigureMgrToken, this.constructor, { baseURL: this.baseURL });
    }

    protected async autoRun(container: IContainer, token: Token<any>, cfg: ModuleConfig<T>, instance: any, data?: any): Promise<Runnable<T>> {
        this.emit(RunnableEvents.onBootCreated, instance, token);
        let runnable = await super.autoRun(container, token, cfg, instance, data);
        this.emit(RunnableEvents.onRunnableStarted, runnable, instance, token);
        return runnable;
    }

    protected getDefaultBuilder(container: IContainer): IModuleBuilder<any> {
        return container.resolve(ModuleBuilderToken);
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

    protected async initRootContainer() {
        if (this.inited) {
            return;
        }
        let container = this.getPools().getDefault();
        await this.registerExts(container);
        let configManager = this.getConfigManager();
        await configManager.bindBuilder(this, ...this.customRegs);
        this.inited = true;
        this.events.emit(RunnableEvents.onRootContainerInited, container);

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
            await container.loadModule(...usedModules);
        }
    }
}
