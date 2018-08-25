import { AppConfigure, AppConfigureToken, DefaultConfigureToken, AppConfigureLoaderToken } from './AppConfigure';
import { IContainer, LoadType, lang, isString, MapSet, Factory, Token, isUndefined, DefaultContainerBuilder, IContainerBuilder, isClass, isToken } from '@ts-ioc/core';
import { IApplicationBuilder, CustomRegister, AnyApplicationBuilder } from './IApplicationBuilder';
import { ModuleBuilder, ModuleEnv, DIModuleInjectorToken, InjectedModule, IModuleBuilder, InjectModuleBuilderToken, DefaultModuleBuilderToken } from '../modules';
import { ContainerPool, ContainerPoolToken } from '../utils';
import { BootModule } from '../BootModule';
import { EventEmitter } from 'events';

export enum ApplicationEvents {
    onRootContainerCreated = 'onRootContainerCreated',
    onRootContainerInited = 'onRooConatianerInited'
}

/**
 * application builder.
 *
 * @export
 * @class Default ApplicationBuilder
 * @extends {ModuleBuilder}
 * @template T
 */
export class DefaultApplicationBuilder<T> extends ModuleBuilder<T> implements IApplicationBuilder<T> {
    private globalConfig: AppConfigure;
    protected globalModules: LoadType[];
    protected customRegs: CustomRegister<T>[];
    protected providers: MapSet<Token<any>, any>;
    protected configs: (string | AppConfigure)[];
    inited = false;

    events: EventEmitter;

    constructor(public baseURL?: string) {
        super();
        this.customRegs = [];
        this.globalModules = [];
        this.configs = [];
        this.providers = new MapSet();
        this.events = new EventEmitter();
    }

    static create(baseURL?: string): AnyApplicationBuilder {
        return new DefaultApplicationBuilder<any>(baseURL);
    }

    getPools(): ContainerPool {
        if (!this.pools) {
            this.pools = new ContainerPool();
            this.createDefaultContainer();
        }
        return this.pools;
    }

    protected createContainer(): IContainer {
        return this.getContainerBuilder().create();
    }

    protected containerBuilder: IContainerBuilder;
    getContainerBuilder() {
        if (!this.containerBuilder) {
            this.containerBuilder = this.createContainerBuilder();
        }
        return this.containerBuilder;
    }

    protected createContainerBuilder(): IContainerBuilder {
        return new DefaultContainerBuilder();
    }

    /**
     * use configuration.
     *
     * @param {(string | AppConfigure)} [config]
     * @returns {this} global config for this application.
     * @memberof Bootstrap
     */
    useConfiguration(config?: string | AppConfigure): this {
        if (isUndefined(config)) {
            config = '';
        }
        // clean cached config.
        this.globalConfig = null;
        let idx = this.configs.indexOf(config);
        if (idx >= 0) {
            this.configs.splice(idx, 1);
        }
        this.configs.push(config);

        return this;
    }

