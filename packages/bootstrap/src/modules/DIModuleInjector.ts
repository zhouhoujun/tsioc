import {
    Type, IContainer, ModuleInjector, InjectModuleInjectorToken, IModuleValidate,
    Inject, Token, ProviderTypes, Injectable, isArray, isClass,
    IModuleInjector, Container, ProviderMap, ProviderParserToken, InjectReference, InjectClassProvidesToken
} from '@ts-ioc/core';
import { DIModuelValidateToken } from './DIModuleValidate';
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
     * @param {Type<T>} type
     * @returns {Promise<InjectedModule<T>>}
     * @memberof IDIModuleInjector
     */
    import<T>(container: IContainer, type: Type<T>): Promise<InjectedModule<T>>;

    /**
     * import by config.
     *
     * @template T
     * @param {IContainer} container
     * @param {ModuleConfig<T>} config
     * @returns {Promise<any>>}
     * @memberof IDIModuleInjector
     */
    importByConfig<T>(container: IContainer, config: ModuleConfig<T>): Promise<any>;
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

    constructor(@Inject(DIModuelValidateToken) validate: IModuleValidate) {
        super(validate)
    }

    protected async setup(container: IContainer, type: Type<any>) {
        await this.importModule(container, type);
    }

    async import<T>(container: IContainer, type: Type<T>): Promise<InjectedModule<T>> {
        if (this.validate.validate(type)) {
            let injMd = await this.importModule(container, type);
            return injMd;
        } else {
            return null;
        }
    }

    async importByConfig<T>(container: IContainer, config: ModuleConfig<T>): Promise<any> {
        await this.registerConfgureDepds(container, config);
        if (isArray(config.providers) && config.providers.length) {
            this.bindProvider(container, config.providers);
        }
        return null;
    }

    protected async importModule(container: IContainer, type: Type<any>): Promise<InjectedModule<any>> {
        let pools = container.get(ContainerPoolToken);
        let newContainer = pools.create(container);
        newContainer.register(type);
        let builder = newContainer.getBuilder();
        let metaConfig = this.validate.getMetaConfig(type, newContainer) as ModuleConfigure;
        metaConfig = await this.registerConfgureDepds(newContainer, metaConfig, type);

        let exps: Type<any>[] = [].concat(...builder.loader.getTypes(metaConfig.exports || []));
        let classProvides = [];
        exps.forEach(ty => {
            let tokens = newContainer.get(new InjectClassProvidesToken(ty));
            if (isArray(tokens) && tokens.length) {
                classProvides = classProvides.concat(tokens);
            }
        });
        console.log(type.name, 'classProvides:', classProvides);

        let pdrMap = newContainer.get(new InjectReference(ProviderMap, type));
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
