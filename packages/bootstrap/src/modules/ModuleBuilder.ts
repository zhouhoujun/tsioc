import 'reflect-metadata';
import {
    IContainer, Token, ParamProviders, lang,
    isClass, isToken, Inject, Registration, Container,
    MetaAccessorToken, IMetaAccessor, isUndefined, Singleton,
    InjectMetaAccessorToken, isArray, Type
} from '@ts-ioc/core';
import { IModuleBuilder, ModuleBuilderToken, ModuleEnv, BootOptions } from './IModuleBuilder';
import { ModuleConfigure, ModuleConfig } from './ModuleConfigure';
import { ContainerPool, ContainerPoolToken } from '../utils';
import { Runnable } from '../runnable';
import {
    IAnnotationBuilder, InjectAnnotationBuilder,
    AnnotationBuilderToken, AnnotationBuilder, BuildOptions
} from '../annotations';
import { InjectedModule, InjectedModuleToken } from './InjectedModule';

/**
 * inject module load token.
 *
 * @export
 * @class InjectModuleLoadToken
 * @extends {Registration<T>}
 * @template T
 */
export class InjectModuleLoadToken<T> extends Registration<T> {
    constructor(token: Token<T>) {
        super(token, 'module_loader')
    }
}


/**
 * module builder
 *
 * @export
 * @class ModuleBuilder
 * @implements {IModuleBuilder}
 * @template T
 */
@Singleton(ModuleBuilderToken)
export class ModuleBuilder<T> implements IModuleBuilder<T> {

    @Inject(ContainerPoolToken)
    protected pools: ContainerPool;

    constructor() {

    }

    getPools(): ContainerPool {
        return this.pools;
    }

    getInjectedModule<T>(type: Type<T>): InjectedModule<T> {
        return this.getPools().getDefault().get(new InjectedModuleToken(type));
    }

    /**
     * get metadata accessor.
     *
     * @param {IContainer} container
     * @param {Token<any>} token
     * @param {ModuleConfigure} [config]
     * @returns {IMetaAccessor<any>}
     * @memberof ModuleBuilder
     */
    getMetaAccessor(container: IContainer, token: Token<any> | ModuleConfigure, config?: ModuleConfigure): IMetaAccessor<any> {
        let mtk: Token<any>;
        if (isToken(token)) {
            mtk = token;
        } else {
            config = token;
        }
        return container.getService(MetaAccessorToken,
            mtk ? [mtk, lang.getClass(this)] : lang.getClass(this),
            tk => new InjectMetaAccessorToken(tk), config ? (config.defaultMetaAccessor || MetaAccessorToken) : MetaAccessorToken);
    }

    /**
     * load module.
     *
     * @param {(Token<T> | ModuleConfigure)} token
     * @param {(ModuleConfig<T> | BootOptions<T>)} [config]
     * @param {BootOptions<T>} [options]
     * @returns {Promise<InjectedModule<T>>}
     * @memberof ModuleBuilder
     */
    async load(token: Token<T> | ModuleConfigure, config?: ModuleConfig<T> | BootOptions<T>, options?: BootOptions<T>): Promise<InjectedModule<T>> {
        let params = this.vaildParams(token, config, options);
        let env = params.options ? params.options.env : null;
        if (env instanceof InjectedModule) {
            return env;
        }
        let parent = await this.getParentContainer(env);
        if (params.token) {
            let injmd = await this.loadViaToken(params.token, parent);
            if (params.config) {
                await this.loadViaConfig(params.config, injmd.container || parent);
            }
            return injmd;
        } else {
            return await this.loadViaConfig(params.config, parent);
        }
    }

    /**
     * bootstrap with module and config.
     *
     * @param {(Token<T> | ModuleConfig<T>)} token
     * @param {(ModuleConfig<T> | BootOptions<T>)} [config]
     * @param {BootOptions<T>} [options]
     * @returns {Promise<Runnable<T>>}
     * @memberof ModuleBuilder
     */
    async bootstrap(token: Token<T> | ModuleConfig<T>, config?: ModuleConfig<T> | BootOptions<T>, options?: BootOptions<T>): Promise<Runnable<T>> {
        let params = this.vaildParams(token, config, options);
        options = params.options || {};
        let injmdl: InjectedModule<T>;
        if (params.token) {
            injmdl = await this.load(params.token, params.config, options);
        } else {
            injmdl = await this.load(params.config, options);
        }
        options.env = injmdl;
        let cfg = injmdl.config;
        let tk = injmdl.token || injmdl.type;
        let container = injmdl.container;
        let accessor = this.getMetaAccessor(container, tk);
        let bootToken = accessor.getBootToken(cfg, container);
        if (bootToken) {
            let anBuilder = this.getAnnoBuilder(container, bootToken, cfg);
            return await anBuilder.boot(bootToken, cfg, options);
        } else {
            let mdBuilder = this.getAnnoBuilder(container, tk, cfg);
            return await mdBuilder.boot(tk, cfg, options);
        }
    }

