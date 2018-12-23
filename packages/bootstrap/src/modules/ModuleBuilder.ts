import 'reflect-metadata';
import {
    IContainer, Token, ParamProviders, lang,
    isClass, isToken, Inject, Registration, Container,
    Injectable, MetaAccessorToken, IMetaAccessor,
    InjectMetaAccessorToken, isArray, ProviderParserToken
} from '@ts-ioc/core';
import { IModuleBuilder, ModuleBuilderToken, ModuleEnv } from './IModuleBuilder';
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
@Injectable(ModuleBuilderToken)
export class ModuleBuilder<T> implements IModuleBuilder<T> {

    @Inject(ContainerPoolToken)
    protected pools: ContainerPool;

    constructor() {

    }

    getPools(): ContainerPool {
        return this.pools;
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
     * @param {ModuleEnv} [env]
     * @returns {Promise<InjectedModule<T>>}
     * @memberof ModuleBuilder
     */
    async load(token: Token<T> | ModuleConfigure, env?: ModuleEnv): Promise<InjectedModule<T>> {
        if (env instanceof InjectedModule) {
            return env;
        }
        let parent = await this.getParentContainer(env);
        if (isToken(token)) {
            return await this.loadViaToken(token, parent);
        } else {
            return await this.loadViaConfig(token, parent);
        }
    }

    /**
    * bootstrap module's main.
    *
    * @param {(Token<T> | ModuleConfig<T>)} token
    * @param {ModuleEnv} [env]
    * @param {BuildOptions<T>} [options] bootstrap build options.
    * @returns {Promise<Runnable<T>>}
    * @memberof ModuleBuilder
    */
    async bootstrap(token: Token<T> | ModuleConfig<T>, env?: ModuleEnv, options?: BuildOptions<T>): Promise<Runnable<T>> {
        let injmdl = await this.load(token, env);
        let cfg = injmdl.config;
        let container = injmdl.container;
        let accessor = this.getMetaAccessor(container, injmdl.token || injmdl.type);
        let bootToken = accessor.getBootToken(cfg, container);
        if (bootToken) {
            let anBuilder = this.getAnnoBuilder(container, bootToken, cfg);
            return await anBuilder.boot(bootToken, cfg, options || null);
        } else {
            let mdBuilder = this.getAnnoBuilder(container, injmdl.token || injmdl.type, cfg);
            return await mdBuilder.boot(injmdl.token || injmdl.type, cfg, options || null);
        }
    }

    /**
    * run module.
    *
    * @param {(Token<T> | ModuleConfig<T>)} token
    * @param {ModuleEnv} [env]
    * @param {BuildOptions<T>} [options] bootstrap build options.
    * @returns {Promise<Runnable<T>>}
    * @memberof ModuleBuilder
    */
    run(token: Token<T> | ModuleConfig<T>, env?: ModuleEnv, options?: BuildOptions<T>): Promise<Runnable<T>> {
        return this.bootstrap(token, env, options);
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
            let parser = parent.get(ProviderParserToken);
            let pdrmap = parser.parse(...config.providers);
            pdrmap.keys().forEach(key => {
                parent.bindProvider(key, (...providers: ParamProviders[]) => pdrmap.resolve(key, ...providers));
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
