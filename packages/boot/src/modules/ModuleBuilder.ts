import 'reflect-metadata';
import {
    Token, ParamProviders, lang,
    isClass, isToken, Inject,
    isUndefined, Singleton, isArray
} from '@ts-ioc/ioc';
import { IModuleBuilder, ModuleEnv, BootOptions } from './IModuleBuilder';
import { ModuleConfigure, ModuleConfig } from './ModuleConfigure';
import { MetaAccessor } from '../services';
import { IRunnable } from '../runnable';
import { IAnnotationBuilder, AnnotationBuilder, BuildOptions } from '../annotations';
import { ModuleResovler } from './ModuleResovler';
import { IContainer, Container, ResolveServiceContext } from '@ts-ioc/core';
import { IDIModuleReflect } from './DIModuleInjector';
import { ContainerPoolToken, ContainerPool } from '../ContainerPool';


/**
 * module builder
 *
 * @export
 * @class ModuleBuilder
 * @implements {IModuleBuilder}
 * @template T
 */
@Singleton
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
    getMetaAccessor(container: IContainer, token: Token<any> | ModuleConfigure, config?: ModuleConfigure): MetaAccessor {
        let mtk: Token<any>;
        if (isToken(token)) {
            mtk = token;
        } else {
            config = token;
        }
        return container.getService(MetaAccessor,
            mtk ? [mtk, lang.getClass(this)] : lang.getClass(this),
            ResolveServiceContext.create({
                defaultToken: config ? config.defaultMetaAccessor : undefined
            }));
    }

    /**
     * load module.
     *
     * @param {(Token<T> | ModuleConfigure)} token
     * @param {(ModuleConfig<T> | BootOptions<T>)} [config]
     * @param {BootOptions<T>} [options]
     * @returns {Promise<ModuleResovler<T>>}
     * @memberof ModuleBuilder
     */
    async load(token: Token<T> | ModuleConfigure, config?: ModuleConfig<T> | BootOptions<T>, options?: BootOptions<T>): Promise<ModuleResovler<T>> {
        let params = this.vaildParams(token, config, options);
        let env = params.options ? params.options.env : null;
        if (env instanceof ModuleResovler) {
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
    async bootstrap(token: Token<T> | ModuleConfig<T>, config?: ModuleConfig<T> | BootOptions<T>, options?: BootOptions<T>): Promise<IRunnable<T>> {
        let params = this.vaildParams(token, config, options);
        options = params.options || {};
        let injmdl: ModuleResovler<T>;
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
                params.options = options;
            }
        } else {
            params.config = token;
            params.options = config as BootOptions<T>;
        }
        return params;
    }

    protected async loadViaToken(token: Token<T>, parent: IContainer): Promise<ModuleResovler<T>> {
        let injmdl = await this.import(token, parent);
        if (!injmdl) {
            let cfg = this.getMetaAccessor(parent, token).getMetadata(token, parent);
            injmdl = new ModuleResovler(token, cfg, parent);
        }
        return injmdl;
    }

    protected async loadViaConfig(config: ModuleConfigure, parent: IContainer): Promise<ModuleResovler<T>> {
        let injmd: ModuleResovler<T> = null;
        let token = this.getMetaAccessor(parent, config).getToken(config, parent);
        if (token) {
            injmd = await this.import(token, parent);
            if (!injmd) {
                let cfg = this.getMetaAccessor(parent, token).getMetadata(token, parent, config);
                injmd = new ModuleResovler(token, cfg, parent);
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
            injmd.config = Object.assign({}, injmd.config, config);
        } else {
            injmd = new ModuleResovler(token, config, parent);
        }

        return injmd;
    }

    protected async import(token: Token<T>, parent: IContainer): Promise<ModuleResovler<T>> {
        let type = isClass(token) ? token : parent.getTokenImpl(token);
        if (isClass(type)) {
            let typeRef = parent.getTypeReflects().get<IDIModuleReflect>(type, true);
            if (typeRef.moduleResolver) {
                return typeRef.moduleResolver
            } else {
                await parent.loadModule(type);
                return parent.getTypeReflects().get<IDIModuleReflect>(type).moduleResolver;
            }
        }
        return null;
    }

    protected async getParentContainer(env?: ModuleEnv) {
        let parent: IContainer;
        if (env) {
            if (env instanceof Container) {
                parent = env;
            } else if (env instanceof ModuleResovler) {
                parent = env.container;
            }
        }
        if (!parent) {
            parent = this.getPools().getRoot();
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
            builder = container.getService(AnnotationBuilder, token,
                ResolveServiceContext.create({
                    // refTargetFactory: tk => new InjectAnnotationBuilderToken(tk),
                    defaultToken: config.defaultAnnoBuilder
                }));
        }

        if (builder) {
            builder.container = container
        }
        return builder;
    }
}
