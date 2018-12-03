import {
    Type, IContainer, ModuleInjector, InjectModuleInjectorToken, IModuleValidate,
    Inject, Token, ProviderTypes, Injectable, isArray, isClass,
    IModuleInjector, Container, ProviderMap, ProviderParserToken, InjectReference, InjectClassProvidesToken, lang, isToken, InjectModuleValidateToken
} from '@ts-ioc/core';
import { DIModuleValidateToken } from './DIModuleValidate';
import { DIModule } from '../decorators';
import { ContainerPoolToken } from '../utils';
import { ModuleConfigure, ModuleConfig } from './ModuleConfigure';
import { InjectedModuleToken, InjectedModule } from './InjectedModule';

// const exportsProvidersFiled = '__exportProviders';

/**
 * DIModule injector interface.
 *
 * @export
 * @interface IDIModuleInjector
 * @extends {IModuleInjector}
 */
export interface IDIModuleInjector extends IModuleInjector {
    /**
     * import module type.
     *
     * @template T
     * @param {IContainer} container
     * @param {Token<T>} token
     * @returns {Promise<InjectedModule<T>>}
     * @memberof IDIModuleInjector
     */
    import<T>(container: IContainer, token: Token<T>): Promise<InjectedModule<T>>;

    /**
     * import by config.
     *
     * @template T
     * @param {IContainer} container
     * @param {ModuleConfig<T>} config
     * @returns {InjectedModule<T>>}
     * @memberof IDIModuleInjector
     */
    importByConfig<T>(container: IContainer, config: ModuleConfig<T>): Promise<InjectedModule<T>>;
}

/**
 * DIModule injector token.
 */
export const DIModuleInjectorToken = new InjectModuleInjectorToken<IDIModuleInjector>(DIModule.toString());

/**
 * DIModule injector.
 *
 * @export
 * @class DIModuleInjector
 * @extends {ModuleInjector}
 */
@Injectable(DIModuleInjectorToken)
export class DIModuleInjector extends ModuleInjector implements IDIModuleInjector {

    constructor(@Inject(DIModuleValidateToken) validate: IModuleValidate) {
        super(validate)
    }

    protected getValidate(container: IContainer, token?: Token<any>): IModuleValidate {
        let vaildate: IModuleValidate;
        if (isToken(token)) {
            vaildate = container.getRefService(InjectModuleValidateToken, token) as IModuleValidate;
        }
        return vaildate ? vaildate : this.validate;
    }

    protected async setup(container: IContainer, type: Type<any>) {
        await this.importModule(container, type);
    }

    protected syncSetup(container: IContainer, type: Type<any>) {
        // do nothing.
    }

    async import<T>(container: IContainer, token: Token<T>): Promise<InjectedModule<T>> {
        let type = isClass(token) ? token : container.getTokenImpl(token);
        if (this.getValidate(container, type).validate(type)) {
            let inMdtk = new InjectedModuleToken(type);
            if (container.has(inMdtk)) {
                return container.get(inMdtk);
            } else {
                return await this.importModule(container, type);
            }
        } else {
            return null;
        }
    }

    protected vaild(container: IContainer, type: Type<any>): boolean {
        let vaildate = this.getValidate(container, type);
        if (!vaildate) {
            return true;
        }
        return vaildate.validate(type);
    }

    async importByConfig<T>(container: IContainer, config: ModuleConfig<T>): Promise<InjectedModule<T>> {
        let injmd: InjectedModule<T> = null;
        let token = this.validate.getToken(config, container);
        if (token) {
            let type = isClass(token) ? token : container.getTokenImpl(token);
            let inMdtk = new InjectedModuleToken(type);
            if (container.has(inMdtk)) {
                injmd = container.get(inMdtk);
            } else {
                injmd = await this.importModule(container, type);
            }
        }

        container = injmd ? injmd.container : container;

        await this.registerConfgureDepds(container, config);
        if (isArray(config.providers) && config.providers.length) {
            this.bindProvider(container, config.providers);
        }

        let cfg = injmd ? lang.assign({}, injmd.config, config) : config;

        return new InjectedModule(token, cfg, container);
    }

    protected async importModule(container: IContainer, type: Type<any>): Promise<InjectedModule<any>> {
        let pools = container.get(ContainerPoolToken);
        let newContainer = pools.create(container);
        newContainer.register(type);
        let builder = newContainer.getBuilder();
        let metaConfig = this.getValidate(newContainer, type).getMetaConfig(type, newContainer) as ModuleConfigure;
        metaConfig = await this.registerConfgureDepds(newContainer, metaConfig, type);

        let exps: Type<any>[] = [].concat(...builder.loader.getTypes(metaConfig.exports || []));
        let classProvides = [];
        exps.forEach(ty => {
            let classPd = newContainer.resolveValue(new InjectClassProvidesToken(ty));
            if (classPd && isArray(classPd.provides) && classPd.provides.length) {
                classProvides = classProvides.concat(classPd.provides);
            }
        });

        let pdrMap = newContainer.resolveValue(new InjectReference(ProviderMap, type));
        let injMd = new InjectedModule(metaConfig.token || type, metaConfig, newContainer, type, exps, pdrMap ? classProvides.concat(pdrMap.keys()) : classProvides);
        container.bindProvider(new InjectedModuleToken(type), injMd);

        await this.importConfigExports(container, newContainer, injMd);

        return injMd;
    }


    protected async registerConfgureDepds(container: IContainer, config: ModuleConfigure, type?: Type<any>): Promise<ModuleConfigure> {
        if (isArray(config.imports) && config.imports.length) {
            await container.loadModule(...config.imports);
        }

        if (isArray(config.providers) && config.providers.length) {
            await this.bindProvider(container, config.providers, type);
        }
        return config;
    }

    protected async importConfigExports(container: IContainer, providerContainer: IContainer, injMd: InjectedModule<any>) {
        if (container === providerContainer) {
            return container;
        }
        if (injMd) {
            let chain = container.getResolvers();
            chain.next(injMd);
            if (injMd.exports && injMd.exports.length) {
                let expchs = providerContainer.getResolvers().toArray().filter(r => {
                    if (r instanceof Container) {
                        return false;
                    } else {
                        return injMd.exports.indexOf(r.type) >= 0
                    }
                });
                expchs.forEach(r => {
                    chain.next(r);
                });
            }
        }

        return container;
    }

    protected bindProvider(container: IContainer, providers: ProviderTypes[], type?: Type<any>): Token<any>[] {
        let parser = container.get(ProviderParserToken);
        let pdrmap: ProviderMap;
        if (type && isClass(type)) {
            let mapRef = new InjectReference(ProviderMap, type);
            pdrmap = container.get(mapRef);
            let newpMap = parser.parse(...providers);
            if (pdrmap) {
                pdrmap.copy(newpMap);
            } else {
                pdrmap = newpMap;
                container.bindProvider(mapRef, pdrmap);
            }
        }
        let tokens = pdrmap.keys();
        tokens.forEach(key => {
            container.bindProvider(key, (...providers: ProviderTypes[]) => pdrmap.resolve(key, ...providers));
        });
        return tokens;
    }
}