    protected loadConfig(container: IContainer, src: string): Promise<AppConfigure> {
        if (container.has(AppConfigureLoaderToken)) {
            let loader = container.resolve(AppConfigureLoaderToken, { baseURL: this.baseURL, container: container });
            return loader.load(src);
        } else if (src) {
            let builder = container.getBuilder();
            return builder.loader.load([src])
                .then(rs => {
                    return rs.length ? rs[0] as AppConfigure : null;
                })
        } else {
            return Promise.resolve(null);
        }

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
     * @returns {this}
     * @memberof IContainer
     */
    provider(provide: Token<any>, provider: Token<any> | Factory<any>): this {
        this.providers.set(provide, provider);
        return this;
    }

    async build(token: Token<T> | AppConfigure, env?: ModuleEnv, data?: any, builder?: IModuleBuilder<T>): Promise<T> {
        if (builder) {
            return await builder.build(token, env, data);
        } else {
            return await super.build(token, env, data);
        }
    }

    async bootstrap(token: Token<T> | AppConfigure, env?: ModuleEnv, data?: any): Promise<Runnable<T>> {
        let injmdl = await this.load(token, env);
        let builder = this.getBuilder(injmdl);
        if (builder) {
            return await builder.build(token, env, data);
        } else {
            return await super.build(token, env, data);
        }
    }

    getBuilder(env: InjectedModule<T>): IModuleBuilder<T> {
        let cfg = env.config;
        let container = env.container;
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

        let tko = env.token;
        if (!builder && tko) {
            container.getTokenExtendsChain(tko).forEach(tk => {
                if (builder) {
                    return false;
                }
                let buildToken = new InjectModuleBuilderToken<T>(tk);
                if (container.has(buildToken)) {
                    builder = container.get(buildToken);
                }
                return true;
            });
        }
        if (!builder) {
            builder = this.getDefaultBuilder(container);
        }

        return builder || this;
    }

    protected getDefaultBuilder(container: IContainer): IModuleBuilder<any> {
        if (container.has(DefaultModuleBuilderToken)) {
            return container.resolve(DefaultModuleBuilderToken);
        }
        return null
    }


    protected async getParentContainer(env?: ModuleEnv) {
        let container = this.getPools().getDefault();
        let globCfg = await this.getGlobalConfig(container);
        if (!this.inited) {
            this.registerExts(container, globCfg);
            this.bindAppConfig(globCfg);
            container.bindProvider(AppConfigureToken, globCfg);
            this.events.emit(ApplicationEvents.onRootContainerInited, container);
            this.inited = true;
        }

        return await super.getParentContainer(env);
    }


    protected async getGlobalConfig(container: IContainer): Promise<AppConfigure> {
        if (!this.globalConfig) {
            let globCfg = await this.getDefaultConfig(container);
            globCfg = globCfg || {};
            if (this.configs.length < 1) {
                this.configs.push(''); // load default loader config.
            }
            let exts = await Promise.all(this.configs.map(cfg => {
                if (isString(cfg)) {
                    return this.loadConfig(container, cfg);
                } else {
                    return cfg;
                }
            }));
            exts.forEach(exCfg => {
                if (exCfg) {
                    lang.assign(globCfg, exCfg);
                }
            });
            this.globalConfig = globCfg;
        }
        return this.globalConfig;
    }

    protected createDefaultContainer() {
        let container = this.createContainer();
        container.register(BootModule);
        this.pools.setDefault(container);

        let chain = container.getBuilder().getInjectorChain(container);
        chain.first(container.resolve(DIModuleInjectorToken));
        container.bindProvider(ContainerPoolToken, () => this.getPools());
        this.events.emit(ApplicationEvents.onRootContainerCreated, container);
        return container;
    }

    /**
     * register ioc exts
     *
     * @protected
     * @param {IContainer} container
     * @param {AppConfigure} config
     * @returns {Promise<IContainer>}
     * @memberof ApplicationBuilder
     */
    protected async registerExts(container: IContainer, config: AppConfigure): Promise<IContainer> {

        if (this.globalModules.length) {
            let usedModules = this.globalModules;
            await container.loadModule(...usedModules);
        }

        this.providers.forEach((val, key) => {
            container.bindProvider(key, val);
        });

        if (this.customRegs.length) {
            await Promise.all(this.customRegs.map(async cs => {
                let tokens = await cs(container, config, this);
                return tokens;
            }));
        }

        return container;
    }

    protected bindAppConfig(config: AppConfigure): AppConfigure {
        if (this.baseURL) {
            config.baseURL = this.baseURL;
        }
        return config;
    }

    protected async getDefaultConfig(container: IContainer): Promise<AppConfigure> {
        if (container.has(DefaultConfigureToken)) {
            return container.resolve(DefaultConfigureToken);
        } else {
            return {} as AppConfigure;
        }
    }

}