    protected vaildParams(token: Token<T> | ModuleConfig<T>, config?: ModuleConfig<T> | BootOptions<T>, options?: BootOptions<T>) {
        let params: {
            token?: Token<T>;
            config?: ModuleConfig<T>;
            options?: BootOptions<T>
        } = {};
        if (isToken(token)) {
            params.token = token;
            if (isUndefined(options)) {
                params.options = config as BuildOptions<T>;
            } else {
                params.config = config as ModuleConfig<T>;
            }
        } else {
            params.config = token;
            params.options = config as BootOptions<T>;
        }
        return params;
    }

    protected async loadViaToken(token: Token<T>, parent: IContainer): Promise<InjectedModule<T>> {
        let injmdl = await this.import(token, parent);
        if (!injmdl) {
            let cfg = this.getMetaAccessor(parent, token).getMetadata(token, parent);
            injmdl = new InjectedModule(token, cfg, parent);
        }
        return injmdl;
    }

    protected async loadViaConfig(config: ModuleConfigure, parent: IContainer): Promise<InjectedModule<T>> {
        let injmd: InjectedModule<T> = null;
        let token = this.getMetaAccessor(parent, config).getToken(config, parent);
        if (token) {
            injmd = await this.import(token, parent);
            if (!injmd) {
                let cfg = this.getMetaAccessor(parent, token).getMetadata(token, parent, config);
                injmd = new InjectedModule(token, cfg, parent);
            }
        } else {
            token = null;
        }
        if (isArray(config.imports) && config.imports.length) {
            await parent.loadModule(...config.imports);
        }
        if (isArray(config.providers) && config.providers.length) {
            let parser = parent.getProviderParser();
            let pdrmap = parser.parse(...config.providers);
            pdrmap.keys().forEach(key => {
                isToken(key) && parent.bindProvider(key, (...providers: ParamProviders[]) => pdrmap.resolve(key, ...providers));
            });
        }
        if (injmd) {
            injmd.config = lang.assign({}, injmd.config, config);
        } else {
            injmd = new InjectedModule(token, config, parent);
        }

        return injmd;
    }

    protected async import(token: Token<T>, parent: IContainer): Promise<InjectedModule<T>> {
        let type = isClass(token) ? token : parent.getTokenImpl(token);
        if (isClass(type)) {
            let key = new InjectedModuleToken(type);
            if (parent.has(key)) {
                return parent.get(key)
            } else {
                await parent.loadModule(type);
                if (parent.has(key)) {
                    return parent.get(key);
                }
            }
        }
        return null;
    }

    protected async getParentContainer(env?: ModuleEnv) {
        let parent: IContainer;
        if (env) {
            if (env instanceof Container) {
                parent = env;
            } else if (env instanceof InjectedModule) {
                parent = env.container.parent;
            }
        }
        if (!parent) {
            parent = this.getPools().getDefault();
        }
        return parent;
    }

    protected getAnnoBuilder(container: IContainer, token: Token<any>, config: ModuleConfigure): IAnnotationBuilder<any> {
        let builder: IAnnotationBuilder<any>;
        if (isClass(config.annoBuilder)) {
            if (!container.has(config.annoBuilder)) {
                container.register(config.annoBuilder);
            }
        }

        if (isToken(config.annoBuilder)) {
            builder = container.resolve(config.annoBuilder);
        } else if (config.annoBuilder instanceof AnnotationBuilder) {
            builder = config.annoBuilder;
        }

        if (!builder && token) {
            builder = container.getService(AnnotationBuilderToken, token, tk => new InjectAnnotationBuilder(tk),
                config.defaultAnnoBuilder || AnnotationBuilderToken);
        }

        if (builder) {
            builder.container = container
        }
        return builder;
    }
}
